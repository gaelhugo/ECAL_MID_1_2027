/**
 * CameraManager
 * Manages webcam stream, permissions, canvas sizing, horizontal mirroring,
 * aspect-ratio mapping (cover/contain), and offscreen pixel extraction.
 */
export class CameraManager {
  constructor(videoElement, canvasElement, processingCanvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: false, willReadFrequently: false });
    this.processingCanvas = processingCanvasElement;
    this.processingCtx = this.processingCanvas.getContext('2d', { willReadFrequently: true });

    this.stream = null;
    this.isReady = false;
    this.isMirrored = true;
    this.fitMode = 'cover'; // 'cover' fills entire screen, 'contain' letterboxes

    // Viewport and video dimensions
    this.displayWidth = window.innerWidth;
    this.displayHeight = window.innerHeight;
    this.videoWidth = 0;
    this.videoHeight = 0;

    // Computed mapping rectangle from video to canvas
    this.drawRect = { sx: 0, sy: 0, sw: 0, sh: 0, dx: 0, dy: 0, dw: 0, dh: 0 };

    // Performance & FPS tracking
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fps = 60;
    this.fpsUpdateInterval = 500;
    this.lastFpsUpdate = performance.now();

    // Resize handler
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * Initializes the webcam stream
   */
  async init() {
    try {
      const constraints = {
        audio: false,
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user'
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;

      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play();
          resolve();
        };
      });

      this.videoWidth = this.video.videoWidth || 1280;
      this.videoHeight = this.video.videoHeight || 720;

      // Update offscreen processing canvas size
      this.processingCanvas.width = this.videoWidth;
      this.processingCanvas.height = this.videoHeight;

      this.handleResize();
      this.isReady = true;

      return true;
    } catch (err) {
      console.error('Camera initialization error:', err);
      throw err;
    }
  }

  /**
   * Handles browser viewport resizing
   */
  handleResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.displayWidth = window.innerWidth;
    this.displayHeight = window.innerHeight;

    this.canvas.width = Math.floor(this.displayWidth * dpr);
    this.canvas.height = Math.floor(this.displayHeight * dpr);

    // Use scale on context so coordinate space matches display pixels (CSS pixels)
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.updateMappingRect();
  }

  /**
   * Computes aspect-ratio 'cover' mapping coordinates
   */
  updateMappingRect() {
    if (!this.videoWidth || !this.videoHeight) return;

    const screenAspect = this.displayWidth / this.displayHeight;
    const videoAspect = this.videoWidth / this.videoHeight;

    let sx = 0, sy = 0, sw = this.videoWidth, sh = this.videoHeight;
    let dx = 0, dy = 0, dw = this.displayWidth, dh = this.displayHeight;

    if (this.fitMode === 'cover') {
      if (screenAspect > videoAspect) {
        // Screen is wider than video: crop top and bottom
        sh = this.videoWidth / screenAspect;
        sy = (this.videoHeight - sh) / 2;
      } else {
        // Screen is taller than video: crop left and right
        sw = this.videoHeight * screenAspect;
        sx = (this.videoWidth - sw) / 2;
      }
    } else {
      // Contain mode
      if (screenAspect > videoAspect) {
        dw = this.displayHeight * videoAspect;
        dx = (this.displayWidth - dw) / 2;
      } else {
        dh = this.displayWidth / videoAspect;
        dy = (this.displayHeight - dh) / 2;
      }
    }

    this.drawRect = { sx, sy, sw, sh, dx, dy, dw, dh };
  }

  /**
   * Toggles horizontal mirroring
   */
  toggleMirror() {
    this.isMirrored = !this.isMirrored;
    return this.isMirrored;
  }

  /**
   * Prepares context with optional horizontal mirroring
   */
  applyTransform(ctx = this.ctx) {
    if (this.isMirrored) {
      ctx.save();
      ctx.translate(this.displayWidth, 0);
      ctx.scale(-1, 1);
    }
  }

  /**
   * Restores context after transformation
   */
  restoreTransform(ctx = this.ctx) {
    if (this.isMirrored) {
      ctx.restore();
    }
  }

  /**
   * Draws the raw webcam frame directly onto the canvas with proper cover & mirroring
   */
  drawVideo(ctx = this.ctx, alpha = 1.0) {
    if (!this.isReady) return;

    const { sx, sy, sw, sh, dx, dy, dw, dh } = this.drawRect;
    
    ctx.save();
    if (alpha < 1.0) {
      ctx.globalAlpha = alpha;
    }

    if (this.isMirrored) {
      ctx.translate(this.displayWidth, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(this.video, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
  }

  /**
   * Extracts pixel data at a target resolution for fast CPU sampling.
   * Caches or renders to the processingCanvas.
   * @param {number} targetWidth - Width of the sampling grid
   * @param {number} targetHeight - Height of the sampling grid
   * @returns {ImageData}
   */
  getSampledImageData(targetWidth, targetHeight) {
    if (!this.isReady) return null;

    if (this.processingCanvas.width !== targetWidth || this.processingCanvas.height !== targetHeight) {
      this.processingCanvas.width = targetWidth;
      this.processingCanvas.height = targetHeight;
    }

    const { sx, sy, sw, sh } = this.drawRect;
    const ctx = this.processingCtx;

    ctx.save();
    if (this.isMirrored) {
      ctx.translate(targetWidth, 0);
      ctx.scale(-1, 1);
    }

    // Draw the cropped video portion into our downscaled processing canvas
    ctx.drawImage(this.video, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
    ctx.restore();

    return ctx.getImageData(0, 0, targetWidth, targetHeight);
  }

  /**
   * Updates FPS computation
   */
  updateFPS() {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFpsUpdate;

    if (elapsed >= this.fpsUpdateInterval) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
    return this.fps;
  }
}
