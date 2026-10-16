import Systeme from "./Systeme.js";

window.onload = () => {
  // Code à exécuter une fois que la page est chargée
  console.log("Page chargée !");

  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  new Systeme(ctx, canvas);
};
