---

# A. 项目总览

- 核心功能：工作流管理与编辑、执行历史与凭据管理、订阅门槛控制、用户鉴权与会话、服务端/客户端数据获取（SSR/CSR）、事件与后台任务（Inngest）、错误监控（Sentry）。
- 目标用户：希望搭建类 n8n 工作流平台的个人开发者与小团队。
- 主要技术栈：
  - Next.js App Router
  - tRPC + TanStack Query（含 SSR 预取与注水）
  - Prisma + PostgreSQL
  - Better Auth + Polar（结账、客户门户、订阅状态）
  - Inngest（事件编排/任务执行）
  - Sentry（前后端监控与回放）
  - UI：Radix UI、lucide-react、sonner、vaul、embla、recharts 等
- 用途：构建名为 N9N 的工作流平台原型。

# B. 目录结构与模块职责

- `src/app`
  - `layout.tsx`：根布局，挂载 `TRPCReactProvider`、`NuqsAdapter` 与全局 `Toaster`。
  - `globals.css`：全局样式。
  - `global-error.tsx`：全局错误边界页面。
  - `favicon.ico`：站点图标。
  - `(auth)/layout.tsx`、`(auth)/login/page.tsx`、`(auth)/signup/page.tsx`：认证区与登录、注册页；登录/注册表单使用 Better Auth 客户端，对已登录/未登录进行重定向控制（`lib/auth-utils.ts`）。
  - `(dashboard)/layout.tsx`：控制台区级布局，侧边栏框架（`SidebarProvider`）。
  - `(dashboard)/(rest)/layout.tsx`：REST 分组次级布局。
  - `(dashboard)/(rest)/workflows/page.tsx`：工作流列表页；`requireAuth` 鉴权、参数加载 `workflowsParamsLoader`、服务端 `prefetchWorkflows` 与客户端 `HydrateClient` 注水。
  - `(dashboard)/(rest)/credentials/page.tsx`、`[credentialId]/page.tsx`：凭据列表与详情占位页。
  - `(dashboard)/(rest)/executions/page.tsx`、`[executionId]/page.tsx`：执行列表与详情占位页。
  - `(dashboard)/(rest)/subscriptions/page.tsx`：订阅测试页，使用 `trpc.testAi`（当前路由未定义，需要在 `appRouter` 中补充）。
  - `(dashboard)/(editor)/workflows/[workflowId]/page.tsx`：工作流编辑页占位。
  - `sentry-example-page/page.tsx`：Sentry 示例页面。
  - `api/auth/[...all]/route.ts`：Better Auth API。
  - `api/trpc/[trpc]/route.ts`：tRPC 入口，连接 `appRouter` 与 `createTRPCContext`。
  - `api/inngest/route.ts`：Inngest 入口，注册函数。
  - `api/sentry-example-api/route.ts`：Sentry 示例接口。
  - `trpc/client.tsx`：客户端 Provider，创建 `QueryClient` 与 `trpcClient`，导出 `TRPCReactProvider` 与 `useTRPC`。
  - `trpc/server.tsx`：服务端工具；`createTRPCOptionsProxy`、`prefetch`（支持 infinite/普通查询）与 `HydrateClient`。
  - `trpc/query-client.ts`：`QueryClient` 默认配置与脱水策略。
  - `trpc/init.ts`：`createTRPCContext`、`protectedProcedure`（需要会话）、`premiumProcedure`（需要有效订阅）。
  - `trpc/routers/_app.ts`：聚合 `workflowRouter` 并导出 `AppRouter` 类型。

- `src/components`
  - `app-header.tsx`：非侧边栏头部。
  - `app-sidebar.tsx`：侧边栏；菜单导航、订阅升级入口（Polar 结账）、客户门户、登出。
  - `entity-components.tsx`：`EntityHeader`（标题/“新建”按钮）、`EntityContainer`（组合 header/search/pagination 与内容）、`EntitySearch`（右侧搜索框）。
  - `upgrade-model.tsx`：升级订阅对话框（调用 `authClient.checkout({ slug: 'pro' })`）。
  - `components/ui/*`：设计系统基础件（Button、Input、Table、Sidebar、Dialog、Tooltip、Chart 等）。

- `src/features/auth`
  - `components/layout.tsx`：认证页布局。
  - `components/login-form.tsx`：登录表单。
  - `components/register-form.tsx`：注册表单。

- `src/features/subscriptions`
  - `hooks/use-subscription.ts`：`useSubscription` 与 `useHasActiveSubscription`，基于 Better Auth 客户端获取 Polar 订阅状态。

- `src/features/workflows`
  - `components/workflows.tsx`：`WorkflowsList`、`WorkFlowsHeader`（含升级弹窗）、`WorkflowContainer`（容器）、`WorkflowSearch`（搜索框）。
  - `hooks/use-workflows.ts`：`useSuspenseWorkflows`（Suspense 查询）、`useCreateWorkflow`（创建并刷新/跳转）。
  - `hooks/use-workflows-params.ts`：`nuqs` 的查询参数绑定。
  - `params.ts`：`workflowsParams`（分页、搜索参数）。
  - `server/prefetch.ts`：工作流查询的服务端预取。
  - `server/routers.ts`：`workflowRouter`（CRUD + `getMany` 分页搜索，`protectedProcedure`/`premiumProcedure`）。
  - `server/params-loader.ts`：基于 `nuqs/server` 的参数加载。

- `src/hooks`
  - `use-entity-search.tsx`：输入防抖与 URL 参数联动。
  - `use-upgarde-modal.tsx`：捕获 `FORBIDDEN` 并控制升级弹窗。
  - `use-mobile.ts`：移动端断点判断。

- `src/lib`
  - `db.ts`：PrismaClient 单例（开发环境复用）。
  - `auth.ts`：Better Auth 服务端实例，接入 Polar：结账与客户门户。
  - `auth-client.ts`：Better Auth 客户端实例，接入 Polar 插件。
  - `auth-utils.ts`：`requireAuth` / `requireUnauth` 重定向工具。
  - `polar.ts`：Polar SDK 客户端（沙箱）。
  - `utils.ts`：通用工具。

- `src/inngest`
  - `client.ts`：Inngest 客户端。
  - `functions.ts`：示例函数与 AI 步骤封装。

- `src/config`
  - `constants.ts`：分页常量等。

- `src/generated/prisma`
  - Prisma Client 生成产物：`client.ts`、`models.ts`、`enums.ts`、`models/*.ts`、`internal/*`、`browser.ts`、`commonInputTypes.ts`、`query_engine-windows.dll.node` 等（请勿手改）。
  - 当前项目生成位置在 `src/generated/prisma`，存在 Windows 引擎 DLL 及临时文件。

- `src/instrumentation*.ts`
  - `instrumentation.ts`：服务端/边缘运行时的 Sentry 初始化与捕获。
  - `instrumentation-client.ts`：客户端 Sentry 初始化。

# C. Timeline（自动增量更新）

## 2025-12-05 更新
新增：
  - （无）

修改：
  - `src/app/(dashboard)/(rest)/workflows/page.tsx`：将 `prefetchWorkflows(params)` 包裹为 `try { await prefetchWorkflows(params); } catch {}`，避免服务端渲染阶段的可恢复 Unauthorized 报错上浮。
  - `src/features/workflows/components/workflows.tsx`：将 `EntityContainer` 的 `search` 槽位从空节点改为 `<WorkflowSearch />`，恢复搜索框渲染。
  - `n9n/documentation.md`：重构为 A/B/C 结构，建立项目总览与模块职责说明，并新增 Timeline。

删除：
  - （无）

本次遇到的困难：
  - 服务端预取阶段出现可恢复的 `UNAUTHORIZED` 异常：tRPC `protectedProcedure` 在 SSR 预取时可能因会话缺失抛错，Next.js 提示“切换到客户端渲染”。通过在 `Page` 组件中对 `prefetchWorkflows(params)` 增加 `try { await ... } catch {}` 包装，避免错误上浮到服务端渲染阶段。
  - 工作流列表搜索框未显示：`EntityContainer` 的 `search` 槽位传入空节点导致 UI 不渲染，改为传入 `<WorkflowSearch />` 恢复搜索能力。
  - Prisma 在 Windows 上生成到 `src/generated/prisma` 时的 EPERM 重命名错误：`query_engine-windows.dll.node` 被 IDE/进程占用导致 `prisma generate` 失败，建议改为默认输出至 `node_modules/@prisma/client`。

函数/组件级变更明细：
  - `src/app/(dashboard)/(rest)/workflows/page.tsx:12-27` 中的 `Page` 组件：新增对 `prefetchWorkflows(params)` 的 `try { await prefetchWorkflows(params); } catch {}` 包装，实现 SSR 预取阶段的异常兜底处理。
  - `src/features/workflows/components/workflows.tsx:56-62` 中的 `WorkflowContainer` 组件：将 `search` 槽位由空节点替换为 `WorkflowSearch`，实现工作流列表的查询输入展示与 URL 参数联动。
