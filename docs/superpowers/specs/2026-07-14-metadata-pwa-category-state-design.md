# 元数据、PWA 与分类状态修复设计

## 目标

1. 元数据插件提示消失时，外层大背景框平滑收缩。
2. PWA 新版本提示文字横向居中。
3. 从其他页面返回主页后，分类和“无标签”按钮保持高亮。
4. “无标签”模式不会被后续自动刷新覆盖为全部归档。

## 根因

- 元数据提示在容器开始收缩时同步卸载，容器失去内容高度，无法完成 `grid-template-rows` 插值。
- PWA 文本占据剩余宽度，但没有 `text-align: center`。
- 主页快照保存归档与筛选条件，却不保存 `selectedCategory`；恢复时该状态固定为 `null`。
- 无标签归档可从快照恢复，但分类状态丢失后，定时或焦点刷新按普通搜索路径重新获取全部归档。

## 设计

### 元数据提示

- 提示进入 `closing` 状态时，将 `metadata-status-wrap` 设为关闭，立即开始 `260ms` 收缩。
- 收缩期间保留提示 DOM；动画结束后再设为 `null`。
- 继续使用现有 opacity/transform 动画与 `prefers-reduced-motion` 规则，不测量 DOM 高度。

### PWA 提示

- 仅为提示文本增加横向居中样式。
- 不改变自动激活、刷新延时、live region 或安全区布局。

### 分类状态

- `buildHomeStateSnapshot` 保存 `selectedCategory`。
- `selectedCategory` 初始值从有效 `homeSnapshot` 恢复，否则为 `null`。
- 快照恢复后，`archiveBrowseStateRef` 同步持有该分类；自动刷新继续走正确的无标签 API 分支。
- 普通筛选、取消分类、清空筛选和分页行为不变。

## 验证

- 回归检查覆盖提示关闭时保留内容、PWA 居中样式、分类快照保存与恢复。
- 现有无标签、渲染链路回归检查全部通过。
- 生产构建与 `git diff --check` 通过。
- UI 复审确认 reduced motion、live region、长文本和安全区规则未退化。
