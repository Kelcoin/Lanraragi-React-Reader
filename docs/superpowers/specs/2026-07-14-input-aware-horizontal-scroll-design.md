# 输入感知横向滚动与 Worker 同步设计

## 目标

- LRR 明确不支持进度时，每个新增最高阅读页立即触发 Worker 同步；频率高于 LRR 可用或状态未知时的 8 秒 Worker 节流。
- 鼠标滚轮位于横向组件内时只驱动组件横向滚动。
- 触屏保留方向语义：横向手势滚动组件，纵向手势滚动页面。

## 设计

`saveHistory` 增加可选 `immediateRemote`。Reader 仅在 `serverTracksProgress === false` 时传入。history 队列保留 urgent 状态；立即请求若遇到在途 Worker 请求，下一批仍在前一批结束后立即发送，不退回 8 秒。

`useHorizontalScroller` 继续独占非 passive wheel listener。只有存在横向溢出时才阻止默认滚动并把 wheel delta 映射为 `scrollLeft`。触屏不加 JS 手势识别，保留浏览器原生 `touchAction: auto`；移除纵向 overscroll contain，避免纵滑被横向组件吞掉并保留页面缩放。

## 边界

- LRR 可用或状态未知：Worker 8 秒节流不变。
- Ctrl+wheel 保留浏览器缩放。
- 无横向溢出时不截获 wheel。
- 不改变组件尺寸、动画、卡片视觉和鼠标拖拽。

## 验证

- 纯函数/源码回归检查覆盖 Worker urgent 调度、在途请求后的立即续发、wheel 溢出判断和触屏样式。
- 生产构建与 `git diff --check`。
- Web Interface Guidelines 局部审核：不禁用缩放；触屏交由原生方向处理；不在非模态横向列表使用纵向 overscroll contain。
