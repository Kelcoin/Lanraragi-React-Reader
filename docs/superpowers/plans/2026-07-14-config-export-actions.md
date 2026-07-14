# Config Export Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将导出配置弹窗的“复制”和“关闭”按钮等宽并排。

**Architecture:** 在 `ConfirmDialog` 现有操作栏增加可选 `actionsBefore` 节点。`ConfigTransferDialog` 仅在导出模式传入复制按钮，继续复用现有确认按钮作为关闭操作。

**Tech Stack:** React 18、CSS Flexbox、Vite

## Global Constraints

- “复制配置”改为“复制”；成功状态保留“已复制”。
- “复制”和“关闭”按钮同宽并排，间距保持 `10px`。
- 导入模式、遮罩关闭、Escape 关闭和错误处理不变。
- 不新增依赖或组件。

---

### Task 1: 导出配置操作栏

**Files:**
- Modify: `src/components/ConfirmDialog.jsx`
- Modify: `src/components/ConfigTransferDialog.jsx`

**Interfaces:**
- Consumes: `ConfirmDialog` 现有 `children`、取消与确认操作。
- Produces: 可选 React 节点属性 `actionsBefore`，在取消和确认按钮前渲染。

- [x] **Step 1: 运行失败静态断言**

```powershell
node -e "const fs=require('fs');const c=fs.readFileSync('src/components/ConfirmDialog.jsx','utf8');const t=fs.readFileSync('src/components/ConfigTransferDialog.jsx','utf8');if(!c.includes('actionsBefore')||!t.includes(\"copied ? '已复制' : '复制'\"))process.exit(1)"
```

Expected: FAIL，退出码 `1`。

- [x] **Step 2: 增加操作栏节点**

在 `ConfirmDialog` 参数中加入 `actionsBefore`，并在 `.confirm-dialog-actions` 内、取消按钮前渲染：

```jsx
{actionsBefore}
{showCancel && (/* 现有取消按钮 */)}
```

- [x] **Step 3: 接入导出复制按钮**

删除弹窗正文中的独立复制按钮，向 `ConfirmDialog` 传入：

```jsx
actionsBefore={isExport ? (
  <button type="button" className="btn" onClick={copyValue}>
    {copied ? '已复制' : '复制'}
  </button>
) : null}
```

- [x] **Step 4: 运行静态断言和生产构建**

```powershell
node -e "const fs=require('fs');const c=fs.readFileSync('src/components/ConfirmDialog.jsx','utf8');const t=fs.readFileSync('src/components/ConfigTransferDialog.jsx','utf8');if(!c.includes('actionsBefore')||!t.includes(\"copied ? '已复制' : '复制'\"))process.exit(1)"
npm run build
git diff --check
```

Expected: 全部退出码 `0`；Vite 构建成功。

- [x] **Step 5: 提交**

```powershell
git add src/components/ConfirmDialog.jsx src/components/ConfigTransferDialog.jsx docs/superpowers/plans/2026-07-14-config-export-actions.md
git commit -m "style(config): align export actions"
```
