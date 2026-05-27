# @repo/perf-detection — Architecture & Workflow

> **Audience:** any future engineer working on hero animations, navbar
> behavior, or other scroll/perf-sensitive UI in any of the
> ekPratishat apps (client, admin, partner, future agent app).
>
> **Goal of this doc:** explain *why* this package exists, *how* it
> works end-to-end, and *what the discipline rules are* so the system
> stays scalable as the platform grows.

---

## 1. Why this package exists

### The original problem

The hero on the homepage runs several visual layers concurrently:

- A background video (light/dark variants, autoplay, loop).
- A scroll-tied logo transition that flies the hero logo into the
  navbar slot as the user scrolls.
- A navbar background that fades from transparent to solid past a
  scroll threshold.
- A perspective card stack (Buy/Rent/Sell) that auto-rotates every 3s.

On desktop and modern Android phones (e.g. Snapdragon 888+), this is
flawless.

On **all iOS WebKit devices (any iPhone, any iPad, any iOS version)
and weak Android hardware**, the per-frame JS scroll handler that
drives the cinematic logo lags behind iOS Safari's native momentum
scroll. The result is visible jitter and a "logo overlapping the
headline" effect mid-scroll.

This is **architectural to iOS Safari, not hardware-dependent**.
WebKit throttles main-thread JS during native momentum scrolling
to keep the scroll itself smooth — which means scroll-tied JS
animation always lags. Verified visibly on iPhone 14 via slow-scroll
capture (the logo trails behind, then collides with the headline).
Newer iPhones (15, 16, future) will have the same issue; in fact,
ProMotion 120Hz displays make it MORE visible (compositor renders
~2× faster than JS can possibly update).

### What we tried to avoid

- **Per-component perf detection.** Each animated component re-deriving
  capability signals would scale poorly, drift over time, and create
  inconsistent behavior across the platform.
- **Always-on heavy mode.** Premium on flagships, broken everywhere
  else.
- **Always-on light mode.** Mediocre on every device. Kills brand.
- **Server-side User-Agent gating.** Would require `Vary: User-Agent`
  on the CDN, which shreds cache hit rate at scale.
- **A fixed-position snap-dock overlay** as the cross-tier "middle
  path." Tried and abandoned — see "What we tried and removed" below.

### What this package does instead

A single capability-detection pass runs **once, before paint, before
React hydrates**. The result is committed to `<html>` as data
attributes. Both CSS rules and the React hook read from those
attributes — they are the single source of truth. Detection cost is
paid once per page load, never per component, never per render.

### What we tried and removed: the snap-dock overlay

An earlier iteration of this package shipped a `SnapDockLogo`
component for the balanced tier — a fixed-position overlay that
animated from the hero slot's viewport position to the navbar slot
via CSS. It was structurally flawed:

- The overlay was anchored to the viewport position the hero slot
  occupied at scrollY=0.
- As the user scrolled (before the dock threshold fired), the page
  scrolled up under the overlay; the overlay stayed put.
- The headline (which was *below* the logo originally) scrolled UP
  into the overlay's pinned position.
- For a brief moment, the overlay visibly collided with the headline.
- The dock animation then snapped the overlay to the navbar.

We replaced it with the **cross-fade handoff** (see Section 3),
which is the same approach Compass, Sotheby's, and Zillow use on
mobile: the in-flow hero logo simply scrolls away with the page;
the static navbar logo cross-fades in once the dock threshold fires.
No overlay, no fixed-position assumption, no possibility of
visually colliding with anything.

---

## 2. The three tiers

The tier names are internal (`full | balanced | lite`) for backward
compatibility with the existing `useHeroPerformanceMode` hook. The
**design language** is what matters when making decisions:

```
┌────────────┬──────────────────────┬───────────────────────────────────┐
│ Tier value │ Design language      │ Audience                          │
├────────────┼──────────────────────┼───────────────────────────────────┤
│ "full"     │ Cinematic premium    │ Capable non-iOS devices (desktop, │
│            │                      │ modern Android Chrome/Brave/etc)  │
│ "balanced" │ Editorial premium    │ All iOS WebKit (any iPhone / iPad │
│            │                      │ / iOS version), mid-range hardware│
│ "lite"     │ Clean premium        │ Reduced-motion, save-data, weak HW│
└────────────┴──────────────────────┴───────────────────────────────────┘
```

### What each tier does today

| Tier        | Logo behavior                                                   | Card stack       | Background video |
| ----------- | --------------------------------------------------------------- | ---------------- | ---------------- |
| `full`      | Scroll-tied JS overlay (cinematic flying logo)                  | Full intensity   | Loop on          |
| `balanced`  | Cross-fade between in-flow hero logo and static navbar logo     | 0.72 intensity   | Loop, deferred   |
| `lite`      | Same cross-fade, instant (no transition for reduced-motion)     | 0.50 intensity   | Poster only      |

### The "never a downgrade" principle

> Balanced is not "Full minus things." Lite is not "Balanced minus
> things." Each tier is its own choreography.

Concrete examples in the current implementation:

- **Cinematic logo** — JS scroll handler interpolates position
  continuously. Strong devices handle the per-frame work without
  jitter; the result feels physical and reactive.
- **Editorial logo** — natural document scroll moves the in-flow hero
  logo off-screen (just like any other content); the navbar logo
  fades in at the dock threshold via CSS. No overlay, no path
  collision possible. This is what most premium real estate sites
  use on tablet/mobile.
- **Clean logo** — same cross-fade, but with the OS-level
  reduced-motion preference respected: instant handoff, no opacity
  transition, deterministic.

---

## 3. Data-flow diagram

```
            ┌────────────────────────────────────────────┐
            │  HTML parse                                │
            │  └─ <head> reaches inline <script>         │
            │     └─ PERF_DETECT_SCRIPT runs (1–3 ms)    │
            │        ├─ reads matchMedia / navigator     │
            │        ├─ honors localStorage override     │
            │        │  (local hosts only)               │
            │        └─ sets <html data-perf-tier="..."  │
            │                       data-scroll-timeline │
            │                       data-reduce-motion   │
            │                       data-apple-webkit    │
            │                       data-perf-reason     │
            │                       data-browser-engine> │
            └────────────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────────────┐
            │  First paint                               │
            │  └─ CSS rules in perf-mode.css match        │
            │     against [data-perf-tier="..."]         │
            │     instantly. No flash, no swap.          │
            └────────────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────────────┐
            │  React hydration                            │
            │  └─ usePerfTier()                           │
            │     ├─ initial render: SAFE_DEFAULT_STATE  │
            │     │  (isMounted: false)                   │
            │     ├─ post-mount effect:                   │
            │     │  └─ readStateFromDom()                │
            │     │     reads attributes → real tier      │
            │     └─ subscribes to:                       │
            │        ├─ matchMedia "reduce-motion"        │
            │        └─ navigator.connection.change       │
            └────────────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────────────┐
            │  Live session                               │
            │  └─ User toggles OS reduced-motion          │
            │     → matchMedia fires                      │
            │     → redetectAndCommit()                   │
            │     → <html> attributes updated             │
            │     → CSS reapplies + React re-renders      │
            └────────────────────────────────────────────┘
```

---

## 4. The detection signals (and why each exists)

Every signal must justify its presence. If a signal doesn't change a
CSS branch or a tier decision, it's noise — remove it.

| Signal                            | Source                                   | Tier impact                        |
| --------------------------------- | ---------------------------------------- | ---------------------------------- |
| `prefers-reduced-motion`          | `matchMedia(...)`                        | → `lite` if reduce                 |
| `connection.saveData`             | Network Information API (optional)       | → `lite` if true                   |
| `connection.effectiveType`        | Network Information API (optional)       | → `lite` if 2g/3g/slow-2g          |
| `navigator.deviceMemory <= 2`     | Chromium-only, optional                  | → `lite` (sole hardware floor)     |
| iPad detection (UA + maxTouchPoints) | UA + iPadOS spoof check               | → `balanced` (iPad / iPadOS)       |
| iPhone / iPod (any iOS version)   | UA match `/iPhone\|iPod/`                | → `balanced` (iOS Safari scroll)   |
| `CSS.supports("animation-timeline: scroll()")` | feature detection           | → enables future progressive enhancement |

### Signals we deliberately do NOT use

| Signal                      | Why not                                                                  |
| --------------------------- | ------------------------------------------------------------------------ |
| `navigator.hardwareConcurrency` (cores) | Privacy browsers (Brave default Shields, Firefox `privacy.resistFingerprinting`, Tor) cap reported cores to 2 to reduce fingerprintability. Treating cores ≤ 2 as "weak device" misclassifies capable hardware (verified: i7-4790K + 32 GB RAM + Brave reports cores=2). We don't even read this signal — leaving it out of the script removes the temptation for future devs to reintroduce a `cores <= N` rule. |
| Memory thresholds above 2 (mid-range tier) | A mid-range `balanced` triggered by `memory <= 3` was overly aggressive — most capable mid-range Androids report memory bucketed to 4 or 8, but spoof-protected browsers can also land here unpredictably. Collapsed to single `<= 2` floor + iOS-only `balanced` for cleaner rules. |
| `pointer: coarse`           | Almost every phone has it. Downgrading here punishes capable touch       |
|                             | devices (S21+, modern Pixels, modern iPhones) for no benefit.             |
| `width < 1180`              | Catches every mobile device including very capable ones. Hardware checks |
|                             | (memory) and platform checks (iPad, old iOS) are more accurate.          |
| User-Agent brand allowlist  | Capability is what matters, not vendor. We only use UA for the two       |
|                             | known structural cases (iPad spoofs Mac, older iOS lacks scroll fixes).  |

### Decision priority (first match wins)

```
1. localStorage override (local hosts only) — highest priority
2. prefers-reduced-motion                                 → lite
3. saveData OR slow effective network                     → lite
4. deviceMemory <= 2                                      → lite
5. iPad / iPadOS (any version, any hardware)              → balanced
6. iPhone / iPod (any iOS version, any hardware)          → balanced
7. Otherwise                                              → full
```

Order matters. A user with reduced-motion on a desktop should still
get `lite` — their preference outweighs their hardware capability.

The non-iOS path to `balanced` was intentionally removed (was previously
`cores <= 4 OR memory <= 3`). `balanced` is now reached ONLY via iPad or
iPhone detection — both of which exist for a known structural iOS Safari
scroll-throttling issue, not hardware capability. Everyone else either
hits the explicit downgrade signals (reduced-motion, saveData, slow net,
memory ≤ 2) and lands on `lite`, or goes to `full`.

---

## 5. The attribute contract

Set by the inline script. **Never hardcode their names** — always
import from `./types.ts`.

| Attribute              | Values                                             | Constant                |
| ---------------------- | -------------------------------------------------- | ----------------------- |
| `data-perf-tier`       | `"full" \| "balanced" \| "lite"`                    | `PERF_TIER_ATTR`        |
| `data-scroll-timeline` | `"true" \| "false"`                                | `SCROLL_TIMELINE_ATTR`  |
| `data-reduce-motion`   | `"true" \| "false"`                                | `REDUCE_MOTION_ATTR`    |
| `data-apple-webkit`    | `"true" \| "false"`                                | `APPLE_WEBKIT_ATTR`     |
| `data-perf-reason`     | one of the `PerfReason` union values               | `PERF_REASON_ATTR`      |
| `data-browser-engine`  | `"webkit" \| "blink" \| "gecko" \| "unknown"`      | `BROWSER_ENGINE_ATTR`   |

Set by Navbar's IntersectionObserver at runtime:

| Attribute     | Values              | Set by                                           |
| ------------- | ------------------- | ------------------------------------------------ |
| `data-docked` | `"true" \| absent`  | Navbar's IntersectionObserver, on threshold      |

Set by the cinematic JS overlay (full tier only):

| Attribute                   | Values             | Set by                       |
| --------------------------- | ------------------ | ---------------------------- |
| `data-scroll-logo-ready`    | `"true" \| absent` | ScrollLogoTransition (full)  |
| `data-scroll-logo-phase`    | `"hero" \| "docking" \| "docked" \| absent` | ScrollLogoTransition |

Set by the navbar's static handoff (balanced + lite):

| Attribute              | Values                                        | Set by                       |
| ---------------------- | --------------------------------------------- | ---------------------------- |
| `data-home-logo-owner` | `"hero" \| "transitioning" \| "navbar"`        | Navbar.tsx                    |

---

## 6. Adding a perf-aware component (3-step recipe)

### Step 1: Decide what changes per tier

Sketch the visual outcome per tier *first*. If the difference is
purely visual (size, timing, intensity), keep it in CSS. If the
difference is structural (different DOM, different listeners), use
the React hook.

### Step 2: Encode visual differences in CSS

```css
html[data-perf-tier="full"] .my-component {
  /* cinematic */
}
html[data-perf-tier="balanced"] .my-component {
  /* editorial */
}
html[data-perf-tier="lite"] .my-component {
  /* clean */
}
```

### Step 3: Encode structural differences in JS

```tsx
"use client";
import { usePerfTier } from "@repo/perf-detection";

export function MyAnimatedThing() {
  const { tier, isMounted } = usePerfTier();
  if (!isMounted) return null;
  if (tier === "full") return <Heavy />;
  return <Light />;
}
```

The `isMounted` gate prevents hydration mismatches.

---

## 7. Discipline rules (locked)

### Rule 1: Three tiers. No more.

`PerfTier` is a closed union of `"full" | "balanced" | "lite"`.
Adding `"editorial-lite"` or `"cinematic-mobile"` creates a
combinatorial CSS explosion. If a behavior difference is small, encode
it as a CSS variable inside an existing tier.

### Rule 2: Every signal must change a CSS branch or a tier decision.

Detection is a contract, not a debug log. If you add a signal but no
component consumes it, remove it. The exception is `data-perf-reason`
and `data-browser-engine`, which are explicitly debug-only — those
are allowed to exist without consumers.

### Rule 3: Never set the tier attribute server-side from User-Agent.

It would force `Vary: User-Agent` on the CDN, which shreds the cache
hit rate. The inline script handles this in 1-3ms after HTML arrives;
the visual cost is imperceptible, the architectural cost (cacheable
SSR) is enormous.

### Rule 4: Never make the fallback feel like a downgrade.

If a balanced or lite behavior feels worse than full, redesign it.
The cross-fade handoff is more premium than a janky scroll-tied
overlay; the JS scroll-tied logo is more premium than a static jump.
Choose for the device, not against it.

### Rule 5: Capability over brand.

Detect what a device can actually do (hardware, supported features,
known structural quirks). Don't allowlist or denylist by browser
brand or vendor. The two exceptions today are:

- **iPad / iPadOS** — forced `balanced` because of the iPadOS
  WebKit momentum-scroll vs JS animation conflict, regardless of
  hardware capability.
- **iPhone / iPod (any iOS version)** — forced `balanced` for the
  same structural reason. iOS Safari throttles main-thread JS during
  native momentum scroll on every iPhone, every iOS version.
  Initially we only flagged iOS < 15, but iPhone 14 testing showed
  the lag is present on iOS 17 too — and ProMotion 120Hz displays
  on newer Pro models actually expose it MORE clearly. The proper
  fix is CSS `animation-timeline: scroll()` once iOS 26+ adoption is
  high (already detected as `data-scroll-timeline`).

macOS desktop Safari is intentionally NOT in the list — it has spare
CPU/GPU headroom and no reported issues with the JS scroll path.
Add it here if real-world feedback shows otherwise.

Both iOS exceptions are about *known structural limitations*, not
brand preference. Android Safari-like browsers don't exist; Android
Chrome/Brave/Edge/Samsung/Firefox are all judged on hardware alone.

### Rule 6: CSS for visual differences, JS for structural ones.

Visual difference (size, timing, intensity) → CSS keyed off the
attribute. No React state required, no re-renders, no flash.

Structural difference (mount/unmount a listener, render a different
element) → React hook + `isMounted` gate.

---

## 8. Performance budget

| Cost                            | When            | Magnitude            |
| ------------------------------- | --------------- | -------------------- |
| Inline detection script         | Once per page   | 1–3 ms, ~2 KB gz     |
| `usePerfTier` initial read      | Once per mount  | O(1) DOM read        |
| Media-query subscriptions       | Once per mount  | Native, ~0 cost      |
| Re-detection on preference flip | Per change      | < 1 ms               |
| CSS attribute selectors         | Per repaint     | Negligible           |
| Cross-fade transition           | Per dock event  | Compositor-only      |

The detection layer **does not grow with the codebase**. Adding a
hundred more perf-aware components costs the same as adding one.

---

## 9. Local development

### Force a tier from devtools

```js
localStorage.setItem("ekPerfTier", "balanced");
location.reload();
```

Valid values: `"full"`, `"balanced"`, `"lite"`. The legacy key
`ekHeroPerformanceMode` is also honored.

This override is **only active on local hosts** (`localhost`,
`127.0.0.1`, LAN IPs). Production behavior is never altered by
client-side localStorage.

### Inspect the live state

```js
document.documentElement.dataset.perfTier
// "balanced"
document.documentElement.dataset.perfReason
// "ipad"   ← why this tier was chosen
document.documentElement.dataset.browserEngine
// "webkit"
document.documentElement.dataset.appleWebkit
// "true"
document.documentElement.dataset.scrollTimeline
// "false"
```

### Test on a real device

The override pattern works on any device sharing your LAN. Open the
dev URL on the device, run the localStorage snippet from Safari's
remote inspector (iOS) or Chrome's remote debugging (Android), reload.

---

## 10. Expected tier assignments (sanity matrix)

| Device                            | Engine  | Expected tier | Reason          |
| --------------------------------- | ------- | ------------- | --------------- |
| Desktop Chrome / Edge / Brave     | blink   | `full`        | `capable`       |
| Desktop Firefox                   | gecko   | `full`        | `capable`       |
| Desktop Safari                    | webkit  | `full`        | `capable`       |
| Samsung Galaxy S21+ Chrome        | blink   | `full`        | `capable`       |
| Samsung Galaxy S21+ Brave         | blink   | `full`        | `capable`       |
| Samsung Galaxy S21+ Samsung Int.  | blink   | `full`        | `capable`       |
| Samsung Galaxy S21+ Firefox       | gecko   | `full`        | `capable`       |
| Modern Pixel / OnePlus / Xiaomi   | blink   | `full`        | `capable`       |
| iPhone 13 / 14 / 15 / 16 (any iOS)| webkit  | `balanced`    | `iphone`        |
| iPhone 8 / X (any iOS)            | webkit  | `balanced`    | `iphone`        |
| iPad Pro / iPad Air (any)         | webkit  | `balanced`    | `ipad`          |
| Samsung Galaxy S6 (4 GB / 8 cores)| blink   | `full`        | `capable`       |
| Very old / weak Android (≤ 2 GB)  | blink   | `lite`        | `very-low-hw`   |
| Brave on capable PC (any specs)   | blink   | `full`        | `capable`       |
| Firefox `privacy.resistFingerprinting` on capable PC | gecko | `full` | `capable` |
| Any device, reduced-motion ON     | any     | `lite`        | `reduced-motion`|
| Any device, save-data ON          | any     | `lite`        | `save-data`     |

If your real device produces a different tier, run the devtools
snippet under "Inspect the live state" — the `data-perf-reason` will
tell you which rule triggered.

---

## 11. Glossary

- **Tier**: one of three discrete performance/design classes.
- **Cross-fade handoff**: the cross-fade between the in-flow hero
  logo (which scrolls naturally with the page) and the static navbar
  logo (which fades in at the dock threshold). Used on balanced and
  lite tiers. No overlay, no fixed-position assumption.
- **Cinematic overlay**: the scroll-tied JS animation in
  `ScrollLogoTransition.tsx` that flies a fixed-position logo
  between the hero and navbar slots. Used only on the full tier.
- **Cinematic / Editorial / Clean**: the design language for each
  tier. Use these when discussing intent; use the internal names
  (`full`/`balanced`/`lite`) when writing code.
- **Hysteresis** (in the navbar context): the asymmetric enter/exit
  thresholds that prevent flicker when scrolling near the threshold.
  Implemented with two IntersectionObserver sentinels in HeroSection.
- **Inline script**: the detection JavaScript injected synchronously
  in `<head>`. Runs before paint, sets the canonical attributes.
- **Snap-dock overlay**: a removed approach. See Section 1 for what
  it was and why it didn't work. Don't bring it back without
  solving the headline-collision problem.

---

## 12. Future enhancements (deliberately not built today)

- **`animation-timeline: scroll()` for the full tier.** Once Safari
  26+ adoption is high, the cinematic logo can be migrated from JS
  scroll handler to CSS scroll-timeline. The signal is already
  detected (`data-scroll-timeline="true"`) — components can branch.
  This will also be the path to upgrade iPhones from balanced to a
  true compositor-driven flying logo without the iOS Safari lag.
- **Frame-rate probing.** A 1-second probe at app start could refine
  the tier (e.g. demote a `full`-tier device to `balanced` if it's
  actually running at 30 fps). Only build this if real telemetry
  shows misclassified devices.
- **Per-route opt-out.** A route could request a fixed tier (e.g.
  the admin dashboard might prefer `lite` regardless of device).
  Build this only when a real route demands it.

Don't build any of these speculatively. Each adds weight; only
real-world telemetry justifies adding weight.