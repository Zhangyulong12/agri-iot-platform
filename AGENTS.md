# FlowDesk 协作约定

- `apps/web` 是 React 前端；`apps/api` 是 NestJS 后端；`docs` 存放中文设计文档。
- 代码、标识符、文件名使用英文；页面文案与项目文档使用中文。
- 先检查现有改动，保留用户工作；只实现当前获准阶段，不提前扩展业务。
- Controller 只处理 HTTP 输入输出；业务逻辑写在 Service，数据访问通过 PrismaService。
- 租户业务数据必须包含 organizationId；权限与租户边界由后端校验，不能信任前端传入的租户或角色。
- 不提交 `.env`、密码、令牌、生成的 Prisma Client、构建产物；同步维护 `.env.example`。
- 依赖更新检查正式版本及 peerDependencies；保持 pnpm-lock.yaml 与 package.json 一致。
- 功能改动添加有意义的行为测试；验证 `pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm test`、`pnpm build`。
- 数据模型修改提供可审查迁移，并在有数据库的环境验证；不得对已有数据执行重置或删库。
- 文档必须区分已实现、设计规划与环境中未验证的能力。
