# NanoBase

基于 Cloudflare 边缘架构的高性能解耦知识库。

## 部署清单 (Required Configuration)

请在 GitHub 仓库中完成以下 **Secrets** 与 **Variables** 配置后推送代码。

### 1. GitHub Secrets
在 `Settings -> Secrets and variables -> Actions -> Secrets` 中添加：

| 名称 | 说明 |
| :--- | :--- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API 令牌 (需 `Edit Workers` 权限) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |
| `GH_PAT` | 具有 `repo` 权限的 GitHub 个人访问令牌 |
| `ADMIN_TOKEN` | 自定义上传鉴权令牌 (后台管理密码) |

### 2. GitHub Variables
在 `Settings -> Secrets and variables -> Actions -> Variables` 中添加：

| 名称 | 说明 |
| :--- | :--- |
| `GH_OWNER` | 您的 GitHub 用户名 |
| `GH_REPO` | 仓库名称 |

## 鉴权说明 (Authentication)
接口 `/api/upload` 采用 Bearer Token 验证。调用时需在请求头中携带：
- **Key**: `Authorization`
- **Value**: `Bearer <您的 ADMIN_TOKEN>`

---
*NanoBase: Minimalist, Edge-first, Decoupled.*
