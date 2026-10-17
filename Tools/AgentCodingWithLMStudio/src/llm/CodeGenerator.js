import { LlmClient } from "./LlmClient.js";
import { PromptBuilder } from "./PromptBuilder.js";
import { CodeCleaner } from "./CodeCleaner.js";

/**
 * Génère le code d'une cellule à partir de son prompt modifié.
 * Le code est transmis au fur et à mesure (onCode) pour s'afficher en direct.
 */
export class CodeGenerator {
  constructor(client = new LlmClient()) {
    this.client = client;
  }

  /**
   * @param {object} request voir PromptBuilder.messages
   * @param {(code: string) => void} onCode appelé à chaque morceau reçu
   * @returns {Promise<string>} le code final
   */
  async generate(request, onCode) {
    const messages = PromptBuilder.messages(request);
    // Visible dans la console du navigateur : permet de vérifier le contexte envoyé
    console.debug(`[${this.client.name}] messages envoyés`, messages);
    let text = "";
    for await (const chunk of this.client.stream(messages)) {
      text += chunk;
      onCode(CodeCleaner.clean(text));
    }
    const code = CodeCleaner.clean(text);
    if (!code.trim()) throw new Error("Le modèle n’a renvoyé aucun code.");
    return code;
  }
}
