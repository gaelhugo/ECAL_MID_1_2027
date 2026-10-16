import { BaseDemo } from './BaseDemo.js';

/**
 * Demo 9: Harmonic Wave & Halftone Distortion
 * Combines center-pixel halftone sampling with mathematical harmonic wave fields.
 * Each dot coordinate oscillates according to frequency interference patterns and sampled luminance.
 */
export class Demo9_AudioVisual extends BaseDemo {
  constructor() {
    super(
      9,
      'Harmonic Wave Halftone',
      'Harmonic synthesis: combines center-pixel halftone dot radii with continuous spatial wave displacement fields, turning the video feed into an undulating topographic mesh.'
    );

    this.params = {
      cellSize: 24,
      waveSpeed: 2.0,
      waveFrequency: 0.025,
      displacement: 18,
      colorCycle: true,
      contrast: 1.2
    };

    this.time = 0;
  }

  update(deltaTime) {
    this.time += deltaTime * this.params.waveSpeed;
  }

  render(ctx, camera) {
    const { displayWidth, displayHeight } = camera;

    const cellSize = Math.max(8, Math.floor(this.params.cellSize));
    const cols = Math.ceil(displayWidth / cellSize);
    const rows = Math.ceil(displayHeight / cellSize);

    const imgData = camera.getSampledImageData(cols, rows);
    if (!imgData) return;

    const data = imgData.data;
    const maxRadius = (cellSize / 2) * 0.9;
    const freq = this.params.waveFrequency;
    const disp = this.params.displacement;
    const t = this.time;

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const baseX = c * cellSize + cellSize / 2;
        const baseY = r * cellSize + cellSize / 2;
        const index = (r * cols + c) * 4;

        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        const lum = BaseDemo.getLuminosity(red, green, blue) / 255;

        // Harmonic wave displacement
        const wave = Math.sin(baseX * freq + t) + Math.cos(baseY * freq + t * 0.8);
        const offsetX = Math.cos(baseY * freq + t) * disp * (1 - lum);
        const offsetY = wave * disp * lum;

        const cx = baseX + offsetX;
        const cy = baseY + offsetY;
        const radius = Math.max(1, lum * maxRadius * (1 + 0.3 * Math.sin(t * 2 + baseX * 0.01)));

        if (this.params.colorCycle) {
          // Dynamic chromatic aberration / hue shift
          const hue = (lum * 260 + t * 40) % 360;
          ctx.fillStyle = `hsl(${hue}, 85%, ${Math.round(20 + lum * 65)}%)`;
        } else {
          ctx.fillStyle = `rgb(${red},${green},${blue})`;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  getControls() {
    return [
      {
        id: 'cellSize',
        label: 'Grid Spacing',
        type: 'range',
        min: 10,
        max: 50,
        step: 2,
        unit: 'px',
        value: this.params.cellSize
      },
      {
        id: 'displacement',
        label: 'Wave Displacement',
        type: 'range',
        min: 0,
        max: 40,
        step: 2,
        unit: 'px',
        value: this.params.displacement
      },
      {
        id: 'waveSpeed',
        label: 'Oscillation Speed',
        type: 'range',
        min: 0.2,
        max: 5.0,
        step: 0.2,
        unit: 'x',
        value: this.params.waveSpeed
      },
      {
        id: 'colorCycle',
        label: 'Chromatic Spectral Shift',
        type: 'toggle',
        value: this.params.colorCycle
      }
    ];
  }
}
