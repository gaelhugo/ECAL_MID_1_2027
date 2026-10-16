# Creative Coding Webcam Demos — Real-Time Vision Transformations

An interactive, pedagogical creative coding application built with **Vite** and **pure vanilla JavaScript classes** (no frontend frameworks). Designed for large-screen projections, workshops, and lectures illustrating digital image processing, rasterization, halftone screens, luminance perception, AI body tracking, and fluid dynamics.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Start the Vite development server
npm run dev

# 3. Open in your browser
# http://localhost:3000
```

---

## ⌨️ Controls & Keyboard Shortcuts

| Shortcut | Action | Description |
|---|---|---|
| **`0` – `9`** | Direct Demo Jump | Immediately switches to the corresponding demo |
| **`←` / `→`** (or `↑` / `↓`) | Prev / Next | Cycles through the demonstration series in sequence |
| **`M`** | Toggle Mirror | Flips webcam horizontally (natural mirror vs true camera) |
| **`H`** | Toggle HUD | Hides/shows all on-screen UI for clean presentation mode |
| **`F`** | Fullscreen | Enters or exits browser fullscreen mode |

You can also use the **top navigation pill bar**, **floating left/right arrows**, and the **Parameters Drawer** on the right side of the screen to interact with the system.

---

## 🎨 Pedagogical Demo Series

The demonstrations progress sequentially, peeling back layers of abstraction:

### **Demo 0: Raw Camera Feed**
- **Concept:** Continuous visual ground truth.
- High-resolution fullscreen live video feed with natural mirroring and aspect ratio fitting (`cover` mode).
- Adjustable brightness, contrast, and saturation. Optional center crosshair.

### **Demo 1: Raster Grid & Center-Pixel Sampling**
- **Concept:** Spatial quantization & resolution downsampling.
- Partitions the continuous video plane into a dynamic grid of rows and columns.
- Demonstrates how resolution drops when each rectangular block's entire area is painted using **only the single color sampled from the cell's exact geometric center**.
- Includes toggles to display cell grid boundaries and highlight the center sampled pixel.

### **Demo 2: Circular Dots Grid**
- **Concept:** Geometric reinterpretation & optical mixing (Pointillism).
- Converts the contiguous rectangular blocks into circular dots centered within each cell.
- Negative space between discs reveals how human perception reconstructs continuity from discrete points of light.
- Controls for cell size, dot fill ratio, and background negative space.

### **Demo 3: Halftone Luminosity (Dynamic Radius)**
- **Concept:** Area coverage encoding tonal value.
- Replaces fixed-size dots with circles whose **radius is directly modulated by the sampled color's perceived luminance** ($L = 0.299R + 0.587G + 0.114B$).
- Highlights the classical print halftone screen printing principle: continuous shades are simulated by varying dot area rather than ink transparency.
- Includes monochrome halftone mode and print ink inversion mode (darker areas = larger dots).

### **Demo 4: Duotone Luminance Mapping**
- **Concept:** Dominance of luminance in human visual perception.
- Discards all original webcam hues and maps them along a gradient between two arbitrary palette values (Color A for shadows, Color B for highlights).
- Demonstrates that the human eye reads shape, volume, and facial recognition almost entirely through luminance contrast; hue/chromaticity is secondary.
- Includes presets (ECAL Red / Noir, Cyberpunk Neon, Phosphor Matrix, Amber Midnight) and multiple display modes (Continuous Full Video, Raster Grid, Halftone Dots).

### **Demo 5: MediaPipe Body Skeleton Detection**
- **Concept:** AI vision & kinematic hierarchy.
- Re-introduces the live webcam as background and overlays deep learning body pose estimation in real-time.
- Tracks 33 anatomical landmarks (shoulders, elbows, wrists, hips, knees, ankles, head) with exponential moving average (EMA) smoothing and velocity tracking.
- Visualizes glowing neon bones, joint pulses, and hand/foot motion trails.

### **Demo 6: Fluid Particle Simulation & Body Motion**
- **Concept:** Kinetic coupling of human motion with viscous 2D Eulerian fluid mechanics.
- **Liquid Physics:** Incorporates 2D **bilinear velocity field interpolation**, **viscous momentum diffusion** (Laplacian spreading between neighboring fluid cells), and **vorticity swirls** (rotational eddies around moving limbs).
- Completely eliminates erratic random jitter/vibrations in favor of calm, graceful laminar liquid flow.
- Overdamped relaxation gently guides particles back to rest without bouncy spring oscillations.
- **Liquid Presets:** Water (oceanic currents), Liquid Ink (dense graceful ribbons), Viscous Honey/Glycerine, and Low-Friction Superfluid.
- **Rendering Modes:** Liquid Ribbons & Streaks (coalescing velocity strokes), Cohesive Droplets, and Droplet Mist.
- **Interaction:** Stirred softly by MediaPipe body limb velocities, filtered webcam optical motion vectors, and pointer drag.

### **Demo 7: ASCII Typographic Matrix**
- **Concept:** Maps luminance to typographic character density (` .:-=+*#%@`).
- Letterforms act as variable-density pixels.

### **Demo 8: Slit-Scan Live Video (Top-to-Bottom Delay)**
- **Concept:** Continuous rolling-shutter / spatiotemporal gradient in a **live video stream**.
- Unlike the static print slitscan (which builds a frozen panorama over space), this remains a **100% live moving video**.
- The top row shows the live camera ($t = 0$), while lower rows show progressively delayed frames from a 600-frame circular buffer.
- Moving your head, smiling, or waving creates elastic rubbery jelly distortions in real time.
- **Controls:** Delay depth (10 to 600 frames / up to 10.0s delay in real-time), time scale multiplier (1x up to 10s, 2x up to 20s, 3x up to 30s, 6x geological mode up to 60s / 1 full minute), slice count (12 to 140 horizontal bands), direction (Top-to-Bottom, Bottom-to-Top, Center-Out, Harmonic Sine Wave), time offset gauge toggle, and freeze buffer toggle.

### **Demo 9: Slit-Scan Print (Classic Photo-Finish Strip)**
- **Concept:** Classical photo-finish & slit-scan camera technique.
- Continuously extracts a narrow central 1-pixel vertical strip of the webcam and appends it horizontally across the screen over time.
- Stillness creates horizontal streaking lines, while motion across the slit renders expressive spatiotemporal portraits.
- **Controls:** Scan velocity, slit width, and active temporal needle guide.

---

## 🏛️ Code Architecture

The codebase follows an Object-Oriented, modular architecture using pure ES6 classes:

```
src/
├── main.js                     # Bootstrap entry point
├── core/
│   ├── App.js                  # Master application orchestrator & key bindings
│   ├── CameraManager.js        # getUserMedia, mirroring, canvas resize & offscreen sampling
│   └── DemoManager.js          # Demo lifecycle coordinator & transitions
├── demos/
│   ├── BaseDemo.js             # Abstract base class (setup, enter, update, render, getControls)
│   ├── Demo0_WebcamFeed.js     # Raw camera feed
│   ├── Demo1_RasterGrid.js     # Raster pixelation & center pixel sampling
│   ├── Demo2_CircularDots.js   # Circular dot grid
│   ├── Demo3_HalftoneLuminosity.js # Luminosity-driven radius
│   ├── Demo4_Duotone.js        # Two-color luminance gradient mapping
│   ├── Demo5_BodySkeleton.js   # MediaPipe Pose tracking & glowing skeleton
│   ├── Demo6_FluidParticles.js # Fluid velocity field & motion-driven particles
│   ├── Demo7_AsciiMatrix.js    # ASCII density matrix
│   ├── Demo8_SlitScanVideo.js  # Slit-scan live video with top-to-bottom delay
│   └── Demo9_SlitScanPrint.js  # Slit-scan classic strip accumulation print
├── vision/
│   └── PoseDetector.js         # MediaPipe PoseLandmarker wrapper, smoothing & velocity
├── simulation/
│   ├── ParticleSystem.js       # High-performance Float32Array 2D particle simulation
│   └── MotionTracker.js        # Optical frame differencing & motion vector estimation
├── ui/
│   ├── HUD.js                  # Navigation pills, concept cards & parameter drawers
│   └── Toast.js                # On-screen notifications
└── styles/
    └── style.css               # Clean dark-mode UI & typography
```

---

## 🔒 Privacy & Performance

- **100% Local Execution:** All image processing, pixel sampling, and MediaPipe neural network inferences execute entirely client-side using WebAssembly and WebGL/GPU acceleration. No camera frames or data are ever transmitted over the network.
- **60 FPS Optimization:** Downscaled offscreen canvases and typed arrays (`Float32Array`, `Uint8Array`) ensure silky-smooth 60fps animations even with high particle counts.
