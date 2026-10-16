import Particule from "./Particule.js";

export default class Systeme {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;

    this.particles = [];

    for (let i = 0; i < 500; i++) {
      const p = new Particule(this.ctx);
      p.x = Math.random() * this.canvas.width;
      p.y = Math.random() * this.canvas.height;
      // p.update();
      // this.particles.push(p);
    }

    document.addEventListener("mousemove", (e) => {
      const p = new Particule(this.ctx);
      // p.x = Math.random() * this.canvas.width;
      // p.y = Math.random() * this.canvas.height;
      p.x = e.clientX;
      p.y = e.clientY;
      this.particles.push(p);
    });

    this.draw();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      // p.x++;
      p.update();
    }

    requestAnimationFrame(() => {
      this.draw();
    });
  }
}
