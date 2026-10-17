/**
 * Crée un élément HTML avec une classe et un contenu HTML optionnels.
 * Petit utilitaire partagé par toutes les classes d'interface.
 */
export function el(tag, className = '', html = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html) node.innerHTML = html;
  return node;
}
