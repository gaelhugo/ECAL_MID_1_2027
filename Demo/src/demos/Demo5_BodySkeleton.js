import { BaseDemo } from './BaseDemo.js';

/**
 * Demo 5: MediaPipe Pose Skeleton
 * Visualizes 33 deep learning keypoints and kinematic bone hierarchy.
 * Default style: pure red skeleton (#ff0033), pure white junction dots (#ffffff), zero glow.
 */
export class Demo5_BodySkeleton extends BaseDemo {
  /**
   * @param {import('../vision/PoseDetector.js').PoseDetector} poseDetector
   */
  constructor(poseDetector) {
    super(
      5,
      'MediaPipe Body Skeleton',
      'Real-time deep learning pose estimation. Neural networks identify 33 spatial landmarks across the human body, translating pixel data into a structured kinematic skeletal hierarchy.'
    );

    this.poseDetector = poseDetector;

    this.params = {
      videoOpacity: 1.0,          // 0.0 to 1.0
      lineWidth: 4,               // Bone connection stroke width
      jointRadius: 5,             // Joint node radius
      glowIntensity: 0,           // 0 = no glow (clean graphic vector lines)
      skeletonColor: '#ff0033',   // Pure ECAL Red
      jointColor: '#ffffff',      // Pure white junction dots
      showMotionTrails: true,     // Motion history trails for hands/feet
      trailLength: 50,            // Motion trail depth
      showKeypointNumbers: false  // Number labels for landmarks
    };

    // Motion trail buffers for hands and feet
    this.trails = {
      leftWrist: [],
      rightWrist: [],
      leftAnkle: [],
      rightAnkle: []
    };
  }

  update(deltaTime) {
    // Trails update
    const landmarks = this.poseDetector.smoothedLandmarks;
    if (landmarks && this.params.showMotionTrails) {
      this.pushTrail(this.trails.leftWrist, landmarks[15]);
      this.pushTrail(this.trails.rightWrist, landmarks[16]);
      this.pushTrail(this.trails.leftAnkle, landmarks[27]);
      this.pushTrail(this.trails.rightAnkle, landmarks[28]);
    } else {
      this.clearTrails();
    }
  }

  pushTrail(trailArray, point) {
    if (!point || (point.visibility !== undefined && point.visibility < 0.4)) {
      if (trailArray.length > 0) trailArray.shift();
      return;
    }
    trailArray.push({ x: point.x, y: point.y });
    const maxLen = this.params.trailLength || 50;
    while (trailArray.length > maxLen) {
      trailArray.shift();
    }
  }

  clearTrails() {
    this.trails.leftWrist.length = 0;
    this.trails.rightWrist.length = 0;
    this.trails.leftAnkle.length = 0;
    this.trails.rightAnkle.length = 0;
  }

  render(ctx, camera) {
    const { displayWidth, displayHeight, video } = camera;

    // 1. Render camera feed with adjustable opacity
    ctx.save();
    if (this.params.videoOpacity < 1.0) {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, displayWidth, displayHeight);
    }

    if (this.params.videoOpacity > 0.01) {
      camera.drawVideo(ctx, this.params.videoOpacity);
    }

    // 2. Check if pose landmarks are ready
    const landmarks = this.poseDetector.smoothedLandmarks;
    if (!landmarks || landmarks.length === 0) {
      this.renderSearchingHint(ctx, displayWidth, displayHeight);
      ctx.restore();
      return;
    }

    // 3. Render motion trails (pure red with fading alpha)
    if (this.params.showMotionTrails) {
      this.renderTrail(ctx, this.trails.leftWrist, this.params.skeletonColor);
      this.renderTrail(ctx, this.trails.rightWrist, this.params.skeletonColor);
      this.renderTrail(ctx, this.trails.leftAnkle, this.params.skeletonColor);
      this.renderTrail(ctx, this.trails.rightAnkle, this.params.skeletonColor);
    }

    // 4. Render bone connections (pure red skeleton, no glow by default)
    const connections = this.poseDetector.connections;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (this.params.glowIntensity > 0) {
      ctx.shadowBlur = this.params.glowIntensity;
      ctx.shadowColor = this.params.skeletonColor;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.strokeStyle = this.params.skeletonColor;
    ctx.lineWidth = this.params.lineWidth;

    for (let i = 0; i < connections.length; i++) {
      const conn = connections[i];
      const start = landmarks[conn.start];
      const end = landmarks[conn.end];

      if (!start || !end) continue;
      if (start.visibility !== undefined && start.visibility < 0.35) continue;
      if (end.visibility !== undefined && end.visibility < 0.35) continue;

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    // 5. Render keypoint joints (pure white junction dots)
    ctx.shadowBlur = 0;
    ctx.fillStyle = this.params.jointColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;

    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      if (lm.visibility !== undefined && lm.visibility < 0.35) continue;

      // Subtle dynamic pulse based on velocity if available
      const vel = this.poseDetector.landmarkVelocities[i];
      const speed = vel ? Math.min(vel.speed * 0.015, 4) : 0;
      const radius = this.params.jointRadius + speed;

      ctx.beginPath();
      ctx.arc(lm.x, lm.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Optional landmark index number
      if (this.params.showKeypointNumbers) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "JetBrains Mono"';
        ctx.fillText(`${i}`, lm.x + 8, lm.y - 4);
        ctx.fillStyle = this.params.jointColor;
      }
    }

    ctx.restore();
  }

  renderTrail(ctx, points, color) {
    if (points.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = this.params.lineWidth * 0.7;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  renderSearchingHint(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '13px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText('Step into camera view to detect body skeleton', w / 2, h - 90);
    ctx.restore();
  }

  getControls() {
    return [
      {
        id: 'videoOpacity',
        label: 'Video Background',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
        formatter: (v) => `${Math.round(v * 100)}%`,
        value: this.params.videoOpacity
      },
      {
        id: 'lineWidth',
        label: 'Bone Stroke Width',
        type: 'range',
        min: 1,
        max: 12,
        step: 1,
        unit: 'px',
        value: this.params.lineWidth
      },
      {
        id: 'jointRadius',
        label: 'Joint Dot Radius',
        type: 'range',
        min: 2,
        max: 14,
        step: 1,
        unit: 'px',
        value: this.params.jointRadius
      },
      {
        id: 'glowIntensity',
        label: 'Glow Intensity',
        type: 'range',
        min: 0,
        max: 30,
        step: 1,
        unit: 'px',
        value: this.params.glowIntensity
      },
      {
        id: 'showMotionTrails',
        label: 'Motion Trails',
        type: 'toggle',
        value: this.params.showMotionTrails
      },
      {
        id: 'trailLength',
        label: 'Trail History Length',
        type: 'range',
        min: 5,
        max: 100,
        step: 5,
        unit: 'pts',
        value: this.params.trailLength
      }
    ];
  }
}
