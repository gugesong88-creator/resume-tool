# 简历制作工具 (Resume Builder)

本工具是一款可完全在本地运行的简历排版与管理应用。目前专注维护“经典高密度型”单一模板，并支持全局个人档案同步、历史状态撤销/重做、可靠的本地落盘和可选的飞书投递通知。

---

## 🚀 核心特性

1. **模块化核心架构**
   * **Vite + TypeScript 入口**：`index.html` 只保留页面结构，样式与脚本统一由 `src/main.ts` 组织和构建。
   * **类型化模块架构**：路由、启动、API、数据仓库、首页、投递记录、全局档案、编辑器、历史快照和存储探针均已模块化；旧的 `src/legacy/` 兼容目录已彻底移除。
   * **数据模式规范**：统一基于 `src/schema.js` 进行版本迁移、结构归一化和运行时校验；当前数据版本为 v3。

2. **全局个人档案 (Global Profile)**
   * **一次填写，多份简历同步**：提供独立的全局档案管理页面，保存后可自动应用至所有关联的简历。
   * **弹性链接机制**：
     * **链接状态**：简历模块同步全局档案且本地只读，防止多份简历数据产生偏差。
     * **取消链接**：保留当前全局数据的本地副本并恢复可编辑状态，本地修改不会反向污染全局档案。

3. **经典高密度模板**
   * 专注维护一套黑白灰、高信息密度、ATS 友好的经典模板。
   * 主题色、字号、边距和模块间距仍可独立调整。

4. **历史快照与撤销重做 (Undo/Redo)**
   * 内置基于 `HistoryStack` 的操作历史管理。
   * 支持通过键盘快捷键（`Ctrl+Z` / `Cmd+Z`，`Ctrl+Shift+Z` / `Cmd+Shift+Z`）以及左上角撤销/重做按钮实时进行回滚。
   * 支持 500ms 智能输入防抖，自动记录每次有意义的修改状态。

5. **可靠的本地存储 & 瘦身引擎**
   * 搭载基于 Node.js 的本地服务器，数据以“临时文件写入 + 原子替换”的方式保存到 `data/resumes.json`，降低异常退出造成文件损坏的风险。
   * 保存操作在前端串行排队，旧请求不会覆盖更新的内存状态；服务端定期保留最近 20 份自动备份。
   * **大图抽取技术**：自动将富文本编辑器内插的 Base64 简历照片抽取并保存为本地实体文件 (`data/images/`)，彻底避免 JSON 数据库体积膨胀导致读写性能下降。

6. **飞书投递通知集成**
   * 仅在显式配置 `FEISHU_WEBHOOK` 后启用，不内置任何默认 Webhook。
   * 新增投递记录时，可向飞书群聊推送包含公司、岗位、日期及备注的卡片通知。

7. **双端高质量导出**
   * **前端矢量 A4 隔离打印**：使用 `html2pdf.js` 将画布放入完全独立的渲染隔离沙箱中；体积较大的 PDF 引擎只在首次快速导出时按需加载。
   * **服务端 Puppeteer 导出**：如果安装了 `puppeteer`，支持通过服务端无头浏览器进行更完美的矢量 PDF 离线渲染。

---

## 📂 项目结构

```bash
├── data/
│   ├── resumes.json          # 本地 JSON 数据库
│   └── images/               # 抽取出的简历照片物理文件
├── lib/
│   └── storage.js            # 原子写入、备份与图片抽取
├── src/
│   ├── main.ts               # Vite/TypeScript 前端入口
│   ├── app/
│   │   ├── bootstrap.ts      # 数据加载与应用启动
│   │   └── router.ts         # 类型化路由、离开确认与页面状态
│   ├── api/
│   │   └── client.ts         # 类型化的前端 API 交互客户端
│   ├── data/
│   │   ├── resume-repository.ts
│   │   ├── delivery-repository.ts
│   │   └── profile-repository.ts
│   ├── features/
│   │   ├── delivery/         # 投递新增、筛选、状态和表格事件
│   │   ├── editor/           # 类型化表单、布局、质量检查、富文本、保存及条目/模块操作
│   │   ├── home/             # 简历卡片及首页操作
│   │   ├── profile/          # 全局档案编辑、预览与富文本回写
│   │   └── storage/          # 本地存储状态探针
│   ├── modules/
│   │   └── export.js         # 双端 PDF 导出引擎
│   ├── templates/
│   │   ├── index.js          # 统一模板引擎注册中心
│   │   └── t01-classic-dense.js
│   ├── utils/
│   │   ├── clone.ts          # 类型安全的深拷贝兼容工具
│   │   ├── html.js           # HTML 实体转义与富文本安全过滤
│   │   └── time.js           # 物理时间格式化及 UUID 生成
│   ├── types/                # 浏览器与静态资源类型声明
│   ├── ui/
│   │   ├── bindings.ts       # 无内联脚本的静态 UI 事件绑定
│   │   └── feedback.ts       # Toast 与无内联事件弹窗
│   ├── schema.js             # 简历实体核心约束 Schema
│   └── store.js              # 统一状态管理与串行保存队列
├── test/                     # Node 单元与集成测试
├── e2e/                      # 浏览器端到端回归测试与临时环境辅助代码
├── scripts/                  # 启动、语法与仓库卫生检查脚本
├── .github/workflows/ci.yml  # GitHub Actions 持续集成
├── index.html                # 精简后的页面结构入口
├── server.js                 # 核心 Node.js 服务器
├── tsconfig.json             # TypeScript 严格检查配置
├── vite.config.mjs           # 开发代理与生产构建配置
├── package.json              # 依赖与脚本定义
└── resume_chatgpt_stable_clean_v9.html # 旧地址兼容跳转页
```

---

## ⚡ 快速开始

### 1. 启动本地服务
确保已安装 Node.js 22.12+，在项目根目录下执行：

```bash
# 安装前端构建与 PDF 导出依赖
npm install

# 生产模式：先构建 dist，再启动本地服务器
npm start
```

服务器默认只监听本机 `127.0.0.1`，启动后会自动打开编辑界面：`http://127.0.0.1:8000/`。旧地址会继续映射到新入口。

开发时使用：

```bash
# 同时启动 API 服务与 Vite 热更新开发服务器
npm run dev
```

开发页面运行在 `http://127.0.0.1:5173/`，API 请求由 Vite 代理到本地 8000 端口。

macOS 用户也可以双击桌面的 `启动简历工具.command`。该快捷方式链接到项目内的 `scripts/start-resume-tool.command`，会打开终端、完成生产构建并启动浏览器；在终端按 `Ctrl+C` 即可停止服务。

### 2. 飞书集成配置 (可选)
如果需要启用飞书投递自动通知，您可以在系统环境变量中配置您的 Webhook 地址：
```bash
export FEISHU_WEBHOOK="https://open.feishu.cn/open-apis/bot/v2/hook/your-hook-id"
npm start
```
不配置时不会发送任何网络通知。

### 3. 验证改动

```bash
# 检查是否误跟踪个人数据、导出文件或高风险密钥
npm run repo:check

# 语法检查 + TypeScript 检查 + 单元/集成测试 + 生产构建
npm run verify

# 使用临时数据启动真实浏览器，验证路由、编辑保存、撤销重做、条目操作、
# 富文本、自动保存、布局压缩、标点检查、英文草稿、全局档案链接及私有路径保护
npm run test:e2e

# 一次执行与 GitHub Actions 相同的全部检查
npm run ci
```

GitHub Actions 会在 push 和 pull request 时自动执行 `npm run ci`。

> 隐私提示：`.gitignore` 和 `npm run repo:check` 会阻止简历数据、图片、备份、PDF/ZIP 导出以及环境变量文件再次被误提交。但已经进入 Git 历史的内容不会因为取消当前跟踪而自动消失，仍需另行重写历史，并轮换曾公开的 Webhook 或其他密钥。

---

## 🛠 开发教训与规范

在参与本项目开发或调整样式时，**必须**遵循以下核心规范（详见 `LESSONS.md`）：
1. **主题色作用域隔离**：主题色变量 `--accent` 必须且只能绑定在 `.a4-canvas` 容器上，禁止注入全局 `html`/`body`。
2. **富文本行内样式穿透**：修改整体色调必须能穿透富文本编辑器的行内 CSS。在 `templates.css` 中需使用 `!important` 级层叠选择器，但显式排除图标。
3. **状态强同步**：每次加载简历、执行数据迁移或撤销重做时，内存中的 `formatting` 与 UI 控件（如调色盘）必须执行强同步刷新，避免状态脱节。
