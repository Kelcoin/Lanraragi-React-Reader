# 移动端分类按钮比例与触屏 Hover 修复设计

## 目标

在窄屏下缩短分类按钮高度，并消除触屏取消分类后残留的 hover 高亮。桌面尺寸、鼠标 hover、选中态、分类筛选逻辑和主题保持不变。

## 根因

- `@media (max-width: 640px)` 将分类按钮 `min-height` 固定为 `44px`；横向 padding 和字号已缩小，高度未同步缩小，胶囊比例失衡。
- 全局 `.btn:hover` 在无 hover 能力的触屏设备上仍生效。移动浏览器会保留最后点击元素的 `:hover`，直到触摸其他位置。

## 方案

- 窄屏分类按钮改为 `min-height: 36px`、更小纵向 padding，并将圆角随高度收紧；横向 padding 与字号维持现有窄屏值。
- 增加 `@media (hover: none)` 的分类按钮专用覆盖，恢复未选中按钮的默认背景、边框、文字、阴影和 transform。
- 选中态继续使用现有内联样式，CSS 覆盖不会压过选中状态。
- 不使用点击后 `blur()`；移动端 sticky hover 并不由焦点状态可靠控制。
- 不修改全局 `.btn:hover`，避免影响其他页面。

## 验证

- 扩展现有分类按钮 Node 检查：断言窄屏高度为 36px，并存在 `@media (hover: none)` 专用重置。
- 运行专项检查、全部 `check-*.mjs`、Vite 生产构建及 `git diff --check`。
