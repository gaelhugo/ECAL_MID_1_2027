import { BaseDemo } from './BaseDemo.js';

/**
 * Demo 7: ASCII Matrix & Digital Rain Curtain
 * Real ASCII art where tonal density is created 100% by the optical weight of strict ASCII glyphs.
 * Features a cascading digital rain curtain inspired by the Matrix aesthetic,
 * but realized strictly with standard US-ASCII characters in solid, opaque colors (ZERO transparency).
 * Columns of letters tumble downwards in liquid currents, revealing the human form through webcam luminance.
 */
export class Demo7_AsciiMatrix extends BaseDemo {
  constructor() {
    super(
      7,
      'ASCII Matrix & Digital Rain',
      'Real ASCII digital rain: columns of strict ASCII characters stream downwards in liquid currents. Tonal shading is produced entirely by typographic character density with 100% solid, crisp glyphs (no fake transparency).'
    );

    // Strict US-ASCII density tiers for streaming rain (Tier 0: space -> Tier 6: maximum density)
    this.densityTiers = [
      [' '],
      ['.', '`', '\'', ','],
      [':', '-', '~', '^', ';', 'i', '!', 'l'],
      ['+', '=', 'x', 'z', 'v', 'u', 'n', 'r'],
      ['*', 'o', 'a', 'h', 'k', 'p', 'd', 'q'],
      ['#', '&', '8', 'X', 'K', 'O', '0', 'Q'],
      ['@', '%', 'W', 'M', 'B', '$']
    ];

    // Selectable strict ASCII sets
    this.charSets = {
      rain: 'matrix_stream',    // Dynamic streaming density tiers
      standard: ' .:-=+*#%@',  // Classic 10-level linear ASCII density ramp
      dense: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$', // 70-level ramp
      code: ' /\\|(){}[]<>=+-*~:;!?01',
      binary: ' 01'
    };

    this.params = {
      fontSize: 16,
      charSet: 'rain',         // 'rain' | 'standard' | 'dense' | 'code' | 'binary'
      colorMode: 'green',      // 'green' | 'webcam' | 'white'
      colorShift: 1.0,         // Continuous color blend: 0.0 = webcam, 1.0 = phosphor green, 2.0 = crisp white
      rainEnabled: true,       // Cascading ASCII rain curtain stream
      rainSpeed: 0.3,          // Speed multiplier for falling drops (default 0.3)
      headGlow: false,         // White flash at the leading head of each rain stream (default false)
      invert: false,
      contrast: 1.3
    };

    this.columns = [];         // Column rain stream trackers
    this.gridCols = 0;
    this.gridRows = 0;
    this.lastTime = performance.now();
  }

  /**
   * Initializes rain streams for each column
   */
  initRain(cols, rows) {
    this.gridCols = cols;
    this.gridRows = rows;
    this.columns = new Array(cols);

    for (let c = 0; c < cols; c++) {
      this.columns[c] = {
        y1: -Math.random() * rows,
        speed1: 0.35 + Math.random() * 0.75, // rows per frame (at 60fps ~ 20-65 rows/sec)
        len1: Math.floor(10 + Math.random() * 22),
        y2: -Math.random() * rows - rows * 0.5,
        speed2: 0.30 + Math.random() * 0.65,
        len2: Math.floor(8 + Math.random() * 18)
      };
    }
  }

  /**
   * Advances falling column streams
   */
  update(deltaTime) {
    if (!this.params.rainEnabled || !this.columns || this.columns.length === 0) return;

    const cols = this.gridCols;
    const rows = this.gridRows;

    const dt = Math.min(0.08, deltaTime || 0.016);
    const dt60 = dt * 60 * (this.params.rainSpeed || 1.0);

    for (let c = 0; c < cols; c++) {
      const col = this.columns[c];
      if (!col) continue;

      // Advance Drop 1
      col.y1 += col.speed1 * dt60;
      if (col.y1 - col.len1 > rows) {
        col.y1 = -Math.random() * 12;
        col.speed1 = 0.35 + Math.random() * 0.75;
        col.len1 = Math.floor(10 + Math.random() * 22);
      }

      // Advance Drop 2
      col.y2 += col.speed2 * dt60;
      if (col.y2 - col.len2 > rows) {
        col.y2 = -Math.random() * 12;
        col.speed2 = 0.30 + Math.random() * 0.65;
        col.len2 = Math.floor(8 + Math.random() * 18);
      }
    }
  }

  render(ctx, camera) {
    const { displayWidth, displayHeight } = camera;

    const fontSize = Math.max(8, Math.floor(this.params.fontSize));
    const stepX = fontSize * 0.6;
    const stepY = fontSize;

    const cols = Math.ceil(displayWidth / stepX);
    const rows = Math.ceil(displayHeight / stepY);

    // Re-initialize columns if grid dimensions or font size changed
    if (!this.columns || this.gridCols !== cols || this.gridRows !== rows) {
      this.initRain(cols, rows);
    }

    // Ensure physics update runs in render loop
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0 && dt < 0.2) {
      this.update(dt);
    }

    const imgData = camera.getSampledImageData(cols, rows);
    if (!imgData) return;

    const data = imgData.data;
    const invert = this.params.invert;
    const gamma = this.params.contrast;
    const mode = this.params.colorMode;
    const isRain = this.params.rainEnabled;
    const headGlow = this.params.headGlow;
    const charSetKey = this.params.charSet;

    // Solid obsidian dark backdrop
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
    ctx.textBaseline = 'top';

    // Compute continuous color shift factor:
    // 0.0 = sampled webcam -> 1.0 = phosphor terminal green -> 2.0 = crisp white
    let shift = this.params.colorShift !== undefined ? this.params.colorShift : null;
    if (shift === null || isNaN(shift)) {
      shift = mode === 'green' ? 1.0 : mode === 'white' ? 2.0 : 0.0;
    }
    shift = Math.max(0, Math.min(2, shift));

    for (let c = 0; c < cols; c++) {
      const x = c * stepX;
      const col = this.columns ? this.columns[c] : null;

      for (let r = 0; r < rows; r++) {
        const y = r * stepY;
        const index = (r * cols + c) * 4;

        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        let lum = BaseDemo.getLuminosity(red, green, blue) / 255;
        lum = Math.pow(lum, gamma);
        if (invert) lum = 1.0 - lum;

        let trailFactor = 0.0;
        let isHead = false;

        if (isRain && col) {
          const d1 = col.y1 - r;
          if (d1 >= 0 && d1 < col.len1) {
            const t1 = 1.0 - (d1 / col.len1);
            if (t1 > trailFactor) trailFactor = t1;
            if (d1 < 1.15) isHead = true;
          }

          const d2 = col.y2 - r;
          if (d2 >= 0 && d2 < col.len2) {
            const t2 = 1.0 - (d2 / col.len2);
            if (t2 > trailFactor) trailFactor = t2;
            if (d2 < 1.15) isHead = true;
          }
        }

        // Real ASCII art: character presence & density determined by webcam luminance + falling raindrops
        let val;
        if (isRain) {
          if (lum > 0.05) {
            // Over the person: the falling raindrops energize the cell to higher ASCII density
            val = Math.min(1.0, lum + trailFactor * 0.35);
          } else {
            // Ambient dark background: falling raindrops trickle down as light ASCII glyphs
            val = trailFactor * 0.40;
          }
          if (isHead && headGlow) {
            val = Math.min(1.0, Math.max(val, 0.70));
          }
        } else {
          val = lum;
        }

        // Empty space: do not draw anything (preserves clean black background)
        if (val < 0.05) continue;

        // Select strict ASCII character based purely on density:
        let ch;
        if (charSetKey === 'rain' || !this.charSets[charSetKey]) {
          // Streaming density tiers: letters physically tumble and stream downwards in real-time
          const tierIdx = Math.min(6, Math.max(1, Math.floor(val * 6.99)));
          const tierList = this.densityTiers[tierIdx];
          const streamRow = Math.floor(r - (col ? col.y1 : 0));
          const idx = ((streamRow % tierList.length) + tierList.length) % tierList.length;
          ch = tierList[idx];
        } else {
          // Linear density ramp (standard 10-level, dense 70-level, code, binary)
          const chars = this.charSets[charSetKey];
          const charLen = chars.length;
          const charIdx = Math.max(0, Math.min(charLen - 1, Math.floor(val * charLen)));
          ch = chars[charIdx];
        }

        if (!ch || ch === ' ') continue;

        // Compute 100% SOLID, OPAQUE color (ZERO transparency)
        let rOut, gOut, bOut;

        if (isHead && headGlow) {
          // Stream head: solid incandescent white flash
          rOut = 255;
          gOut = 255;
          bOut = 255;
        } else if (shift <= 1.0) {
          // Blend from Solid Webcam RGB (shift 0) to Solid Phosphor Green (shift 1)
          const t = shift;
          rOut = Math.round(red * (1 - t) + 34 * t);
          gOut = Math.round(green * (1 - t) + 197 * t);
          bOut = Math.round(blue * (1 - t) + 94 * t);
        } else {
          // Blend from Solid Phosphor Green (shift 1) to Solid Crisp White (shift 2)
          const t = shift - 1.0;
          rOut = Math.round(34 * (1 - t) + 244 * t);
          gOut = Math.round(197 * (1 - t) + 244 * t);
          bOut = Math.round(94 * (1 - t) + 245 * t);
        }

        ctx.fillStyle = `rgb(${rOut},${gOut},${bOut})`;
        ctx.fillText(ch, x, y);
      }
    }
  }

  getControls() {
    return [
      {
        id: 'charSet',
        label: 'ASCII Glyph Mode',
        type: 'select',
        options: [
          { value: 'rain', label: 'Cascading ASCII Rain (Streaming Tiers)' },
          { value: 'standard', label: 'Classic ASCII Density ( .:-=+*#%@)' },
          { value: 'dense', label: 'Dense Typographic Ramp (70 levels)' },
          { value: 'code', label: 'Code & Syntax Rain (/\\|(){}[]<>=+-*)' },
          { value: 'binary', label: 'Binary Stream (0 / 1)' }
        ],
        value: this.params.charSet
      },
      {
        id: 'rainEnabled',
        label: 'ASCII Rain Curtain Flow',
        type: 'toggle',
        value: this.params.rainEnabled
      },
      {
        id: 'rainSpeed',
        label: 'Rain Velocity',
        type: 'range',
        min: 0.3,
        max: 3.0,
        step: 0.1,
        unit: 'x',
        value: this.params.rainSpeed
      },
      {
        id: 'headGlow',
        label: 'Stream Head White Flash',
        type: 'toggle',
        value: this.params.headGlow
      },
      {
        id: 'colorMode',
        label: 'Color Palette',
        type: 'select',
        options: [
          { value: 'green', label: 'Phosphor Green Terminal' },
          { value: 'webcam', label: 'Sampled Webcam Colors' },
          { value: 'white', label: 'Clean Monochromatic White' }
        ],
        value: this.params.colorMode
      },
      {
        id: 'fontSize',
        label: 'Typography Size',
        type: 'range',
        min: 8,
        max: 32,
        step: 2,
        unit: 'px',
        value: this.params.fontSize
      },
      {
        id: 'contrast',
        label: 'Contrast / Gamma',
        type: 'range',
        min: 0.5,
        max: 2.5,
        step: 0.1,
        unit: 'x',
        value: this.params.contrast
      },
      {
        id: 'invert',
        label: 'Invert Density',
        type: 'toggle',
        value: this.params.invert
      }
    ];
  }
}
