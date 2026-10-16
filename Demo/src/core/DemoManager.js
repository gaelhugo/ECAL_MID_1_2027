/**
 * DemoManager
 * Coordinates demo instances, handles transitions, updates lifecycle hooks,
 * executes smooth visual crossfades between demos, and communicates state to the HUD.
 */
export class DemoManager {
  /**
   * @param {Array<import('../demos/BaseDemo.js').BaseDemo>} demos
   * @param {import('./CameraManager.js').CameraManager} cameraManager
   */
  constructor(demos, cameraManager) {
    this.demos = demos;
    this.camera = cameraManager;
    this.currentIndex = 0;
    this.onDemoChangeCallbacks = [];

    // Smooth transition state
    this.isTransitioning = false;
    this.transitionProgress = 0.0;
    this.transitionDuration = 1.8;
    this.fromIndex = 0;
    this.toIndex = 0;
    this.fromDemo = null;
    this.toDemo = null;

    // Transition offscreen buffers
    this.bufA = null;
    this.bufACtx = null;
    this.bufB = null;
    this.bufBCtx = null;

    // Initialize all demos with camera reference
    for (const demo of this.demos) {
      demo.setup(this.camera);
    }
  }

  /**
   * Registers a callback invoked whenever active demo changes
   * @param {Function} callback
   */
  onDemoChange(callback) {
    this.onDemoChangeCallbacks.push(callback);
  }

  /**
   * Returns currently active demo instance
   * @returns {import('../demos/BaseDemo.js').BaseDemo}
   */
  getCurrentDemo() {
    return this.demos[this.currentIndex];
  }

  /**
   * Direct, immediate switch to demo by numeric index
   * @param {number} index
   */
  switchTo(index) {
    if (index < 0 || index >= this.demos.length) return;

    // If currently in a transition, abort it cleanly
    if (this.isTransitioning) {
      this.isTransitioning = false;
      if (this.fromDemo && this.fromDemo !== this.demos[index]) {
        this.fromDemo.exit();
      }
    }

    if (this.currentIndex === index && this.demos[index].isActive) return;

    // Exit old demo
    const oldDemo = this.demos[this.currentIndex];
    if (oldDemo) {
      oldDemo.exit();
    }

    this.currentIndex = index;
    const newDemo = this.demos[this.currentIndex];
    newDemo.enter();

    // Notify listeners
    for (const cb of this.onDemoChangeCallbacks) {
      cb(newDemo, this.currentIndex);
    }
  }

  /**
   * Initiates a smooth, cinema-grade crossfade transition between current demo and next demo
   * @param {number} nextIndex
   * @param {number} duration - Transition length in seconds
   */
  transitionTo(nextIndex, duration = 1.8) {
    if (nextIndex < 0 || nextIndex >= this.demos.length) return;
    if (nextIndex === this.currentIndex && !this.isTransitioning) return;

    if (this.isTransitioning) {
      if (this.fromDemo) this.fromDemo.exit();
    }

    this.isTransitioning = true;
    this.transitionProgress = 0.0;
    this.transitionDuration = Math.max(0.4, duration);
    this.fromIndex = this.currentIndex;
    this.toIndex = nextIndex;
    this.fromDemo = this.demos[this.fromIndex];
    this.toDemo = this.demos[this.toIndex];

    // Activate the incoming demo so its buffers and state are live
    this.toDemo.enter();

    // Update active index and notify HUD so concept cards and tabs glide to next demo
    this.currentIndex = this.toIndex;
    for (const cb of this.onDemoChangeCallbacks) {
      cb(this.toDemo, this.toIndex);
    }
  }

  /**
   * Navigates to next demo in sequence
   * @param {boolean} smooth - Whether to use crossfade
   */
  next(smooth = false) {
    const nextIdx = (this.currentIndex + 1) % this.demos.length;
    if (smooth) {
      this.transitionTo(nextIdx);
    } else {
      this.switchTo(nextIdx);
    }
  }

  /**
   * Navigates to previous demo in sequence
   * @param {boolean} smooth - Whether to use crossfade
   */
  prev(smooth = false) {
    const prevIdx = (this.currentIndex - 1 + this.demos.length) % this.demos.length;
    if (smooth) {
      this.transitionTo(prevIdx);
    } else {
      this.switchTo(prevIdx);
    }
  }

  initTransitionBuffers(w, h) {
    if (!this.bufA) {
      this.bufA = document.createElement('canvas');
      this.bufACtx = this.bufA.getContext('2d');
      this.bufB = document.createElement('canvas');
      this.bufBCtx = this.bufB.getContext('2d');
    }
    if (this.bufA.width !== w || this.bufA.height !== h) {
      this.bufA.width = w;
      this.bufA.height = h;
      this.bufB.width = w;
      this.bufB.height = h;
    }
  }

  /**
   * Per-frame simulation update
   * @param {number} deltaTime
   */
  update(deltaTime) {
    if (this.isTransitioning) {
      this.transitionProgress += deltaTime / this.transitionDuration;

      // Update both demos concurrently so motion remains fluid throughout the crossfade
      if (this.fromDemo && this.fromDemo.isActive) {
        this.fromDemo.update(deltaTime);
      }
      if (this.toDemo && this.toDemo.isActive) {
        this.toDemo.update(deltaTime);
      }

      // Conclude transition
      if (this.transitionProgress >= 1.0) {
        this.isTransitioning = false;
        this.transitionProgress = 1.0;
        if (this.fromDemo) {
          this.fromDemo.exit();
        }
        this.fromDemo = null;
        this.toDemo = null;
      }
    } else {
      const current = this.getCurrentDemo();
      if (current && current.isActive) {
        current.update(deltaTime);
      }
    }
  }

  /**
   * Per-frame canvas draw call with smooth crossfade blending
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (this.isTransitioning && this.fromDemo && this.toDemo) {
      const { displayWidth, displayHeight } = this.camera;
      this.initTransitionBuffers(displayWidth, displayHeight);

      // Render outgoing demo to buffer A
      this.fromDemo.render(this.bufACtx, this.camera);

      // Render incoming demo to buffer B
      this.toDemo.render(this.bufBCtx, this.camera);

      // Smoothstep easing: S-curve for optical naturalness
      const p = Math.max(0, Math.min(1, this.transitionProgress));
      const blend = p * p * (3 - 2 * p);

      // Draw outgoing demo
      ctx.save();
      ctx.globalAlpha = 1.0;
      ctx.drawImage(this.bufA, 0, 0);

      // Blend incoming demo smoothly over outgoing
      ctx.globalAlpha = blend;
      ctx.drawImage(this.bufB, 0, 0);
      ctx.restore();
    } else {
      const current = this.getCurrentDemo();
      if (current && current.isActive) {
        current.render(ctx, this.camera);
      }
    }
  }
}
