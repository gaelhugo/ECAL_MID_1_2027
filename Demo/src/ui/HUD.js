import { Toast } from "./Toast.js";

/**
 * HUD
 * Modern on-screen heads-up display managing navigation pills,
 * concept explainer cards, dynamic parameters drawer, Showcase Tour button,
 * and live hardware metrics.
 */
export class HUD {
  /**
   * @param {import('../core/DemoManager.js').DemoManager} demoManager
   * @param {import('../core/CameraManager.js').CameraManager} cameraManager
   * @param {import('../vision/PoseDetector.js').PoseDetector} poseDetector
   */
  constructor(demoManager, cameraManager, poseDetector) {
    this.demoManager = demoManager;
    this.camera = cameraManager;
    this.poseDetector = poseDetector;
    this.toast = new Toast();
    this.showcase = null;

    this.container = document.getElementById("hud-container");
    this.navContainer = document.getElementById("demo-nav");
    this.tagEl = document.getElementById("demo-index-tag");
    this.titleEl = document.getElementById("demo-title");
    this.descEl = document.getElementById("demo-description");
    this.fpsEl = document.getElementById("meta-fps");
    this.resEl = document.getElementById("meta-res");
    this.aiStatusEl = document.getElementById("meta-ai-status");
    this.controlsDrawer = document.getElementById("controls-drawer");
    this.controlsContent = document.getElementById("controls-content");

    this.currentControlBindings = new Map();
    this.activeDemoInstance = null;
    this.isHidden = false;

    this.setupNavigationPills();
    this.bindEvents();

    // Listen for demo changes
    this.demoManager.onDemoChange((demo, idx) => {
      this.updateActiveDemo(demo, idx);
    });
  }

  /**
   * Attaches the ShowcaseController instance to wire up UI buttons and progress indicators
   * @param {import('../core/ShowcaseController.js').ShowcaseController} showcase
   */
  setShowcase(showcase) {
    this.showcase = showcase;

    const btnShowcase = document.getElementById("btn-toggle-showcase");
    const iconPlay = btnShowcase?.querySelector(".tour-icon-play");
    const iconPause = btnShowcase?.querySelector(".tour-icon-pause");
    const label = document.getElementById("tour-label");
    const progressBar = document.getElementById("tour-progress-bar");

    btnShowcase?.addEventListener("click", () => {
      this.showcase.toggle();
    });

    this.showcase.onStateChange((isRunning) => {
      if (btnShowcase) {
        btnShowcase.classList.toggle("active", isRunning);
      }
      if (iconPlay) iconPlay.style.display = isRunning ? "none" : "block";
      if (iconPause) iconPause.style.display = isRunning ? "block" : "none";
      if (label) label.textContent = isRunning ? "Touring" : "Tour";
      this.toast.show(
        isRunning ? "Auto Showcase Tour Started" : "Auto Showcase Tour Paused",
      );
    });

    this.showcase.onProgress((p, elapsed, total) => {
      if (progressBar) {
        progressBar.style.width = `${(p * 100).toFixed(1)}%`;
      }
    });

    // Re-render controls if currently displayed
    if (this.activeDemoInstance) {
      this.renderControls(this.activeDemoInstance);
    }
  }

  setupNavigationPills() {
    this.navContainer.innerHTML = "";
    const demos = this.demoManager.demos;

    demos.forEach((d, index) => {
      const btn = document.createElement("button");
      btn.className = `demo-tab-btn ${index === 0 ? "active" : ""}`;
      btn.dataset.index = index;

      btn.innerHTML = `
        <span class="tab-num">${d.id}</span>
        <span class="tab-name">${d.title}</span>
      `;

      btn.addEventListener("click", () => {
        this.demoManager.switchTo(index);
      });

      this.navContainer.appendChild(btn);
    });
  }

  bindEvents() {
    // Prev / Next buttons
    document.getElementById("btn-prev-demo")?.addEventListener("click", () => {
      this.demoManager.prev();
    });

    document.getElementById("btn-next-demo")?.addEventListener("click", () => {
      this.demoManager.next();
    });

    // Mirror button
    const btnMirror = document.getElementById("btn-toggle-mirror");
    btnMirror?.addEventListener("click", () => {
      const isMirrored = this.camera.toggleMirror();
      btnMirror.classList.toggle("active", isMirrored);
      this.toast.show(isMirrored ? "Camera Mirrored" : "Camera Normal");
    });

    // Fullscreen button
    const btnFullscreen = document.getElementById("btn-toggle-fullscreen");
    btnFullscreen?.addEventListener("click", () => {
      this.toggleFullscreen();
    });

    // Hide HUD button
    const btnHud = document.getElementById("btn-toggle-hud");
    btnHud?.addEventListener("click", () => {
      this.toggleVisibility();
    });

    // Parameters drawer collapse toggle
    const drawerHeader = document.querySelector(".controls-drawer-header");
    drawerHeader?.addEventListener("click", () => {
      this.controlsDrawer.classList.toggle("collapsed");
    });

    // Close parameters drawer if user clicks outside
    document.addEventListener("pointerdown", (e) => {
      if (
        !this.controlsDrawer ||
        this.controlsDrawer.classList.contains("collapsed")
      )
        return;
      if (!this.controlsDrawer.contains(e.target)) {
        this.controlsDrawer.classList.add("collapsed");
      }
    });

    // Prevent any ancestor window or document horizontal scrolling
    window.addEventListener(
      "scroll",
      () => {
        if (window.scrollX !== 0 || window.scrollY !== 0) {
          window.scrollTo(0, 0);
        }
      },
      { passive: true },
    );
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      this.toast.show("Fullscreen Mode (Press F or Esc to exit)");
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  toggleVisibility() {
    this.isHidden = !this.isHidden;
    this.container.classList.toggle("hud-hidden", this.isHidden);
    this.toast.show(
      this.isHidden ? "UI Hidden (Press Esc or H to restore)" : "UI Restored",
    );
  }

  updateActiveDemo(demo, index) {
    // 1. Update pills
    const pills = this.navContainer.querySelectorAll(".demo-tab-btn");
    pills.forEach((p) => {
      const pIdx = parseInt(p.dataset.index, 10);
      if (pIdx === index) {
        p.classList.add("active");
        // Smoothly scroll ONLY within navContainer carousel; never trigger window scrolling
        const containerWidth = this.navContainer.clientWidth;
        const pillLeft = p.offsetLeft;
        const pillWidth = p.offsetWidth;
        const targetScroll = pillLeft - containerWidth / 2 + pillWidth / 2;
        this.navContainer.scrollTo({
          left: Math.max(0, targetScroll),
          behavior: "smooth",
        });
      } else {
        p.classList.remove("active");
      }
    });

    // Ensure window horizontal scroll offset stays strictly at 0
    if (window.scrollX !== 0 || window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }

    // 2. Update concept card
    if (this.tagEl) this.tagEl.textContent = `DEMO ${demo.id}`;
    if (this.titleEl) this.titleEl.textContent = demo.title;
    if (this.descEl) this.descEl.textContent = demo.description;

    // 3. Update parameters drawer
    this.renderControls(demo);

    this.toast.show(`Demo ${demo.id}: ${demo.title}`);
  }

  renderControls(demo) {
    this.activeDemoInstance = demo;
    this.currentControlBindings.clear();

    if (!this.controlsContent) return;
    this.controlsContent.innerHTML = "";

    const controls = demo.getControls();
    if (controls && controls.length > 0) {
      controls.forEach((ctrl) => {
        const group = document.createElement("div");
        group.className = "control-group";

        if (ctrl.type === "range") {
          const labelRow = document.createElement("div");
          labelRow.className = "control-label-row";

          const label = document.createElement("label");
          label.textContent = ctrl.label;

          const valDisplay = document.createElement("span");
          valDisplay.className = "control-val-display";
          valDisplay.textContent = ctrl.formatter
            ? ctrl.formatter(ctrl.value)
            : `${ctrl.value}${ctrl.unit || ""}`;

          labelRow.appendChild(label);
          labelRow.appendChild(valDisplay);

          const input = document.createElement("input");
          input.type = "range";
          input.min = ctrl.min;
          input.max = ctrl.max;
          input.step = ctrl.step || 1;
          input.value = ctrl.value;

          input.addEventListener("input", (e) => {
            const val = parseFloat(e.target.value);
            demo.setParam(ctrl.id, val);
            valDisplay.textContent = ctrl.formatter
              ? ctrl.formatter(val)
              : `${val}${ctrl.unit || ""}`;
          });

          group.appendChild(labelRow);
          group.appendChild(input);
          this.currentControlBindings.set(ctrl.id, { ctrl, input, valDisplay });
        } else if (ctrl.type === "toggle") {
          const toggleRow = document.createElement("label");
          toggleRow.className = "control-toggle-row";

          const label = document.createElement("span");
          label.textContent = ctrl.label;

          const switchEl = document.createElement("span");
          switchEl.className = "switch";

          const input = document.createElement("input");
          input.type = "checkbox";
          input.checked = !!ctrl.value;

          const slider = document.createElement("span");
          slider.className = "slider-round";

          input.addEventListener("change", (e) => {
            demo.setParam(ctrl.id, e.target.checked);
          });

          switchEl.appendChild(input);
          switchEl.appendChild(slider);
          toggleRow.appendChild(label);
          toggleRow.appendChild(switchEl);
          group.appendChild(toggleRow);
          this.currentControlBindings.set(ctrl.id, { ctrl, input });
        } else if (ctrl.type === "select") {
          const label = document.createElement("label");
          label.className = "control-label-row";
          label.textContent = ctrl.label;

          const select = document.createElement("select");
          select.className = "control-select";

          ctrl.options.forEach((opt) => {
            const optEl = document.createElement("option");
            optEl.value = opt.value;
            optEl.textContent = opt.label;
            if (opt.value === ctrl.value) optEl.selected = true;
            select.appendChild(optEl);
          });

          select.addEventListener("change", (e) => {
            demo.setParam(ctrl.id, e.target.value);
          });

          group.appendChild(label);
          group.appendChild(select);
          this.currentControlBindings.set(ctrl.id, { ctrl, input: select });
        }

        this.controlsContent.appendChild(group);
      });
    } else {
      const emptyNotice = document.createElement("div");
      emptyNotice.style.fontSize = "12px";
      emptyNotice.style.color = "var(--text-dim)";
      emptyNotice.style.fontStyle = "italic";
      emptyNotice.textContent = "No adjustable parameters for this demo.";
      this.controlsContent.appendChild(emptyNotice);
    }

    // Append Showcase Tour Settings
    this.renderShowcaseSettings();
  }

  renderShowcaseSettings() {
    if (!this.showcase || !this.controlsContent) return;

    const divider = document.createElement("div");
    divider.className = "controls-section-divider";
    divider.innerHTML = `
      <div class="controls-section-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Auto Showcase Tour</span>
      </div>
    `;
    this.controlsContent.appendChild(divider);

    // Duration slider (minimal length per demo)
    const durationGroup = document.createElement("div");
    durationGroup.className = "control-group";

    const labelRow = document.createElement("div");
    labelRow.className = "control-label-row";

    const label = document.createElement("label");
    label.textContent = "Demo Duration (min length)";

    const valDisplay = document.createElement("span");
    valDisplay.className = "control-val-display";
    valDisplay.textContent = `${this.showcase.minDemoDuration}s`;

    labelRow.appendChild(label);
    labelRow.appendChild(valDisplay);

    const input = document.createElement("input");
    input.type = "range";
    input.min = 4;
    input.max = 300;
    input.step = 1;
    input.value = this.showcase.minDemoDuration;

    input.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      this.showcase.setMinDuration(val);
      valDisplay.textContent = `${val}s`;
    });

    durationGroup.appendChild(labelRow);
    durationGroup.appendChild(input);
    this.controlsContent.appendChild(durationGroup);

    // Auto-Evolve parameters toggle
    const toggleRow = document.createElement("label");
    toggleRow.className = "control-toggle-row";

    const toggleLabel = document.createElement("span");
    toggleLabel.textContent = "Evolve Parameters in Live";

    const switchEl = document.createElement("span");
    switchEl.className = "switch";

    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.checked = this.showcase.autoAnimateParams;

    const slider = document.createElement("span");
    slider.className = "slider-round";

    toggleInput.addEventListener("change", (e) => {
      this.showcase.autoAnimateParams = e.target.checked;
    });

    switchEl.appendChild(toggleInput);
    switchEl.appendChild(slider);
    toggleRow.appendChild(toggleLabel);
    toggleRow.appendChild(switchEl);
    this.controlsContent.appendChild(toggleRow);
  }

  /**
   * Synchronizes input elements in the parameter drawer with live animated values
   * @param {import('../demos/BaseDemo.js').BaseDemo} demo
   */
  syncControls(demo) {
    if (!this.currentControlBindings || this.currentControlBindings.size === 0)
      return;
    if (this.activeDemoInstance !== demo) return;

    for (const [id, binding] of this.currentControlBindings) {
      const val = demo.params[id];
      if (val === undefined) continue;

      if (binding.ctrl.type === "range") {
        const cur = parseFloat(binding.input.value);
        if (Math.abs(cur - val) > 0.005) {
          binding.input.value = val;
          if (binding.valDisplay) {
            binding.valDisplay.textContent = binding.ctrl.formatter
              ? binding.ctrl.formatter(val)
              : `${val}${binding.ctrl.unit || ""}`;
          }
        }
      } else if (binding.ctrl.type === "select") {
        if (binding.input.value !== val) {
          binding.input.value = val;
        }
      } else if (binding.ctrl.type === "toggle") {
        if (binding.input.checked !== !!val) {
          binding.input.checked = !!val;
        }
      }
    }
  }

  updateMetrics(fps) {
    if (this.fpsEl) {
      this.fpsEl.textContent = fps;
    }

    if (this.resEl && this.camera.isReady) {
      this.resEl.textContent = `${this.camera.displayWidth}×${this.camera.displayHeight}`;
    }

    if (this.aiStatusEl) {
      if (this.poseDetector.isLoading) {
        this.aiStatusEl.textContent = "Loading AI...";
        this.aiStatusEl.className = "meta-val badge-status loading";
      } else if (this.poseDetector.error) {
        this.aiStatusEl.textContent = "CPU Fallback";
        this.aiStatusEl.className = "meta-val badge-status error";
      } else if (this.poseDetector.smoothedLandmarks) {
        this.aiStatusEl.textContent = "33 Nodes Active";
        this.aiStatusEl.className = "meta-val badge-status";
      } else if (this.poseDetector.isReady) {
        this.aiStatusEl.textContent = "Pose Ready";
        this.aiStatusEl.className = "meta-val badge-status";
      }
    }
  }
}
