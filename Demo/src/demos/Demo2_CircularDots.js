import { BaseDemo } from './BaseDemo.js';

/**
 * Demo 2: Circular Dots Grid
 * Converts the rectangular raster cells into circular dots centered at each cell.
 * Demonstrates pointillism and optical mixing: the color at the center pixel
 * is now projected onto a round disc surrounded by negative space.
 */
export class Demo2_CircularDots extends BaseDemo {
  constructor() {
    super(
      2,
      'Circular Dots Grid',
      'Geometric reinterpretation: square pixels are replaced by circular dots positioned at each cell center. The negative space between circles reveals how our vision reconstructs continuous forms from discrete points.'
    );

    this.params = {
      cellSize: 32,            // Grid resolution matching Demo 1, Demo 3, Demo 4
      dotScale: 0.85,          // Diameter relative to cell size (1.0 = touching)
      bgColor: '#09090b',      // Negative space background
      showCellOutline: true,   // Show subtle boundary grid (smoothly connected from Demo 1)
      outlineColor: 'rgba(0, 0, 0, 0.4)'
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
    const baseRadius = (cellSize / 2) * this.params.dotScale;

    // Fill background (negative space between dots)
    ctx.fillStyle = this.params.bgColor;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Draw circular dots with center pixel color
    for (let r = 0; r < rows; r++) {
      const cy = r * cellSize + cellSize / 2;
      for (let c = 0; c < cols; c++) {
        const cx = c * cellSize + cellSize / 2;
        const index = (r * cols + c) * 4;

        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        ctx.fillStyle = `rgb(${red},${green},${blue})`;
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Grid outlines matching Demo 1
    if (this.params.showCellOutline && cellSize >= 10) {
      ctx.save();
      ctx.strokeStyle = this.params.outlineColor || 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let c = 0; c <= cols; c++) {
        const x = c * cellSize;
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, displayHeight);
      }
      for (let r = 0; r <= rows; r++) {
        const y = r * cellSize;
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(displayWidth, y + 0.5);
      }
      ctx.stroke();
      ctx.restore();
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
        id: 'dotScale',
        label: 'Dot Scale',
        type: 'range',
        min: 0.2,
        max: 1.5,
        step: 0.05,
        unit: 'x',
        value: this.params.dotScale
      },
      {
        id: 'showCellOutline',
        label: 'Show Cell Boundaries',
        type: 'toggle',
        value: this.params.showCellOutline
      }
    ];
  }
}
