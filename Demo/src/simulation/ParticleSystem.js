/**
 * ParticleSystem
 * High-performance 2D particle engine coupled with a Eulerian fluid velocity field.
 * Uses Float32Array typed buffers for 60fps execution with thousands of interacting particles.
 * Features bilinear field interpolation, viscous momentum diffusion, vorticity swirls, and overdamped relaxation.
 */
export class ParticleSystem {
  constructor(maxParticles = 8000) {
    this.maxParticles = maxParticles;
    this.count = 4500;

    // Structure of Arrays (SoA) for cache efficiency
    this.x = new Float32Array(maxParticles);
    this.y = new Float32Array(maxParticles);
    this.vx = new Float32Array(maxParticles);
    this.vy = new Float32Array(maxParticles);
    this.homeX = new Float32Array(maxParticles);
    this.homeY = new Float32Array(maxParticles);
    this.size = new Float32Array(maxParticles);
    this.r = new Uint8Array(maxParticles);
    this.g = new Uint8Array(maxParticles);
    this.b = new Uint8Array(maxParticles);

    // Reusable sample result vector to eliminate GC churn (270,000 allocations/sec)
    this._sampleResult = { u: 0, v: 0 };

    // Fluid velocity grid (Eulerian grid)
    this.fCols = 64;
    this.fRows = 36;
    this.fieldSize = this.fCols * this.fRows;
    this.uField = new Float32Array(this.fieldSize); // Horizontal fluid velocity
    this.vField = new Float32Array(this.fieldSize); // Vertical fluid velocity
    this.uTemp = new Float32Array(this.fieldSize);  // Diffusion scratch buffer
    this.vTemp = new Float32Array(this.fieldSize);

    this.width = 1920;
    this.height = 1080;

    // Simulation physics parameters tuned for liquid cohesion
    this.viscosity = 0.965;        // Fluid momentum retention (0.90 = dense syrup, 0.97 = water)
    this.diffusion = 0.18;        // Neighbor momentum diffusion (creates rolling liquid waves)
    this.fieldDecay = 0.965;      // Grid dissipation rate
    this.returnSpeed = 0.008;     // Overdamped, gentle drift back to rest (no bouncy spring)
    this.fluidInfluence = 0.85;   // Coupling between fluid field and particle velocity
    this.vorticity = 0.35;        // Swirl / eddy curl generation
    this.maxSpeed = 8.5;          // Velocity clamp to prevent erratic particle excitation
  }

  /**
   * Resets and spawns particles evenly across current canvas dimensions
   */
  initGrid(width, height, count = this.count) {
    this.width = width;
    this.height = height;
    this.count = Math.min(count, this.maxParticles);

    const cols = Math.round(Math.sqrt(this.count * (width / height)));
    const rows = Math.ceil(this.count / cols);
    const spacingX = width / cols;
    const spacingY = height / rows;

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (idx >= this.count) break;

        const px = (c + 0.5) * spacingX + (Math.random() - 0.5) * (spacingX * 0.25);
        const py = (r + 0.5) * spacingY + (Math.random() - 0.5) * (spacingY * 0.25);

        this.x[idx] = px;
        this.y[idx] = py;
        this.homeX[idx] = px;
        this.homeY[idx] = py;
        this.vx[idx] = 0;
        this.vy[idx] = 0;
        this.size[idx] = 2.2 + Math.random() * 2.0;

        // Default aesthetic color
        this.r[idx] = 6;
        this.g[idx] = 182;
        this.b[idx] = 212;

        idx++;
      }
    }

    // Reset fluid grid
    this.uField.fill(0);
    this.vField.fill(0);
  }

  /**
   * Injects directional fluid impulse with rotational vorticity (swirls)
   * @param {number} x - Pixel coord
   * @param {number} y - Pixel coord
   * @param {number} fx - Force X
   * @param {number} fy - Force Y
   * @param {number} radius - Radius of influence
   */
  addImpulse(x, y, fx, fy, radius = 90) {
    const gx = (x / this.width) * (this.fCols - 1);
    const gy = (y / this.height) * (this.fRows - 1);
    const gRadius = (radius / this.width) * this.fCols;

    const minX = Math.max(0, Math.floor(gx - gRadius));
    const maxX = Math.min(this.fCols - 1, Math.ceil(gx + gRadius));
    const minY = Math.max(0, Math.floor(gy - gRadius));
    const maxY = Math.min(this.fRows - 1, Math.ceil(gy + gRadius));

    const forceMag = Math.sqrt(fx * fx + fy * fy);
    if (forceMag < 0.08) return;

    // Smooth speed clamping to prevent jarring velocity spikes
    const clampedMag = Math.min(forceMag, 14.0);
    const scale = clampedMag / forceMag;
    const sFx = fx * scale;
    const sFy = fy * scale;
    const swirl = this.vorticity;

    for (let j = minY; j <= maxY; j++) {
      for (let i = minX; i <= maxX; i++) {
        const dx = (i - gx) / (gRadius || 1);
        const dy = (j - gy) / (gRadius || 1);
        const distSq = dx * dx + dy * dy;

        if (distSq < 1.0) {
          // Smooth cosine bell-curve falloff (much softer than linear)
          const falloff = 0.5 * (1.0 + Math.cos(Math.PI * Math.sqrt(distSq)));
          const fIdx = j * this.fCols + i;

          // Linear velocity push
          let uPush = sFx * falloff;
          let vPush = sFy * falloff;

          // Rotational curl / vortex force perpendicular to displacement
          // Creates organic swirling eddies around moving limbs
          if (swirl > 0) {
            uPush += -dy * clampedMag * swirl * falloff;
            vPush += dx * clampedMag * swirl * falloff;
          }

          this.uField[fIdx] += uPush;
          this.vField[fIdx] += vPush;
        }
      }
    }
  }

  /**
   * Samples smooth continuous fluid velocity using 2D Bilinear Interpolation
   * Eliminates boundary stepping artifacts and produces silky smooth motion.
   */
  sampleField(x, y) {
    const gx = Math.max(0, Math.min(this.fCols - 1.001, (x / this.width) * (this.fCols - 1)));
    const gy = Math.max(0, Math.min(this.fRows - 1.001, (y / this.height) * (this.fRows - 1)));

    const x0 = Math.floor(gx);
    const x1 = Math.min(this.fCols - 1, x0 + 1);
    const y0 = Math.floor(gy);
    const y1 = Math.min(this.fRows - 1, y0 + 1);

    const fx = gx - x0;
    const fy = gy - y0;

    const row0 = y0 * this.fCols;
    const row1 = y1 * this.fCols;

    // 4 surrounding grid velocities
    const u00 = this.uField[row0 + x0];
    const u10 = this.uField[row0 + x1];
    const u01 = this.uField[row1 + x0];
    const u11 = this.uField[row1 + x1];

    const v00 = this.vField[row0 + x0];
    const v10 = this.vField[row0 + x1];
    const v01 = this.vField[row1 + x0];
    const v11 = this.vField[row1 + x1];

    // Bilinear blending
    const topU = u00 + (u10 - u00) * fx;
    const botU = u01 + (u11 - u01) * fx;
    const u = topU + (botU - topU) * fy;

    const topV = v00 + (v10 - v00) * fx;
    const botV = v01 + (v11 - v01) * fx;
    const v = topV + (botV - topV) * fy;

    this._sampleResult.u = u;
    this._sampleResult.v = v;
    return this._sampleResult;
  }

  /**
   * Diffuses velocities across neighboring cells (viscous momentum spread)
   */
  diffuseGrid() {
    const cols = this.fCols;
    const rows = this.fRows;
    const diff = this.diffusion;
    if (diff <= 0.001) return;

    this.uTemp.set(this.uField);
    this.vTemp.set(this.vField);

    for (let j = 1; j < rows - 1; j++) {
      const row = j * cols;
      for (let i = 1; i < cols - 1; i++) {
        const idx = row + i;
        // Laplacian neighbor average
        const avgU = (this.uTemp[idx - 1] + this.uTemp[idx + 1] + this.uTemp[idx - cols] + this.uTemp[idx + cols]) * 0.25;
        const avgV = (this.vTemp[idx - 1] + this.vTemp[idx + 1] + this.vTemp[idx - cols] + this.vTemp[idx + cols]) * 0.25;

        this.uField[idx] = this.uField[idx] * (1.0 - diff) + avgU * diff;
        this.vField[idx] = this.vField[idx] * (1.0 - diff) + avgV * diff;
      }
    }
  }

  /**
   * Updates fluid grid dissipation and particle positions
   */
  update(dt = 0.016) {
    // 1. Viscous momentum diffusion (smooths out sharp velocity spikes into flowing currents)
    this.diffuseGrid();

    // 2. Dissipate fluid velocity field smoothly to absolute zero
    const decay = this.fieldDecay;
    for (let i = 0; i < this.fieldSize; i++) {
      this.uField[i] *= decay;
      this.vField[i] *= decay;
      if (Math.abs(this.uField[i]) < 0.004) this.uField[i] = 0;
      if (Math.abs(this.vField[i]) < 0.004) this.vField[i] = 0;
    }

    const w = this.width;
    const h = this.height;
    const visc = this.viscosity;
    const ret = this.returnSpeed;
    const fluidInf = this.fluidInfluence;
    const maxSpd = this.maxSpeed;
    const count = this.count;

    // 3. Integrate particle movement with liquid damping
    for (let i = 0; i < count; i++) {
      let px = this.x[i];
      let py = this.y[i];
      let pvx = this.vx[i];
      let pvy = this.vy[i];

      // Sample macroscopic fluid velocity via bilinear interpolation
      const fluid = this.sampleField(px, py);
      pvx += fluid.u * fluidInf;
      pvy += fluid.v * fluidInf;

      // Overdamped gentle drift back to rest (no bouncy harmonic springs)
      if (ret > 0) {
        const dx = this.homeX[i] - px;
        const dy = this.homeY[i] - py;
        const distSq = dx * dx + dy * dy;

        // Snapping deadzone: if returned near home and slow, settle into pure rest
        if (distSq < 0.6 && Math.abs(pvx) < 0.08 && Math.abs(pvy) < 0.08) {
          px = this.homeX[i];
          py = this.homeY[i];
          pvx = 0;
          pvy = 0;
        } else {
          pvx += dx * ret;
          pvy += dy * ret;
        }
      }

      // Viscous liquid drag (smoothly slows down motion)
      pvx *= visc;
      pvy *= visc;

      // Cutoff micro-creep to ensure dead quiet rest
      if (Math.abs(pvx) < 0.012) pvx = 0;
      if (Math.abs(pvy) < 0.012) pvy = 0;

      // Terminal velocity clamping (prevents hyper-excited particle bursts)
      const currentSpeed = Math.sqrt(pvx * pvx + pvy * pvy);
      if (currentSpeed > maxSpd) {
        const cap = maxSpd / currentSpeed;
        pvx *= cap;
        pvy *= cap;
      }

      // Integrate position
      px += pvx;
      py += pvy;

      // Soft boundary damping
      if (px < 0) { px = 0; pvx = 0; }
      else if (px > w) { px = w; pvx = 0; }

      if (py < 0) { py = 0; pvy = 0; }
      else if (py > h) { py = h; pvy = 0; }

      this.x[i] = px;
      this.y[i] = py;
      this.vx[i] = pvx;
      this.vy[i] = pvy;
    }
  }

  /**
   * Updates particle colors by sampling the live video buffer directly beneath each particle
   */
  sampleVideoColors(camera) {
    const imgData = camera.getSampledImageData(64, 36);
    if (!imgData) return;

    const data = imgData.data;
    const w = this.width;
    const h = this.height;
    const sW = 64;
    const sH = 36;
    const count = this.count;

    for (let i = 0; i < count; i++) {
      const u = Math.max(0, Math.min(1, this.x[i] / w));
      const v = Math.max(0, Math.min(1, this.y[i] / h));

      const sx = Math.floor(u * (sW - 1));
      const sy = Math.floor(v * (sH - 1));
      const idx = (sy * sW + sx) * 4;

      this.r[i] = data[idx];
      this.g[i] = data[idx + 1];
      this.b[i] = data[idx + 2];
    }
  }
}
