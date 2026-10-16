/**
 * ShowcaseController
 * Coordinates an automated, seamless creative coding tour through all demos.
 * Gradually and naturally evolves demo parameters in real-time, ensuring continuous
 * mathematical and visual handoffs without sudden jumps or disappearing outlines.
 */
export class ShowcaseController {
  /**
   * @param {import('./DemoManager.js').DemoManager} demoManager
   * @param {import('../ui/HUD.js').HUD} hud
   */
  constructor(demoManager, hud) {
    this.demoManager = demoManager;
    this.hud = hud;

    this.isRunning = false;
    this.minDemoDuration = 10.0;    // Minimum seconds per demo before transitioning
    this.transitionDuration = 1.2;  // Duration of the crossfade transition in seconds
    this.autoAnimateParams = true;  // Smoothly choreograph parameters during the tour
    this.timeInDemo = 0.0;          // Seconds elapsed in currently active demo

    this.onStateChangeCallbacks = [];
    this.onProgressCallbacks = [];

    // Listen to manual demo clicks to smoothly sync tour position
    this.demoManager.onDemoChange((demo, idx) => {
      if (this.isRunning && !this.demoManager.isTransitioning) {
        this.timeInDemo = 0.0;
        if (demo && this.autoAnimateParams) {
          this.choreographParameters(demo, idx, 0.0);
          if (this.hud && this.hud.syncControls) {
            this.hud.syncControls(demo);
          }
        }
      }
    });
  }

  /**
   * Register listener for tour state change (running vs paused)
   */
  onStateChange(cb) {
    this.onStateChangeCallbacks.push(cb);
  }

  /**
   * Register listener for tour tick progress (0.0 to 1.0)
   */
  onProgress(cb) {
    this.onProgressCallbacks.push(cb);
  }

  /**
   * Starts automated showcase tour
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timeInDemo = 0.0;

    const curIdx = this.demoManager.currentIndex;
    const curDemo = this.demoManager.getCurrentDemo();
    if (curDemo && this.autoAnimateParams) {
      this.choreographParameters(curDemo, curIdx, 0.0);
      if (this.hud && this.hud.syncControls) {
        this.hud.syncControls(curDemo);
      }
    }

    this.notifyState();
  }

  /**
   * Pauses showcase tour
   */
  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.notifyState();
  }

  /**
   * Toggles tour play / pause state
   */
  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
    return this.isRunning;
  }

  /**
   * Configures minimal duration per demo in seconds
   * @param {number} seconds
   */
  setMinDuration(seconds) {
    this.minDemoDuration = Math.max(3.0, Math.min(60.0, parseFloat(seconds) || 10.0));
  }

  notifyState() {
    for (const cb of this.onStateChangeCallbacks) {
      cb(this.isRunning);
    }
  }

  notifyProgress(p) {
    for (const cb of this.onProgressCallbacks) {
      cb(p, this.timeInDemo, this.minDemoDuration);
    }
  }

  /**
   * Per-frame showcase tick called from main animation loop
   * @param {number} deltaTime
   */
  update(deltaTime) {
    if (!this.isRunning) return;

    // During crossfade transition, maintain stable parameters without ticking demo time
    if (this.demoManager.isTransitioning) {
      return;
    }

    this.timeInDemo += deltaTime;
    const progress = Math.min(1.0, this.timeInDemo / this.minDemoDuration);

    const activeDemo = this.demoManager.getCurrentDemo();
    const activeIndex = this.demoManager.currentIndex;

    // Choreograph active demo parameters smoothly across its lifecycle
    if (activeDemo && this.autoAnimateParams) {
      this.choreographParameters(activeDemo, activeIndex, progress);
      if (this.hud && this.hud.syncControls) {
        this.hud.syncControls(activeDemo);
      }
    }

    // When minimal duration reached, prepare incoming demo and initiate smooth transition
    if (this.timeInDemo >= this.minDemoDuration) {
      this.timeInDemo = 0.0;
      const nextIdx = (this.demoManager.currentIndex + 1) % this.demoManager.demos.length;
      const nextDemo = this.demoManager.demos[nextIdx];

      // CRITICAL: Pre-configure incoming demo to its exact p = 0.0 state BEFORE transition begins!
      // This eliminates parameter pops and visual snapping.
      if (nextDemo && this.autoAnimateParams) {
        this.choreographParameters(nextDemo, nextIdx, 0.0);
      }

      this.demoManager.transitionTo(nextIdx, this.transitionDuration);
    }

    this.notifyProgress(progress);
  }

  /**
   * Evolves parameters continuously so every demo's start state mathematically matches
   * the previous demo's end state without visual discontinuity.
   *
   * @param {import('../demos/BaseDemo.js').BaseDemo} demo
   * @param {number} index
   * @param {number} p - Normalized lifecycle progress (0.0 to 1.0)
   */
  choreographParameters(demo, index, p) {
    switch (index) {
      case 0: {
        // Demo 0: Webcam Feed baseline
        demo.setParam('contrast', 100);
        demo.setParam('saturation', 100);
        demo.setParam('filter', 'none');
        break;
      }

      case 1: {
        // Demo 1: Raster Grid & Center Sampling
        // Starts with microscopic cells (cellSize: 4) visually identical to video,
        // then smoothly expands to cellSize: 32 with grid lines gently emerging.
        demo.setParam('showCenterPoints', false);

        // Smooth expansion from 4px to 32px
        const cellSize = Math.round(4 + p * 28);
        demo.setParam('cellSize', cellSize);

        // Grid lines fade in smoothly as cells enlarge past 12px
        const gridAlpha = Math.max(0, Math.min(0.4, (p - 0.25) * 0.55));
        demo.setParam('gridColor', `rgba(0, 0, 0, ${gridAlpha.toFixed(3)})`);
        demo.setParam('showGridLines', gridAlpha > 0.01);
        break;
      }

      case 2: {
        // Demo 2: Circular Dots
        // Enters at cellSize: 32 and dotScale: 1.42 (circles fully tile square cells),
        // with showCellOutline: true (rgba 0.4) matching Demo 1's end state pixel-for-pixel!
        // Then smoothly contracts circles from 1.42 down to 0.85, dissolving outlines.
        demo.setParam('cellSize', 32);

        // Shrink from touching/overlapping squares to distinct circular dots
        const dotScale = 1.42 - p * (1.42 - 0.85);
        demo.setParam('dotScale', Number(dotScale.toFixed(3)));

        // Gently dissolve cell outlines as circles detach from cell borders
        const outlineAlpha = Math.max(0, (1.0 - p * 1.3) * 0.4);
        demo.setParam('outlineColor', `rgba(0, 0, 0, ${outlineAlpha.toFixed(3)})`);
        demo.setParam('showCellOutline', outlineAlpha > 0.01);
        break;
      }

      case 3: {
        // Demo 3: Halftone Luminosity
        // Enters at cellSize: 32 and maxRadiusRatio: 0.85 with luminanceWeight: 0.0
        // (uniform dots, 100% identical to Demo 2's end state).
        demo.setParam('cellSize', 32);
        demo.setParam('maxRadiusRatio', 0.85);

        // First half: smoothly awaken luminosity responsiveness
        const lumWeight = Math.min(1.0, p * 2.0);
        demo.setParam('luminanceWeight', Number(lumWeight.toFixed(3)));
        demo.setParam('contrastBoost', Number((1.0 + p * 0.35).toFixed(2)));

        // Second half: smoothly blend webcam colors into luminous photographic monochrome
        const monoBlend = p > 0.45 ? (p - 0.45) / 0.50 : 0.0;
        demo.setParam('monoBlend', Number(Math.min(1.0, monoBlend).toFixed(3)));
        break;
      }

      case 4: {
        // Demo 4: Duotone Circular Grid
        // Enters at cellSize: 32 and dotScale: 0.85 with duotoneBlend: 0.0
        // (dots drawn in sampled RGB/monochrome, 100% identical to Demo 3's end state).
        demo.setParam('cellSize', 32);
        demo.setParam('dotScale', 0.85);

        // In first 18%, blend from sampled input colors into duotone
        if (p < 0.18) {
          const blend = p / 0.18;
          demo.setParam('duotoneBlend', Number(blend.toFixed(3)));
          demo.setInterpolatedPalette('ecal', 'ecal', 0.0);
        } else {
          demo.setParam('duotoneBlend', 1.0);
          // Continual smooth palette morphing without any snapping
          const t = (p - 0.18) / 0.82; // 0.0 to 1.0
          if (t < 0.33) {
            // ecal -> cyberpunk
            demo.setInterpolatedPalette('ecal', 'cyberpunk', t / 0.33);
          } else if (t < 0.66) {
            // cyberpunk -> amber
            demo.setInterpolatedPalette('cyberpunk', 'amber', (t - 0.33) / 0.33);
          } else {
            // amber -> matrix
            demo.setInterpolatedPalette('amber', 'matrix', (t - 0.66) / 0.34);
          }
        }
        break;
      }

      case 5: {
        // Demo 5: Body Skeleton Tracking
        // Pure red skeleton, pure white junction dots, zero glow
        demo.setParam('glowIntensity', 0);
        demo.setParam('skeletonColor', '#ff0033');
        demo.setParam('jointColor', '#ffffff');
        demo.setParam('videoOpacity', 1.0);
        demo.setParam('lineWidth', 4);
        demo.setParam('jointRadius', 5);

        // Smoothly expand kinematic trail depth
        const trailLen = Math.round(25 + p * 45);
        demo.setParam('trailLength', trailLen);
        break;
      }

      case 6: {
        // Demo 6: Fluid Particles & Body Motion
        // Transform webcam opacity to 0 during particle fluid simulation
        demo.setParam('videoOpacity', 0.0);
        demo.setParam('mouseInteraction', false);
        const vorticity = 0.20 + p * 0.25;
        demo.setParam('vorticity', Number(vorticity.toFixed(2)));
        demo.setParam('forceStrength', 0.90);
        demo.setParam('trailLength', 0.70);

        // Morph smoothly to the fluid velocity glow:
        // First 35%: starts in natural sampled webcam colors
        // 35% - 75%: gracefully morphs into the electric fluid velocity glow (cyan -> violet -> coral)
        // 75% - 100%: full luminous fluid velocity glow responding dynamically to body velocity
        let glow = 0.0;
        if (p < 0.35) {
          glow = 0.0;
        } else if (p < 0.75) {
          glow = (p - 0.35) / 0.40;
        } else {
          glow = 1.0;
        }
        demo.setParam('velocityGlowBlend', Number(glow.toFixed(3)));
        break;
      }

      case 7: {
        // Demo 7: ASCII Matrix & Digital Rain Curtain
        demo.setParam('fontSize', 16);
        demo.setParam('charSet', 'rain');
        demo.setParam('rainEnabled', true);
        demo.setParam('rainSpeed', 0.3);
        demo.setParam('headGlow', false);
        // Continuous butter-smooth color morphing:
        // 0.0 = sampled webcam -> 1.0 = phosphor terminal green -> 2.0 = crisp white
        const colorShift = p * 2.0;
        demo.setParam('colorShift', Number(colorShift.toFixed(3)));
        break;
      }

      case 8: {
        // Demo 8: Slit-Scan Video Time Warp
        // Smoothly deepens delay depth from 25 to 180 frames
        const delayDepth = Math.round(25 + Math.pow(p, 1.25) * 155);
        demo.setParam('maxDelay', delayDepth);
        break;
      }
    }
  }
}
