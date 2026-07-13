# Archive Reader Toolbar Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize reader toolbars, merge history/watchlist access, animate archive selection controls and refresh replacement, and relocate metadata editing.

**Architecture:** Keep existing page ownership and data flows. Add small pure UI-state helpers for testable toolbar/panel and refresh-phase decisions; React pages consume those helpers while CSS owns geometry and compositor-friendly motion. Reuse `ReaderArchiveListPanel`, existing confirmation flow, navigation, and API calls.

**Tech Stack:** React 18, JavaScript ES modules, CSS, Node.js built-in test runner, ESLint, Vite.

## Global Constraints

- Add no dependency, route, persistence format, or API call.
- Keep manual refresh content visible until replacement is ready; restore it on failure.
- Use only explicit property transitions; never add `transition: all`.
- Honor `prefers-reduced-motion: reduce`.
- Keep all icon-only buttons labeled with `title` and `aria-label`.
- Keep archive deletion behind the existing confirmation dialog.
- Keep transient archive-list tab state local to the Reader mount.

## File Map

- Create `src/lib/readerUiState.js`: normalized reader toolbar groups and unified archive-list panel model.
- Create `src/lib/archiveRefreshMotion.js`: deterministic archive refresh phase reducer.
- Create `src/lib/readerUiState.test.mjs`: reader toolbar and panel model tests.
- Create `src/lib/archiveRefreshMotion.test.mjs`: refresh phase tests.
- Modify `src/lib/readerSkeletonLayout.js`: delegate skeleton groups to normalized toolbar state.
- Modify `src/pages/Reader.jsx`: shared toolbar classes, unified panel tabs, metadata drawer action.
- Modify `src/pages/Home.jsx`: animated bulk-action row and refresh phase integration.
- Modify `src/index.css`: shared button geometry, panel tabs, selection row, refresh motion, reduced-motion rules.

---

### Task 1: Normalize Reader Toolbar and Merge Archive Lists

**Files:**
- Create: `src/lib/readerUiState.js`
- Create: `src/lib/readerUiState.test.mjs`
- Modify: `src/lib/readerSkeletonLayout.js`
- Modify: `src/pages/Reader.jsx`
- Modify: `src/index.css`

**Interfaces:**
- Produces: `getReaderToolbarGroups(isMobile)` returning `{ left, right }` label arrays.
- Produces: `getReaderArchivePanelModel(type, sources)` returning `{ type, title, items, emptyMessage, onDelete }`.
- Consumes: existing `historyList`, `watchlistEntries`, `handleRemoveWatchlist`, `setHistoryDeleteTarget`, `hideRead`.

- [ ] **Step 1: Write failing reader UI-state tests**

Create `src/lib/readerUiState.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getReaderArchivePanelModel, getReaderToolbarGroups } from './readerUiState.js';

test('reader toolbar has stable merged control groups', () => {
  assert.deepEqual(getReaderToolbarGroups(false), {
    left: ['← 返回', '归档列表'],
    right: ['沉浸模式', '设为封面', '阅读设定', '缩略面板'],
  });
  assert.deepEqual(getReaderToolbarGroups(true), {
    left: ['', ''],
    right: ['', '', '', ''],
  });
});

test('archive panel model selects history behavior', () => {
  const removeHistory = () => 'history';
  const model = getReaderArchivePanelModel('history', {
    historyItems: [{ id: 'h' }], watchlistItems: [{ id: 'w' }],
    historyEmptyMessage: '暂无阅读历史', watchlistEmptyMessage: '暂无待看归档',
    removeHistory, removeWatchlist: () => 'watchlist',
  });
  assert.equal(model.title, '阅读历史');
  assert.deepEqual(model.items, [{ id: 'h' }]);
  assert.equal(model.onDelete, removeHistory);
});

test('archive panel model selects watchlist behavior', () => {
  const removeWatchlist = () => 'watchlist';
  const model = getReaderArchivePanelModel('watchlist', {
    historyItems: [{ id: 'h' }], watchlistItems: [{ id: 'w' }],
    historyEmptyMessage: '暂无阅读历史', watchlistEmptyMessage: '暂无待看归档',
    removeHistory: () => 'history', removeWatchlist,
  });
  assert.equal(model.title, '待看归档');
  assert.deepEqual(model.items, [{ id: 'w' }]);
  assert.equal(model.onDelete, removeWatchlist);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
node --test src/lib/readerUiState.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `readerUiState.js`.

- [ ] **Step 3: Add minimal reader UI-state implementation**

Create `src/lib/readerUiState.js`:

```js
const DESKTOP_TOOLBAR = Object.freeze({
  left: Object.freeze(['← 返回', '归档列表']),
  right: Object.freeze(['沉浸模式', '设为封面', '阅读设定', '缩略面板']),
});

const MOBILE_TOOLBAR = Object.freeze({
  left: Object.freeze(['', '']),
  right: Object.freeze(['', '', '', '']),
});

export function getReaderToolbarGroups(isMobile) {
  return isMobile ? MOBILE_TOOLBAR : DESKTOP_TOOLBAR;
}

export function getReaderArchivePanelModel(type, sources) {
  if (type === 'watchlist') {
    return {
      type,
      title: '待看归档',
      items: sources.watchlistItems,
      emptyMessage: sources.watchlistEmptyMessage,
      onDelete: sources.removeWatchlist,
    };
  }
  return {
    type: 'history',
    title: '阅读历史',
    items: sources.historyItems,
    emptyMessage: sources.historyEmptyMessage,
    onDelete: sources.removeHistory,
  };
}
```

Change `readerSkeletonLayout.js` to re-export the normalized groups:

```js
export { getReaderToolbarGroups as getReaderSkeletonToolbarGroups } from './readerUiState';
```

- [ ] **Step 4: Run reader UI-state tests and verify GREEN**

Run `node --test src/lib/readerUiState.test.mjs`.

Expected: 3 tests PASS.

- [ ] **Step 5: Merge Reader panel state and controls**

In `Reader.jsx`:

```js
import { getReaderArchivePanelModel } from '../lib/readerUiState';
```

Replace `showHistoryPanel` and `showWatchlistPanel` state with:

```js
const [showArchivePanel, setShowArchivePanel] = useState(false);
const [archivePanelType, setArchivePanelType] = useState('history');
```

Build panel model near `historyList`:

```js
const archivePanel = getReaderArchivePanelModel(archivePanelType, {
  historyItems: historyList,
  watchlistItems: watchlistEntries,
  historyEmptyMessage: hideRead && getHistory().length > 0 ? '所有归档均已读完' : '暂无阅读历史',
  watchlistEmptyMessage: '暂无待看归档',
  removeHistory: setHistoryDeleteTarget,
  removeWatchlist: handleRemoveWatchlist,
});
```

Render one toolbar button:

```jsx
<button
  className="reader-toolbar-button"
  disabled={!readerReady}
  data-panel-toggle
  onClick={() => {
    if (!readerReady) return;
    setShowArchivePanel((visible) => !visible);
    setShowSettingsPanel(false);
  }}
  title="查看阅读历史和待看归档"
  aria-label="查看阅读历史和待看归档"
>
  {isMobile ? <ToolbarGlyph name="history" size={18} /> : '归档列表'}
</button>
```

Render one panel and its segmented control:

```jsx
{viewMode !== 'immersive' && showArchivePanel && (
  <ReaderArchiveListPanel
    type={archivePanel.type}
    title={archivePanel.title}
    items={archivePanel.items}
    emptyMessage={archivePanel.emptyMessage}
    cacheOnly={assetCacheOnly}
    onDelete={archivePanel.onDelete}
    activeType={archivePanelType}
    onTypeChange={setArchivePanelType}
  />
)}
```

Extend `ReaderArchiveListPanel` heading with a `role="group"` wrapper and two buttons using `aria-pressed={activeType === type}`. Update outside-click logic and settings toggles to close `showArchivePanel`.

- [ ] **Step 6: Standardize toolbar, skeleton, tabs, and drawer metadata action**

Add CSS classes:

```css
.reader-toolbar-button {
  min-height: 40px;
  box-sizing: border-box;
  transition: background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
}

.reader-toolbar-button:focus-visible,
.reader-panel-tab:focus-visible,
.reader-drawer-icon-button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.reader-panel-tabs { display: flex; gap: 4px; }
.reader-panel-tab { min-height: 32px; }
.reader-panel-tab[aria-pressed="true"] { background: var(--accent); color: #fff; }

@media (max-width: 720px) {
  .reader-toolbar-button {
    width: 40px;
    min-width: 40px;
    height: 40px;
    padding: 0;
  }
}
```

Use `reader-toolbar-button` on every real toolbar button and identical skeleton placeholders. Remove metadata toolbar button. In drawer heading, render:

```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
  <h3 style={{ margin: 0, fontSize: '18px' }}>归档信息</h3>
  <button
    className="reader-drawer-icon-button"
    onClick={() => navigateToMetadata(archiveId)}
    title="编辑元数据"
    aria-label="编辑元数据"
  >
    <ToolbarGlyph name="metadata" size={18} />
  </button>
</div>
```

Keep close button at far right and add its missing `aria-label="关闭缩略面板"`.

- [ ] **Step 7: Verify Task 1**

Run:

```powershell
node --test src/lib/readerUiState.test.mjs
npm run lint
npm run build
```

Expected: tests PASS; lint and build exit 0.

- [ ] **Step 8: Commit Task 1**

```powershell
git add src/lib/readerUiState.js src/lib/readerUiState.test.mjs src/lib/readerSkeletonLayout.js src/pages/Reader.jsx src/index.css
git commit -m "feat(reader): merge archive list controls"
```

---

### Task 2: Restore Animated Archive Selection Row

**Files:**
- Modify: `src/pages/Home.jsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: existing `archiveSelectionMode`, `selectedArchiveIds`, `allVisibleSelected`, `archiveDeleting`, `toggleSelectAllVisibleArchives`, `requestBulkArchiveDelete`.
- Produces: `.archive-selection-actions` expanded/collapsed state controlled by `data-open` and `aria-hidden`.

- [ ] **Step 1: Add a failing structural check**

Create a temporary assertion in `src/lib/readerUiState.test.mjs` that reads `Home.jsx` and verifies bulk actions occur after the selection-mode button row marker:

```js
import { readFileSync } from 'node:fs';

test('bulk archive actions live in the expandable second row', () => {
  const source = readFileSync(new URL('../pages/Home.jsx', import.meta.url), 'utf8');
  const header = source.indexOf('archive-toolbar-primary');
  const actions = source.indexOf('archive-selection-actions');
  assert.ok(header >= 0 && actions > header);
  assert.match(source, /aria-hidden=\{!archiveSelectionMode\}/);
});
```

- [ ] **Step 2: Run test and verify RED**

Run `node --test src/lib/readerUiState.test.mjs`.

Expected: FAIL because class markers do not exist.

- [ ] **Step 3: Move bulk actions and selected count into second row**

Keep primary row buttons limited to selection mode and refresh. Replace empty animated container with:

```jsx
<div
  className="archive-selection-actions"
  data-open={archiveSelectionMode ? 'true' : 'false'}
  aria-hidden={!archiveSelectionMode}
>
  <div className="archive-selection-actions-inner">
    <span aria-live="polite">已选 {selectedArchiveIds.size} 个</span>
    <button className="btn" tabIndex={archiveSelectionMode ? 0 : -1} onClick={toggleSelectAllVisibleArchives} disabled={visibleArchiveIds.length === 0 || archiveDeleting}>
      {allVisibleSelected ? '取消全选' : '全选当前'}
    </button>
    <button className="btn archive-selection-delete" tabIndex={archiveSelectionMode ? 0 : -1} onClick={requestBulkArchiveDelete} disabled={selectedArchiveIds.size === 0 || archiveDeleting}>
      {archiveDeleting ? '删除中…' : '删除所选'}
    </button>
  </div>
</div>
```

Add `className="archive-toolbar-primary"` to the first row.

- [ ] **Step 4: Add selection row CSS**

```css
.archive-selection-actions {
  display: grid;
  grid-template-rows: 0fr;
  pointer-events: none;
}
.archive-selection-actions[data-open="true"] {
  grid-template-rows: 1fr;
  pointer-events: auto;
}
.archive-selection-actions-inner {
  min-height: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  opacity: 0;
  transform: translateY(-6px) scaleY(0.96);
  transform-origin: center top;
  transition: opacity 0.2s ease, transform 0.26s ease;
}
.archive-selection-actions[data-open="true"] .archive-selection-actions-inner {
  opacity: 1;
  transform: translateY(0) scaleY(1);
}
```

- [ ] **Step 5: Verify and commit Task 2**

Run `node --test src/lib/readerUiState.test.mjs && npm run lint` in equivalent PowerShell sequential commands. Expected: PASS and exit 0.

```powershell
git add src/pages/Home.jsx src/index.css src/lib/readerUiState.test.mjs
git commit -m "feat(home): animate archive bulk actions"
```

---

### Task 3: Animate Manual Archive Refresh Replacement

**Files:**
- Create: `src/lib/archiveRefreshMotion.js`
- Create: `src/lib/archiveRefreshMotion.test.mjs`
- Modify: `src/pages/Home.jsx`
- Modify: `src/index.css`

**Interfaces:**
- Produces: `reduceArchiveRefreshPhase(phase, event)` returning `idle`, `exiting`, or `entering`.
- Consumes: existing `handleManualRefreshArchives`, `doFetch`, `archivesRefreshing`, and archive grid.

- [ ] **Step 1: Write failing reducer tests**

Create `src/lib/archiveRefreshMotion.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { reduceArchiveRefreshPhase } from './archiveRefreshMotion.js';

test('refresh phases cover exit, replacement entry, and completion', () => {
  assert.equal(reduceArchiveRefreshPhase('idle', 'start'), 'exiting');
  assert.equal(reduceArchiveRefreshPhase('exiting', 'replace'), 'entering');
  assert.equal(reduceArchiveRefreshPhase('entering', 'finish'), 'idle');
});

test('failed refresh restores visible idle phase', () => {
  assert.equal(reduceArchiveRefreshPhase('exiting', 'fail'), 'idle');
  assert.equal(reduceArchiveRefreshPhase('entering', 'fail'), 'idle');
});
```

- [ ] **Step 2: Run test and verify RED**

Run `node --test src/lib/archiveRefreshMotion.test.mjs`.

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement reducer**

Create `src/lib/archiveRefreshMotion.js`:

```js
export function reduceArchiveRefreshPhase(phase, event) {
  if (event === 'fail' || event === 'finish') return 'idle';
  if (phase === 'idle' && event === 'start') return 'exiting';
  if (phase === 'exiting' && event === 'replace') return 'entering';
  return phase;
}
```

- [ ] **Step 4: Run reducer tests and verify GREEN**

Run `node --test src/lib/archiveRefreshMotion.test.mjs`.

Expected: 2 tests PASS.

- [ ] **Step 5: Integrate refresh phase without blanking old cards**

In `Home.jsx`, import reducer, add `useReducer`, and make `doFetch` return success:

```js
const [archiveRefreshPhase, dispatchArchiveRefresh] = useReducer(reduceArchiveRefreshPhase, 'idle');
```

At successful replacement, dispatch `replace` immediately before `setArchives(data)`. On error dispatch `fail`. After replacement, schedule `finish` on the next animation frame. Only manual background refresh dispatches motion events; initial load, pagination, and infinite append do not.

Apply grid state:

```jsx
<div
  ref={gridRef}
  className="archive-grid"
  data-refresh-phase={archiveRefreshPhase}
  aria-busy={archivesRefreshing}
  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: isNarrow ? '10px' : '16px' }}
>
```

- [ ] **Step 6: Add refresh motion CSS**

```css
.archive-grid {
  display: grid;
  grid-auto-flow: dense;
  justify-items: center;
  opacity: 1;
  transform: scale(1);
  transform-origin: center top;
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.archive-grid[data-refresh-phase="exiting"] { opacity: 0.35; transform: scale(0.992); }
.archive-grid[data-refresh-phase="entering"] { animation: archive-grid-enter 0.24s ease both; }
@keyframes archive-grid-enter {
  from { opacity: 0.35; transform: scale(0.992); }
  to { opacity: 1; transform: scale(1); }
}
```

Add reduced-motion override:

```css
@media (prefers-reduced-motion: reduce) {
  .archive-grid,
  .archive-selection-actions,
  .reader-toolbar-button { transition: none; animation: none; }
}
```

- [ ] **Step 7: Verify and commit Task 3**

Run:

```powershell
node --test src/lib/archiveRefreshMotion.test.mjs src/lib/readerUiState.test.mjs
npm run lint
npm run build
```

Expected: all tests PASS; lint/build exit 0.

```powershell
git add src/lib/archiveRefreshMotion.js src/lib/archiveRefreshMotion.test.mjs src/pages/Home.jsx src/index.css
git commit -m "feat(home): animate archive refresh"
```

---

### Task 4: Final Verification and Interface Audit

**Files:**
- Review: `src/pages/Home.jsx`
- Review: `src/pages/Reader.jsx`
- Review: `src/lib/readerSkeletonLayout.js`
- Review: `src/lib/readerUiState.js`
- Review: `src/lib/archiveRefreshMotion.js`
- Review: `src/index.css`

**Interfaces:**
- Consumes all completed task outputs.
- Produces verified build and concise guideline findings.

- [ ] **Step 1: Run complete automated verification**

```powershell
node --test src/lib/readerUiState.test.mjs src/lib/archiveRefreshMotion.test.mjs
npm run lint
npm run build
git diff --check HEAD~3
```

Expected: all tests pass; lint/build exit 0; no whitespace errors.

- [ ] **Step 2: Run focused code searches**

```powershell
rg -n "transition:\s*all|outline:\s*none|showHistoryPanel|showWatchlistPanel|编辑元数据" src/pages/Home.jsx src/pages/Reader.jsx src/index.css
```

Expected: no new `transition: all`; old dual panel states absent; `编辑元数据` appears in drawer action only. Existing unrelated guideline issues must be reported, not expanded into unrelated refactors.

- [ ] **Step 3: Manual responsive verification**

Run `npm run dev`. Verify at 390 px, 768 px, and 1440 px:

- selection second row expands/collapses and keyboard focus cannot enter while closed;
- skeleton and loaded toolbar control geometry matches without overlap;
- all mobile toolbar buttons have identical outer size;
- archive-list panel opens, tabs switch data and delete action, active button closes panel;
- refresh success crossfades, failure restores old cards, repeated click cannot corrupt phase;
- reduced-motion removes new motion;
- drawer metadata button navigates correctly and close button remains reachable.

- [ ] **Step 4: Apply Web Interface Guidelines review**

Fetch current guidelines and audit touched files. Required checks: icon button labels, semantic buttons, visible focus, explicit transitions, reduced motion, pointer/focus behavior when collapsed, touch target size, long-title truncation, and `aria-busy`/`aria-live` for async state.

- [ ] **Step 5: Commit audit-only fixes if required**

If audit finds touched-code defects, write a failing check where practical, fix only those defects, rerun Step 1, then commit:

```powershell
git add src/pages/Home.jsx src/pages/Reader.jsx src/index.css src/lib/*.test.mjs
git commit -m "fix(ui): close toolbar accessibility gaps"
```
