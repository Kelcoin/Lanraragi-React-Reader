# Reader Watchlist Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在阅读器普通模式加入与阅读历史共用面板组件的待看归档按钮和下拉列表。

**Architecture:** 在 `Reader.jsx` 内提取 `ReaderArchiveListPanel`，由历史和待看两种数据提供标题、空状态、元信息和删除回调。新增一个纯元信息函数用于稳定处理历史进度和待看加入时间，并通过 Node 内置测试覆盖分支。

**Tech Stack:** React 18、Vite 5、Node.js `node:test`。

## Global Constraints

- 使用方案 B，共用归档列表面板组件。
- 普通模式显示按钮和面板；沉浸模式隐藏并关闭。
- 阅读历史、待看归档、阅读设置互斥。
- 不新增依赖，不修改 Worker 或待看存储格式。
- 不调用浏览器自动化。

---

### Task 1: 列表元信息的红—绿测试

**Status:** complete

**Files:**
- Create: `src/lib/readerArchiveList.js`
- Create: `src/lib/readerArchiveList.test.js`

**Interfaces:**
- Produces: `getReaderArchiveListMeta(item, type): { timestamp: number, progress: string }`

- [ ] 写失败测试：历史项使用 `time` 和页数，待看项使用 `addedAt` 且无进度。

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getReaderArchiveListMeta } from './readerArchiveList.js';

test('builds history and watchlist metadata', () => {
  assert.deepEqual(
    getReaderArchiveListMeta({ time: 10, page: 3, total: 12 }, 'history'),
    { timestamp: 10, progress: '3/12' },
  );
  assert.deepEqual(
    getReaderArchiveListMeta({ addedAt: 20 }, 'watchlist'),
    { timestamp: 20, progress: '' },
  );
});
```

- [ ] Run: `node --test src/lib/readerArchiveList.test.js`

Expected: FAIL，因为模块或导出尚不存在。

- [ ] 写最小实现。

```js
export function getReaderArchiveListMeta(item, type) {
  if (type === 'watchlist') {
    return { timestamp: Number(item?.addedAt) || 0, progress: '' };
  }
  return {
    timestamp: Number(item?.time) || 0,
    progress: `${Number(item?.page) || 0}/${Number(item?.total) || 0}`,
  };
}
```

- [ ] Run: `node --test src/lib/readerArchiveList.test.js`

Expected: PASS，1 test、0 failures。

### Task 2: 共用面板与待看数据接线

**Status:** complete

**Files:**
- Modify: `src/pages/Reader.jsx`
- Modify: `src/components/AppGlyphs.jsx`
- Test: `src/lib/readerArchiveList.test.js`

**Interfaces:**
- Consumes: `getWatchlist()`、`loadWatchlistState()`、`removeWatchlistItem(id)`、`getReaderArchiveListMeta(item, type)`
- Produces: 内部 `ReaderArchiveListPanel` 组件与 `showWatchlistPanel` 状态

- [ ] 扩展导入。

```js
import { getWatchlist, hasRemoteWatchlist, loadWatchlistState, removeWatchlistItem } from '../lib/watchlist';
import { getReaderArchiveListMeta } from '../lib/readerArchiveList';
```

- [ ] 在 `HistoryThumb` 后定义内部共用组件，参数固定为：

```jsx
function ReaderArchiveListPanel({ type, title, items, emptyMessage, cacheOnly, onDelete })
```

组件统一渲染 360px 面板、缩略图、翻译后的限定标签、标题、日期、可选进度和删除按钮。点击行调用 `navigateToArchive(item.id || item.arcid)`；删除按钮阻止冒泡并调用 `onDelete(item)`。

- [ ] 增加待看状态和刷新逻辑。

```js
const [showWatchlistPanel, setShowWatchlistPanel] = useState(false);
const [watchlistEntries, setWatchlistEntries] = useState(() => getWatchlist());
```

监听 `lrr:watchlist-changed`；远程配置存在时调用 `loadWatchlistState()`，成功写入 `state.items`，失败保持缓存。

- [ ] 增加待看删除处理。

```js
const handleRemoveWatchlist = useCallback((item) => {
  const id = item?.id || item?.arcid;
  if (!id) return;
  removeWatchlistItem(id).finally(() => setWatchlistEntries(getWatchlist()));
}, []);
```

- [ ] 更新互斥和沉浸模式关闭。

历史、待看、设置按钮打开自身时关闭另外两个。外部点击 effect 同时处理 `showWatchlistPanel`。增加 effect：当 `viewMode === 'immersive'` 时将三个面板状态设为 false。

- [ ] 在历史按钮旁增加普通模式待看按钮。

```jsx
<button disabled={!readerReady} data-panel-toggle onClick={...}>
  {isMobile ? <ToolbarGlyph name="watchlist" size={20} /> : '待看归档'}
</button>
```

- [ ] 用两个 `ReaderArchiveListPanel` 替换原历史面板 JSX，并增加待看实例。两者都使用 `viewMode !== 'immersive'` 外层条件。

- [ ] 为 `ToolbarGlyph` 增加 `watchlist` 书签路径。

```jsx
case 'watchlist':
  return <path d="M6 4.5h12v16l-6-3-6 3v-16z" />;
```

### Task 3: 验证和范围检查

**Status:** complete

**Files:**
- Verify: `src/pages/Reader.jsx`
- Verify: `src/components/AppGlyphs.jsx`
- Verify: `src/lib/readerArchiveList.js`
- Verify: `src/lib/readerArchiveList.test.js`

- [ ] Run: `node --test src/lib/readerArchiveList.test.js src/lib/ehFavoriteSync.test.js`

Expected: 2 tests、0 failures。

- [ ] Run: `node scripts/theme-self-check.mjs`

Expected: `theme self-check passed`。

- [ ] Run: `npm run build`

Expected: Vite build exit 0。

- [ ] Run: `rg -n "showWatchlistPanel|viewMode !== 'immersive'|ReaderArchiveListPanel|lrr:watchlist-changed" src/pages/Reader.jsx`

Expected: 可确认按钮、面板、事件监听、互斥状态和沉浸隐藏均已接线。

- [ ] Run: `git diff --check`

Expected: exit 0。

- [ ] 检查 `git diff`，确保只包含设计范围内文件且没有浏览器相关代码。
