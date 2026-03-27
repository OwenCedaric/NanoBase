# 产品需求文档 (PRD)：极简自动化 AI 知识库系统

## 1. 系统概述与核心工作流
本项目是一个基于 Cloudflare Workers + GitOps 理念的轻量级知识库发布系统，专为管理和展示单文件 HTML 格式的 AI 学习记录设计。系统强依赖自动化，以**性能优先、边界清晰**为核心原则。

**核心资源流转闭环：**
1. **上传 (Client -> Worker)：** 管理员在前端 `/upload` 提交单/多个 HTML 文件及鉴权 Token。
2. **处理 (Worker 内存)：** Worker 拦截请求并校验 Token。通过正则提取 HTML `<title>`，更新内存中的 `index.json`。
3. **推送 (Worker -> GitHub)：** Worker 使用预置的 GitHub PAT (Personal Access Token) 调用 GitHub REST API，将新 HTML 和更新后的 `index.json` 作为 Commit 推送至指定仓库。
4. **部署 (GitHub Actions -> Cloudflare)：** GitHub 监听到 Push 事件，触发 CI/CD 流程，读取环境变量，将包含最新静态资产的项目重新构建并部署至 Workers 边缘节点。

## 2. 约束与技术栈规范
* **包管理：** 强制统一使用 `pnpm`。
* **CSS 框架：** 强制使用最新的 **Tailwind CSS v4**。必须利用 v4 基于 CSS 变量的 `@theme` 配置引擎，**禁止**生成过时的 `tailwind.config.js` 文件。
* **推荐生态库：** * 样式合并：`clsx` + `tailwind-merge`
  * UI 图标：`lucide-react` 或 `lucide-vue` (极简风格，按需引入)
  * 日期处理：`dayjs` (保持低包体积)
* **性能与环境约束：**
  * Worker 运行环境严格限制 CPU 时间和内存。**禁止**引入 `jsdom` 或 `cheerio` 等重型 DOM 解析库。提取 HTML 元数据必须使用轻量级正则表达式。
  * 前端打包产物必须极致压缩，首屏仅加载必要资源。

## 3. 路由设计与 UI/UX 规范
前端 UI 需严格遵循**现代极简主义 (Modern Minimalist)**，大面积留白，高信噪比，消除视觉噪音。必须原生支持并根据系统偏好自动适配 Light/Dark 模式。

### 3.1 列表与检索视图 (`/` 与 `/index`)
* **路由映射：** 根路由 `/` 和 `/index` 必须在路由层指向同一逻辑组件或执行无缝重定向，避免 404。
* **核心功能：**
  * 首次加载解析生成的 `index.json` 数据。
  * **快速检索：** 提供极简搜索框，基于 Title 进行前端模糊过滤（利用前端算力，降低后端请求）。
  * **分页控制：** 支持通过 URL 参数（如 `?page=n`）进行列表分页。
  * **响应式：** 桌面端采用宽幅列表或轻量网格，移动端自动折叠为单列流式布局。

### 3.2 内容阅读视图 (`/[content-name]`)
* **核心功能：** 根据动态路由读取并渲染对应的单文件 HTML。
* **样式隔离 (Critical)：** 由于原 HTML 为 AI 生成，自带不可控的内联样式或冲突标签。必须使用 `<iframe srcdoc="...">` 或 Shadow DOM 进行严格的**样式隔离**，确保原生内容不被 Tailwind Reset 破坏，同时不污染主站框架。

### 3.3 管理上传视图 (`/upload`)
* **核心功能：** 提供受保护的文件上传网关。
* **界面元素：**
  * 鉴权密钥输入框（支持输入后持久化存储于 `localStorage`，后续自动注入 Header）。
  * 文件选择区（支持拖拽及多选 HTML 文件）。
  * 状态反馈（清晰的 Loading 态及成功/失败的 Toast 提示）。

## 4. 后端 Worker 接口规范
接口设计需保持无状态与高并发容错能力。

* **`POST /api/upload` (核心处理)：**
  * **安全校验：** 提取 Header 中的 Token（如 `Authorization: Bearer <TOKEN>`），与 Worker 环境变量中的 Secret 比对。失败立即返回 `401 Unauthorized`。
  * **数据处理：** 解析 `multipart/form-data`。正则提取 `<title>...</title>`，若匹配失败则降级使用文件名。
  * **GitHub API 交互：**
    1. 获取目标仓库中 `index.json` 的最新 SHA。
    2. 将新文档元数据追加至 JSON 数组。
    3. 并行（`Promise.all`）或串行发起 `PUT /repos/{owner}/{repo}/contents/{path}` 请求，提交 HTML 文件与新 `index.json`。
    4. *容错逻辑：* 设置合理的 Fetch Timeout，处理 GitHub API 可能的 409 冲突。
* **`GET /api/index` (可选)：** 如果架构设计为纯静态导出，前端可直接 Fetch 静态文件；若设计为动态路由，则 Worker 读取 KV/静态资源返回 JSON 并设置强缓存 `Cache-Control`。

## 5. CI/CD 与环境变量映射 (GitOps)
系统的自动化闭环高度依赖 GitHub Actions。开发需提供标准的 `.github/workflows/deploy.yml` 和 `wrangler.toml` 模板。

### 5.1 GitHub Actions 工作流 (`on: push`)
1. Checkout 代码。
2. Setup Node.js & `pnpm install`。
3. 执行前端静态资源 Build。
4. 使用 `wrangler action` 部署至 Cloudflare。

### 5.2 变量 (Vars) 与机密 (Secrets) 矩阵
必须明确区分平台凭证与业务参数，避免权限越界。

**GitHub Repository Secrets (注入 Actions 环境):**
* `CLOUDFLARE_API_TOKEN`: 用于部署 Worker 的 CF 凭证。
* `CLOUDFLARE_ACCOUNT_ID`: 目标 CF 账号 ID。
* `WORKER_ADMIN_TOKEN`: **上传鉴权密钥**。Action 部署时将其作为环境变量绑定到 Worker，用于 `/api/upload` 接口的 401 校验。
* `WORKER_GITHUB_PAT`: **核心触发器**。GitHub 默认的 `GITHUB_TOKEN` 提交代码不会触发下游 Action。必须在 Worker 中注入一个具有 `repo` 权限的个人访问令牌 (PAT)。Worker 使用此 PAT 提交代码，以确保成功触发自动化部署流程。

**GitHub Repository Variables (注入 Actions / Worker 环境):**
* `GITHUB_REPO_OWNER`: 目标仓库 Owner。
* `GITHUB_REPO_NAME`: 目标仓库名称。

## 6. 数据结构契约 (Data Schema)
`index.json` 作为全局状态树，需保持极致扁平：

```json
{
  "total": 1,
  "last_updated": "2026-03-26T19:00:00Z",
  "documents": [
    {
      "id": "understanding-llm-1",
      "title": "大语言模型原理解析",
      "slug": "understanding-llm-1",
      "upload_date": "2026-03-26",
      "path": "/understanding-llm-1.html"
    }
  ]
}
```
