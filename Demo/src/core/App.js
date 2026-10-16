import { CameraManager } from './CameraManager.js';
import { DemoManager } from './DemoManager.js';
import { ShowcaseController } from './ShowcaseController.js';
import { PoseDetector } from '../vision/PoseDetector.js';
import { HUD } from '../ui/HUD.js';

// Demos
import { Demo0_WebcamFeed } from '../demos/Demo0_WebcamFeed.js';
import { Demo1_RasterGrid } from '../demos/Demo1_RasterGrid.js';
import { Demo2_CircularDots } from '../demos/Demo2_CircularDots.js';
import { Demo3_HalftoneLuminosity } from '../demos/Demo3_HalftoneLuminosity.js';
import { Demo4_Duotone } from '../demos/Demo4_Duotone.js';
import { Demo5_BodySkeleton } from '../demos/Demo5_BodySkeleton.js';
import { Demo6_FluidParticles } from '../demos/Demo6_FluidParticles.js';
import { Demo7_AsciiMatrix } from '../demos/Demo7_AsciiMatrix.js';
import { Demo8_SlitScanVideo } from '../demos/Demo8_SlitScanVideo.js';

/**
 * App
 * Primary application controller coordinating webcam feed, vision pipeline,
 * showcase tour coordinator, animation loop, and keyboard navigation.
 */
export class App {
  constructor() {
    this.canvas = document.getElementById('render-canvas');
    this.video = document.getElementById('webcam-video');
    this.processingCanvas = document.getElementById('processing-canvas');
    this.startScreen = document.getElementById('start-screen');
    this.btnStart = document.getElementById('btn-start-camera');

    this.camera = new CameraManager(this.video, this.canvas, this.processingCanvas);
    this.poseDetector = new PoseDetector();

    // Instantiate demo suite
    this.demos = [
      new Demo0_WebcamFeed(),
      new Demo1_RasterGrid(),
      new Demo2_CircularDots(),
      new Demo3_HalftoneLuminosity(),
      new Demo4_Duotone(),
      new Demo5_BodySkeleton(this.poseDetector),
      new Demo6_FluidParticles(this.poseDetector),
      new Demo7_AsciiMatrix(),
      new Demo8_SlitScanVideo()
    ];

    this.demoManager = new DemoManager(this.demos, this.camera);
    this.hud = new HUD(this.demoManager, this.camera, this.poseDetector);
    this.showcase = new ShowcaseController(this.demoManager, this.hud);
    this.hud.setShowcase(this.showcase);

    this.isRunning = false;
    this.lastFrameTime = performance.now();

    this.bindKeyboardShortcuts();
    this.bindStartButton();
  }

  bindStartButton() {
    this.btnStart?.addEventListener('click', async () => {
      this.btnStart.disabled = true;
      this.btnStart.textContent = 'Initializing Camera...';

      try {
        await this.camera.init();
        this.startScreen.classList.remove('active');

        // Initialize first demo (Demo 0)
        this.demoManager.switchTo(0);

        // Start animation loop immediately
        this.startLoop();

        // Non-blocking background load for MediaPipe
        this.poseDetector.init().catch((err) => {
          console.warn('PoseDetector background init notice:', err);
        });
      } catch (err) {
        alert('Could not access webcam: ' + (err.message || err.name) + '\nPlease check camera permissions.');
        this.btnStart.disabled = false;
        this.btnStart.textContent = 'Retry Camera Access';
      }
    });
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const key = e.key;

      // Escape closes open parameters drawer, or toggles UI
      if (key === 'Escape') {
        e.preventDefault();
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }
        if (this.hud.controlsDrawer && !this.hud.controlsDrawer.classList.contains('collapsed')) {
          this.hud.controlsDrawer.classList.add('collapsed');
          return;
        }
        this.hud.toggleVisibility();
        return;
      }

      // Ignore other keys if user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      // 0-8 Direct demo switching
      if (/^[0-8]$/.test(key)) {
        const demoIdx = parseInt(key, 10);
        this.demoManager.switchTo(demoIdx);
        return;
      }

      // Prev / Next navigation
      if (key === 'ArrowLeft' || key === 'ArrowUp') {
        e.preventDefault();
        this.demoManager.prev();
      } else if (key === 'ArrowRight' || key === 'ArrowDown') {
        e.preventDefault();
        this.demoManager.next();
      } else if (key === 'p' || key === 'P' || key === ' ') {
        // Toggle Auto Showcase Tour
        e.preventDefault();
        this.showcase.toggle();
      } else if (key === 'm' || key === 'M') {
        // Toggle Mirror
        const isMirrored = this.camera.toggleMirror();
        const btnMirror = document.getElementById('btn-toggle-mirror');
        btnMirror?.classList.toggle('active', isMirrored);
        this.hud.toast.show(isMirrored ? 'Camera Mirrored' : 'Camera Normal');
      } else if (key === 'h' || key === 'H') {
        // Toggle HUD Visibility
        this.hud.toggleVisibility();
      } else if (key === 'f' || key === 'F') {
        // Fullscreen
        this.hud.toggleFullscreen();
      }
    });
  }

  startLoop() {
    this.isRunning = true;
    this.lastFrameTime = performance.now();

    const loop = (currentTime) => {
      if (!this.isRunning) return;

      const deltaTime = Math.min(0.1, (currentTime - this.lastFrameTime) / 1000);
      this.lastFrameTime = currentTime;

      // 1. Update MediaPipe pose tracking if active (either current demo or transitioning)
      const curIdx = this.demoManager.currentIndex;
      const transIdx = this.demoManager.toIndex;
      const needsPose = (curIdx === 5 || curIdx === 6 || (this.demoManager.isTransitioning && (transIdx === 5 || transIdx === 6)));
      if (this.camera.isReady && needsPose) {
        this.poseDetector.update(this.camera.video, this.camera);
      }

      // 2. Update automated showcase progression & parameter choreography
      this.showcase.update(deltaTime);

      // 3. Update active demo simulation (handles both demos during crossfade)
      this.demoManager.update(deltaTime);

      // 4. Render active demo to canvas (handles smooth crossfade blending)
      this.demoManager.render(this.camera.ctx);

      // 5. Update metrics (FPS)
      const fps = this.camera.updateFPS();
      this.hud.updateMetrics(fps);

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}
