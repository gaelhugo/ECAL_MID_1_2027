/**
 * Clients minimaux pour les modèles, appelés via le proxy Vite (vite.config.js),
 * ou directement dans la version web publiée (voir endpoints.js).
 * - LlmClient : API compatible OpenAI (LM Studio, Groq, OpenRouter, Mistral).
 *   Par défaut : LM Studio, avec le modèle VITE_LMSTUDIO_MODEL (.env) ou,
 *   à défaut, le modèle actuellement chargé dans LM Studio.
 * - GeminiClient : API Gemini (Google AI Studio).
 * Chacun renvoie le texte de la réponse morceau par morceau : stream(messages).
 */
import { t } from "../i18n/index.js";
import { DIRECT_API, endpoint } from "./endpoints.js";

// Messages plus clairs pour les erreurs les plus fréquentes des services en ligne
const HINTED = [400, 401, 403, 429];

export class LlmClient {
  constructor(options = {}) {
    Object.assign(
      this,
      {
        name: "LM Studio",
        baseUrl: endpoint("lmstudio"),
        model: import.meta.env?.VITE_LMSTUDIO_MODEL,
        apiKey: "",
        requiresKey: false,
      },
      options,
    );
  }

  get isLocal() {
    return this.baseUrl === endpoint("lmstudio");
  }

  /** Envoie les messages et renvoie le texte de la réponse morceau par morceau. */
  async *stream(messages) {
    const response = await this.request("/v1/chat/completions", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: await this.getModel(),
        messages,
        temperature: 0.2,
        stream: true,
      }),
    });
    for await (const data of this.events(response)) {
      // Seul le contenu final compte (le raisonnement éventuel est ignoré)
      const delta = data.choices?.[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  headers() {
    return {
      "Content-Type": "application/json",
      ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
    };
  }

  /** Réponse en « server-sent events » : des lignes "data: {...}", décodées en objets. */
  async *events(response) {
    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      const lines = (buffer + value).split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        const data = line.replace(/^data:\s*/, "").trim();
        if (!line.startsWith("data:") || data === "[DONE]") continue;
        yield JSON.parse(data);
      }
    }
  }

  /** Modèle imposé (réglages ou .env), sinon le premier modèle chargé dans LM Studio. */
  async getModel() {
    if (this.model) return this.model;
    const { data = [] } = await (await this.request("/api/v0/models")).json();
    const chat = data.filter((model) => model.type !== "embeddings");
    const model = chat.find((m) => m.state === "loaded") ?? chat[0];
    if (!model) throw new Error(t("llm.noModel"));
    return model.id;
  }

  async request(path, options) {
    if (this.requiresKey && !this.apiKey)
      throw new Error(t("llm.noKey", { name: this.name }));
    const response = await fetch(this.baseUrl + path, options).catch(
      () => null,
    );
    // Le proxy Vite répond 5xx quand LM Studio n'est pas lancé
    if (!response || (this.isLocal && response.status >= 500))
      throw new Error(
        this.isLocal
          ? await this.localError()
          : t("llm.unreachableService", { name: this.name }),
      );
    if (!response.ok) {
      // Aide dans la langue de l'interface + message exact du service (utile pour comprendre une clé refusée)
      const hint =
        !this.isLocal &&
        HINTED.includes(response.status) &&
        t(`llm.hint.${response.status}`);
      const message = LlmClient.errorMessage(await response.text());
      throw new Error(
        `${this.name} (${response.status}) : ${hint ? `${hint} — ${message}` : message}`,
      );
    }
    // Une page HTML signifie que le proxy n'est pas actif
    if (response.headers.get("content-type")?.includes("text/html"))
      throw new Error(t("llm.noProxy", { baseUrl: this.baseUrl }));
    return response;
  }

  /** Message d'erreur LM Studio : en version web, on distingue « navigateur qui bloque » de « serveur injoignable ». */
  async localError() {
    if (!DIRECT_API) return t("llm.unreachable");
    // Chrome : l'accès refusé au réseau local peut être autorisé dans les réglages du site
    for (const name of ["local-network-access", "loopback-network"]) {
      try {
        const { state } = await navigator.permissions.query({ name });
        if (state === "denied") return t("llm.localDenied");
      } catch {
        /* API de permissions absente : autre navigateur */
      }
    }
    return t("llm.unreachableWeb");
  }

  /** Message lisible extrait d'une réponse d'erreur (JSON des différents services, sinon texte brut). */
  static errorMessage(text) {
    try {
      const data = [JSON.parse(text)].flat()[0];
      return data.error?.message ?? data.detail ?? data.message ?? text;
    } catch {
      return text;
    }
  }
}

/**
 * API Gemini (generateContent en streaming) ; le chemin (path) précède le modèle.
 */
export class GeminiClient extends LlmClient {
  async *stream(messages) {
    // Gemini sépare l'instruction système du message de l'utilisateur
    const join = (keep) =>
      messages
        .filter(keep)
        .map((message) => message.content)
        .join("\n\n");
    const system = join((message) => message.role === "system");
    const user = join((message) => message.role !== "system");
    const response = await this.request(
      `${this.path}/${this.model}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          // Réflexion courte : une cellule de code n'a pas besoin de plus
          generationConfig: { thinkingConfig: { thinkingLevel: "LOW" } },
        }),
      },
    );
    for await (const data of this.events(response))
      for (const part of data.candidates?.[0]?.content?.parts ?? [])
        if (part.text && !part.thought) yield part.text;
  }

  headers() {
    return {
      "Content-Type": "application/json",
      "x-goog-api-key": this.apiKey,
    };
  }
}
