import { BaseDemo } from './BaseDemo.js';

/**
 * Demo 1: Raster Grid (Center-Pixel Sampling)
 * Divides the live video into a discrete grid of rows and columns.
 * Illustrates spatial downsampling: each block's entire area is painted using ONLY
 * the color sampled from the exact center pixel of that cell.
 */
export class Demo1_RasterGrid extends BaseDemo {
  constructor() {
    super(
      1,
      'Raster Grid & Center Sampling',
      'Spatial quantization: the screen is partitioned into rows and columns. Instead of averaging, the color of the entire cell is dictated solely by the single pixel at its exact geometric center.'
    );

    this.params = {
      cellSize: 32,              // Dynamic cell dimension in pixels (controls resolution)
      showGridLines: true,       // Toggle grid boundary lines
      showCenterPoints: false,   // Highlight the center sampled pixel (disabled by default)
      gridColor: 'rgba(0, 0, 0, 0.4)',
      pointColor: '#00ffff'      // Vibrant cyan dot indicating the center sample
    };
  }

  render(ctx, camera) {
    const { displayWidth, displayHeight } = camera;

    // Calculate columns and rows based on cellSize
    const cellSize = Math.max(6, Math.floor(this.params.cellSize));
    const cols = Math.ceil(displayWidth / cellSize);
    const rows = Math.ceil(displayHeight / cellSize);

    // Fetch downscaled image data matching the grid resolution
    // Each pixel in this imageData corresponds directly to the center of each cell!
    const imgData = camera.getSampledImageData(cols, rows);
    if (!imgData) return;

    const data = imgData.data;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // 1. Draw solid raster cells filled with the sampled center pixel color
    for (let r = 0; r < rows; r++) {
      const y = r * cellSize;
      for (let c = 0; c < cols; c++) {
        const x = c * cellSize;
        const index = (r * cols + c) * 4;

        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        ctx.fillStyle = `rgb(${red},${green},${blue})`;
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }

    // 2. Optional: Draw grid outlines to clearly visualize quantization boundaries
    if (this.params.showGridLines && cellSize >= 10) {
      ctx.save();
      ctx.strokeStyle = this.params.gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();

      // Vertical lines
      for (let c = 0; c <= cols; c++) {
        const x = c * cellSize;
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, displayHeight);
      }

      // Horizontal lines
      for (let r = 0; r <= rows; r++) {
        const y = r * cellSize;
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(displayWidth, y + 0.5);
      }

      ctx.stroke();
      ctx.restore();
    }

    // 3. Optional: Highlight the exact center sample pixel (pedagogical proof)
    if (this.params.showCenterPoints && cellSize >= 14) {
      ctx.save();
      const dotRadius = Math.max(1.5, Math.min(3.5, cellSize * 0.08));

      for (let r = 0; r < rows; r++) {
        const cy = r * cellSize + cellSize / 2;
        for (let c = 0; c < cols; c++) {
          const cx = c * cellSize + cellSize / 2;
          const index = (r * cols + c) * 4;
          const lum = BaseDemo.getLuminosity(data[index], data[index + 1], data[index + 2]);

          // Use high-contrast color against the background cell color
          ctx.fillStyle = lum > 130 ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)';
          ctx.beginPath();
          ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  getControls() {
    return [
      {
        id: 'cellSize',
        label: 'Cell Size / Resolution',
        type: 'range',
        min: 8,
        max: 80,
        step: 2,
        unit: 'px',
        value: this.params.cellSize
      },
      {
        id: 'showGridLines',
        label: 'Show Cell Boundaries',
        type: 'toggle',
        value: this.params.showGridLines
      },
      {
        id: 'showCenterPoints',
        label: 'Highlight Sample Pixels',
        type: 'toggle',
        value: this.params.showCenterPoints
      }
    ];
  }
}
