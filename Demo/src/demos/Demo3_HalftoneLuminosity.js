import { BaseDemo } from './BaseDemo.js';

/**
 * Demo 3: Halftone Luminosity (Dynamic Radius)
 * Modulates the radius of each circular dot based directly on the luminosity of the sampled pixel.
 * Seamlessly connects from Demo 2's uniform circular grid to a density-driven halftone field,
 * with smooth color blend transitions.
 */
export class Demo3_HalftoneLuminosity extends BaseDemo {
  constructor() {
    super(
      3,
      'Halftone Luminosity',
      'The halftone principle: dot radius is directly proportional to sampled luminance. Human visual perception translates dot size density into continuous shades of tonal value.'
    );

    this.params = {
      cellSize: 32,               // Grid density matching Demo 1, Demo 2, Demo 4
      maxRadiusRatio: 0.85,       // Max radius relative to cell half-size
      luminanceWeight: 1.0,       // 0.0 = uniform dots (Demo 2), 1.0 = fully modulated halftone
      invertLuminosity: false,    // Invert: dark areas = bigger dots (print style)
      monochrome: false,          // Toggle between webcam colors vs pure monochrome
      monoBlend: 0.0,             // 0.0 = full webcam RGB colors, 1.0 = pure monochrome white
      contrastBoost: 1.2,         // Gamma exponent
      bgColor: '#09090b',
      dotColorMono: '#ffffff'
    };
  }

  render(ctx, camera) {
    const { displayWidth, displayHeight } = camera;

    const cellSize = Math.max(6, Math.floor(this.params.cellSize));
    const cols = Math.ceil(displayWidth / cellSize);
    const rows = Math.ceil(displayHeight / cellSize);

    const imgData = camera.getSampledImageData(cols, rows);
    if (!imgData) return;

    const data = imgData.data;
    const maxRadius = (cellSize / 2) * this.params.maxRadiusRatio;
    const gamma = this.params.contrastBoost;
    const invert = this.params.invertLuminosity;
    const mono = this.params.monochrome ? 1.0 : Math.max(0, Math.min(1, this.params.monoBlend || 0.0));
    const weight = this.params.luminanceWeight !== undefined ? this.params.luminanceWeight : 1.0;

    // Fill background
    ctx.fillStyle = this.params.bgColor;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    for (let r = 0; r < rows; r++) {
      const cy = r * cellSize + cellSize / 2;
      for (let c = 0; c < cols; c++) {
        const cx = c * cellSize + cellSize / 2;
        const index = (r * cols + c) * 4;

        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        // Perceived luminosity (Rec. 601)
        const lum = BaseDemo.getLuminosity(red, green, blue) / 255;

        // Apply contrast gamma curve
        let factor = Math.pow(lum, gamma);
        if (invert) {
          factor = 1.0 - factor;
        }

        // Blend between uniform dot size (weight = 0) and dynamic halftone (weight = 1)
        const effectiveFactor = (1.0 - weight) + factor * weight;
        const radius = Math.max(0.5, effectiveFactor * maxRadius);

        // Smooth color transition from webcam RGB to monochrome
        if (mono > 0.001) {
          const finalR = Math.round(red + (255 - red) * mono);
          const finalG = Math.round(green + (255 - green) * mono);
          const finalB = Math.round(blue + (255 - blue) * mono);
          ctx.fillStyle = `rgb(${finalR},${finalG},${finalB})`;
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
        min: 8,
        max: 80,
        step: 2,
        unit: 'px',
        value: this.params.cellSize
      },
      {
        id: 'maxRadiusRatio',
        label: 'Max Dot Scale',
        type: 'range',
        min: 0.5,
        max: 1.5,
        step: 0.05,
        unit: 'x',
        value: this.params.maxRadiusRatio
      },
      {
        id: 'contrastBoost',
        label: 'Contrast / Gamma',
        type: 'range',
        min: 0.5,
        max: 2.5,
        step: 0.1,
        value: this.params.contrastBoost
      },
      {
        id: 'monochrome',
        label: 'Monochrome Print',
        type: 'toggle',
        value: this.params.monochrome
      }
    ];
  }
}
