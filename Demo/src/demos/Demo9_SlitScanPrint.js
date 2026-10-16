import { BaseDemo } from './BaseDemo.js';

/**
 * Demo 9: Slit-Scan Print (Classical Photo-Finish Strip Accumulation)
 * The historical photo-finish and slit-scan camera technique.
 * Continuously samples a single narrow vertical column from the camera center and writes it 
 * across the canvas sequentially, freezing motion into a permanent spatial recording.
 */
export class Demo9_SlitScanPrint extends BaseDemo {
  constructor() {
    super(
      9,
      'Slit-Scan Print (Strip)',
      'Classical photo-finish & slit-scan camera: captures a 1-pixel wide vertical central strip of the live camera and paints it horizontally over time. Stillness produces horizontal streaks; motion creates expressive temporal portraits.'
    );

    this.params = {
      scanSpeed: 2,        // Pixels advanced per frame
      slitWidth: 2,        // Width of sampled central strip
      showSlitLine: true   // Visual cue of where the sampling occurs
    };

    this.scanX = 0;
    this.historyCanvas = null;
    this.historyCtx = null;
  }

  setup(camera) {
    super.setup(camera);
    this.initBuffer(camera.displayWidth, camera.displayHeight);
  }

  initBuffer(w, h) {
    this.historyCanvas = document.createElement('canvas');
    this.historyCanvas.width = w;
    this.historyCanvas.height = h;
    this.historyCtx = this.historyCanvas.getContext('2d');
    this.historyCtx.fillStyle = '#09090b';
    this.historyCtx.fillRect(0, 0, w, h);
    this.scanX = 0;
  }

  enter() {
    super.enter();
    if (this.camera && (!this.historyCanvas || this.historyCanvas.width !== this.camera.displayWidth)) {
      this.initBuffer(this.camera.displayWidth, this.camera.displayHeight);
    }
  }

  render(ctx, camera) {
    const { displayWidth, displayHeight } = camera;

    if (!this.historyCanvas || this.historyCanvas.width !== displayWidth || this.historyCanvas.height !== displayHeight) {
      this.initBuffer(displayWidth, displayHeight);
    }

    const speed = Math.max(1, Math.floor(this.params.scanSpeed));
    const slitW = Math.max(1, Math.floor(this.params.slitWidth));
    const { sx, sy, sw, sh } = camera.drawRect;

    // Center pixel column in source video
    const centerSx = sx + (sw / 2) - (slitW / 2);

    // Extract the central vertical slit from camera video into historyCanvas
    this.historyCtx.save();
    this.historyCtx.drawImage(
      camera.video,
      centerSx, sy, slitW, sh,
      this.scanX, 0, speed, displayHeight
    );
    this.historyCtx.restore();

    // Advance scan position
    this.scanX = (this.scanX + speed) % displayWidth;

    // Draw the accumulated time-displacement image onto main canvas
    ctx.drawImage(this.historyCanvas, 0, 0);

    // Glowing scanline indicating where the live slit is being written
    if (this.params.showSlitLine) {
      ctx.save();
      ctx.strokeStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.scanX + 0.5, 0);
      ctx.lineTo(this.scanX + 0.5, displayHeight);
      ctx.stroke();
      ctx.restore();
    }
  }

  getControls() {
    return [
      {
        id: 'scanSpeed',
        label: 'Scan Velocity',
        type: 'range',
        min: 1,
        max: 8,
        step: 1,
        unit: 'px',
        value: this.params.scanSpeed
      },
      {
        id: 'showSlitLine',
        label: 'Show Active Temporal Needle',
        type: 'toggle',
        value: this.params.showSlitLine
      }
    ];
  }
}
