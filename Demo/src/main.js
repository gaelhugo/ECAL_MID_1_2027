import { App } from './core/App.js';

// Bootstrap the application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  // Expose to window for live console debugging/experimentation
  window.__APP__ = app;
});
