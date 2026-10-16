import { BaseDemo } from './BaseDemo.js';

/**
 * Demo 0: Regular Camera Feed
 * Starting point: unadulterated live fullscreen video feed.
 * Serves as the ground truth before applying digital transformations.
 */
export class Demo0_WebcamFeed extends BaseDemo {
  constructor() {
    super(
      0,
      'Raw Camera Feed',
      'Original full-resolution camera feed. The human eye perceives continuous motion and depth through millions of RGB photodetectors on the camera sensor.'
    );

    this.params = {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      showCrosshair: false
    };
  }

  render(ctx, camera) {
    const { displayWidth, displayHeight } = camera;

    // Clear background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Apply any filter adjustments
    const filter = `brightness(${this.params.brightness}%) contrast(${this.params.contrast}%) saturate(${this.params.saturation}%)`;
    ctx.filter = filter;

    // Draw the live video feed
    camera.drawVideo(ctx);

    ctx.filter = 'none';

    // Optional pedagogical crosshair at center
    if (this.params.showCrosshair) {
      const cx = displayWidth / 2;
      const cy = displayHeight / 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, displayHeight);
      ctx.moveTo(0, cy);
      ctx.lineTo(displayWidth, cy);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  getControls() {
    return [
      {
        id: 'brightness',
        label: 'Brightness',
        type: 'range',
        min: 50,
        max: 180,
        step: 1,
        unit: '%',
        value: this.params.brightness
      },
      {
        id: 'contrast',
        label: 'Contrast',
        type: 'range',
        min: 50,
        max: 180,
        step: 1,
        unit: '%',
        value: this.params.contrast
      },
      {
        id: 'saturation',
        label: 'Saturation',
        type: 'range',
        min: 0,
        max: 200,
        step: 1,
        unit: '%',
        value: this.params.saturation
      },
      {
        id: 'showCrosshair',
        label: 'Optical Center Crosshair',
        type: 'toggle',
        value: this.params.showCrosshair
      }
    ];
  }
}
