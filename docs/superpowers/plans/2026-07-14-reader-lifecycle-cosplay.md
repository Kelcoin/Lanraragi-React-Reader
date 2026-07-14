# Reader Lifecycle & Cosplay Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 稳定普通/沉浸翻页与 iOS 显示，清理 Reader 局部资源，并完善详情、Cosplay 推荐及窄屏分类布局。

**Architecture:** 保持现有 Reader 状态结构与三图滑动架构。修复 DOM 生命周期和异步所有权，不新增依赖；共享缓存继续跨页面保留，Reader 仅释放自身引用。

**Tech Stack:** React 18、Vite、原生 DOM/CSS、Node `assert` 自检。

## Global Constraints

- 不改变现有功能、主题和主要视觉尺寸。
- Cosplay 且存在 `cosplayer:` 时，查询源与标题均切换为 Coser。
- 发布者、添加日期、发布日期、来源始终位于所有内容标签之后。
- 动画只使用 transform/opacity，并尊重 reduced motion。
- 不新增依赖；优先共享函数、CSS 媒体查询和浏览器原生能力。

---

### Task 1: Regression Check

**Files:**
- Create: `scripts/check-reader-lifecycle-cosplay.mjs`
- Test: `scripts/check-reader-lifecycle-cosplay.mjs`

**Interfaces:**
- Consumes: `categorizeTags(tags)` 与生产源码。
- Produces: 覆盖固定底部分组、单 DOM 图片、沉浸晋升复用、卸载清理、详情摘要、Coser 查询和窄屏 class 的自检。

- [ ] **Step 1: Write failing assertions**

使用 `node:assert/strict`：验证 `cosplayer` 位于 `uploader` 前且末尾四组严格为 `uploader/date_added/timestamp/source`；验证 Reader/Recommendations/Home/CSS 含批准设计的稳定结构。

- [ ] **Step 2: Verify RED**

Run: `node scripts/check-reader-lifecycle-cosplay.mjs`

Expected: FAIL，首个缺失行为为标签固定置底或 Reader 稳定图片结构。

### Task 2: Tag Order & Cosplay Recommendation

**Files:**
- Modify: `src/lib/tags.js`
- Modify: `src/components/Recommendations.jsx`
- Test: `scripts/check-reader-lifecycle-cosplay.mjs`

**Interfaces:**
- Produces: `categorizeTags()` 统一固定底部分组；Recommendations 内 `isCosplayWithCosplayer`、`sameCreatorTags`、`sameCreatorLabel`。

- [ ] **Step 1: Pin metadata groups**

普通固定组、未知组、general 输出后，再依次追加 `uploader/date_added/timestamp/source`。

- [ ] **Step 2: Select recommendation identity**

当标签同时含 `category:cosplay` 与非空 `cosplayer:`，`sameCreatorTags` 取 cosplayer；否则取 artist/group。缓存键加入推荐身份类型，标题使用“同Coser”或“同作者”。

- [ ] **Step 3: Verify GREEN subset**

Run: `node scripts/check-reader-lifecycle-cosplay.mjs`

Expected: 标签与推荐断言 PASS；Reader/UI 断言仍 FAIL。

### Task 3: Reader Image Lifecycle

**Files:**
- Modify: `src/pages/Reader.jsx`
- Test: `scripts/check-reader-lifecycle-cosplay.mjs`

**Interfaces:**
- Consumes: 现有 `PageImage` 回调、三张沉浸图片 refs、共享 image cache。
- Produces: 单 DOM `<img>` 加加载覆盖层；已晋升沉浸图片快速采用；集中局部清理。

- [ ] **Step 1: Stabilize PageImage**

用 layout effect 在绘制前切换加载状态；同一 `<img>` 始终挂载，ready 只隐藏 overlay，不重建图片节点。

- [ ] **Step 2: Reuse immersive preview**

若当前 `<img>` 的 src 已等于目标且 complete/naturalWidth 有效，直接显示并返回成功；否则才隐藏、赋值、decode。

- [ ] **Step 3: Move pending overlay**

把沉浸加载提示移入 `swipeContainerRef`，位于 zoom wrapper 兄弟层，使其随水平翻页移动但不随缩放。

- [ ] **Step 4: Release local resources**

登记翻页动画/封面提示 timeout；卸载时取消 RAF/timer、递增加载序号、清空三张图片 src/handlers、释放 Webtoon 检测图片。共享 cache 不清理。

- [ ] **Step 5: Verify GREEN subset**

Run: `node scripts/check-reader-lifecycle-cosplay.mjs`

Expected: Reader 生命周期断言 PASS。

### Task 4: Drawer Summary & Narrow Categories

**Files:**
- Modify: `src/pages/Reader.jsx`
- Modify: `src/pages/Home.jsx`
- Modify: `src/index.css`
- Test: `scripts/check-reader-lifecycle-cosplay.mjs`

**Interfaces:**
- Produces: `formatArchiveSize(value)`；`.archive-category-list` 与 `.archive-category-button`。

- [ ] **Step 1: Add archive summary**

读取 `size ?? filesize ?? file_size`，使用 `Intl.NumberFormat` 显示 B/KB/MB/GB；标签下显示“体积 · N 页”，未知体积只显示页数。

- [ ] **Step 2: Add responsive category classes**

桌面保持现值；窄屏减小横向 gap 与按钮左右 padding。按钮自身最小高度 32px，容器通过 padding 扩充纵向命中空间，不固定列数。

- [ ] **Step 3: Add reduced-motion rule**

窄屏只改静态间距；现有 active transform 在 `prefers-reduced-motion` 下取消。

- [ ] **Step 4: Verify GREEN**

Run: `node scripts/check-reader-lifecycle-cosplay.mjs`

Expected: PASS。

### Task 5: Full Verification

**Files:**
- Modify: `task_plan.md`
- Modify: `findings.md`
- Modify: `progress.md`

**Interfaces:**
- Consumes: 全部实现和检查。
- Produces: 可复核的验证记录。

- [ ] **Step 1: Run all checks**

Run: `Get-ChildItem scripts/check-*.mjs | ForEach-Object { node $_.FullName }`

Expected: 全部 exit 0。

- [ ] **Step 2: Build**

Run: `npm run build`

Expected: Vite production build 成功。

- [ ] **Step 3: Diff validation**

Run: `git diff --check`

Expected: exit 0。

- [ ] **Step 4: UI review**

按最新 Web Interface Guidelines 复核 `Reader.jsx`、`Home.jsx`、`Recommendations.jsx`、`index.css`，只报告本轮触达代码中的未解决问题。
