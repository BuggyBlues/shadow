# 开发指南

Shadow 的编码标准、约定和工作流程。

## 分支策略

- `main` 是稳定分支。**禁止直接推送**到 `main`。
- 从 `main` 创建功能分支：

```bash
git checkout -b feat/my-feature main
```

### 分支命名

| 前缀        | 用途           | 示例                       |
|-------------|---------------|----------------------------|
| `feat/`     | 新功能         | `feat/voice-channels`      |
| `fix/`      | Bug 修复       | `fix/login-redirect`       |
| `refactor/` | 代码重构       | `refactor/auth-middleware`  |
| `docs/`     | 文档           | `docs/api-reference`       |
| `chore/`    | 维护           | `chore/update-deps`        |

## 提交约定

Shadow 使用 [Conventional Commits](https://www.conventionalcommits.org/)，由 Commitlint 强制执行：

```
<type>(<scope>): <description>

[可选正文]

[可选脚注]
```

### 类型

| 类型       | 描述                        |
|------------|----------------------------|
| `feat`     | 新功能                      |
| `fix`      | Bug 修复                    |
| `docs`     | 仅文档变更                  |
| `style`    | 格式化、缺少分号等          |
| `refactor` | 非功能性、非修复性代码变更   |
| `perf`     | 性能优化                    |
| `test`     | 添加或更新测试              |
| `chore`    | 构建流程或工具变更          |
| `ci`       | CI 配置                     |

### 作用域

使用应用/包名：`web`、`server`、`desktop`、`mobile`、`admin`、`shared`、`ui`、`sdk`、`openclaw`、`oauth`。

示例：

```bash
git commit -m "feat(web): add voice channel UI"
git commit -m "fix(server): handle expired JWT gracefully"
```

## 代码风格

Shadow 使用 **Biome** 同时进行代码检查和格式化（替代 ESLint + Prettier）：

```bash
# 检查问题
pnpm lint

# 自动修复
pnpm lint:fix

# 仅格式化
pnpm format
```

### 核心规则

- **禁止 `any` 类型** — 使用正确的 TypeScript 类型
- **禁止 `console.log`** — 服务端使用 Pino 日志
- **导入** — 由 Biome 自动排序
- **分号** — 省略（Biome 默认）
- **引号** — 双引号
- **缩进** — Tab

## 测试

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch

# 覆盖率报告
pnpm test:coverage

# 桌面端 E2E
pnpm --dir ./apps/desktop test:e2e
```

### 测试组织

- 单元测试：`packages/*/__tests__/` 和 `apps/*/__tests__/`
- E2E 测试：`apps/desktop/e2e/`

### 编写测试

- 使用 **Vitest** 编写单元/集成测试
- 使用 **Playwright** 编写 E2E 测试
- 将测试文件放在源码旁的 `__tests__/` 目录中
- 测试文件命名：`*.test.ts` 或 `*.test.tsx`

## 数据库迁移

Shadow 使用 **Drizzle ORM** 管理迁移文件：

```bash
# Schema 变更后生成迁移
pnpm db:generate

# 应用待执行的迁移
pnpm db:migrate

# 使用 Drizzle Studio 浏览数据库
pnpm db:studio
```

## 添加新功能

### 后端功能

1. **Schema** — 在 `apps/server/src/db/schema/` 添加/修改表
2. **迁移** — 运行 `pnpm db:generate` 创建迁移文件
3. **DAO** — 在 `apps/server/src/dao/` 创建数据访问方法
4. **Service** — 在 `apps/server/src/services/` 实现业务逻辑
5. **验证器** — 在 `apps/server/src/validators/` 添加 Zod Schema
6. **Handler** — 在 `apps/server/src/handlers/` 创建 HTTP 路由处理器
7. **注册** — 在 `apps/server/src/container.ts` 注册 DI 容器
8. **路由** — 在 `apps/server/src/app.ts` 注册路由

### 前端功能

1. **类型** — 如需，在 `packages/shared/src/types/` 添加共享类型
2. **API** — 在应用的 `lib/api` 模块添加 API 调用
3. **Store** — 如需，创建/更新 Zustand Store
4. **组件** — 在 `components/` 构建 UI 组件
5. **页面** — 在 `pages/` 创建路由页面
6. **i18n** — 在所有语言文件中添加翻译键

### WebSocket 功能

1. **事件** — 在 `packages/shared/src/constants/` 定义事件名
2. **网关** — 在 `apps/server/src/ws/` 实现服务端处理器
3. **客户端** — 在前端通过 Socket.IO 客户端监听事件

## Pull Request 检查清单

- [ ] 代码遵循项目编码规范（Biome 检查通过）
- [ ] 为新功能添加/更新测试
- [ ] Schema 变更后生成数据库迁移
- [ ] 在所有语言文件中添加翻译键
- [ ] 代码中没有遗留 `console.log`
- [ ] 提交信息遵循 Conventional Commits
- [ ] PR 描述说明了做什么和为什么
