import { BaseDemo } from './BaseDemo.js';

/**
 * Demo 8: Slit-Scan Live Video (Top-to-Bottom Temporal Delay)
 * A continuous live video transformation where each horizontal row has a progressive time delay.
 * Unlike the slit-scan print (which accumulates a static strip over space), this remains a 
 * 100% LIVE, continuous motion mirror where the top represents the present and lower rows 
 * lag behind in the past, creating surreal rubbery, elastic distortions when moving.
 */
export class Demo8_SlitScanVideo extends BaseDemo {
  constructor() {
    super(
      8,
      'Slit-Scan Live Video',
      'Continuous spatiotemporal gradient: unlike a static slit-scan print, this is a live moving video where time is mapped vertically. The top row is live (t = 0), while lower rows display progressively older frames from memory, bending reality as you move.'
    );

    // Buffer capacity for deep time delay: 600 frames (~10s at 60 FPS in 1x, or up to 60s with time scaling)
    this.maxBufferSize = 600;
    this.bufferW = 640;
    this.bufferH = 360;

    this.frameBuffers = [];
    this.bufferCtxs = [];
    this.head = 0;
    this.tickCount = 0;
    this.waveTime = 0;

    this.params = {
      maxDelay: 240,             // Frames of delay between top and bottom (e.g. 240 = 4s at 60fps)
      stride: 1,                 // Time scale multiplier: 1x (10s), 2x (20s), 3x (30s), 6x (60s)
      sliceCount: 80,            // Number of horizontal temporal bands (smoothness)
      direction: 'top-to-bottom',// 'top-to-bottom' | 'bottom-to-top' | 'center-out' | 'sine-wave'
      waveSpeed: 2.0,            // Speed for sine-wave delay mode
      showTimelineGuide: false,  // Visual overlay indicating time offset in seconds (off by default)
      frozen: false              // Pause frame recording to inspect temporal sculpture
    };

    this.initRingBuffer();
  }

  /**
   * Pre-allocates fixed ring buffer of offscreen canvases to avoid runtime garbage collection
   */
  initRingBuffer() {
    this.frameBuffers = [];
    this.bufferCtxs = [];

    for (let i = 0; i < this.maxBufferSize; i++) {
      const cvs = document.createElement('canvas');
      cvs.width = this.bufferW;
      cvs.height = this.bufferH;
      const ctx = cvs.getContext('2d', { alpha: false, willReadFrequently: false });
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, this.bufferW, this.bufferH);

      this.frameBuffers.push(cvs);
      this.bufferCtxs.push(ctx);
    }

    this.head = 0;
    this.tickCount = 0;
  }

  setup(camera) {
    super.setup(camera);
  }

  enter() {
    super.enter();
    // Pre-fill buffer with current video image if available
    if (this.camera && this.camera.isReady) {
      for (let i = 0; i < this.maxBufferSize; i++) {
        this.recordFrame(this.camera);
      }
    }
  }

  /**
   * Records the latest camera frame into the ring buffer
   */
  recordFrame(camera) {
    if (!camera.isReady) return;

    this.head = (this.head + 1) % this.maxBufferSize;
    const ctx = this.bufferCtxs[this.head];
    const { sx, sy, sw, sh } = camera.drawRect;

    ctx.save();
    if (camera.isMirrored) {
      ctx.translate(this.bufferW, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(camera.video, sx, sy, sw, sh, 0, 0, this.bufferW, this.bufferH);
    ctx.restore();
  }

  update(deltaTime) {
    if (!this.isActive || !this.camera) return;

    this.waveTime += deltaTime * this.params.waveSpeed;

    // Record new frame into ring buffer according to time stride
    if (!this.params.frozen) {
      this.tickCount++;
      const stride = Math.max(1, Math.floor(this.params.stride));
      if (this.tickCount % stride === 0) {
        this.recordFrame(this.camera);
      }
    }
  }

  render(ctx, camera) {
    const { displayWidth, displayHeight } = camera;

    const sliceCount = Math.max(8, Math.min(180, Math.floor(this.params.sliceCount)));
    const maxDelay = Math.max(1, Math.min(this.maxBufferSize - 1, Math.floor(this.params.maxDelay)));
    const dir = this.params.direction;
    const sliceH = displayHeight / sliceCount;
    const srcSliceH = this.bufferH / sliceCount;

    // Clear background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Render horizontal slices, each from a progressively delayed frame
    for (let i = 0; i < sliceCount; i++) {
      const normY = i / (sliceCount - 1); // 0.0 at top, 1.0 at bottom

      // Compute temporal delay ratio [0..1] based on selected geometry
      let delayRatio = normY;
      if (dir === 'top-to-bottom') {
        delayRatio = normY;
      } else if (dir === 'bottom-to-top') {
        delayRatio = 1.0 - normY;
      } else if (dir === 'center-out') {
        delayRatio = Math.abs(normY - 0.5) * 2.0;
      } else if (dir === 'sine-wave') {
        delayRatio = 0.5 + 0.5 * Math.sin(normY * Math.PI * 4 + this.waveTime);
      }

      // Compute frame index in circular buffer
      const frameLag = Math.round(delayRatio * maxDelay);
      const bufIdx = (this.head - frameLag + this.maxBufferSize) % this.maxBufferSize;
      const srcCanvas = this.frameBuffers[bufIdx];

      const sy = i * srcSliceH;
      const dy = i * sliceH;
      // Slight overlap to eliminate sub-pixel seam rendering artifacts
      const dh = sliceH + 0.6;
      const dw = Math.ceil(displayWidth) + 1;

      ctx.drawImage(
        srcCanvas,
        0, sy, this.bufferW, srcSliceH,
        0, dy, dw, dh
      );
    }

    // Optional visual temporal indicator overlay
    if (this.params.showTimelineGuide) {
      this.renderTimelineIndicator(ctx, displayWidth, displayHeight, maxDelay);
    }
  }

  /**
   * Visual indicator showing current time lag along the screen edge
   */
  renderTimelineIndicator(ctx, w, h, maxDelay) {
    const fps = this.camera ? this.camera.fps || 60 : 60;
    const stride = Math.max(1, Math.floor(this.params.stride));
    const effectiveLagFrames = maxDelay * stride;
    const maxSeconds = (effectiveLagFrames / fps).toFixed(1);

    ctx.save();
    // Subtle gradient sidebar
    const grad = ctx.createLinearGradient(w - 70, 0, w - 70, h);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
    grad.addColorStop(1, 'rgba(236, 72, 153, 0.4)');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w - 24, 40);
    ctx.lineTo(w - 24, h - 40);
    ctx.stroke();

    ctx.font = '10px "JetBrains Mono"';
    ctx.textAlign = 'right';

    // Top indicator
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('0.0s (LIVE)', w - 34, 44);

    // Mid indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`-${(maxSeconds / 2).toFixed(1)}s`, w - 34, h / 2);

    // Bottom indicator
    ctx.fillStyle = '#ec4899';
    ctx.fillText(`-${maxSeconds}s DELAY`, w - 34, h - 36);

    ctx.restore();
  }

  getControls() {
    return [
      {
        id: 'maxDelay',
        label: 'Delay Depth',
        type: 'range',
        min: 10,
        max: 600,
        step: 10,
        value: this.params.maxDelay,
        formatter: (val) => {
          const fps = this.camera && this.camera.fps ? this.camera.fps : 60;
          const stride = Math.max(1, Math.floor(this.params.stride));
          const sec = ((val * stride) / fps).toFixed(1);
          return `${val} frames (~${sec}s)`;
        }
      },
      {
        id: 'stride',
        label: 'Time Scale Multiplier',
        type: 'select',
        options: [
          { value: 1, label: '1x Realtime (up to 10s delay)' },
          { value: 2, label: '2x Extended (up to 20s delay)' },
          { value: 3, label: '3x Deep Time (up to 30s delay)' },
          { value: 6, label: '6x Geological (up to 60s / 1 min delay)' }
        ],
        value: this.params.stride
      },
      {
        id: 'sliceCount',
        label: 'Time Slices / Bands',
        type: 'range',
        min: 12,
        max: 140,
        step: 4,
        unit: ' bands',
        value: this.params.sliceCount
      },
      {
        id: 'direction',
        label: 'Delay Direction',
        type: 'select',
        options: [
          { value: 'top-to-bottom', label: 'Top (Live) → Bottom (Delayed)' },
          { value: 'bottom-to-top', label: 'Bottom (Live) → Top (Delayed)' },
          { value: 'center-out', label: 'Center (Live) → Edges (Delayed)' },
          { value: 'sine-wave', label: 'Continuous Harmonic Sine Wave' }
        ],
        value: this.params.direction
      },
      {
        id: 'showTimelineGuide',
        label: 'Show Time Offset Gauge',
        type: 'toggle',
        value: this.params.showTimelineGuide
      },
      {
        id: 'frozen',
        label: 'Freeze Time Buffer',
        type: 'toggle',
        value: this.params.frozen
      }
    ];
  }
}
