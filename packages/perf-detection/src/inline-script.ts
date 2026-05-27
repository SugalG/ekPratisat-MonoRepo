/**
 * Pre-paint performance detection script.
 *
 * PRINCIPLE — VISUAL POLISH ONLY
 * ------------------------------
 * This system gates VISUAL POLISH ONLY. Misclassification must never
 * affect navigation, forms, uploads, authentication, data fetching,
 * listing creation, admin workflows, partner workflows, or backend
 * behavior. If a tier causes broken UI, fix the tier consumer/fallback.
 * Do not make functional code depend on this value.
 *
 * Hardware signals (cores/memory) are intentionally minimized because
 * privacy-protecting browsers (Brave with default Shields, Firefox with
 * privacy.resistFingerprinting, Tor) actively spoof them. `navigator.
 * hardwareConcurrency` is NOT read at all — capping cores to 2 is the
 * default fingerprint-protection behavior, and treating that as "weak
 * device" misclassifies capable hardware. Trust user-intent signals
 * (reduced-motion, saveData) and minimal memory floor instead.
 *
 * What this is
 * ------------
 * A self-contained string of JavaScript that is injected into the
 * <head> of every page consuming this package. It runs *before* React
 * hydrates (and before the first paint of any animated element), so
 * the document tree already has the correct `data-perf-tier` attribute
 * by the time the browser paints.
 *
 * Why a string and not a normal module
 * ------------------------------------
 * Next.js' <Script strategy="beforeInteractive"> requires the script
 * body as a string (or a `src` URL). Inlining as a string keeps it in
 * the initial HTML — no extra round-trip, no waiting for chunk loads,
 * no flash of the wrong tier.
 *
 * Why blocking is fine
 * --------------------
 * The script measures at well under 3ms on the slowest devices we care
 * about. It only reads from `navigator` / `matchMedia` / `localStorage`
 * — no DOM walks, no layout, no network.
 *
 * What it sets on <html>
 * ----------------------
 *   data-perf-tier         "full" | "balanced" | "lite"
 *   data-scroll-timeline   "true" | "false"   (CSS animation-timeline)
 *   data-reduce-motion     "true" | "false"   (OS preference)
 *   data-apple-webkit      "true" | "false"   (any Safari/WebKit)
 *   data-perf-reason       short string explaining why this tier
 *   data-browser-engine    "webkit" | "blink" | "gecko" | "unknown"
 *
 * Tier decision (priority order — first match wins)
 * -------------------------------------------------
 *   1. localStorage override (local hosts only)        → that tier
 *   2. prefers-reduced-motion                          → "lite"
 *   3. saveData OR slow effective network              → "lite"
 *   4. deviceMemory <= 2                               → "lite"
 *   5. iPad / iPadOS (any version, any hardware)       → "balanced"
 *   6. iPhone / iPod (any version, any hardware)       → "balanced"
 *   7. Otherwise                                       → "full"
 *
 * Notes on the rules
 * ------------------
 * - `navigator.hardwareConcurrency` (CPU cores) is INTENTIONALLY NOT
 *   used. Privacy browsers cap it to 2 by default, which would
 *   misclassify capable hardware (verified with i7-4790K + 32GB RAM +
 *   Brave reporting cores=2). Any future contributor tempted to
 *   reintroduce a "cores <= N" rule should read this comment first.
 *
 * - `deviceMemory <= 2` is the SOLE hardware-based guardrail. Real
 *   low-end devices (2GB RAM Tecno/Itel/Infinix phones common in
 *   emerging markets) genuinely report memory <= 2 and benefit from
 *   the lite tier. Privacy browsers also spoof memory but typically to
 *   bucketed values >= 4, so the floor isn't false-positive'd often.
 *
 * - `pointer: coarse` is intentionally NOT used as a downgrade signal.
 *   Almost every phone (including S21+, modern Pixels) has coarse
 *   pointer; downgrading on it would punish capable touch devices
 *   with no real benefit.
 *
 * - The detection is browser-engine-agnostic for non-Apple devices.
 *   Blink and Gecko (Android Chrome/Brave/Edge/Samsung/Firefox) all
 *   get "full" tier unless an explicit downgrade signal is present.
 *
 * - ALL iOS WebKit (any iPhone, any iPad, any iOS version) is forced
 *   to "balanced" because of an architectural limitation: iOS Safari
 *   throttles main-thread JS during native momentum scrolling, so
 *   any scroll-tied JS animation lags the actual scroll position.
 *   This is independent of hardware capability — verified visibly
 *   on iPhone 14 (slow-scroll capture shows logo lagging headline).
 *   Newer iPhones (15+, 16 Pro, etc) will have the same issue, and
 *   ProMotion 120Hz displays actually expose it MORE clearly.
 *   The proper fix is CSS `animation-timeline: scroll()` once
 *   iOS 26+ adoption is high (detected as `data-scroll-timeline`).
 *
 * - macOS desktop Safari is NOT forced to balanced — it has spare
 *   CPU/GPU headroom and no reported issues. If that changes, add
 *   a check for `isSafariBrowser && !isAppleTouch` here.
 */

export const PERF_DETECT_SCRIPT = `(function () {
  try {
    var html = document.documentElement;
    var nav = navigator;
    var ua = nav.userAgent || "";

    // --- Preference & network signals --------------------------------------
    var reducedMotion = false;
    try {
      reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {}

    var conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    var saveData = !!(conn && conn.saveData);
    var slowNetwork = !!(conn && conn.effectiveType &&
      /^(slow-2g|2g|3g)$/.test(conn.effectiveType));

    // --- Hardware capability (memory-only floor) --------------------------
    // navigator.hardwareConcurrency is INTENTIONALLY NOT READ — see the
    // docblock at the top of this file. Privacy browsers cap it to 2 by
    // default, which would misclassify capable hardware to lite.
    // Only deviceMemory <= 2 is used, as a floor for genuinely low-end
    // devices (2GB RAM phones common in emerging markets).
    var memory = (typeof nav.deviceMemory === "number") ? nav.deviceMemory : null;
    var veryLowHw = (memory !== null && memory <= 2);

    // --- WebKit / iOS / iPadOS detection ----------------------------------
    // iPadOS 13+ spoofs the macOS UA but still exposes touch points.
    var platform = nav.platform || "";
    var isIPad =
      /iPad/.test(ua) ||
      (platform === "MacIntel" && nav.maxTouchPoints > 1);

    // ANY iPhone is forced to "balanced". iOS Safari throttles
    // main-thread JS during native momentum scroll regardless of
    // hardware — verified on iPhone 14 with slow-scroll capture
    // showing the cinematic JS overlay lagging the headline.
    var isIPhone = /iPhone|iPod/.test(ua) && !isIPad;

    var isSafariBrowser = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
    var appleWebKit = isIPad || isIPhone || isSafariBrowser;

    // --- Browser engine (informational) -----------------------------------
    var engine = "unknown";
    if (appleWebKit && !/(Chrome|CriOS|FxiOS|EdgiOS)/.test(ua)) {
      engine = "webkit";
    } else if (/Firefox|FxiOS/.test(ua)) {
      engine = "gecko";
    } else if (/Chrome|CriOS|EdgiOS|Edg|OPR|SamsungBrowser|Brave/.test(ua) ||
               (typeof window.chrome !== "undefined")) {
      engine = "blink";
    }

    // --- Development override (only honored on local hosts) ---------------
    var override = null;
    var host = (window.location && window.location.hostname) || "";
    var isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.indexOf("192.168.") === 0 ||
      host.indexOf("10.") === 0 ||
      /^172\\.(1[6-9]|2\\d|3[0-1])\\./.test(host);
    if (isLocal) {
      try {
        var raw =
          window.localStorage.getItem("ekPerfTier") ||
          window.localStorage.getItem("ekHeroPerformanceMode");
        if (raw === "full" || raw === "balanced" || raw === "lite") {
          override = raw;
        }
      } catch (e) {}
    }

    // --- Decide tier (first match wins) -----------------------------------
    var tier;
    var reason;
    if (override) {
      tier = override;
      reason = "override";
    } else if (reducedMotion) {
      tier = "lite";
      reason = "reduced-motion";
    } else if (saveData || slowNetwork) {
      tier = "lite";
      reason = "save-data";
    } else if (veryLowHw) {
      tier = "lite";
      reason = "very-low-hw";
    } else if (isIPad) {
      tier = "balanced";
      reason = "ipad";
    } else if (isIPhone) {
      tier = "balanced";
      reason = "iphone";
    } else {
      tier = "full";
      reason = "capable";
    }

    // --- Progressive enhancement signal -----------------------------------
    var supportsTimeline = false;
    try {
      supportsTimeline =
        typeof CSS !== "undefined" &&
        typeof CSS.supports === "function" &&
        CSS.supports("animation-timeline: scroll()");
    } catch (e) {}

    // --- Commit attributes to the document root ---------------------------
    html.setAttribute("data-perf-tier", tier);
    html.setAttribute("data-scroll-timeline", supportsTimeline ? "true" : "false");
    html.setAttribute("data-reduce-motion", reducedMotion ? "true" : "false");
    html.setAttribute("data-apple-webkit", appleWebKit ? "true" : "false");
    html.setAttribute("data-perf-reason", reason);
    html.setAttribute("data-browser-engine", engine);
  } catch (e) {
    // Fail-safe: if anything blew up, pick the safest middle tier so
    // the page still renders correctly. "balanced" looks premium on
    // every device and avoids both the JS-scroll and overlay paths.
    try {
      var h = document.documentElement;
      h.setAttribute("data-perf-tier", "balanced");
      h.setAttribute("data-scroll-timeline", "false");
      h.setAttribute("data-reduce-motion", "false");
      h.setAttribute("data-apple-webkit", "false");
      h.setAttribute("data-perf-reason", "fallback");
      h.setAttribute("data-browser-engine", "unknown");
    } catch (e2) {}
  }
})();`;
