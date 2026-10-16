import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

/**
 * PoseDetector
 * Wrapper around MediaPipe PoseLandmarker.
 * Handles model loading, real-time video inference, coordinate mapping (cover/contain/mirror),
 * temporal smoothing (EMA filter), and landmark velocity tracking.
 */
export class PoseDetector {
  constructor() {
    this.landmarker = null;
    this.isReady = false;
    this.isLoading = false;
    this.error = null;

    // Smoothed landmarks and velocities
    this.rawLandmarks = null;
    this.smoothedLandmarks = null;
    this.landmarkVelocities = []; // Array of { vx, vy, speed }

    this.lastVideoTime = -1;
    this.lastTimestamp = performance.now();

    // 33 pose landmark connections from MediaPipe
    this.connections = PoseLandmarker.POSE_CONNECTIONS || [
      { start: 0, end: 1 }, { start: 1, end: 2 }, { start: 2, end: 3 }, { start: 3, end: 7 },
      { start: 0, end: 4 }, { start: 4, end: 5 }, { start: 5, end: 6 }, { start: 6, end: 8 },
      { start: 9, end: 10 }, { start: 11, end: 12 }, { start: 11, end: 13 }, { start: 13, end: 15 },
      { start: 15, end: 17 }, { start: 15, end: 19 }, { start: 15, end: 21 }, { start: 17, end: 19 },
      { start: 12, end: 14 }, { start: 14, end: 16 }, { start: 16, end: 18 }, { start: 16, end: 20 },
      { start: 16, end: 22 }, { start: 18, end: 20 }, { start: 11, end: 23 }, { start: 12, end: 24 },
      { start: 23, end: 24 }, { start: 23, end: 25 }, { start: 24, end: 26 }, { start: 25, end: 27 },
      { start: 26, end: 28 }, { start: 27, end: 29 }, { start: 28, end: 30 }, { start: 29, end: 31 },
      { start: 30, end: 32 }, { start: 27, end: 31 }, { start: 28, end: 32 }
    ];
  }

  /**
   * Loads the MediaPipe Pose model asynchronously
   */
  async init() {
    if (this.isReady || this.isLoading) return;
    this.isLoading = true;

    try {
      // Attempt loading wasm from local folder first, then fallback to CDN
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks('/wasm');
      } catch (e) {
        console.warn('Local wasm load failed, falling back to CDN:', e);
        vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
      }

      // Try GPU delegate first, fallback to CPU if needed
      try {
        this.landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/pose_landmarker_lite.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
      } catch (gpuErr) {
        console.warn('GPU delegate failed, initializing with CPU delegate:', gpuErr);
        this.landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/pose_landmarker_lite.task',
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
      }

      this.isReady = true;
      this.isLoading = false;
      console.log('MediaPipe PoseLandmarker initialized successfully.');
      return true;
    } catch (err) {
      this.error = err;
      this.isLoading = false;
      console.error('Failed to load MediaPipe PoseLandmarker:', err);
      throw err;
    }
  }

  /**
   * Processes current video frame and updates smoothed landmarks and velocities
   * @param {HTMLVideoElement} video
   * @param {import('../core/CameraManager.js').CameraManager} camera
   * @returns {Array<Object>|null}
   */
  update(video, camera) {
    if (!this.isReady || !this.landmarker || !video || video.readyState < 2) {
      return null;
    }

    const now = performance.now();
    const dt = Math.max(0.001, (now - this.lastTimestamp) / 1000);
    this.lastTimestamp = now;

    // MediaPipe requires strictly increasing timestamps for VIDEO mode
    if (video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;
      try {
        const result = this.landmarker.detectForVideo(video, now);
        if (result && result.landmarks && result.landmarks.length > 0) {
          this.rawLandmarks = result.landmarks[0];
          this.processLandmarks(this.rawLandmarks, camera, now);
        } else {
          this.rawLandmarks = null;
          this.smoothedLandmarks = null;
        }
      } catch (e) {
        // Ignored or handle frame skip
      }
    } else {
      // Between camera video updates (e.g. 60Hz screen vs 30Hz camera):
      // Rapidly decay velocity so static points never inject stale forces
      if (this.landmarkVelocities) {
        for (let i = 0; i < this.landmarkVelocities.length; i++) {
          const v = this.landmarkVelocities[i];
          if (v) {
            v.vx *= 0.5;
            v.vy *= 0.5;
            v.speed *= 0.5;
            if (v.speed < 2.0) {
              v.vx = 0;
              v.vy = 0;
              v.speed = 0;
            }
          }
        }
      }
    }

    return this.smoothedLandmarks;
  }

  /**
   * Maps normalized video coordinates to canvas space and computes smoothed position & velocity
   */
  processLandmarks(rawList, camera, now) {
    const { sx, sy, sw, sh, dx, dy, dw, dh } = camera.drawRect;
    const isMirrored = camera.isMirrored;
    const videoW = camera.videoWidth || 1280;
    const videoH = camera.videoHeight || 720;
    const alpha = 0.45; // EMA position smoothing factor

    if (!this.lastProcessTime) this.lastProcessTime = now;
    const processDt = Math.max(0.016, (now - this.lastProcessTime) / 1000);
    this.lastProcessTime = now;

    if (!this.smoothedLandmarks || this.smoothedLandmarks.length !== rawList.length) {
      this.smoothedLandmarks = [];
      this.landmarkVelocities = [];
    }

    for (let i = 0; i < rawList.length; i++) {
      const lm = rawList[i];
      // Convert normalized video coords [0..1] to pixel coords in source video
      const rawVideoPx = lm.x * videoW;
      const rawVideoPy = lm.y * videoH;

      // Map from source crop [sx, sy, sw, sh] to canvas viewport [dx, dy, dw, dh]
      let screenX = dx + ((rawVideoPx - sx) / sw) * dw;
      const screenY = dy + ((rawVideoPy - sy) / sh) * dh;

      // Handle horizontal mirroring if camera is mirrored
      if (isMirrored) {
        screenX = camera.displayWidth - screenX;
      }

      if (!this.smoothedLandmarks[i]) {
        this.smoothedLandmarks[i] = { x: screenX, y: screenY, z: lm.z, visibility: lm.visibility };
        this.landmarkVelocities[i] = { vx: 0, vy: 0, speed: 0 };
      } else {
        const prevX = this.smoothedLandmarks[i].x;
        const prevY = this.smoothedLandmarks[i].y;
        const deltaX = screenX - prevX;
        const deltaY = screenY - prevY;
        const rawDist = Math.hypot(deltaX, deltaY);

        // Neural network jitter deadband: filter out 1-4.5px detector noise
        if (rawDist < 4.5) {
          // Stationary keypoint: immediately zero out velocity to guarantee quiet stillness
          this.landmarkVelocities[i].vx = 0;
          this.landmarkVelocities[i].vy = 0;
          this.landmarkVelocities[i].speed = 0;

          // Gentle drift without building up synthetic velocity
          this.smoothedLandmarks[i].x = prevX + deltaX * 0.15;
          this.smoothedLandmarks[i].y = prevY + deltaY * 0.15;
          this.smoothedLandmarks[i].z = lm.z;
          this.smoothedLandmarks[i].visibility = lm.visibility;
          continue;
        }

        // Apply Exponential Moving Average on position
        const smoothX = prevX + alpha * deltaX;
        const smoothY = prevY + alpha * deltaY;

        // Compute velocity (pixels per second) with low-pass filter
        const rawVx = (smoothX - prevX) / processDt;
        const rawVy = (smoothY - prevY) / processDt;

        const prevVel = this.landmarkVelocities[i];
        const vx = prevVel.vx * 0.3 + rawVx * 0.7;
        const vy = prevVel.vy * 0.3 + rawVy * 0.7;
        const speed = Math.hypot(vx, vy);

        this.smoothedLandmarks[i].x = smoothX;
        this.smoothedLandmarks[i].y = smoothY;
        this.smoothedLandmarks[i].z = lm.z;
        this.smoothedLandmarks[i].visibility = lm.visibility;

        this.landmarkVelocities[i] = { vx, vy, speed };
      }
    }
  }

  /**
   * Helper indices for key body parts
   */
  static get KEYPOINTS() {
    return {
      NOSE: 0,
      LEFT_EYE: 2,
      RIGHT_EYE: 5,
      LEFT_SHOULDER: 11,
      RIGHT_SHOULDER: 12,
      LEFT_ELBOW: 13,
      RIGHT_ELBOW: 14,
      LEFT_WRIST: 15,
      RIGHT_WRIST: 16,
      LEFT_INDEX: 19,
      RIGHT_INDEX: 20,
      LEFT_HIP: 23,
      RIGHT_HIP: 24,
      LEFT_KNEE: 25,
      RIGHT_KNEE: 26,
      LEFT_ANKLE: 27,
      RIGHT_ANKLE: 28
    };
  }
}
