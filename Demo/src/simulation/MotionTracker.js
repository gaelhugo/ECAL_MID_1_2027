/**
 * MotionTracker
 * Optical frame-differencing engine.
 * Computes pixel motion energy and approximate directional velocity vectors
 * across a low-resolution grid for instant physical responsiveness.
 */
export class MotionTracker {
  constructor(gridCols = 48, gridRows = 32) {
    this.cols = gridCols;
    this.rows = gridRows;
    this.cellCount = this.cols * this.rows;

    this.prevLuma = new Float32Array(this.cellCount);
    this.currLuma = new Float32Array(this.cellCount);
    this.motionGrid = new Float32Array(this.cellCount); // Motion magnitude 0..1
    this.flowX = new Float32Array(this.cellCount);      // Directional X force
    this.flowY = new Float32Array(this.cellCount);      // Directional Y force

    this.hasPreviousFrame = false;
  }

  /**
   * Updates motion grid by comparing downsampled video frame with previous frame
   * @param {import('../core/CameraManager.js').CameraManager} camera
   */
  update(camera) {
    const imgData = camera.getSampledImageData(this.cols, this.rows);
    if (!imgData) return;

    const data = imgData.data;

    if (!this.hasPreviousFrame) {
      for (let i = 0; i < this.cellCount; i++) {
        const idx = i * 4;
        this.prevLuma[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      }
      this.hasPreviousFrame = true;
      return;
    }

    // Compute current luma and motion magnitude
    for (let i = 0; i < this.cellCount; i++) {
      const idx = i * 4;
      const luma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      this.currLuma[i] = luma;

      // Temporal difference
      const diff = Math.abs(luma - this.prevLuma[i]);
      // Noise gate: webcams produce ~10-15 levels of sensor noise on high-contrast edges (head/face/shoulders)
      const motion = diff > 16.0 ? Math.min(1.0, (diff - 16.0) / 45.0) : 0;
      
      // Decay existing motion smoothly to absolute zero when still
      this.motionGrid[i] = motion > 0 
        ? (this.motionGrid[i] * 0.6 + motion * 0.4) 
        : (this.motionGrid[i] * 0.5);
      if (this.motionGrid[i] < 0.01) this.motionGrid[i] = 0;
    }

    // Approximate optical gradient flow between adjacent cells
    for (let r = 1; r < this.rows - 1; r++) {
      for (let c = 1; c < this.cols - 1; c++) {
        const idx = r * this.cols + c;
        const m = this.motionGrid[idx];

        if (m > 0.08) {
          // Spatial intensity gradient
          const dx = (this.currLuma[idx + 1] - this.currLuma[idx - 1]) * 0.5;
          const dy = (this.currLuma[idx + this.cols] - this.currLuma[idx - this.cols]) * 0.5;
          const temporal = this.currLuma[idx] - this.prevLuma[idx];

          const gradMag = Math.sqrt(dx * dx + dy * dy) + 1e-4;
          this.flowX[idx] = (-temporal * (dx / gradMag)) * 0.05;
          this.flowY[idx] = (-temporal * (dy / gradMag)) * 0.05;
        } else {
          this.flowX[idx] *= 0.6;
          this.flowY[idx] *= 0.6;
          if (Math.abs(this.flowX[idx]) < 0.001) this.flowX[idx] = 0;
          if (Math.abs(this.flowY[idx]) < 0.001) this.flowY[idx] = 0;
        }
      }
    }

    // Swap buffers
    this.prevLuma.set(this.currLuma);
  }

  /**
   * Retrieves motion force at given normalized canvas coordinates [0..1]
   * @param {number} u - Normalized horizontal coord (0 to 1)
   * @param {number} v - Normalized vertical coord (0 to 1)
   * @returns {{ magnitude: number, fx: number, fy: number }}
   */
  getForceAt(u, v) {
    if (u < 0 || u >= 1 || v < 0 || v >= 1) {
      return { magnitude: 0, fx: 0, fy: 0 };
    }

    const c = Math.floor(u * this.cols);
    const r = Math.floor(v * this.rows);
    const idx = r * this.cols + c;

    return {
      magnitude: this.motionGrid[idx] || 0,
      fx: this.flowX[idx] || 0,
      fy: this.flowY[idx] || 0
    };
  }
}
