# 简历制作工具：开发教训与系统设计指南 (LESSONS.md)

本文件总结了简历制作工具（以 `index.html` 与 `src/main.ts` 为前端入口）开发中的核心踩坑教训、技术原理及开发铁律。**未来的开发助手和开发者必须严格遵守本指南，以防止修复一个 bug 时引入其他连锁 bug。**

---

## 1. 核心架构与数据流向

整个应用采用“Vite 构建的浏览器单页界面 + 本地 Node.js 服务”的架构。浏览器负责编辑、预览与交互，本地服务负责校验、原子落盘、备份、图片抽取和可选的 PDF 导出。生产服务只托管 `dist/` 与 `data/images/`，不得直接暴露 `src/`、配置或简历 JSON。前端数据流与样式流的关系如下：

```
[用户操作] ──> [onFormatChange / 历史恢复] ──> 更新 [editState.formatting]
                                                        │
                      ┌─────────────────────────────────┴────────────────────────┐
                      ▼                                                            ▼
            [updateFormattingUI()]                                         [applyFormatting()]
      同步更新左侧编辑栏控件状态                                      将格式变量以 CSS 变量注入到 A4 画布
      (例如 fmt-theme-color 等)                                      (例如 --accent, --fmt-font-size 等)
                                                                                   │
                                                                                   ▼
                                                                        [renderPreview() / 导出]
                                                                        依据样式与最新变量渲染 Canvas
```

---

## 2. 核心踩坑教训与开发铁律

### 铁律一：主题色作用域必须严格隔离 (Scope Isolation)
* **教训**：直接修改 `document.documentElement` 或 `:root` 的 `--accent` 变量会污染整个网页的 UI（如左侧工具栏、应用 Logo、撤销按钮等）。
* **规矩**：**简历的主题色变量 `--accent` 必须且只能绑定在 `.a4-canvas` 容器上**。严禁向 `html`、`body` 或其他全局节点注入简历主题色变量。

### 铁律二：必须穿透富文本编辑器的行内样式 (Inline Style Specificity)
* **教训**：用户在预览区使用富文本编辑（加粗、改颜色）时，浏览器会在 DOM 中插入行内样式（如 `<span style="color: rgb(30, 58, 138);">`）。行内样式优先级高于常规 CSS，这会导致“修改整体色调”对已编辑过的文字失效。
* **规矩**：在 `templates.css` 中必须使用强力的 `!important` 级层叠选择器，穿透覆盖姓名和模块标题内可能产生的所有子孙节点，但需显式排除图标本身：
  ```css
  .a4-canvas .resume-name,
  .a4-canvas .resume-name *,
  .a4-canvas .section-title,
  .a4-canvas .section-title *:not(.section-icon):not(.section-icon *) {
    color: var(--accent) !important;
  }
  .a4-canvas .section-title {
    border-color: var(--accent) !important;
  }
  ```

### 铁律三：颜色选择器防塌陷与 Webkit 自定义 (Flex Compressibility)
* **教训**：在 Flex 布局容器内，`<input type="color">` 在未指定 `flex-shrink: 0` 时会被浏览器自动压缩为 0 或极窄尺寸。同时，浏览器默认的 padding/border 样式会使其看起来像一个纯白的色块。
* **规矩**：必须在 `editor.css` 中为 `#fmt-theme-color` 重置外观，强制固定宽高并保护防缩：
  ```css
  input[type="color"]#fmt-theme-color {
    -webkit-appearance: none;
    border: none !important;
    background: none !important;
    padding: 0 !important;
    width: 24px !important;
    height: 24px !important;
    min-width: 24px !important;
    flex-shrink: 0 !important;
    cursor: pointer;
  }
  input[type="color"]#fmt-theme-color::-webkit-color-swatch-wrapper {
    padding: 0 !important;
  }
  input[type="color"]#fmt-theme-color::-webkit-color-swatch {
    border: 1px solid #d1d5db !important;
    border-radius: 4px !important;
  }
  ```

### 铁律四：内存状态与 UI 控件必须强同步 (State Sync & History Rollback)
* **教训**：在加载简历、执行数据迁移或撤销重做历史记录 (`restoreHistoryState`) 时，如果仅恢复了 `editState.resume`，而没有显式恢复 `editState.formatting` 指针并调用 `updateFormattingUI()`，会导致左侧编辑栏控件状态（如主题色调色盘）停留在回退前的值，造成严重的数据不一致。
* **规矩**：
  1. 加载或迁移简历时，必须从归一化后的经典模板配置恢复 `editState.formatting`，不得使用未迁移的旧数据指针。
  2. 历史回滚时，必须同时覆盖 `editState.formatting` 内存空间，并立即执行 `updateFormattingUI()` 与 `renderPreview()`。
  3. 执行 `onFormatChange` 更新属性后，若是非数值（如 HEX 颜色），应越过 `parseFloat` 并立即执行 `updateFormattingUI()` 刷新调色盘自身。

### 铁律五：导出/打印上下文环境补全 (Print Context Replication)
* **教训**：简历导出 PDF（无论是 Puppeteer 服务端导出、前端 html2pdf 图片导出，还是 `window.print` 矢量打印）都是通过**克隆**或**重新渲染** HTML 节点进行的。如果不把动态的主题色及排版参数（如 `--accent`、 margins、module spacing 等）显式设置到克隆后的新节点上，导出的 PDF 将丢失自定义样式。
* **规矩**：在 `src/modules/export.js` 的所有导出分支中，克隆 DOM 节点或构建新 window 时，必须手动将当前 formatting 的配置（特别是 `--accent` 变量和自定义外边距）写入克隆节点的 style 属性中：
  ```javascript
  // 示例：静态导出/图片导出中
  tempDiv.style.setProperty('--accent', tc);
  tempDiv.style.padding = `${marginY}px ${marginX}px`;
  
  // 示例：新窗口矢量导出打印中
  `<div class="a4-canvas ${cssClass}" style="--accent: ${tc}">${resumeHTML}</div>`
  ```

### 铁律六：静态页面禁止内联事件 (Event Binding Boundary)
* **教训**：`onclick`、`onchange` 等内联脚本会迫使业务函数长期挂在 `window` 上，难以进行类型检查、依赖追踪和内容安全策略收紧。
* **规矩**：`index.html` 只声明 `data-*` 行为标记；静态控件事件统一在 `src/ui/bindings.ts` 中绑定。首页卡片、投递表格和弹窗也必须使用事件监听或事件委托。新增控件时不得重新引入内联事件；编辑器与全局档案中的遗留内联事件应在后续迁移中继续移除。

### 铁律七：业务读写必须经过仓库边界 (Repository Boundary)
* **教训**：页面直接读取、排序或替换 Store 数组，会让展示逻辑意外修改内存状态，并绕开迁移、保存队列和级联删除规则。
* **规矩**：简历增删改查统一经过 `src/data/resume-repository.ts`，投递记录经过 `src/data/delivery-repository.ts`，全局档案经过 `src/data/profile-repository.ts`。展示模块只能使用仓库返回值，不得直接持有或就地排序 Store 内部数组。

---

## 3. 每次开发后的自测清单 (Verification Checklist)

修改完代码后，必须**至少**通过以下 5 项测试才可交付：

1. [ ] **调色盘状态**：打开页面，整体色调输入框能正确显示当前简历的色调，且非纯白、非极小塌陷。
2. [ ] **局部颜色穿透**：修改预览区个人信息或模块文本的颜色后，再次调节“整体色调”，姓名、大字标题和底轴仍能跟随整体色调变化。
3. [ ] **UI 隔离度**：将整体色调调为极端颜色（如 `#ff0000` 鲜红），检查网页自身的 Logo、左侧编辑菜单按钮等是否保持蓝色不变。
4. [ ] **经典模板与撤销**：
   * 打开新旧简历后都只使用“经典高密度型”，且原有模块内容与排序完整保留。
   * 修改颜色后点击“撤销”，左侧调色盘和右侧 Canvas 必须同步退回上一色值。
5. [ ] **双端导出**：分别点击“矢量导出 PDF”与“快速导出（图片型）”，验证下载到的 PDF 文件中，姓名、底轴和大字标题的颜色是否与网页预览中的自定义主题色完美一致。
