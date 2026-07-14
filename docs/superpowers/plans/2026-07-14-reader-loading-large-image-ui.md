# Reader Loading and Large Image UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify reader loading UI, reduce large-image interaction overhead, stabilize thumbnail generation state, animate wide cards, and clarify settings help.

**Architecture:** Keep existing components and native image APIs. Delete fake loading percentage state, route high-frequency zoom transforms through one RAF writer, and use CSS-only compositor animations and solid tooltip surfaces.

**Tech Stack:** React 18, browser image/decode APIs, CSS, Node `assert`, Vite.

## Global Constraints

- Preserve original image quality and existing reader navigation behavior.
- Keep auto-turn countdown; render it as a visible 2 px line.
- Add no dependency.
- Honor `prefers-reduced-motion`.

---

### Task 1: Regression contract

**Files:**
- Create: `scripts/check-reader-loading-performance.mjs`

- [x] Write source assertions for removed loading bars, retained 2 px auto-turn bar, stable queued retry state, single mounted-image decode path, RAF-batched zoom transform, opaque help bubbles, revised copy, and wide-card reduced-motion animation.
- [x] Run `node scripts/check-reader-loading-performance.mjs`; expect failure on current implementation.

### Task 2: Reader loading and large-image path

**Files:**
- Modify: `src/pages/Reader.jsx`

- [x] Remove fake page-loading percentage state, timer, and normal/immersive loading bars.
- [x] Render the same centered two-line loading status in normal and immersive modes with `role="status"` and `aria-live="polite"`.
- [x] Assign resolved image URLs to mounted images without a duplicate off-DOM decode.
- [x] Batch immersive zoom/pan DOM transforms in `requestAnimationFrame`, committing React state only when needed by surrounding UI.
- [x] Reduce auto-turn line to 2 px.
- [x] Run the regression check; reader assertions must pass.

### Task 3: Stable thumbnails, wide-card reveal, and help copy

**Files:**
- Modify: `src/pages/Reader.jsx`
- Modify: `src/pages/Home.jsx`
- Modify: `src/index.css`

- [x] Preserve `queued` while drawer thumbnail polling retries.
- [x] Add transform/opacity wide-card reveal and disable it under reduced motion.
- [x] Make dark/light hint backgrounds opaque, improve readable width and line handling, and rewrite all settings hint copy as clear purpose/condition/effect text.
- [x] Run the regression check; all assertions must pass.

### Task 4: Full verification and delivery

**Files:**
- Verify all touched files and existing check scripts.

- [x] Run relevant reader/archive/history Node checks.
- [x] Run `npm run build` and `git diff --check`.
- [x] Review touched UI rules against latest Web Interface Guidelines.
- [ ] Commit with a concise Conventional Commit message and push `dev` to `origin`.
