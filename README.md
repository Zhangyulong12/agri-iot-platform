# FlowDesk

面向企业的多租户工单管理平台，用于系统学习全栈开发与求职展示。当前完成第二阶段 2A：邮箱注册、密码登录、JWT 认证、刷新会话与退出。**工单业务、组织/成员 CRUD、RBAC 与租户数据隔离接口仍未实现。**

## 环境要求

- Node.js 22.22.2+（22.x）或 24.15.0+（24.x）；推荐使用 LTS。
- pnpm 11.25.0；packageManager 已固定。可用 `npm install -g pnpm@11.25.0` 安装。
- 数据库优先使用 Docker Desktop / Docker Engine 与 Compose v2（需要支持 `up --wait`）；当前 Windows 环境也提供独立 PostgreSQL 开发方式。

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

当前这台 Windows 电脑没有 Docker，已经在项目的 `.local-tools` 与 `.local-db` 中准备了真实 PostgreSQL，可以直接使用：

```powershell
cd D:\123\saas\flowdesk
pnpm env:init
pnpm db:local:up
pnpm db:deploy
pnpm dev
```

停止本地数据库用 `pnpm db:local:down`，保留数据。脚本只绑定 127.0.0.1，已有数据目录不会重新初始化，已有环境配置不会被覆盖；缺少 TEST_DATABASE_URL 时补充独立测试库地址。启动失败时查看 `.local-db/postgres.log`。不要同时启动占用同一个端口的 Docker 数据库。

重新克隆项目时，本地 PostgreSQL 工具与数据不在仓库中。优先使用 Docker；Windows 可选择安装此前已验证的 npm 工具包，再运行本地启动命令：`npm install --prefix .local-tools --no-save --package-lock=false @embedded-postgres/windows-x64@18.4.0-beta.17`。这个包的分发版本含 beta 标识，只用作本地开发验证，不作为生产数据库部署方案。

`env:init` 从示例生成根目录、API 与 Web 的 `.env`，使用随机本地数据库密码并同步 DATABASE_URL，不打印密码，不覆盖已有文件。已有 `.env` 缺少值时会提示补齐。也可以手动复制 `.env.example` 并填写；API 和 Compose 的数据库用户、密码、端口、数据库名必须一致。密码中的特殊字符需要在 DATABASE_URL 中 URL 编码。真实环境文件被 .gitignore 忽略。

| 地址                                      | 用途                |
| ----------------------------------------- | ------------------- |
| http://127.0.0.1:5173                     | 登录后的工作概览    |
| http://127.0.0.1:5173/login               | 邮箱密码登录        |
| http://127.0.0.1:5173/register            | 注册并登录          |
| http://127.0.0.1:5173/tickets             | 工单占位页          |
| http://127.0.0.1:5173/members             | 企业成员占位页      |
| http://127.0.0.1:5173/settings            | 系统设置占位页      |
| http://127.0.0.1:3000/api/v1/health       | API 存活检查        |
| http://127.0.0.1:3000/api/v1/health/ready | PostgreSQL 连接检查 |
| http://127.0.0.1:3000/api/docs            | Swagger 文档        |
| http://127.0.0.1:3000/api/docs-json       | OpenAPI JSON        |

单独启动：终端一运行 `pnpm dev:api`，终端二运行 `pnpm dev:web`。API 命令会先生成 Prisma Client，再启动 Nest watch；Vite 将 `/api` 请求代理到 API_PROXY_TARGET。更改 API 端口时同步修改该代理变量和 README 中的访问地址；Vite 使用 strictPort，5173 被占用时明确失败。

API 开发产物输出到 `apps/api/.dev`，正式构建输出到 `apps/api/dist`，避免构建清理产物时中断正在运行的开发服务。

数据库离线时存活检查仍为 200，就绪检查为 503；注册、登录和会话恢复需要真实数据库。只有开发模式且 `apps/web/.env` 设置 `VITE_ENABLE_DEV_PREVIEW=true` 时，`/dev-preview` 才提供独立无数据界面预览。该页不登录、不请求业务数据，生产构建不提供预览入口。

体验顺序：打开 `/register`，填写显示名称、邮箱与 12–128 字符密码 → 自动进入工作台 → 刷新页面保留会话 → 退出登录 → 使用同一邮箱密码登录。当前没有默认账号；邮箱验证与密码找回尚未实现。

调试认证接口的 Swagger Try it out 时，使用 Vite 代理地址 `http://127.0.0.1:5173/api/docs`，在接口的 X-FlowDesk-CSRF 输入框填写 `1`。这样浏览器自动发送的 Origin 属于开发来源白名单。直接打开 3000 端口的 Swagger 可以阅读文档，但默认白名单未包含这个来源，认证 POST 会被 CSRF 检查拒绝；不要为调试关闭检查。

## 常用命令

```powershell
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:integration
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

`pnpm test` 执行 17 个前端与 28 个后端测试，不依赖外部数据库；12 个数据库集成测试在此命令中明确跳过。`pnpm test:integration` 单独应用迁移并运行真实 PostgreSQL 的认证、轮换重放、并发、退出与成员约束测试。配置 `apps/api/.env` 中的 TEST_DATABASE_URL，库名必须以 `_test` 结尾并与开发库不同；`db:local:up` 可准备本机测试库。测试只清理本次随机前缀用户与自己创建的组织，不执行 truncate/reset。

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
        auth/            认证、密码、会话、CSRF 与 Guard
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

根 `.env` 只供 Compose 使用；`apps/api/.env` 供 NestJS 与 Prisma CLI 使用；`apps/web/.env` 供 Vite 使用。VITE_ 变量公开给浏览器，不能放密钥。API 使用 HOST、PORT、NODE_ENV、DATABASE_URL、CORS_ORIGINS、SWAGGER_ENABLED 与认证配置。JWT_SECRET 至少 32 字节，`env:init` 补充随机开发密钥；access token 默认 15 分钟、会话绝对期限默认 7 天。生产强制 Secure Cookie 与 HTTPS 来源，Swagger 未显式指定时默认关闭。

生产 API 使用 `HOST=0.0.0.0` 并部署构建输出；前端部署 `apps/web/dist`，配置 SPA 回退与 `/api` 反向代理。Compose 当前只提供开发数据库；完整镜像、HTTPS、生产密钥管理与发布流程将在第五阶段实现。本阶段不宣称已完成生产安全验收。

## 文档与已知限制

- [系统架构](docs/architecture.md)
- [数据库设计](docs/database-design.md)
- [后续阶段计划](docs/roadmap.md)
- [完整项目任务与验收清单](docs/project-tasks.md)
- [协作规范](AGENTS.md)
- [第一阶段验证记录](docs/verification.md)
- [认证设计与接口契约](docs/authentication.md)
- [第二阶段 2A 验证记录](docs/verification-auth.md)

当前执行环境没有 Docker 命令，Compose 启动仍待验证；独立真实 PostgreSQL 已通过迁移、约束与认证集成验证，ready 返回 200。页面不提供虚构业务统计，进度是阶段示意，服务状态来自真实 API。前后端应使用同一个主机地址访问，例如统一使用 127.0.0.1，避免 localhost 与 127.0.0.1 的 Cookie 隔离。
