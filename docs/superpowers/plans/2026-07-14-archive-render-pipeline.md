# Archive Render Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复无标签归档误判、元数据插件提示不消失，以及主页分页/筛选/卡片渲染竞态，同时保持现有视觉设计。

**Architecture:** 让 React state effect 成为分页、筛选、分类与模式切换的唯一前景请求入口；每次请求拥有 AbortController 和递增 ID，只有最新请求可提交 data/loading/error。无标签端点先取得 ID，再按当前页/滚动批次以有界并发加载元数据，任何失败显示错误而非空仓库。

**Tech Stack:** React 18、原生 Fetch/AbortController、CSS Grid、Node.js `assert` 自检、Vite 5。

## Global Constraints

- 不新增依赖。
- 不改变现有主题、卡片尺寸、宽卡公式、分页视觉及动效时长。
- 保留滚动与分页两种浏览模式、筛选预设、分类、多选、快照恢复与自动刷新。
- 所有生产逻辑先有失败回归检查；完成前运行全部 Node 自检、`npm run build`、`git diff --check`。
- 不启动交互浏览器；如静态与构建证据不足，在最终结果中明确剩余人工验证项。

---

### Task 1: 无标签批次加载

**Files:**
- Modify: `src/lib/api.js`
- Modify: `src/pages/Home.jsx`
- Modify: `scripts/check-untagged-archives.mjs`

**Interfaces:**
- Produces: `loadArchiveMetadataBatch(ids, loadArchive, { concurrency, signal }) -> Promise<Array<object>>`
- Produces: `lrrApi.search(..., options)`, `getUntaggedArchives(options)`, `getArchive(id, options)` 支持 AbortSignal。

- [x] 扩展自检：多个 ID 中任一元数据请求失败时必须 reject；并发数不得超过设定值；AbortError 必须透传。
- [x] 运行 `node scripts/check-untagged-archives.mjs`，确认当前代码因缺少 helper 而失败。
- [x] 在 `api.js` 实现有界并发 helper，并给三个 GET 方法透传 options。
- [x] 在 Home 无标签分支先按 page/start 切 ID，再只加载当前批；失败写 error，不再写 total=0 空态。
- [x] 重跑自检，确认通过。

### Task 2: 元数据提示生命周期

**Files:**
- Modify: `src/pages/MetadataPage.jsx`
- Modify: `scripts/check-metadata-plugin-result.mjs`

**Interfaces:**
- Consumes: 现有 `showStatus(text, type, { autoHide })`。

- [x] 扩展自检：插件有新标签和无新标签两条成功路径都必须启用 autoHide，error 路径保持常驻。
- [x] 运行自检，确认“未返回新标签”路径失败。
- [x] 给插件完成提示传 `{ autoHide: true }`；保留现有 timer 重入清理与 unmount cleanup。
- [x] 重跑自检，确认通过。

### Task 3: 单一请求入口与请求所有权

**Files:**
- Modify: `src/pages/Home.jsx`
- Create: `scripts/check-archive-render-pipeline.mjs`

**Interfaces:**
- Home 内部 `archiveBrowseStateRef` 保存请求默认值。
- Home 内部 `archiveRequestRef` 保存 `{ id, controller }`。

- [x] 写源码结构回归检查：状态处理器不得直接 force fetch；旧 request ID 不得写 data/error/loading；unmount 必须 abort。
- [x] 运行检查，确认当前双触发与无条件 finally 导致失败。
- [x] 用同步 ref 读取请求默认 state，使 `doFetch` 不依赖 total/start/category 等结果状态。
- [x] 分类、筛选、清除、模式切换只更新 state/URL，由单一 effect 拉取；手动刷新、自动刷新、加载更多保留显式请求。
- [x] 新请求 abort 旧请求；catch/finally 仅最新 ID 可写状态；AbortError 静默退出。
- [x] 增加 `archiveLoadError`，只有真实成功空数组显示“没有无标签归档”。
- [x] 重跑新检查与原有自检。

### Task 4: 网格布局抖动与最终验证

**Files:**
- Modify: `src/pages/Home.jsx`
- Modify: `src/components/ArchiveCard.jsx`
- Modify: `src/index.css`
- Modify: `scripts/check-archive-render-pipeline.mjs`

**Interfaces:**
- 分页末行居中仍使用 `getLastArchiveRowCentering`，但 observer 只响应 direct grid child 与 direct wrapper `is-wide` 变化。

- [x] 扩展检查：网格不得 dense 回填；observer 不得监听整个 subtree；ArchiveCard 所有关闭 timer 必须在 unmount 清理。
- [x] 运行检查，确认当前布局链失败。
- [x] 取消 dense 回填，保持 DOM/视觉顺序稳定；保留列宽、gap、wide shell 公式。
- [x] 收窄 MutationObserver；保留 ResizeObserver、rAF 合批、末行居中与 reduced-motion。
- [x] 统一 ArchiveCard 二级关闭 timer ref 与 cleanup，不改 200ms/100ms 动画时长。
- [x] 运行 `node scripts/check-untagged-archives.mjs`、`node scripts/check-metadata-plugin-result.mjs`、`node scripts/check-archive-render-pipeline.mjs`、其他现有自检。
- [x] 运行 `npm run build` 与 `git diff --check`，审查最终 diff 是否仅触达计划文件。
