# 第一阶段验证记录

验证日期：2026-10-14（Asia/Shanghai）。项目位于 `D:\123\saas\flowdesk`。

## 自动检查

| 命令                                                                                    | 实际结果                                                            |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| pnpm install                                                                            | 成功；安装脚本策略已显式配置                                        |
| pnpm install --frozen-lockfile --offline                                                | 成功，锁文件与依赖一致                                              |
| pnpm env:init                                                                           | 成功生成随机本地配置；重复执行保留已有文件                          |
| pnpm lint                                                                               | 通过，零警告                                                        |
| pnpm format:check                                                                       | 通过                                                                |
| pnpm typecheck                                                                          | 前后端通过                                                          |
| pnpm test                                                                               | 前端 7 个测试、后端 17 个测试通过，共 24 个                         |
| pnpm build                                                                              | 前后端通过，前端已分包，无大块体积警告                              |
| pnpm check                                                                              | 完整通过；后续开发输出目录修改后再次通过 lint、格式、类型与构建检查 |
| pnpm db:validate                                                                        | Prisma schema 校验通过                                              |
| prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script --output ... | 成功生成初始迁移 SQL；未连接数据库                                  |

Jest ESM 运行使用实验性 VM Modules 开关，会显示 ExperimentalWarning。错误分支测试中的 503 和 500 日志是测试预期，不代表测试失败。

## 真实运行验证

- `pnpm dev` 同时启动 Vite 5173 与 NestJS 3000，watch 编译零错误。
- `GET /api/v1/health` 返回 200，JSON 包含 status=ok、service 与 timestamp。
- `GET /api/v1/health/ready` 返回 503；本环境没有可用 PostgreSQL，未误报成功。
- `/api/docs` 和 `/api/docs-json` 返回 200；浏览器实际渲染 Swagger 的两个健康检查操作。
- Vite `/api/v1/health` 代理请求返回 200。
- 编译后的 API 通过 start 命令在临时端口 3001 启动，健康检查返回 200。
- 前端通过 preview 命令在临时端口 5174 启动，构建产物实际渲染，API 代理返回 200。
- Nest 开发输出 `.dev` 与正式构建 `dist` 分离后，在开发服务运行期间执行 build，开发 API 仍返回 200。
- 临时 3001 / 5174 验证服务已停止，保留 3000 / 5173 开发服务供当前会话预览。

## 页面与适配

浏览器实际访问工作概览、登录、工单、成员、设置与 404 页面，验证菜单切换、登录预览入口和 404 返回入口。检查 1440px 桌面布局与 390px 窄屏布局；窄屏抽屉导航可以跳转并关闭，页面没有横向溢出。桌面截图保存为 [工作台截图](screenshots/dashboard.jpg)。

## 环境限制

`pnpm db:up` 实际失败：系统找不到 docker 命令。没有声称 PostgreSQL 容器启动成功，真实数据库连接、初始迁移应用、数据库约束行为尚未验证。安装 Docker Desktop 后运行 `pnpm db:up`、`pnpm db:deploy`，确认 ready 接口返回 200 才能补齐数据库验收。

`git check-ignore` 确认根目录、前后端 `.env`、Prisma 生成代码与 API 开发产物被忽略。没有提交真实密码或凭据。
