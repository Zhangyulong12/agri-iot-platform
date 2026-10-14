# FlowDesk

面向企业的多租户工单管理平台，用于系统学习全栈开发与求职展示。当前版本为第一阶段：基础工程、管理后台预览、API 健康检查与初始数据库模型。**尚未实现认证、工单业务、成员 CRUD、RBAC 或租户数据隔离接口。**

## 环境要求

- Node.js 22.22.2+（22.x）或 24.15.0+（24.x）；推荐使用 LTS。
- pnpm 11.25.0；packageManager 已固定。可用 `npm install -g pnpm@11.25.0` 安装。
- Docker Desktop / Docker Engine 与 Compose v2（需要支持 `up --wait`）。

PowerShell 在项目根目录执行以下命令；macOS / Linux 的 pnpm 命令相同。

## 快速启动

```powershell
cd D:\123\saas\flowdesk
pnpm install
pnpm env:init
pnpm db:up
pnpm db:deploy
pnpm dev
```

`env:init` 从示例生成根目录、API 与 Web 的 `.env`，使用随机本地数据库密码并同步 DATABASE_URL，不打印密码，不覆盖已有文件。已有 `.env` 缺少值时会提示补齐。也可以手动复制 `.env.example` 并填写；API 和 Compose 的数据库用户、密码、端口、数据库名必须一致。密码中的特殊字符需要在 DATABASE_URL 中 URL 编码。真实环境文件被 .gitignore 忽略。

| 地址                                      | 用途                                |
| ----------------------------------------- | ----------------------------------- |
| http://127.0.0.1:5173                     | 工作概览                            |
| http://127.0.0.1:5173/login               | 登录 UI；禁用登录按钮，提供预览入口 |
| http://127.0.0.1:5173/tickets             | 工单占位页                          |
| http://127.0.0.1:5173/members             | 企业成员占位页                      |
| http://127.0.0.1:5173/settings            | 系统设置占位页                      |
| http://127.0.0.1:3000/api/v1/health       | API 存活检查                        |
| http://127.0.0.1:3000/api/v1/health/ready | PostgreSQL 连接检查                 |
| http://127.0.0.1:3000/api/docs            | Swagger 文档                        |
| http://127.0.0.1:3000/api/docs-json       | OpenAPI JSON                        |

单独启动：终端一运行 `pnpm dev:api`，终端二运行 `pnpm dev:web`。API 命令会先生成 Prisma Client，再启动 Nest watch；Vite 将 `/api` 请求代理到 API_PROXY_TARGET。更改 API 端口时同步修改该代理变量和 README 中的访问地址；Vite 使用 strictPort，5173 被占用时明确失败。

API 开发产物输出到 `apps/api/.dev`，正式构建输出到 `apps/api/dist`，避免构建清理产物时中断正在运行的开发服务。

没有 Docker 时仍可运行 `pnpm env:init` 和 `pnpm dev` 联调 UI。存活检查应为 200，但数据库就绪检查会返回 503，工作概览会显示未就绪。该模式不能代替真实数据库与迁移验证。

## 常用命令

```powershell
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
# 一次执行所有检查
pnpm check
# 构建后启动 API 和前端预览
pnpm --filter @flowdesk/api start
pnpm --filter @flowdesk/web preview --port 5173
# 数据库
pnpm db:validate
pnpm db:generate
pnpm db:migrate --name descriptive_change
pnpm db:studio
pnpm db:logs
pnpm db:down
```

`db:down` 保留命名数据卷。请勿对已有数据执行 `down -v`、migrate reset 等重置命令。生产用 `db:deploy`，开发模型变更用 `db:migrate`。Prisma 客户端生成无需连接数据库；生成代码不提交，build/typecheck/test 自动生成。

前端 preview 继承当前 Vite 配置中的 `/api` 代理，可在 API 启动后用 `--port 5173` 预览构建结果。它仅用于本地验证，生产环境仍需反向代理。使用 API 完整地址时，在构建前配置 VITE_API_BASE_URL，并在 CORS_ORIGINS 中允许实际浏览器来源。`pnpm dev:web` 是本地开发联调的推荐方式。

测试包括前端路由、登录预览入口、未知页面恢复、API 与数据库状态分离，以及后端环境校验、健康检查、就绪失败、CORS、Swagger、DTO 校验与 404/409/500 异常响应。HTTP 测试覆盖数据库就绪行为时使用 PrismaService 测试替身，不需要外部数据库。完整真实数据库验证需启动 Compose、应用迁移并访问 ready 接口。

## 目录

```text
flowdesk/
  apps/
    web/                 React、路由、布局、页面、请求与测试
    api/
      src/
        common/filters/  统一异常处理
        config/          环境变量校验
        database/        PrismaService
        health/          健康检查模块与 DTO
      prisma/            schema 与迁移
      test/              Jest / Supertest 测试
  docs/                  架构、数据模型与路线
  scripts/               本地环境初始化
  docker-compose.yml
  pnpm-workspace.yaml
  pnpm-lock.yaml
  AGENTS.md
```

没有真实共享契约需求，暂不创建 packages/shared。前后端通过 REST 交互，数据库只从后端 Service 访问。

## 环境变量与部署

根 `.env` 只供 Compose 使用；`apps/api/.env` 供 NestJS 与 Prisma CLI 使用；`apps/web/.env` 供 Vite 使用。VITE_ 变量公开给浏览器，不能放密钥。API 使用 HOST、PORT、NODE_ENV、DATABASE_URL、CORS_ORIGINS 与 SWAGGER_ENABLED。生产未显式指定时 Swagger 默认关闭；若复制开发配置到生产，必须调整 SWAGGER_ENABLED。

生产 API 使用 `HOST=0.0.0.0` 并部署构建输出；前端部署 `apps/web/dist`，配置 SPA 回退与 `/api` 反向代理。Compose 当前只提供开发数据库；完整镜像、HTTPS、生产密钥管理与发布流程将在第五阶段实现。本阶段不宣称已完成生产安全验收。

## 文档与已知限制

- [系统架构](docs/architecture.md)
- [数据库设计](docs/database-design.md)
- [后续阶段计划](docs/roadmap.md)
- [协作规范](AGENTS.md)
- [第一阶段验证记录](docs/verification.md)

当前执行环境没有 Docker 命令，因此无法验证 PostgreSQL 容器启动、真实连接与迁移执行。这些检查需在安装并启动 Docker Desktop 后补齐。页面不提供虚构业务统计；建设进度是五阶段路线图，服务状态来自真实 API。
