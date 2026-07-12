# Archive Upload Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive upload page that accepts multiple local archives or multiple URLs, automatically selects LANraragi download plugins by their declared regular expressions, and reports every task independently.

**Architecture:** Keep LANraragi transport in the existing `lrrApi`, put deterministic parsing and plugin matching in a small pure helper module, and let one React page own the sequential task queue. Extend the current query-string router and settings tool section without introducing a routing library or another state store.

**Tech Stack:** React 18, browser `FormData`/Fetch APIs, existing Vite build, Node built-in test runner, existing project CSS/components.

## Global Constraints

- Do not call or open a browser during implementation or verification.
- Do not add dependencies.
- Local file uploads use `PUT /api/archives/upload` and browser-generated multipart boundaries.
- URL plugin selection uses each download plugin's declared regular expression and chooses the first matching plugin in API order.
- Invalid plugin regular expressions are isolated; unmatched URLs require explicit manual plugin selection.
- Process tasks sequentially and do not stop the batch when one item fails.
- Do not modify `worker.js`, config import/export, reader settings, or archive metadata structures.

---

### Task 1: Pure upload parsing and plugin matching

**Files:**
- Create: `src/lib/upload.js`
- Create: `src/lib/upload.test.js`

**Interfaces:**
- Produces: `parseUploadUrls(text) -> { valid: string[], invalid: string[] }`
- Produces: `normalizeDownloadPlugins(payload) -> { options: Array<{label,value}>, plugins: Array<{label,value,pattern}>, warnings: string[] }`
- Produces: `matchDownloadPlugin(url, plugins) -> plugin | null`
- Produces: `dedupeUploadFiles(files) -> File[]`

- [ ] **Step 1: Write failing parsing and matching tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dedupeUploadFiles,
  matchDownloadPlugin,
  normalizeDownloadPlugins,
  parseUploadUrls,
} from './upload.js';

test('parses, validates and deduplicates URL lines', () => {
  assert.deepEqual(parseUploadUrls('https://a.test/g/1\nftp://bad\nhttps://a.test/g/1'), {
    valid: ['https://a.test/g/1'],
    invalid: ['ftp://bad'],
  });
});

test('normalizes downloader regex and selects first matching plugin', () => {
  const result = normalizeDownloadPlugins({ plugins: [
    { name: 'First', namespace: 'first', oneshot_arg: 'https?://a\\.test/.*' },
    { name: 'Second', namespace: 'second', regex: 'https?://a\\.test/g/.*' },
  ] });
  assert.equal(matchDownloadPlugin('https://a.test/g/1', result.plugins)?.value, 'first');
  assert.deepEqual(result.options[0], { label: '自动匹配', value: 'auto' });
});

test('isolates invalid regex and leaves unmatched URL unresolved', () => {
  const result = normalizeDownloadPlugins([{ name: 'Broken', namespace: 'bad', oneshot_arg: '[' }]);
  assert.equal(result.warnings.length, 1);
  assert.equal(matchDownloadPlugin('https://a.test/g/1', result.plugins), null);
});

test('deduplicates files by name, size and lastModified', () => {
  const files = [
    { name: 'a.zip', size: 10, lastModified: 1 },
    { name: 'a.zip', size: 10, lastModified: 1 },
    { name: 'a.zip', size: 11, lastModified: 1 },
  ];
  assert.equal(dedupeUploadFiles(files).length, 2);
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run: `node --test src/lib/upload.test.js`

Expected: FAIL because `src/lib/upload.js` does not exist.

- [ ] **Step 3: Implement the pure helpers**

```js
function pluginSource(payload) {
  return Array.isArray(payload) ? payload : (payload?.data || payload?.plugins || []);
}

export function parseUploadUrls(text = '') {
  const seen = new Set();
  const valid = [];
  const invalid = [];
  String(text).split(/\r?\n/).map(line => line.trim()).filter(Boolean).forEach((line) => {
    try {
      const url = new URL(line);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol');
      const normalized = url.href;
      if (!seen.has(normalized)) { seen.add(normalized); valid.push(normalized); }
    } catch { if (!invalid.includes(line)) invalid.push(line); }
  });
  return { valid, invalid };
}

export function normalizeDownloadPlugins(payload) {
  const warnings = [];
  const plugins = pluginSource(payload).map((item, index) => {
    const value = String(item?.namespace ?? item?.plugin_id ?? item?.id ?? item?.name ?? `plugin-${index}`);
    const label = String(item?.name ?? value);
    const pattern = String(item?.oneshot_arg ?? item?.url_regex ?? item?.regex ?? item?.pattern ?? '');
    let matcher = null;
    if (pattern) {
      try { matcher = new RegExp(pattern); }
      catch { warnings.push(`${label} 的 URL 匹配正则无效`); }
    }
    return { label, value, pattern, matcher };
  });
  return {
    plugins,
    warnings,
    options: [{ label: '自动匹配', value: 'auto' }, ...plugins.map(({ label, value }) => ({ label, value }))],
  };
}

export function matchDownloadPlugin(url, plugins = []) {
  return plugins.find((plugin) => {
    if (!plugin.matcher) return false;
    plugin.matcher.lastIndex = 0;
    return plugin.matcher.test(url);
  }) || null;
}

export function dedupeUploadFiles(files = []) {
  const seen = new Set();
  return Array.from(files).filter((file) => {
    const key = `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `node --test src/lib/upload.test.js`

Expected: 4 tests pass, 0 fail.

- [ ] **Step 5: Commit the pure helper**

```powershell
git add src/lib/upload.js src/lib/upload.test.js
git commit -m "feat: add upload input helpers"
```

---

### Task 2: LANraragi upload API methods

**Files:**
- Modify: `src/lib/api.js`
- Create: `src/lib/apiUpload.test.js`

**Interfaces:**
- Produces: `lrrApi.getDownloadPlugins()`
- Produces: `lrrApi.useDownloadPlugin(plugin, url)`
- Produces: `lrrApi.uploadArchive(file)`
- Consumes: existing server URL, API key, `createApiError`, and search cache API.

- [ ] **Step 1: Export a transport factory and write failing request-shape tests**

Add `createLrrApi({ getBaseUrl, getAuthHeaders, fetchImpl = fetch })` around the existing API object without changing public `lrrApi` behavior, then test:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { createLrrApi } from './api.js';

test('uploads archive as PUT multipart without overriding content type', async () => {
  let request;
  const api = createLrrApi({
    getBaseUrl: () => 'https://reader.test',
    getAuthHeaders: () => ({ Authorization: 'Bearer token' }),
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ success: 1 }), { status: 200 });
    },
  });
  await api.uploadArchive(new Blob(['x']));
  assert.equal(request.url, 'https://reader.test/api/archives/upload');
  assert.equal(request.options.method, 'PUT');
  assert.ok(request.options.body instanceof FormData);
  assert.equal(request.options.headers['Content-Type'], undefined);
});

test('uses downloader plugin with URL argument', async () => {
  let requestedUrl = '';
  const api = createLrrApi({
    getBaseUrl: () => 'https://reader.test',
    getAuthHeaders: () => ({ Authorization: 'Bearer token' }),
    fetchImpl: async (url) => { requestedUrl = url; return new Response('{}'); },
  });
  await api.useDownloadPlugin('eh', 'https://e-hentai.org/g/1/a');
  assert.match(requestedUrl, /plugin=eh/);
  assert.match(requestedUrl, /arg=https%3A%2F%2Fe-hentai\.org/);
});
```

- [ ] **Step 2: Run API tests and verify RED**

Run: `node --test src/lib/apiUpload.test.js`

Expected: FAIL because `createLrrApi` and upload methods are not exported.

- [ ] **Step 3: Implement multipart upload and downloader calls**

The implementation must append the file using the LANraragi field name `file`, preserve the existing Bearer header, parse JSON or text responses, and throw the same 401/status errors as `request`:

```js
getDownloadPlugins: () => request('/plugins/download'),
useDownloadPlugin: (plugin, arg) => {
  const params = new URLSearchParams({ plugin, arg });
  return request(`/plugins/use?${params}`, 'POST');
},
uploadArchive: async (file) => {
  const body = new FormData();
  body.append('file', file, file.name);
  const res = await fetchImpl(`${getBaseUrl()}/api/archives/upload`, {
    method: 'PUT', headers: getAuthHeaders(), body,
  });
  return parseResponseOrThrow(res);
},
```

- [ ] **Step 4: Run API and existing metadata tests**

Run: `node --test src/lib/apiUpload.test.js src/lib/metadataEditor.test.js`

Expected: all tests pass.

- [ ] **Step 5: Commit API support**

```powershell
git add src/lib/api.js src/lib/apiUpload.test.js
git commit -m "feat: add LANraragi upload APIs"
```

---

### Task 3: Upload route and settings tool entry

**Files:**
- Modify: `src/lib/navigation.js`
- Create: `src/lib/navigation.test.js`
- Modify: `src/App.jsx`
- Modify: `src/pages/Home.jsx`

**Interfaces:**
- Produces: route `{ kind: 'upload' }` for `?view=upload`
- Produces: `navigateUpload({ replace = false })`
- Consumes later: default export from `src/pages/UploadPage.jsx`

- [ ] **Step 1: Write failing route tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRouteSearch } from './navigation.js';

test('parses upload route', () => {
  assert.deepEqual(parseRouteSearch('?view=upload'), { kind: 'upload' });
});
```

- [ ] **Step 2: Run route test and verify RED**

Run: `node --test src/lib/navigation.test.js`

Expected: FAIL because `parseRouteSearch` is not exported.

- [ ] **Step 3: Extract pure route parsing and add navigation**

```js
export function parseRouteSearch(search = '') {
  const params = new URLSearchParams(search);
  const archiveId = params.get('id');
  const query = params.get('q');
  const view = params.get('view');
  if (archiveId && view === 'metadata') return { kind: 'metadata', archiveId };
  if (archiveId) return { kind: 'reader', archiveId };
  if (view === 'history') return { kind: 'history' };
  if (view === 'watchlist') return { kind: 'watchlist' };
  if (view === 'dedupe') return { kind: 'dedupe' };
  if (view === 'upload') return { kind: 'upload' };
  return { kind: 'home', query: query || '' };
}

export function navigateUpload({ replace = false } = {}) {
  const url = '/?view=upload';
  if (replace) window.history.replaceState({}, '', url);
  else window.history.pushState({}, '', url);
  dispatchRouteChange({ kind: 'upload' });
}
```

`parseRouteFromLocation()` must delegate to `parseRouteSearch(window.location.search)`.

- [ ] **Step 4: Add App rendering and settings entry**

Import `UploadPage`, render it when `route.kind === 'upload'`, import `navigateUpload` in `Home.jsx`, close the settings modal, then navigate:

```jsx
<button type="button" className="btn" onClick={() => { setShowConfig(false); navigateUpload(); }}
  style={{ width: '100%', padding: '10px', fontSize: '13px' }}>
  上传归档
</button>
```

Keep the existing duplicate-detection button and place both in a grid that collapses to one column on narrow widths.

- [ ] **Step 5: Run route test and production build**

Run: `node --test src/lib/navigation.test.js`

Expected: route test passes.

Run: `npm run build`

Expected: build passes after creating the route scaffold below; Task 4 replaces its body:

```jsx
export default function UploadPage() { return null; }
```

- [ ] **Step 6: Commit routing and entry**

```powershell
git add src/lib/navigation.js src/lib/navigation.test.js src/App.jsx src/pages/Home.jsx src/pages/UploadPage.jsx
git commit -m "feat: add archive upload route"
```

---

### Task 4: Upload page and sequential task queue

**Files:**
- Replace: `src/pages/UploadPage.jsx`
- Modify: `src/components/AppGlyphs.jsx`
- Modify: `src/index.css`
- Test: `src/lib/upload.test.js`

**Interfaces:**
- Consumes: all Task 1 helpers.
- Consumes: Task 2 API methods.
- Consumes: existing `CustomSelect`, `ToolbarGlyph`, `navigateHome`, and project theme classes.

- [ ] **Step 1: Add a failing queue-continuation helper test**

Extend `src/lib/upload.test.js` with a pure sequential runner so page behavior is testable without a browser:

```js
test('sequential tasks continue after an item fails', async () => {
  const seen = [];
  const results = await runUploadTasks(['a', 'b'], async (item) => {
    seen.push(item);
    if (item === 'a') throw new Error('failed');
    return 'ok';
  });
  assert.deepEqual(seen, ['a', 'b']);
  assert.deepEqual(results.map(item => item.status), ['failed', 'success']);
});
```

- [ ] **Step 2: Run helper test and verify RED**

Run: `node --test src/lib/upload.test.js`

Expected: FAIL because `runUploadTasks` is missing.

- [ ] **Step 3: Implement the sequential runner**

```js
export async function runUploadTasks(items, worker, onUpdate = () => {}) {
  const results = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    onUpdate({ index, item, status: 'running' });
    try {
      const value = await worker(item, index);
      const result = { item, status: 'success', value };
      results.push(result); onUpdate({ index, ...result });
    } catch (error) {
      const result = { item, status: 'failed', error: error?.message || String(error) };
      results.push(result); onUpdate({ index, ...result });
    }
  }
  return results;
}
```

- [ ] **Step 4: Implement the full page**

The page must contain:

- Header with upload SVG glyph, title, and safe back button.
- A native hidden `<input type="file" multiple accept=".zip,.cbz,.rar,.cbr,.7z,.pdf">` controlled by a styled button.
- Keyboard-accessible drag/drop area using `onDragOver`, `onDragLeave`, and `onDrop`.
- Selected file list with per-item removal before execution.
- Download plugin `CustomSelect`, default value `auto`, and multiline URL textarea.
- Preflight output for invalid URLs and automatic-regex misses.
- Separate “上传所选文件” and “从 URL 添加” actions.
- Shared result list with `queued/running/success/failed` labels and `aria-live="polite"` summary.
- `beforeunload` guard while `running === true`.
- `lrrApi.clearSearchCache().catch(() => {})` after each completed batch.
- Back behavior: `window.history.back()` when history exists, otherwise `navigateHome()`.

For auto mode, resolve the plugin independently for every URL:

```js
const selected = pluginValue === 'auto'
  ? matchDownloadPlugin(url, downloadPlugins)
  : downloadPlugins.find(item => item.value === pluginValue);
if (!selected) throw new Error('没有下载插件匹配该 URL，请手动选择插件');
return lrrApi.useDownloadPlugin(selected.value, url);
```

- [ ] **Step 5: Add the SVG upload glyph and responsive CSS**

Add an `upload` case to `ToolbarGlyph` using stroke-based tray/arrow paths consistent with existing icons. Add only page-specific layout rules that cannot be expressed cleanly inline: two-column desktop sections, one-column mobile collapse, drag-active border/background, task status colors, and reduced-motion-safe transitions.

- [ ] **Step 6: Run focused tests**

Run: `node --test src/lib/upload.test.js src/lib/apiUpload.test.js src/lib/navigation.test.js src/lib/metadataEditor.test.js`

Expected: all tests pass, 0 fail.

- [ ] **Step 7: Commit the upload page**

```powershell
git add src/pages/UploadPage.jsx src/components/AppGlyphs.jsx src/index.css src/lib/upload.js src/lib/upload.test.js
git commit -m "feat: add archive upload page"
```

---

### Task 5: Cross-feature verification and delivery

**Files:**
- Verify only; fix only failures caused by Tasks 1–4.

**Interfaces:**
- Validates the complete upload flow and ensures existing reader, metadata, cache, and theme behavior remain intact.

- [ ] **Step 1: Run all relevant unit tests**

Run:

```powershell
node --test src/lib/upload.test.js src/lib/apiUpload.test.js src/lib/navigation.test.js src/lib/metadataEditor.test.js src/lib/readerSettings.test.js src/lib/cachePolicy.test.js src/lib/pageIndicatorLayout.test.js src/lib/readerImageTransform.test.js src/lib/readerArchiveList.test.js src/lib/ehFavoriteSync.test.js
```

Expected: all tests pass, 0 fail.

- [ ] **Step 2: Run style and formatting verification**

Run: `node scripts/theme-self-check.mjs`

Expected: `theme self-check passed`.

Run: `git diff --check`

Expected: no whitespace errors; line-ending warnings are acceptable.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: Vite exits 0 and emits `dist` assets.

- [ ] **Step 4: Review requirements from the design document**

Confirm every item in `docs/superpowers/specs/2026-07-12-archive-upload-page-design.md`: settings entry, upload route, multiple files, multiple URLs, regex-first matching, manual fallback, independent task results, safe back navigation, before-unload guard, cache clear, no Worker change, and no new dependency.

- [ ] **Step 5: Resolve verification failures, then push `dev`**

If a check fails, return to the task responsible for that file, add a regression test where applicable, make the smallest correction, rerun every command in Tasks 5.1–5.3, and commit the exact corrected source and test files with `git commit -m "fix: finalize archive upload flow"`. Do not create an empty commit when no correction is required.

Push only after confirming the branch is still `dev` and the worktree contains no unrelated changes:

```powershell
git status --short --branch
git push origin dev
```
