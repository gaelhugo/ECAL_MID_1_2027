import { LlmClient } from "./LlmClient.js";
import { PromptBuilder } from "./PromptBuilder.js";
import { CodeCleaner } from "./CodeCleaner.js";
import { t } from "../i18n/index.js";

/**
 * Génère le code d'une cellule à partir de son prompt modifié.
 * Le code est transmis au fur et à mesure (onCode) pour s'afficher en direct.
 */
export class CodeGenerator {
  mode; // mode du processus (voir runtime/modes.js), choisi par main.js

  constructor(client = new LlmClient()) {
    this.client = client;
  }

  /**
   * @param {object} request voir PromptBuilder.messages
   * @param {(code: string) => void} onCode appelé à chaque morceau reçu
   * @returns {Promise<{ code: string, steps: { title: string, prompt: string }[] }>}
   *   le code final de la cellule et les éventuelles sous-étapes si la demande
   *   a été subdivisée par le modèle
   */
  async generate(request, onCode) {
    const messages = PromptBuilder.messages({ mode: this.mode, ...request });
    // Visible dans la console du navigateur : permet de vérifier le contexte envoyé
    console.debug(`[${this.client.name}] messages envoyés`, messages);
    let text = "";
    for await (const chunk of this.client.stream(messages)) {
      text += chunk;
      onCode(CodeCleaner.clean(text));
    }
    const { code, steps } = CodeCleaner.parse(text, (count) =>
      t("llm.splitHeader", { count }),
    );
    // Si le modèle a tenté un découpage à 1 seule étape sans code, on relance sans découpage
    if (
      request.allowSplit !== false &&
      !steps.length &&
      !CodeCleaner.hasExecutableCode(code) &&
      /@step\b/i.test(text)
    ) {
      return this.generate({ ...request, allowSplit: false }, onCode);
    }
    if (!code.trim()) throw new Error(t("llm.noCode"));
    return { code, steps: request.allowSplit === false ? [] : steps };
  }

  /**
   * Génère (ou met à jour) le prompt correspondant au code saisi par l'utilisateur
   * et détecte pédagogiquement les éventuelles erreurs dans ce code.
   * @param {object} request voir PromptBuilder.promptFromCodeMessages
   * @param {(prompt: string) => void} onPrompt appelé à chaque morceau reçu
   * @returns {Promise<{ prompt: string, advice: string }>}
   */
  async generatePrompt(request, onPrompt) {
    const messages = PromptBuilder.promptFromCodeMessages({
      mode: this.mode,
      ...request,
    });
    console.debug(`[${this.client.name}] messages (code → prompt)`, messages);
    let text = "";
    for await (const chunk of this.client.stream(messages)) {
      text += chunk;
      onPrompt(CodeCleaner.cleanPrompt(text));
    }
    const { prompt, advice } = CodeCleaner.parsePrompt(text);
    if (!prompt && !advice) throw new Error(t("llm.noPrompt"));
    return { prompt, advice };
  }
}
