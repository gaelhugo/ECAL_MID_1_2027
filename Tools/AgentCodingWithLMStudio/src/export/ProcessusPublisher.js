/**
 * Publication d'un processus dans le dépôt GitHub (src/examples/<slug>.json),
 * avec traduction automatique (fr ↔ en) via le modèle actif :
 * - les titres (du processus et des étapes) et les prompts sont traduits ;
 * - dans le code, seuls les commentaires et les textes affichés sont traduits
 *   (les instructions JavaScript restent strictement identiques).
 */
import { CodeCleaner } from "../llm/CodeCleaner.js";
import { CodeExporter } from "./CodeExporter.js";
import { lang as uiLang, t } from "../i18n/index.js";

const REPO = "gaelhugo/ECAL_MID_1_2027";
const EXAMPLES_DIR = "Tools/AgentCodingWithLMStudio/src/examples";
const API_BASE = `https://api.github.com/repos/${REPO}/contents/${EXAMPLES_DIR}`;

const LANG_NAMES = { fr: "French (natural, with all accents)", en: "English" };

export class ProcessusPublisher {
  /**
   * Construit le JSON bilingue (fr/en) du processus et l'envoie sur GitHub.
   * @param {object} options
   * @param {string} options.title titre saisi par l'administrateur
   * @param {object} options.mode mode actif (vanilla, p5, three, dom)
   * @param {{ title: string, prompt: string, code: string }[]} options.steps étapes non vides
   * @param {import('../llm/LlmClient.js').LlmClient} options.client client LLM actif
   * @param {string} options.token jeton GitHub (Personal Access Token)
   * @param {(status: string) => void} [options.onStatus] suivi de l'avancement
   * @returns {Promise<{ path: string, data: object }>}
   */
  static async publish({ title, mode, steps, client, token, onStatus }) {
    const sourceLang = uiLang === "fr" ? "fr" : "en";
    const targetLang = sourceLang === "fr" ? "en" : "fr";

    onStatus?.(t("publish.translating"));
    const translated = await ProcessusPublisher.translate(
      { title, steps },
      sourceLang,
      targetLang,
      client,
    );

    const data = ProcessusPublisher.buildJson(
      { title, mode, steps },
      translated,
      sourceLang,
      targetLang,
    );

    // Le nom du fichier suit le titre anglais ou français (slug)
    const slug = CodeExporter.slug(data.title.fr || data.title.en || title);
    const filename = `${slug}.json`;

    onStatus?.(t("publish.uploading", { file: filename }));
    await ProcessusPublisher.commitToGitHub(
      filename,
      `${JSON.stringify(data, null, 2)}\n`,
      `feat(examples): ${data.title.fr || title} (${filename})`,
      token,
    );

    return { path: `./${filename}`, data };
  }

  /** Demande au modèle actif de traduire titres, prompts et commentaires du code. */
  static async translate({ title, steps }, from, to, client) {
    const payload = {
      title,
      steps: steps.map((step, i) => ({
        title: step.title || t("cell.step", { n: i + 1 }),
        prompt: step.prompt,
        code: step.code,
      })),
    };

    const system = `You are a precise bilingual translator for a creative-coding teaching app.
Translate the given JSON from ${LANG_NAMES[from]} to ${LANG_NAMES[to]}.

Strict rules:
- Return ONLY valid JSON with the exact same structure: { "title": "...", "steps": [{ "title": "...", "prompt": "...", "code": "..." }] }.
- Translate "title" and each step's "title" and "prompt" naturally and accurately into ${LANG_NAMES[to]}.
- If a step's "title" is just a generic step number (like "Étape 1" or "Step 1"), write a short, descriptive title (2–4 words) summarizing what the step does in ${LANG_NAMES[to]}.
- Inside each step's "code", translate ONLY the comments (// ... or /* ... */) and human-readable strings displayed on the page. Keep every single JavaScript instruction, identifier, number, and line break IDENTICAL.`;

    let raw = "";
    for await (const chunk of client.stream([
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(payload, null, 2) },
    ])) {
      raw += chunk;
    }

    const cleaned = CodeCleaner.clean(raw).trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
  }

  /** Assemble l'objet JSON final au format de src/examples/*.json. */
  static buildJson({ title, mode, steps }, translated, from, to) {
    const pair = (a, b) => ({
      fr: from === "fr" ? a : b,
      en: from === "en" ? a : b,
    });
    return {
      title: pair(title, translated.title || title),
      mode: mode.id,
      steps: steps.map((step, i) => {
        const tr = translated.steps?.[i] ?? {};
        const stepTitle = step.title || tr.title || "";
        return {
          title: pair(stepTitle, tr.title || stepTitle),
          prompt: pair(step.prompt, tr.prompt || step.prompt),
          code: pair(
            step.code.trimEnd().split("\n"),
            (tr.code || step.code).trimEnd().split("\n"),
          ),
        };
      }),
    };
  }

  /** Crée ou met à jour src/examples/<filename> sur GitHub via l'API Contents. */
  static async commitToGitHub(filename, content, message, token) {
    const url = `${API_BASE}/${encodeURIComponent(filename)}`;
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Si le fichier existe déjà, GitHub demande son sha pour le remplacer
    let sha;
    const existing = await fetch(url, { headers }).catch(() => null);
    if (existing?.ok) {
      sha = (await existing.json()).sha;
    }

    const bytes = new TextEncoder().encode(content);
    const base64 = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify({ message, content: base64, ...(sha && { sha }) }),
    });

    if (!response.ok) {
      const text = await response.text();
      let detail = text;
      try {
        detail = JSON.parse(text).message ?? text;
      } catch {
        /* texte brut */
      }
      throw new Error(`GitHub (${response.status}) : ${detail}`);
    }
  }

  /** Supprime src/examples/<filename> sur GitHub via l'API Contents. */
  static async deleteFromGitHub(path, title, token, onStatus) {
    const filename = path.replace(/^\.\//, "");
    const url = `${API_BASE}/${encodeURIComponent(filename)}`;
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    onStatus?.(t("publish.deleting", { file: filename }));
    const existing = await fetch(url, { headers });
    if (!existing.ok) {
      throw new Error(`GitHub (${existing.status}) : ${filename}`);
    }
    const { sha } = await existing.json();

    const response = await fetch(url, {
      method: "DELETE",
      headers,
      body: JSON.stringify({
        message: `chore(examples): remove ${title} (${filename})`,
        sha,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      let detail = text;
      try {
        detail = JSON.parse(text).message ?? text;
      } catch {
        /* texte brut */
      }
      throw new Error(`GitHub (${response.status}) : ${detail}`);
    }
  }
}
