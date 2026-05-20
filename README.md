# 简历制作工具（本地版）

本仓库是一个本地运行的简历模板编辑与管理工具，基于单页 HTML 编辑器和一个轻量的本地文件存储服务。适合注重隐私、自定义和离线使用的场景。

**主要文件**
- [resume_chatgpt_stable_clean_v9.html](resume_chatgpt_stable_clean_v9.html#L1) — 前端单页应用，包含编辑器、预览与导出逻辑。
- [server.js](server.js#L1) — Node 本地文件服务器，提供 /api/store 等简单 API，并将内嵌 base64 图片抽取为 [data/images](data/images) 中的文件。
- [start_local_server.py](start_local_server.py#L1) — Python 可替代的静态文件+保存接口启动脚本。
- [data/resumes.json](data/resumes.json#L1) — 本地存储的简历数据示例。

**功能概览**
- 本地单页编辑器（HTML+JS），可编辑多个模块（个人信息、教育、实习、项目等）。
- 本地 JSON 存储（data/resumes.json），支持多份简历与版本性字段（created_at、updated_at）。
- 客户端导出 PDF（使用 html2pdf.js）；服务端会把内联 base64 图片存为独立文件以节省 JSON 大小。
- 简单的投递/记录视图（deliveryRecords 占位）。
- 可直接用 `node server.js` 启动，也可用 `python3 start_local_server.py` 静默启动并打开浏览器。

快速开始
1. 安装 Node（可选，若使用 Node 启动）或确保有 Python3（用于备用启动脚本）。
2. 在项目根目录打开终端：

  使用 Node:

  ```bash
  npm start
  # 或
  node server.js
  ```

  使用 Python 启动静态服务:

  ```bash
  python3 start_local_server.py
  ```

3. 浏览器会打开编辑页面：/resume_chatgpt_stable_clean_v9.html。

Server-side PDF 导出（可选）

- 本仓库新增了服务器端高质量 PDF 导出支持（基于 Puppeteer）。当在项目中安装了 `puppeteer` 依赖后，服务器会暴露一个导出接口：

  - `POST /api/export_pdf`，请求体为 JSON：
    - `{ "html": "<...>" }` —— 直接渲染传入的 HTML 并导出 PDF。
    - `{ "url": "/resume_chatgpt_stable_clean_v9.html" }` —— 渲染服务器可访问的相对 URL 并导出。

  返回值为 `application/pdf`，会以附件形式下载。示例 curl：

  ```bash
  # 通过 URL 导出（服务器会加载该页面并渲染）
  curl -X POST http://localhost:8000/api/export_pdf \
    -H "Content-Type: application/json" \
    -d '{"url":"/resume_chatgpt_stable_clean_v9.html"}' --output resume.pdf

  # 直接提交 HTML 导出
  curl -X POST http://localhost:8000/api/export_pdf \
    -H "Content-Type: application/json" \
    -d '{"html":"<html><body><h1>测试</h1></body></html>"}' --output resume.pdf
  ```

  注意：`puppeteer` 会在安装时下载 Chromium，首次安装可能较大（几十到上百 MB）。如需跳过下载或使用系统 Chromium，可改用 `puppeteer-core` 并在环境中指定 `PUPPETEER_EXECUTABLE_PATH`。

与商用简历工具对比（简要）

优势：
- 完全本地化：数据存储在本地文件，隐私性好，便于备份与离线使用。
- 代码简单、易定制：项目文件容易阅读与修改，适合深度定制模板或功能。
- 数据为可读 JSON，利于程序化处理（批量导出、多语言转换等）。

主要缺点 / 与商用工具差距：
- UI 与模板数量：当前仅有内嵌模板与基本样式，缺少丰富模板库与交互式模板市场。
- 智能辅助：缺少内置的写作/润色 AI 建议、ATS 优化建议、职位匹配（JD 分析）等商用常见能力。
- 导入/集成：无 LinkedIn/CV 导入、无云端同步、无第三方账号登录与多设备同步功能。
- 导出可靠性：客户端的 html2pdf 导出对不同浏览器/字体有差异，缺少服务器端高质量 PDF 渲染（如 Puppeteer/Wkhtmltopdf）。
- 协作与版本控制：没有历史版本、多人协作或回滚功能。
- 可用性与可访问性：缺少移动端优化、国际化 UI 与无障碍支持。
- 部署与包装：缺少 Docker、CI、单元/端到端测试和发布说明。

改进建议（按优先级）

短期（快速可落地）
- 在仓库中添加本 README 与 LICENSE（推荐 MIT），并补充运行截图与示例数据。已在本仓库创建 README。
- 把客户端 PDF 导出改为可选的服务器端导出（使用 Puppeteer），提高导出一致性与质量。
- 增加导入功能：从 Word/Markdown/简单的 LinkedIn 导出（CSV/JSON）导入。 

中期（增强功能）
- 集成写作/润色 API（如 OpenAI / 本地 LLM）以提供要点重写、成就量化、ATS 关键词建议。
- 模板系统化：把模板拆成模块化配置，提供多个预设模板与模板预览/切换功能。
- 添加历史版本与本地备份（按时间戳保存快照），支持恢复。

长期（产品化）
- 帐号和云同步（可选端到端加密）；团队协作与模板市场。
- 自动 JD 分析与一键投递集成（支持邮件/第三方投递 API）。
- 增加可拓展的插件体系，让社区贡献模板和导出器。

开发者说明（快速参考）
- 数据文件: [data/resumes.json](data/resumes.json#L1)。
- 图片存放: [data/images](data/images)（server.js 会把内联 base64 图片保存到此目录）。
- 启动: `npm start`（使用 Node）或 `python3 start_local_server.py`。

贡献与许可
- 当前仓库未包含 LICENSE 文件。建议在将来添加明确许可证（例如 MIT）以便第三方贡献。
- 欢迎 Issues/PR：请先在 Issues 中描述改进建议或 bug，再提交小的 PR。

后续我可以帮你：
- 把客户端 PDF 导出替换成服务器端渲染（Puppeteer）；
- 添加一个简单的模板切换面板与更多模板样例；
- 集成一个基础的 AI 文案润色入口（只需接入一个 API key）；

如果你想让我继续实现其中任意一项，请告诉我优先级。 

## 架构重构进度 (Architecture Refactoring Progress)

目前项目正在进行**渐进式架构重构**，从单文件巨石架构（Monolith）迁移到现代模块化架构，为未来可能的 React/Vue 迁移铺路。

### 已完成阶段
- **Phase 1a/1b/1c: 基础剥离**
  - 将内嵌 CSS 剥离至 `assets/styles/` (base, editor, templates, delivery)。
  - 提取纯工具函数至 `src/utils/html.js` 和 `src/utils/time.js`。
  - 建立统一的数据契约 `src/schema.js`。
- **Phase 1d/1e: 状态与通信解耦**
  - 彻底移除了导致假死的同步 XHR 请求，重构为基于 `fetch` 的异步 API 客户端 (`src/api/client.js`)。
  - 引入全局状态容器 `src/store.js`，采用"乐观更新"策略，消除了多处全局变量污染，并通过代理完美兼容了遗留的 `window.editState` 和存储读写调用。

### 下一步计划
- **Phase 1f: 模板系统分离** - 将超大函数 `renderResumeHTML` 拆分为独立模板引擎文件。
- **Phase 1g: PDF 导出统一** - 消除导出代码的多版本冗余。
- **Phase 1h: 编辑器面板合并** - 消除所有 UI 事件的猴子补丁（Monkey Patch）包装链。
- **Phase 1i: 纯净入口** - 建立全新的 `index.html` 外壳，挂载模块化架构。
