import { BaseDemo } from './BaseDemo.js';

/**
 * Demo 4: Duotone Circular Grid
 * Replaces original webcam chromaticity on the circular grid with two arbitrary palette values.
 * Demonstrates that luminance alone carries spatial frequency, edge definition, and human recognition.
 */
export class Demo4_Duotone extends BaseDemo {
  constructor() {
    super(
      4,
      'Duotone Luminance Mapping',
      'Proof of luminance dominance on the circular grid: original webcam hues are discarded and mapped along a two-color gradient based purely on luminance. Shape and recognition remain intact because contrast defines human visual perception.'
    );

    this.presets = {
      ecal: { name: 'ECAL Red / Noir', dark: '#08080a', light: '#ff0033' },
      cyberpunk: { name: 'Cyberpunk Neon', dark: '#1e082c', light: '#00f2fe' },
      amber: { name: 'Midnight & Amber', dark: '#0a1128', light: '#fca311' },
      matrix: { name: 'Phosphor Green', dark: '#001408', light: '#00ff66' },
      mono: { name: 'Black & White', dark: '#000000', light: '#ffffff' }
    };

    this.params = {
      preset: 'ecal',
      colorDark: '#08080a',
      colorLight: '#ff0033',
      cellSize: 32,             // Grid resolution matching Demo 2 & Demo 3
      dotScale: 0.95,           // Dot radius factor
      contrast: 1.2,
      threshold: 0.5,           // Midpoint shift
      duotoneBlend: 1.0         // 0.0 = original webcam colors, 1.0 = full duotone
    };

    this.rgbDark = this.hexToRgb(this.params.colorDark);
    this.rgbLight = this.hexToRgb(this.params.colorLight);

    // Lookup table (LUT) for 256 luminance levels
    this.lutR = new Uint8Array(256);
    this.lutG = new Uint8Array(256);
    this.lutB = new Uint8Array(256);
    this.recomputeLUT();
  }

  hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  }

  recomputeLUT() {
    const d = this.rgbDark;
    const l = this.rgbLight;
    const gamma = this.params.contrast;
    const mid = this.params.threshold;

    for (let i = 0; i < 256; i++) {
      let t = i / 255;
      // Sigmoid/contrast curve centered on midpoint
      t = Math.pow(t, gamma);
      if (mid !== 0.5) {
        t = t < mid ? (t / mid) * 0.5 : 0.5 + ((t - mid) / (1 - mid)) * 0.5;
      }
      t = Math.max(0, Math.min(1, t));

      this.lutR[i] = Math.round(d.r + (l.r - d.r) * t);
      this.lutG[i] = Math.round(d.g + (l.g - d.g) * t);
      this.lutB[i] = Math.round(d.b + (l.b - d.b) * t);
    }
  }

  setParam(key, value) {
    super.setParam(key, value);

    if (key === 'preset' && this.presets[value]) {
      this.params.colorDark = this.presets[value].dark;
      this.params.colorLight = this.presets[value].light;
      this.rgbDark = this.hexToRgb(this.params.colorDark);
      this.rgbLight = this.hexToRgb(this.params.colorLight);
    } else if (key === 'colorDark') {
      this.rgbDark = this.hexToRgb(value);
    } else if (key === 'colorLight') {
      this.rgbLight = this.hexToRgb(value);
    }

    this.recomputeLUT();
  }

  /**
   * Smoothly interpolates between two palette presets with factor [0..1]
   */
  setInterpolatedPalette(pAKey, pBKey, factor) {
    const pA = this.presets[pAKey] || this.presets.ecal;
    const pB = this.presets[pBKey] || this.presets.ecal;
    const rgbDarkA = this.hexToRgb(pA.dark);
    const rgbDarkB = this.hexToRgb(pB.dark);
    const rgbLightA = this.hexToRgb(pA.light);
    const rgbLightB = this.hexToRgb(pB.light);

    const f = Math.max(0, Math.min(1, factor));
    this.rgbDark = {
      r: Math.round(rgbDarkA.r + (rgbDarkB.r - rgbDarkA.r) * f),
      g: Math.round(rgbDarkA.g + (rgbDarkB.g - rgbDarkA.g) * f),
      b: Math.round(rgbDarkA.b + (rgbDarkB.b - rgbDarkA.b) * f)
    };
    this.rgbLight = {
      r: Math.round(rgbLightA.r + (rgbLightB.r - rgbLightA.r) * f),
      g: Math.round(rgbLightA.g + (rgbLightB.g - rgbLightA.g) * f),
      b: Math.round(rgbLightA.b + (rgbLightB.b - rgbLightA.b) * f)
    };
    this.params.colorDark = `rgb(${this.rgbDark.r},${this.rgbDark.g},${this.rgbDark.b})`;
    this.params.colorLight = `rgb(${this.rgbLight.r},${this.rgbLight.g},${this.rgbLight.b})`;
    this.recomputeLUT();
  }

  /**
   * Pure circular grid duotone rendering
   */
  render(ctx, camera) {
    const { displayWidth, displayHeight } = camera;
    const cellSize = Math.max(6, Math.floor(this.params.cellSize));
    const cols = Math.ceil(displayWidth / cellSize);
    const rows = Math.ceil(displayHeight / cellSize);

    const imgData = camera.getSampledImageData(cols, rows);
    if (!imgData) return;

    const data = imgData.data;
    const maxRadius = (cellSize / 2) * (this.params.dotScale || 0.95);
    const blend = this.params.duotoneBlend !== undefined ? Math.max(0, Math.min(1, this.params.duotoneBlend)) : 1.0;

    // Fill background with smooth blend from previous demo bgColor (#09090b) into duotone dark
    if (blend < 0.999) {
      const bgR = Math.round(9 + (this.rgbDark.r - 9) * blend);
      const bgG = Math.round(9 + (this.rgbDark.g - 9) * blend);
      const bgB = Math.round(11 + (this.rgbDark.b - 11) * blend);
      ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
    } else {
      ctx.fillStyle = this.params.colorDark;
    }
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    for (let r = 0; r < rows; r++) {
      const cy = r * cellSize + cellSize / 2;
      for (let c = 0; c < cols; c++) {
        const cx = c * cellSize + cellSize / 2;
        const index = (r * cols + c) * 4;

        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const lum = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);

        const radius = Math.max(1, (lum / 255) * maxRadius);

        if (blend < 0.999) {
          const targetR = this.lutR[lum];
          const targetG = this.lutG[lum];
          const targetB = this.lutB[lum];
          const finalR = Math.round(red + (targetR - red) * blend);
          const finalG = Math.round(green + (targetG - green) * blend);
          const finalB = Math.round(blue + (targetB - blue) * blend);
          ctx.fillStyle = `rgb(${finalR},${finalG},${finalB})`;
        } else {
          ctx.fillStyle = `rgb(${this.lutR[lum]},${this.lutG[lum]},${this.lutB[lum]})`;
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
        id: 'preset',
        label: 'Palette Preset',
        type: 'select',
        options: Object.entries(this.presets).map(([k, v]) => ({ value: k, label: v.name })),
        value: this.params.preset
      },
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
        id: 'dotScale',
        label: 'Max Dot Scale',
        type: 'range',
        min: 0.4,
        max: 1.4,
        step: 0.05,
        value: this.params.dotScale
      },
      {
        id: 'contrast',
        label: 'Contrast Exponent',
        type: 'range',
        min: 0.5,
        max: 2.5,
        step: 0.1,
        unit: 'x',
        value: this.params.contrast
      }
    ];
  }
}
