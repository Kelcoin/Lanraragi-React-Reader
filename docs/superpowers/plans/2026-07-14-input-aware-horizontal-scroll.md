# Input-Aware Horizontal Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase Worker durability when LRR progress is unavailable and separate mouse-wheel locking from directional touch scrolling.

**Architecture:** Extend the existing history queue with one urgent bit instead of adding a second scheduler. Keep wheel handling in `useHorizontalScroller`; use native touch-axis arbitration rather than custom gesture code.

**Tech Stack:** React 18, browser wheel/touch CSS APIs, Node assertion scripts, Vite.

## Global Constraints

- No new dependencies.
- Preserve visual output and mouse drag behavior.
- `serverTracksProgress === false` is the only urgent Worker condition.
- LRR available or unknown keeps the existing 8-second Worker interval.

---

### Task 1: Urgent Worker history scheduling

**Files:**
- Modify: `scripts/check-history-monotonic-sync.mjs`
- Modify: `src/lib/history.js`
- Modify: `src/pages/Reader.jsx`

**Interfaces:**
- Consumes: `saveHistory(archive, page)` and `flushHistorySync()`.
- Produces: `saveHistory(archive, page, { immediateRemote?: boolean })`.

- [ ] Add failing assertions for `immediateRemote`, zero-delay scheduling, and urgent continuation after an in-flight batch.
- [ ] Run `node scripts/check-history-monotonic-sync.mjs`; expect assertion failure because urgent scheduling is absent.
- [ ] Add one pending urgent flag to the existing queue; consume it per batch, restore it on failure, and schedule pending urgent work with delay 0.
- [ ] Pass `{ immediateRemote: serverTracksProgress === false }` from Reader.
- [ ] Rerun the history check; expect exit 0.

### Task 2: Input-aware horizontal scroller

**Files:**
- Create: `scripts/check-horizontal-scroller-input.mjs`
- Modify: `src/lib/horizontalScroller.js`

**Interfaces:**
- Consumes: existing `useHorizontalScroller()` return object.
- Produces: same return object; no caller changes.

- [ ] Add failing assertions: wheel locks only with horizontal overflow; touch style uses `pan-x pan-y`; vertical overscroll is not contained.
- [ ] Run `node scripts/check-horizontal-scroller-input.mjs`; expect assertion failure against current touch style and wheel ordering.
- [ ] Move wheel cancellation after overflow check; keep delta mapping and Ctrl+wheel escape.
- [ ] Return `touchAction: 'pan-x pan-y'`, `overscrollBehaviorX: 'contain'`, `overscrollBehaviorY: 'auto'`.
- [ ] Rerun input check; expect exit 0.

### Task 3: Verification and delivery

**Files:**
- Modify: `task_plan.md`, `findings.md`, `progress.md` (ignored working notes only).

- [ ] Run both focused checks plus existing archive/reader checks.
- [ ] Run `npm run build`; expect Vite exit 0.
- [ ] Run `git diff --check`; expect no whitespace errors.
- [ ] Audit changed UI code against current Web Interface Guidelines.
- [ ] Commit with `fix: distinguish wheel and touch scrolling` and push `dev`.
