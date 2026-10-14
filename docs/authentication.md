# 身份认证设计与接口契约（2A）

## 范围

本阶段只实现用户与会话，不创建组织、成员管理、RBAC 或工单接口。用户登录后访问的工单/成员/设置仍为占位页。后续企业权限必须独立校验。

## 接口

统一前缀 `/api/v1/auth`。全部响应带 `Cache-Control: no-store`。

| 方法 | 路径      | 输入                              | 成功响应                                                  |
| ---- | --------- | --------------------------------- | --------------------------------------------------------- |
| POST | /register | email、displayName、password      | 201，创建用户并返回 AuthResponse，同时设置 refresh Cookie |
| POST | /login    | email、password                   | 200，AuthResponse 与 refresh Cookie                       |
| POST | /refresh  | HttpOnly refresh Cookie           | 200，轮换 Cookie 并返回 AuthResponse                      |
| POST | /logout   | HttpOnly refresh Cookie           | 204，撤销该会话并清除 Cookie；无 Cookie 时同样幂等成功    |
| GET  | /me       | Authorization: Bearer accessToken | 200，当前用户公开字段                                     |

AuthResponse 包含 `accessToken`、`expiresIn`（秒）、`user`；公开 User 仅含 id、email、displayName、createdAt。不返回密码摘要、刷新令牌或内部会话记录。

邮箱 trim + 小写，昵称 trim；密码保留原样，长度 12–128 字符，支持空格与 Unicode，不施加无意义的大小写组合规则。重复邮箱返回 409，校验失败 400，无效凭据或会话返回 401，来源/CSRF 检查失败 403。数据库不可用返回 503，未知错误保留 500。注册邮箱目前未验证；邮件验证与密码找回留待后续。

## 会话与令牌

密码使用 Node.js 内置 scrypt，随机盐，N=32768、r=8、p=3，64 字节摘要，timingSafeEqual 比较。参数采用 [OWASP 密码存储建议](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) 中的 32 MiB 方案，无需新增本机原生编译依赖。未知邮箱也执行密码校验以减少明显时序差异。

JWT 使用 HS256，强随机密钥至少 32 字节，检查签名、算法、iss、aud、sub、sid、exp；默认 15 分钟。access token 只放前端内存，不持久化到 localStorage/sessionStorage。AuthSession 记录用户、绝对过期时间（默认 7 天）与撤销时间；Guard 同时查询该会话，退出后旧 JWT 立即不能访问 me。该设计选择撤销及时性，代价是每个受保护请求要查数据库。

refresh token 为 32 字节随机不透明令牌，仅保存 SHA-256 摘要。RefreshToken 留存 consumedAt，轮换时对会话行加锁，消费旧令牌并插入新令牌，在同一事务中完成。再次使用已消费令牌将提交整个会话的撤销，再返回 401；不能在事务内抛异常导致撤销回滚。会话绝对期限不因轮换无限延长。历史令牌清理属于后续运维任务。

User.passwordHash 可空，以非破坏性方式兼容第一阶段已存在的用户；没有密码摘要的用户不能密码登录，需要后续合法凭据设置流程，不能自动给其默认密码。

## Cookie 与 CSRF

Cookie 名为 flowdesk_refresh，HttpOnly、SameSite=Lax、Path=/api/v1/auth、无 Domain（仅当前主机）。生产环境必须 Secure=true、允许来源使用 HTTPS；开发 localhost/127.0.0.1 HTTP 可用 Secure=false。推荐生产前后端同源，不支持无额外设计的跨站 Cookie 场景。

所有认证 POST 都强制：Origin 必须是 CORS_ORIGINS 的精确允许来源；X-FlowDesk-CSRF 必须为 1；Content-Type 为 application/json。自定义头触发跨源预检，结合严格来源校验阻断跨站表单和登录 CSRF；SameSite 是额外防线。CORS 开 credentials 并仅允许显式白名单。非浏览器调用同样需提供这些头。浏览器不能自行改写 Origin；本地 Swagger Try it out 应通过 `http://127.0.0.1:5173/api/docs` 访问并填写 CSRF 头，使用 Vite 代理保留允许来源。

Vite 代理保留浏览器 Origin，不将它改写成 API 地址。生产 HTTPS 与开发 Cookie 设置分离。刷新失败不持续重试；匿名恢复的 401 不显示为系统故障，网络/503 则提供明确重试页面。

## 前端竞态与预览

认证请求使用独立 Axios 实例，避免刷新接口进入 401 拦截器循环；业务请求最多重试一次。同一个 JS 上下文共用刷新 Promise。若旧请求 401 时内存令牌已更新，使用新令牌重试，不再次刷新。

通过 Web Locks 在支持的浏览器中串行化同源多个标签页的 Cookie 轮换，并用 BroadcastChannel 同步退出/账户变更；不广播令牌。异步响应提交前核对认证操作版本，退出后不能被迟到的刷新结果重新登录。多标签请求仍可能发生严格一次性刷新冲突，后端以撤销会话优先，客户端要求重新登录而非绕过重放保护。

正式路由必须认证，刷新页面先尝试 Cookie 恢复，再加载 me。只有 Vite 开发模式且 VITE_ENABLE_DEV_PREVIEW=true 时提供独立 /dev-preview 页面；该页仅展示无数据 UI，不建立认证状态，也不能绕过 API Guard。生产构建没有该预览入口。

## 验收

行为测试覆盖密码校验、环境密钥、DTO、认证缺失/伪造/过期、CSRF 来源、刷新轮换/重放/并发、会话退出和数据库故障。集成测试必须显式配置独立 TEST_DATABASE_URL 与测试标志，只清理本次随机测试标识关联记录，禁止 truncate/reset。数据库迁移重复执行不得修改已有业务数据。
