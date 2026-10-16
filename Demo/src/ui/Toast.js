/**
 * Toast
 * Lightweight transient HUD notification system
 */
export class Toast {
  constructor(elementId = 'hud-toast') {
    this.el = document.getElementById(elementId);
    this.timer = null;
  }

  show(message, duration = 1800) {
    if (!this.el) return;
    this.el.textContent = message;
    this.el.classList.add('active');

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.el.classList.remove('active');
    }, duration);
  }
}
