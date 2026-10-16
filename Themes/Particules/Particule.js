export default class Particule {
  constructor(ctx) {
    this.x = 0;
    this.y = 0;
    this.vitesseX = 5 - 10 * Math.random();
    this.vitesseY = 5 - 10 * Math.random();
    this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    this.ctx = ctx;
  }

  verifier_les_bords() {
    if (this.x < 0 || this.x > this.ctx.canvas.width) {
      this.vitesseX = -this.vitesseX;
    }
    if (this.y < 0 || this.y > this.ctx.canvas.height) {
      this.vitesseY = -this.vitesseY;
    }
  }

  update() {
    this.x += this.vitesseX;
    this.y += this.vitesseY;
    this.verifier_les_bords();

    this.ctx.fillStyle = this.color;
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, 10, 0, 2 * Math.PI);
    // this.ctx.rect(this.x, this.y, 100, 100);
    this.ctx.fill();
  }
}
