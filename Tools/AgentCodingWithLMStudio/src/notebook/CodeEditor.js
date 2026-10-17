import { el } from '../ui/dom.js';
import { Highlighter } from './Highlighter.js';

/**
 * Éditeur de code léger : un <textarea> transparent posé sur un <pre>
 * coloré. Le <pre> donne sa taille à l'ensemble, le textarea gère la saisie.
 */
export class CodeEditor {
  constructor(placeholder) {
    this.element = el('div', 'code-editor');
    this.pre = el('pre', 'code-editor__highlight');
    this.textarea = el('textarea', 'code-editor__input');
    Object.assign(this.textarea, { placeholder, spellcheck: false, readOnly: true, wrap: 'off' });

    const layer = el('div', 'code-editor__layer');
    layer.append(this.pre, this.textarea);
    this.element.append(layer);

    this.textarea.addEventListener('input', () => this.#render());
    this.textarea.addEventListener('keydown', (event) => this.#onKeyDown(event));
    this.#render();
  }

  get value() {
    return this.textarea.value;
  }

  set value(text) {
    this.textarea.value = text;
    this.#render();
  }

  set readOnly(state) {
    this.textarea.readOnly = state;
  }

  focus() {
    this.textarea.focus();
  }

  /** Fait apparaître le texte progressivement, comme s'il était généré. */
  type(text) {
    const duration = Math.min(900, text.length * 2);
    const start = performance.now();
    return new Promise((resolve) => {
      const frame = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        this.value = text.slice(0, Math.round(text.length * progress));
        if (progress < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  /** Met à jour la coloration (l'espace final garde la hauteur d'une ligne vide). */
  #render() {
    this.pre.innerHTML = `${Highlighter.toHtml(this.textarea.value)} `;
  }

  /** La touche Tab insère deux espaces au lieu de changer de champ. */
  #onKeyDown(event) {
    if (event.key !== 'Tab' || this.textarea.readOnly) return;
    event.preventDefault();
    this.textarea.setRangeText('  ', this.textarea.selectionStart, this.textarea.selectionEnd, 'end');
    this.#render();
  }
}
