/**
 * Raccourcis clavier inspirés de Colab.
 *
 * Partout :
 *   Maj + Entrée        exécuter et passer à la cellule suivante
 *   Ctrl/⌘ + Entrée     exécuter la cellule
 *   Ctrl/⌘ + F9         tout exécuter
 *   Ctrl + M puis …     A insérer au-dessus · B insérer en dessous · D supprimer
 *                       K monter · J descendre · Z annuler la suppression · . réinitialiser
 * Hors édition :
 *   ↑ / k, ↓ / j        changer de cellule
 *   Entrée              éditer le code
 * En édition :
 *   Échap               quitter l'édition
 */
export class Shortcuts {
  chord = false; // vrai juste après Ctrl + M

  constructor(notebook) {
    this.notebook = notebook;
    document.addEventListener("keydown", (event) => this.onKeyDown(event));
  }

  onKeyDown(event) {
    // Le menu des exemples et les champs des réglages gardent leurs propres touches
    if (["SELECT", "INPUT"].includes(event.target.tagName)) return;
    const nb = this.notebook;
    const mod = event.ctrlKey || event.metaKey;
    const chord = this.chord;
    const key = event.key.toLowerCase();
    this.chord = event.ctrlKey && key === "m";

    // Seconde touche après Ctrl + M
    const chordActions = {
      ".": () => nb.restart(),
      a: () => nb.insertAbove(),
      b: () => nb.insert(),
      d: () => nb.delete(),
      k: () => nb.move(nb.selected, -1),
      j: () => nb.move(nb.selected, 1),
      z: () => nb.undoDelete(),
    };

    const action = (() => {
      if (this.chord) return () => {};
      if (chord && chordActions[key]) return chordActions[key];
      if (event.key === "Enter" && event.shiftKey)
        return () => {
          nb.run();
          document.activeElement?.blur();
          nb.selectNext();
        };
      if (event.key === "Enter" && mod) return () => nb.run();
      if (event.key === "F9" && mod) return () => nb.runAll();
      if (nb.isEditing)
        return event.key === "Escape"
          ? () => document.activeElement.blur()
          : null;
      if (event.key === "ArrowDown" || event.key === "j")
        return () => nb.selectNext();
      if (event.key === "ArrowUp" || event.key === "k")
        return () => nb.selectPrevious();
      if (event.key === "Enter") return () => nb.edit();
      return null;
    })();

    if (!action) return;
    event.preventDefault();
    action();
  }
}
