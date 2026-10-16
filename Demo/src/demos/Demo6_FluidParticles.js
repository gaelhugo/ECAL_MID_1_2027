import { BaseDemo } from './BaseDemo.js';
import { ParticleSystem } from '../simulation/ParticleSystem.js';
import { MotionTracker } from '../simulation/MotionTracker.js';

// Pre-computed lookup tables to eliminate string allocations in the 60fps render loop
const WEBCAM_COLOR_CACHE = new Array(32768);
for (let r = 0; r < 32; r++) {
  for (let g = 0; g < 32; g++) {
    for (let b = 0; b < 32; b++) {
      WEBCAM_COLOR_CACHE[(r << 10) | (g << 5) | b] = `rgb(${r * 8 + 4},${g * 8 + 4},${b * 8 + 4})`;
    }
  }
}

const VELOCITY_R = new Uint8Array(100);
const VELOCITY_G = new Uint8Array(100);
const VELOCITY_B = new Uint8Array(100);
const VELOCITY_PALETTE = new Array(100);
for (let i = 0; i < 100; i++) {
  const norm = i / 99;
  let r, g, b;
  if (norm < 0.5) {
    const t = norm * 2;
    // Cyan #06b6d4 (6, 182, 212) -> Electric Violet #8b5cf6 (139, 92, 246)
    r = Math.round(6 + (139 - 6) * t);
    g = Math.round(182 + (92 - 182) * t);
    b = Math.round(212 + (246 - 212) * t);
  } else {
    const t = (norm - 0.5) * 2;
    // Electric Violet #8b5cf6 (139, 92, 246) -> Incandescent Coral Glow #f43f5e (244, 63, 94)
    r = Math.round(139 + (244 - 139) * t);
    g = Math.round(92 + (63 - 92) * t);
    b = Math.round(246 + (94 - 246) * t);
  }
  VELOCITY_R[i] = r;
  VELOCITY_G[i] = g;
  VELOCITY_B[i] = b;
  VELOCITY_PALETTE[i] = `rgb(${r},${g},${b})`;
}

/**
 * Demo 6: Liquid Fluid Particle System with Body Motion Interaction
 * Simulates thousands of cohesive particles suspended in a 2D Eulerian fluid velocity field.
 * Featuring viscous momentum diffusion, rotational vorticity swirls, bilinear field interpolation,
 * and overdamped relaxation for an authentic, graceful liquid feel.
 */
export class Demo6_FluidParticles extends BaseDemo {
  /**
   * @param {import('../vision/PoseDetector.js').PoseDetector} poseDetector
   */
  constructor(poseDetector) {
    super(
      6,
      'Fluid Particles & Body Motion',
      'Viscous fluid dynamics: thousands of particles suspended in a 2D Eulerian velocity field with momentum diffusion and vorticity swirls. Moving limbs and optical motion gently stir the liquid like ink in water.'
    );

    this.poseDetector = poseDetector;
    this.particles = new ParticleSystem(8000);
    this.motionTracker = new MotionTracker(48, 27);

    this.liquidPresets = {
      water: { viscosity: 0.965, diffusion: 0.22, vorticity: 0.45, returnSpeed: 0.007, maxSpeed: 7.5 },
      ink: { viscosity: 0.945, diffusion: 0.35, vorticity: 0.30, returnSpeed: 0.005, maxSpeed: 6.0 },
      honey: { viscosity: 0.885, diffusion: 0.50, vorticity: 0.15, returnSpeed: 0.003, maxSpeed: 4.5 },
      superfluid: { viscosity: 0.982, diffusion: 0.15, vorticity: 0.55, returnSpeed: 0.008, maxSpeed: 9.0 }
    };

    this.params = {
      forceMode: 'both',            // 'both' | 'skeleton' | 'optical' | 'mouse'
      liquidType: 'water',          // 'water' | 'ink' | 'honey' | 'superfluid'
      renderStyle: 'droplets',      // 'droplets' | 'dots' | 'glow' (NO solid lines!)
      particleCount: 4500,
      colorMode: 'webcam',          // 'webcam' | 'velocity' | 'duotone'
      velocityGlowBlend: 0.0,       // 0.0 = sampled webcam, 1.0 = fluid velocity glow
      videoOpacity: 0.0,            // Background camera visibility (0 by default)
      forceStrength: 0.90,          // Force multiplier (gentle liquid strokes)
      minMotionSpeed: 160,          // Clear motion threshold in px/s (ignores resting tremors)
      vorticity: 0.40,              // Swirl & eddy current generation
      trailLength: 0.70,            // Natural fluid persistence trace (0.0 to 0.96)
      elasticReturn: true,          // Overdamped, gentle drift back to rest
      mouseInteraction: false       // Mouse / pointer stirring (default: inactive)
    };

    // Dedicated offscreen canvas for persistence trails
    this.trailCanvas = null;
    this.trailCtx = null;

    // Mouse drag interaction
    this.mouse = { x: 0, y: 0, prevX: 0, prevY: 0, isDown: false };
    this.setupMouseListeners();
  }

  setup(camera) {
    super.setup(camera);
    this.initTrailCanvas(camera.displayWidth, camera.displayHeight);
    this.particles.initGrid(camera.displayWidth, camera.displayHeight, this.params.particleCount);
  }

  enter() {
    super.enter();
    if (this.camera) {
      this.initTrailCanvas(this.camera.displayWidth, this.camera.displayHeight);
      this.particles.initGrid(this.camera.displayWidth, this.camera.displayHeight, this.params.particleCount);
    }
  }

  initTrailCanvas(w, h) {
    if (!this.trailCanvas) {
      this.trailCanvas = document.createElement('canvas');
      this.trailCtx = this.trailCanvas.getContext('2d');
    }
    if (this.trailCanvas.width !== w || this.trailCanvas.height !== h) {
      this.trailCanvas.width = w;
      this.trailCanvas.height = h;
      this.trailCtx.clearRect(0, 0, w, h);
    }
  }

  setupMouseListeners() {
    window.addEventListener('pointermove', (e) => {
      this.mouse.prevX = this.mouse.x;
      this.mouse.prevY = this.mouse.y;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;

      // Only stir particles if mouse interaction is enabled (default inactive)
      const isMouseEnabled = this.params.mouseInteraction || this.params.forceMode === 'mouse';
      if (this.isActive && isMouseEnabled) {
        const dx = (this.mouse.x - this.mouse.prevX) * 0.18 * this.params.forceStrength;
        const dy = (this.mouse.y - this.mouse.prevY) * 0.18 * this.params.forceStrength;
        if (Math.abs(dx) > 0.35 || Math.abs(dy) > 0.35) {
          this.particles.addImpulse(this.mouse.x, this.mouse.y, dx, dy, 100);
        }
      }
    });
  }

  update(deltaTime) {
    if (!this.isActive || !this.camera) return;

    // Apply liquid physical characteristics from preset
    const preset = this.liquidPresets[this.params.liquidType] || this.liquidPresets.water;
    this.particles.viscosity = preset.viscosity;
    this.particles.diffusion = preset.diffusion;
    this.particles.vorticity = this.params.vorticity;
    this.particles.maxSpeed = preset.maxSpeed;
    this.particles.returnSpeed = this.params.elasticReturn ? preset.returnSpeed : 0.0;

    // 1. Process optical motion frame differences (strict noise-rejection gate)
    if (this.params.forceMode === 'optical' || this.params.forceMode === 'both') {
      this.motionTracker.update(this.camera);

      const mCols = this.motionTracker.cols;
      const mRows = this.motionTracker.rows;
      const w = this.camera.displayWidth;
      const h = this.camera.displayHeight;
      const forceMult = this.params.forceStrength * 4.0;
      const optThreshold = 0.35;

      for (let r = 0; r < mRows; r++) {
        for (let c = 0; c < mCols; c++) {
          const idx = r * mCols + c;
          const mag = this.motionTracker.motionGrid[idx];

          // High noise floor (0.35): completely rejects subtle edge changes and breathing
          if (mag > optThreshold) {
            const activeMag = (mag - optThreshold) / (1.0 - optThreshold);
            const px = (c / mCols) * w;
            const py = (r / mRows) * h;
            const fx = this.motionTracker.flowX[idx] * forceMult * activeMag;
            const fy = this.motionTracker.flowY[idx] * forceMult * activeMag;
            this.particles.addImpulse(px, py, fx, fy, (w / mCols) * 2.0);
          }
        }
      }
    }

    // 2. Process MediaPipe skeleton limb velocities (clear, deliberate gestures only)
    if (this.params.forceMode === 'skeleton' || this.params.forceMode === 'both') {
      const landmarks = this.poseDetector.smoothedLandmarks;
      const velocities = this.poseDetector.landmarkVelocities;

      if (landmarks && velocities) {
        // Only active limbs: wrists (15, 16), hands (19, 20), elbows (13, 14), ankles (27, 28)
        const limbJoints = [15, 16, 19, 20, 13, 14, 27, 28];
        const skelForce = this.params.forceStrength * 0.024;
        const minSpeed = this.params.minMotionSpeed;

        for (const idx of limbJoints) {
          const lm = landmarks[idx];
          const vel = velocities[idx];

          // Require clear, intentional physical motion (ignores static tremor & posture holding)
          if (lm && vel && vel.speed > minSpeed) {
            const activeSpeed = vel.speed - minSpeed;
            const ramp = Math.min(1.0, activeSpeed / 160.0);
            const fx = vel.vx * ramp * skelForce;
            const fy = vel.vy * ramp * skelForce;
            const radius = (idx === 15 || idx === 16 || idx === 19 || idx === 20) ? 120 : 80;
            this.particles.addImpulse(lm.x, lm.y, fx, fy, radius);
          }
        }

        // Head/Nose (0): Requires deliberate head gesture (> minSpeed + 110 px/s)
        const headLm = landmarks[0];
        const headVel = velocities[0];
        const headThreshold = minSpeed + 110;
        if (headLm && headVel && headVel.speed > headThreshold) {
          const activeHeadSpeed = headVel.speed - headThreshold;
          const ramp = Math.min(1.0, activeHeadSpeed / 180.0);
          const fx = headVel.vx * ramp * skelForce * 0.5;
          const fy = headVel.vy * ramp * skelForce * 0.5;
          this.particles.addImpulse(headLm.x, headLm.y, fx, fy, 85);
        }
      }
    }

    // 3. Update particle simulation
    this.particles.update(deltaTime);

    // 4. Sample video colors if enabled
    if (this.params.colorMode === 'webcam') {
      this.particles.sampleVideoColors(this.camera);
    }
  }

  render(ctx, camera) {
    const { displayWidth, displayHeight } = camera;
    this.initTrailCanvas(displayWidth, displayHeight);

    const tLen = this.params.trailLength;
    const tCtx = this.trailCtx;

    // 1. Natural persistence fade (fades prior frames smoothly without expensive destination-out)
    if (tLen > 0.02) {
      // Exponential curve: tLen=0.5 -> fadeAlpha 0.22; tLen=0.75 -> fadeAlpha 0.08; tLen=0.92 -> fadeAlpha 0.025
      const fadeAlpha = Math.max(0.015, Math.pow(1.0 - tLen * 0.985, 1.4));
      tCtx.fillStyle = `rgba(9, 9, 11, ${fadeAlpha})`;
      tCtx.fillRect(0, 0, displayWidth, displayHeight);
    } else {
      tCtx.fillStyle = '#09090b';
      tCtx.fillRect(0, 0, displayWidth, displayHeight);
    }

    // 2. Render particles into trail buffer as natural circular points/droplets (NO solid lines)
    const count = Math.min(this.params.particleCount, this.particles.count);
    const px = this.particles.x;
    const py = this.particles.y;
    const pvx = this.particles.vx;
    const pvy = this.particles.vy;
    const size = this.particles.size;
    const r = this.particles.r;
    const g = this.particles.g;
    const b = this.particles.b;

    const mode = this.params.colorMode;
    const style = this.params.renderStyle;
    const glowBlend = mode === 'velocity' ? 1.0 : Math.max(0, Math.min(1, this.params.velocityGlowBlend || 0.0));

    tCtx.save();
    let currentFill = '';

    for (let i = 0; i < count; i++) {
      const x = px[i];
      const y = py[i];
      const vx = pvx[i];
      const vy = pvy[i];
      const s = size[i];

      // Instant pre-computed color lookup (zero string allocations = 60fps locked)
      let col;
      if (mode === 'duotone') {
        const norm = (x / displayWidth) * 0.5 + (y / displayHeight) * 0.5;
        col = norm > 0.5 ? '#06b6d4' : '#f59e0b';
      } else if (glowBlend <= 0.001) {
        // Pure webcam sampling
        const key = ((r[i] >> 3) << 10) | ((g[i] >> 3) << 5) | (b[i] >> 3);
        col = WEBCAM_COLOR_CACHE[key] || '#06b6d4';
      } else if (glowBlend >= 0.999) {
        // Pure fluid velocity glow
        const speed = Math.hypot(vx, vy);
        const vIdx = Math.min(99, Math.floor((speed / 6.5) * 99));
        col = VELOCITY_PALETTE[vIdx];
      } else {
        // Seamless real-time color morphing (zero string allocations via quantized cache)
        const speed = Math.hypot(vx, vy);
        const vIdx = Math.min(99, Math.floor((speed / 6.5) * 99));
        const vR = VELOCITY_R[vIdx];
        const vG = VELOCITY_G[vIdx];
        const vB = VELOCITY_B[vIdx];

        const mr = Math.round(r[i] + (vR - r[i]) * glowBlend);
        const mg = Math.round(g[i] + (vG - g[i]) * glowBlend);
        const mb = Math.round(b[i] + (vB - b[i]) * glowBlend);

        const key = ((mr >> 3) << 10) | ((mg >> 3) << 5) | (mb >> 3);
        col = WEBCAM_COLOR_CACHE[key] || '#06b6d4';
      }

      if (col !== currentFill) {
        tCtx.fillStyle = col;
        currentFill = col;
      }

      tCtx.beginPath();
      if (style === 'droplets') {
        // Natural circular fluid droplet with sub-frame wake bubble (NO solid lines!)
        const rScale = 1.05 + glowBlend * 0.25;
        tCtx.arc(x, y, s * rScale, 0, Math.PI * 2);
        const speedSq = vx * vx + vy * vy;
        if (speedSq > 0.35) {
          // Soft sub-frame wake bubble creates a natural fluid droplet shape without drawing lines
          tCtx.arc(x - vx * 0.38, y - vy * 0.38, s * (0.65 + glowBlend * 0.15), 0, Math.PI * 2);
        }
      } else if (style === 'glow') {
        // Luminous plume particle
        tCtx.arc(x, y, s * (1.35 + glowBlend * 0.3), 0, Math.PI * 2);
      } else {
        // Fine circular dot
        tCtx.arc(x, y, s * 0.85, 0, Math.PI * 2);
      }
      tCtx.fill();
    }

    tCtx.restore();

    // 3. Composite onto main display canvas at full 60fps
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    if (this.params.videoOpacity > 0.01) {
      camera.drawVideo(ctx, this.params.videoOpacity);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(this.trailCanvas, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(this.trailCanvas, 0, 0);
    }
  }

  setParam(key, value) {
    super.setParam(key, value);
    if (key === 'particleCount' && this.camera) {
      this.particles.initGrid(this.camera.displayWidth, this.camera.displayHeight, value);
    } else if (key === 'colorMode') {
      if (value === 'velocity') {
        this.params.velocityGlowBlend = 1.0;
      } else if (value === 'webcam') {
        this.params.velocityGlowBlend = 0.0;
      }
    } else if (key === 'velocityGlowBlend') {
      const blend = Math.max(0, Math.min(1, value));
      this.params.velocityGlowBlend = blend;
      if (blend >= 0.99) {
        this.params.colorMode = 'velocity';
      } else if (blend <= 0.01) {
        this.params.colorMode = 'webcam';
      }
    }
  }

  getControls() {
    return [
      {
        id: 'liquidType',
        label: 'Liquid Viscosity & Type',
        type: 'select',
        options: [
          { value: 'water', label: 'Water (Smooth Oceanic Currents)' },
          { value: 'ink', label: 'Liquid Ink (Graceful Dense Ribbons)' },
          { value: 'honey', label: 'Viscous Honey / Glycerine' },
          { value: 'superfluid', label: 'Superfluid (Swirling Eddies)' }
        ],
        value: this.params.liquidType
      },
      {
        id: 'renderStyle',
        label: 'Fluid Rendering Style',
        type: 'select',
        options: [
          { value: 'droplets', label: 'Cohesive Liquid Droplets' },
          { value: 'dots', label: 'Fine Circular Dots' },
          { value: 'glow', label: 'Luminous Fluid Plumes' }
        ],
        value: this.params.renderStyle
      },
      {
        id: 'forceMode',
        label: 'Motion Interaction Source',
        type: 'select',
        options: [
          { value: 'both', label: 'Body Skeleton + Optical Motion' },
          { value: 'skeleton', label: 'MediaPipe Skeleton Only' },
          { value: 'optical', label: 'Webcam Optical Motion Only' },
          { value: 'mouse', label: 'Pointer / Mouse Drag' }
        ],
        value: this.params.forceMode
      },
      {
        id: 'mouseInteraction',
        label: 'Mouse / Pointer Stirring',
        type: 'toggle',
        value: this.params.mouseInteraction
      },
      {
        id: 'vorticity',
        label: 'Vorticity / Swirl Strength',
        type: 'range',
        min: 0.0,
        max: 0.8,
        step: 0.05,
        unit: '',
        value: this.params.vorticity
      },
      {
        id: 'forceStrength',
        label: 'Motion Stirring Sensitivity',
        type: 'range',
        min: 0.2,
        max: 2.5,
        step: 0.1,
        unit: 'x',
        value: this.params.forceStrength
      },
      {
        id: 'minMotionSpeed',
        label: 'Clear Motion Gate',
        type: 'range',
        min: 60,
        max: 340,
        step: 20,
        unit: ' px/s',
        value: this.params.minMotionSpeed
      },
      {
        id: 'trailLength',
        label: 'Liquid Persistence Trail',
        type: 'range',
        min: 0,
        max: 0.96,
        step: 0.02,
        unit: '',
        value: this.params.trailLength
      },
      {
        id: 'colorMode',
        label: 'Particle Color Palette',
        type: 'select',
        options: [
          { value: 'webcam', label: 'Sampled Webcam Colors' },
          { value: 'velocity', label: 'Fluid Velocity Glow' },
          { value: 'duotone', label: 'Duotone Aesthetic' }
        ],
        value: this.params.colorMode
      },
      {
        id: 'velocityGlowBlend',
        label: 'Velocity Glow Morph',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
        unit: '',
        value: this.params.velocityGlowBlend
      },
      {
        id: 'particleCount',
        label: 'Particle Count',
        type: 'range',
        min: 1000,
        max: 8000,
        step: 500,
        unit: '',
        value: this.params.particleCount
      },
      {
        id: 'videoOpacity',
        label: 'Webcam Background Opacity',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
        unit: '%',
        value: this.params.videoOpacity
      },
      {
        id: 'elasticReturn',
        label: 'Overdamped Gentle Return',
        type: 'toggle',
        value: this.params.elasticReturn
      }
    ];
  }
}
