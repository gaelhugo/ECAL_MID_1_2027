/**
 * BaseDemo
 * Abstract base class for all creative coding webcam demonstrations.
 */
export class BaseDemo {
  /**
   * @param {number} id - Unique numeric identifier (0-9)
   * @param {string} title - Human readable demo title
   * @param {string} description - Pedagogical explanation of the creative coding concept
   */
  constructor(id, title, description) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.camera = null;
    this.isActive = false;
    this.params = {};
    this.defaultParams = {};
  }

  /**
   * Initializes demo assets and attaches camera manager
   * @param {import('../core/CameraManager.js').CameraManager} cameraManager
   */
  setup(cameraManager) {
    this.camera = cameraManager;
    this.defaultParams = JSON.parse(JSON.stringify(this.params));
  }

  /**
   * Called when switching into this demo
   */
  enter() {
    this.isActive = true;
  }

  /**
   * Called when navigating away from this demo
   */
  exit() {
    this.isActive = false;
  }

  /**
   * Updates internal physics, simulations, or AI models
   * @param {number} deltaTime - Time in seconds since last frame
   */
  update(deltaTime) {
    // Override in subclasses
  }

  /**
   * Renders the transformation onto the canvas
   * @param {CanvasRenderingContext2D} ctx - Main canvas 2D rendering context
   * @param {import('../core/CameraManager.js').CameraManager} camera - Camera manager reference
   */
  render(ctx, camera) {
    // Override in subclasses
  }

  /**
   * Returns control descriptors for the HUD parameter drawer
   * @returns {Array<Object>}
   */
  getControls() {
    return [];
  }

  /**
   * Updates a single parameter value
   * @param {string} key
   * @param {any} value
   */
  setParam(key, value) {
    if (key in this.params) {
      if (typeof this.params[key] === 'number' && typeof value === 'string') {
        const parsed = Number(value);
        this.params[key] = isNaN(parsed) ? value : parsed;
      } else {
        this.params[key] = value;
      }
    }
  }

  /**
   * Helper: Calculates perceived luminosity from RGB values using Rec. 601 standard
   * L = 0.299*R + 0.587*G + 0.114*B
   * @param {number} r (0-255)
   * @param {number} g (0-255)
   * @param {number} b (0-255)
   * @returns {number} Luminosity (0-255)
   */
  static getLuminosity(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }
}
