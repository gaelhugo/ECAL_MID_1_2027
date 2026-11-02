import { el } from "../ui/dom.js";
import { icons } from "../ui/icons.js";
import { RunButton } from "./RunButton.js";
import { CodeEditor } from "./CodeEditor.js";
import { CellOutput } from "./CellOutput.js";
import { CellActions } from "./CellActions.js";
import { CellInserter } from "./CellInserter.js";
import { t } from "../i18n/index.js";

/** Contenu d'une nouvelle cellule vide. */
export const EMPTY_STEP = { title: "", prompt: "", code: "" };

/**
 * Une cellule du notebook : le prompt (modifiable) à gauche, le code à droite,
 * le bouton d'exécution dans la marge et la sortie en dessous.
 * Sous chaque cellule, une zone permet d'en insérer une nouvelle.
 */
export class Cell {
  generated;
  sourcePrompt; // prompt qui a produit le code actuel
  sourceCode; // code correspondant au dernier prompt synchronisé
  lastAdvice = ""; // conseil pédagogique affiché si le code comporte une erreur

  /**
   * @param {{ title: string, prompt: string, code: string }} step
   * @param {number} id identifiant unique et stable (indépendant de la position)
   * @param {object} callbacks onRun, onSelect, onInsert, onMove, onDelete
   */
  constructor(step, id, { onRun, onSelect, onInsert, onMove, onDelete }) {
    this.step = step;
    this.id = id;
    // Si la cellule a un prompt mais pas encore de code (ex. sous-étape créée par découpage),
    // sourcePrompt reste vide pour déclencher la génération à l'exécution
    this.sourcePrompt = step.code ? step.prompt : "";
    this.sourceCode = step.code || "";
    // Une cellule sans code prédéfini est directement modifiable
    this.generated = !step.code;
    this.runButton = new RunButton(() => onRun(this));
    this.editor = new CodeEditor(
      this.generated && !step.prompt
        ? t("cell.codePlaceholder")
        : t("cell.codePending"),
      () => this.updateModified(),
    );
    this.editor.readOnly = !this.generated;
    this.output = new CellOutput();
    this.actions = new CellActions({
      onMove: (delta) => onMove(this, delta),
      onDelete: () => onDelete(this),
    });
    this.inserter = new CellInserter(() => onInsert(this));
    this.element = this.build();
    this.element.addEventListener("mousedown", () => onSelect(this));
    this.updateModified();
  }

  /** Code actuel (le code prédéfini tant que la cellule n'a pas été générée). */
  get code() {
    return this.generated ? this.editor.value : this.step.code;
  }

  get prompt() {
    return this.promptText.innerText.trim();
  }

  get isGenerated() {
    return this.generated;
  }

  /** Vrai si le prompt a changé depuis la génération du code actuel. */
  get isPromptModified() {
    return this.prompt !== this.sourcePrompt;
  }

  /** Vrai si le code a été saisi ou modifié manuellement par l'utilisateur. */
  get isCodeModified() {
    return this.generated && this.code.trim() !== this.sourceCode.trim();
  }

  /** Vrai si le prompt doit être créé ou mis à jour à partir du code de l'utilisateur. */
  get needsPromptFromCode() {
    if (!this.generated || !this.code.trim()) return false;
    if (!this.prompt) return true;
    return !this.isPromptModified && this.isCodeModified;
  }

  /**
   * Prépare le code avant exécution :
   * - prompt modifié (et non vide) → le modèle génère un nouveau code
   *   (et renvoie d'éventuelles sous-étapes si la demande est trop complexe) ;
   * - première exécution → le code prédéfini « s'écrit » ;
   * - sinon → le code actuel (éventuellement modifié à la main) est conservé.
   * @param {import('../llm/CodeGenerator.js').CodeGenerator} generator
   * @param {{ before: object[], after: string[], upcoming?: string[] }} context code des autres cellules
   * @param {{ allowSplit?: boolean }} [options]
   * @returns {Promise<{ title: string, prompt: string }[] | undefined>}
   */
  async generate(generator, context, { allowSplit = true } = {}) {
    if (this.isPromptModified && this.prompt) {
      this.lastAdvice = "";
      return this.generateFromPrompt(generator, context, { allowSplit });
    }
    if (this.generated) return;
    this.generated = true;
    await this.editor.type(this.step.code);
    this.sourceCode = this.code;
    this.editor.readOnly = false;
    this.updateModified();
  }

  /** Met à jour le numéro affiché (« Étape n »), qui suit la position. */
  setIndex(index) {
    const title = this.step.title ? ` · ${this.step.title}` : "";
    this.label.textContent = `${t("cell.step", { n: index + 1 })}${title}`;
  }

  select(state) {
    const wasSelected = this.element.classList.contains("is-selected");
    this.element.classList.toggle("is-selected", state);
    if (state && !wasSelected)
      this.element.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  focusPrompt() {
    this.promptText.focus();
  }

  async generateFromPrompt(generator, context, { allowSplit = true } = {}) {
    const prompt = this.prompt;
    const previous = this.editor.value;
    this.editor.readOnly = true;
    this.element.classList.add("is-generating");
    try {
      const request = {
        ...context,
        prompt,
        originalPrompt: this.sourcePrompt,
        code: this.code,
        allowSplit,
      };
      const { code, steps } = await generator.generate(
        request,
        (chunk) => (this.editor.value = chunk),
      );
      this.editor.value = code;
      this.sourcePrompt = prompt;
      this.sourceCode = code;
      this.generated = true;
      this.updateModified();
      return steps;
    } catch (error) {
      this.editor.value = previous; // en cas d'échec, on retrouve le code d'avant
      throw error;
    } finally {
      this.editor.readOnly = !this.generated;
      this.element.classList.remove("is-generating");
    }
  }

  /**
   * Génère (ou met à jour) le prompt correspondant au code saisi par l'utilisateur
   * et renvoie une éventuelle explication pédagogique si le code comporte des erreurs.
   * @param {import('../llm/CodeGenerator.js').CodeGenerator} generator
   * @param {{ before: object[], after: string[] }} context
   * @param {string[]} [errors] erreurs d'exécution rapportées par le navigateur
   * @returns {Promise<string>} explication pédagogique éventuelle
   */
  async generatePromptFromCode(generator, context, errors = []) {
    const previousPrompt = this.prompt;
    this.promptText.contentEditable = "false";
    this.element.classList.add("is-generating");
    try {
      const { prompt, advice } = await generator.generatePrompt(
        {
          ...context,
          code: this.code,
          currentPrompt: previousPrompt,
          errors,
        },
        (chunk) => {
          if (chunk) this.promptText.textContent = chunk;
        },
      );
      if (prompt) this.promptText.textContent = prompt;
      this.sourcePrompt = this.prompt;
      this.sourceCode = this.code;
      this.lastAdvice = advice || "";
      this.updateModified();
      return this.lastAdvice;
    } catch (error) {
      this.promptText.textContent = previousPrompt;
      throw error;
    } finally {
      this.promptText.contentEditable = "plaintext-only";
      this.element.classList.remove("is-generating");
    }
  }

  updateModified() {
    this.element.classList.toggle(
      "is-modified",
      (this.isPromptModified && this.prompt !== "") ||
        (!this.isPromptModified && this.isCodeModified && this.prompt !== ""),
    );
  }

  build() {
    const prompt = el(
      "div",
      "prompt",
      `<div class="prompt__label">${icons.sparkle}<span></span></div>`,
    );
    this.label = prompt.querySelector("span");
    this.promptText = el("p", "prompt__text", "");
    this.promptText.textContent = this.step.prompt;
    this.promptText.dataset.placeholder = t("cell.promptPlaceholder");
    this.promptText.contentEditable = "plaintext-only";
    this.promptText.spellcheck = false;
    this.promptText.addEventListener("input", () => this.updateModified());
    prompt.append(this.promptText);

    const body = el("div", "cell__body");
    body.append(prompt, this.editor.element);

    const gutter = el("div", "cell__gutter");
    gutter.append(this.runButton.element);

    const cell = el("article", "cell");
    cell.append(gutter, body, this.output.element, this.actions.element);
    return cell;
  }
}
