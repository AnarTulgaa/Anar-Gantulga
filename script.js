// The portfolio content and project disclosures work without JavaScript.
// Enhance the mobile navigation only when its controls are available.
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.getElementById("primary-nav");
const mobileViewport = window.matchMedia("(max-width: 800px)");

if (menuButton && navigation) {
  document.documentElement.classList.add("menu-enabled");
  menuButton.hidden = false;

  function setMenuOpen(open, restoreFocus = false) {
    navigation.classList.toggle("is-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    if (restoreFocus) menuButton.focus();
  }

  menuButton.addEventListener("click", () => {
    setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
  });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      const wasOpen = menuButton.getAttribute("aria-expanded") === "true";
      setMenuOpen(false);
      // Keep keyboard focus on visible content after the mobile menu closes.
      if (wasOpen && mobileViewport.matches) {
        const target = document.querySelector(event.target.closest("a").getAttribute("href"));
        if (target) {
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
          target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
        }
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false, true);
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".site-header")) setMenuOpen(false);
  });

  mobileViewport.addEventListener("change", () => setMenuOpen(false));
}

// Smooth only recognizable, discrete desktop wheel steps. Fine-grained input
// remains native, including the rest of a gesture once trackpad input is seen.
(() => {
  const WHEEL_MULTIPLIER = 0.75;
  const WHEEL_DURATION = 180; // ms; finite settling, no perpetual inertia loop.
  const desktop = window.matchMedia("(min-width: 801px) and (hover: hover) and (pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let start = 0;
  let target = 0;
  let started = 0;
  let writtenY = 0;
  let lastWheel = 0;
  let nativeGesture = false;

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function tick(time) {
    const progress = Math.min(1, (time - started) / WHEEL_DURATION);
    const eased = 1 - (1 - progress) ** 3;
    window.scrollTo({ top: start + (target - start) * eased, behavior: "instant" });
    writtenY = window.scrollY;
    frame = progress < 1 ? requestAnimationFrame(tick) : 0;
  }

  window.addEventListener("wheel", (event) => {
    const now = performance.now();
    if (now - lastWheel > 240) nativeGesture = false;
    lastWheel = now;
    const mode = event.deltaMode;
    const amount = Math.abs(event.deltaY);
    const discrete = mode === 1 || (mode === 0 && amount >= 100 &&
      (amount % 100 === 0 || amount % 120 === 0));
    if (!discrete) nativeGesture = true;
    if (!desktop.matches || reducedMotion.matches || nativeGesture ||
        !event.cancelable || event.defaultPrevented || event.ctrlKey || event.metaKey ||
        event.altKey || event.shiftKey || event.deltaX || !amount || mode === 2) {
      stop();
      return;
    }
    // Embedded controls and independently scrollable areas keep their behavior.
    for (const node of event.composedPath()) {
      if (!(node instanceof HTMLElement) || node === document.body || node === document.documentElement) continue;
      if (node.matches("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) {
        stop();
        return;
      }
      if (node.scrollHeight > node.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(node).overflowY)) {
        stop();
        return;
      }
    }
    const y = window.scrollY;
    const delta = event.deltaY * (mode === 1 ? 20 : 1) * WHEEL_MULTIPLIER;
    const maximum = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    if ((delta < 0 && y <= 0) || (delta > 0 && y >= maximum)) {
      stop();
      return;
    }
    event.preventDefault();
    const reversing = frame && Math.sign(delta) !== Math.sign(target - y);
    const base = frame && !reversing ? target : y;
    const backlog = Math.min(420, innerHeight * 0.5);
    target = Math.max(0, Math.min(maximum, y + Math.max(-backlog, Math.min(backlog, base + delta - y))));
    start = y;
    started = now;
    stop();
    // Interrupt any browser anchor animation before taking over a wheel step.
    window.scrollTo({ top: y, behavior: "instant" });
    writtenY = window.scrollY;
    frame = requestAnimationFrame(tick);
  }, { passive: false });

  // Native navigation, focus, scrollbar drags, touch, and external scrolls win.
  window.addEventListener("scroll", () => {
    if (frame && Math.abs(window.scrollY - writtenY) > 2) stop();
  }, { passive: true });
  for (const type of ["pointerdown", "touchstart", "keydown", "focusin", "hashchange", "blur", "resize", "pagehide"]) {
    window.addEventListener(type, stop, { passive: true });
  }
  document.addEventListener("click", (event) => {
    if (event.target.closest("a")) stop();
  });
  desktop.addEventListener("change", stop);
  reducedMotion.addEventListener("change", stop);
})();

// Repeatable reveals use stable layout coordinates, never animated rectangles.
// One observer and one passive, frame-scheduled scroll handler share the work.
(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!window.IntersectionObserver || !Element.prototype.animate) return;

  const pending = new Map(); // Persistent choreography, retained across visits.
  const states = new Map();
  const active = new Map();
  let observer;
  let frame = 0;
  let lastY = window.scrollY;
  let directionY = lastY;
  let lastTime = performance.now();
  let velocity = 0;
  let direction = 1;
  let disabled = false;
  let measure = true;
  const mobile = window.matchMedia("(max-width: 800px)");

  function finish(element) {
    element.classList.remove("motion-pending");
    active.get(element)?.cancel();
    active.delete(element);
    states.get(element).ready = false;
  }

  function reveal(element, immediate = false, rate = 1) {
    const settings = pending.get(element);
    if (!states.get(element).ready) return;
    finish(element);
    if (immediate || reducedMotion.matches || disabled) return;
    const distance = mobile.matches ? 0.55 : 1;
    const animation = element.animate([
      { opacity: 0, translate: `${settings.x * distance * direction}px ${settings.y * distance * direction}px`,
        scale: settings.scale, filter: `blur(${settings.blur}px)` },
      { opacity: 1, translate: "0px 0px", scale: 1, filter: "blur(0px)" }
    ], {
      duration: settings.duration, delay: rate > 1.3 ? 0 : settings.delay,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards"
    });
    animation.playbackRate = rate;
    active.set(element, animation);
    animation.onfinish = () => {
      active.delete(element);
      animation.cancel();
    };
  }

  function group(selector, options = {}) {
    document.querySelectorAll(selector).forEach((element, index) => {
      pending.set(element, {
        x: 0, y: 80, scale: 1, blur: 4, duration: 1600,
        delay: (index % 3) * 120, ...options
      });
    });
  }

  function update() {
    frame = 0;
    const y = window.scrollY;
    const delta = y - lastY;
    const now = performance.now();
    const elapsed = Math.max(16, now - lastTime);
    velocity = Math.max(Math.abs(delta) / elapsed, velocity * Math.exp(-elapsed / 100));
    if (delta !== 0) lastTime = now;
    if (Math.abs(y - directionY) > 2) {
      direction = y > directionY ? 1 : -1;
      directionY = y;
    }
    const speed = velocity * 1000 / innerHeight; // Viewports per second.
    const fast = speed > 2.4 || Math.abs(delta) > innerHeight * 0.45;
    const rate = 1 + Math.min(4, Math.max(0, speed - 0.35) * 2);
    const lead = 180 + Math.min(120, velocity * 150);
    lastY = y;
    if (measure) {
      for (const [element, state] of states) {
        // offset geometry ignores our translate/scale and avoids observer loops.
        let top = 0;
        for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
        state.top = top;
        state.height = element.offsetHeight;
      }
      measure = false;
    }
    for (const [element, state] of states) {
      const top = state.top - y;
      const bottom = top + state.height;
      if (reducedMotion.matches || disabled || element.contains(document.activeElement)) {
        finish(element);
      } else if (bottom < -420 || top > innerHeight + 420) {
        // Reset only beyond the viewport plus a buffer. Small reversals never
        // restart a visible entrance, even when its transform crosses an edge.
        active.get(element)?.cancel();
        active.delete(element);
        state.ready = true;
        element.classList.add("motion-pending");
      } else if (bottom > -lead && top < innerHeight + lead) {
        const reading = direction > 0 ? top < innerHeight * 0.75 : bottom > innerHeight * 0.25;
        if (state.ready) {
          reveal(element, fast || (delta !== 0 && reading), rate);
        } else if (active.has(element)) {
          const animation = active.get(element);
          if (fast || (delta !== 0 && reading)) {
            finish(element);
          } else if (rate > 1.3) {
            // Remove only the remaining stagger; retain the current visual pose.
            const timing = animation.effect.getTiming();
            if (animation.currentTime < timing.delay) animation.currentTime = timing.delay;
            animation.updatePlaybackRate(Math.max(animation.playbackRate, rate));
          }
        }
      }
    }
  }

  function scheduleCheck() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function refresh() {
    measure = true;
    scheduleCheck();
  }

  try {
    group(".hero-intro", { y: 35, duration: 1400, delay: 0 });
    group(".hero-line", { y: 90, delay: 0 });
    document.querySelectorAll(".hero-line").forEach((element, index) => {
      pending.get(element).delay = 90 + index * 120;
    });
    group(".hero-description", { delay: 340, y: 55 });
    group(".hero-actions", { delay: 440, y: 45, blur: 0 });
    group(".portrait", { x: 70, y: 20, scale: 0.97, blur: 0, delay: 160, duration: 1800 });
    group(".hero-note", { delay: 280, y: 40 });
    group(".capability-list > li", { y: 45 });
    group(".perspective-strip, .section-heading > *, #about > .eyebrow, #about-title, .group-heading", { delay: 0 });
    document.querySelectorAll(".project-panel").forEach((panel, index) => {
      const reverse = index % 2 ? -1 : 1;
      pending.set(panel.querySelector(".project-image"), {
        x: -70 * reverse, y: 25, scale: 0.97, blur: 0, duration: 1800, delay: 0
      });
      panel.querySelectorAll(".project-copy > *").forEach((element, detail) => {
        pending.set(element, { x: 60 * reverse, y: 35, scale: 1,
          blur: 4, duration: 1600, delay: Math.min(detail * 110, 330) });
      });
    });
    group(".project-disclosure", { y: 45, blur: 0 });
    group(".about-copy > *", { y: 70 });
    group(".skill-card", { scale: 0.98, blur: 0 });
    group(".ai-panel, .soft-skill-list", { y: 55, delay: 0, blur: 0 });
    group(".experience-meta, .experience-content", { y: 65, blur: 0 });
    group(".education-card", { y: 60, scale: 0.98, blur: 0 });
    group(".contact-top, #contact-title, .contact-bottom, .contact-links", { y: 80 });

    group(".site-footer > *", { y: 45, blur: 0 });
    observer = new IntersectionObserver(scheduleCheck, {
      rootMargin: "420px 0px 420px 0px", threshold: 0
    });
    for (const element of pending.keys()) {
      states.set(element, { ready: true, top: 0, height: 0 });
      observer.observe(element);
    }
    update();
    window.addEventListener("scroll", scheduleCheck, { passive: true });
    window.addEventListener("resize", refresh, { passive: true });
    window.addEventListener("pageshow", refresh);
    document.addEventListener("toggle", refresh, true);
    document.addEventListener("load", refresh, true);
    document.addEventListener("focusin", () => {
      for (const element of states.keys()) {
        if (element.contains(document.activeElement)) finish(element);
      }
    });
    // Accordion height animations alter downstream layout between toggle events.
    const disclosureResize = new ResizeObserver(refresh);
    document.querySelectorAll(".project-disclosure").forEach((details) => {
      disclosureResize.observe(details);
    });
    reducedMotion.addEventListener("change", scheduleCheck);
  } catch {
    disabled = true;
    for (const element of states.keys()) finish(element);
    observer?.disconnect();
  }
})();

// Keep native details/summary semantics, enhancing only the height transition.
// Measuring again on every click makes reversal and late-loading images safe.
document.querySelectorAll(".project-disclosure").forEach((details) => {
  const summary = details.querySelector("summary");
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let animation;
  let expanded = details.open;

  function settle() {
    animation?.cancel();
    animation = null;
    details.open = expanded;
    details.style.removeProperty("overflow");
  }

  summary.addEventListener("click", (event) => {
    if (motionPreference.matches || !details.animate) return;
    event.preventDefault();
    const start = details.getBoundingClientRect().height;
    expanded = animation ? !expanded : !details.open;
    animation?.cancel();
    details.open = true;
    const end = expanded ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height;
    details.style.overflow = "hidden";
    animation = details.animate([{ height: `${start}px` }, { height: `${end}px` }], {
      duration: 440, easing: "cubic-bezier(0.22, 1, 0.36, 1)"
    });
    animation.onfinish = settle;
  });
  motionPreference.addEventListener("change", () => { if (animation) settle(); });
  window.addEventListener("resize", () => { if (animation) settle(); }, { passive: true });
  details.querySelectorAll("img").forEach((img) => {
    img.addEventListener("load", () => { if (animation) settle(); });
  });
});
