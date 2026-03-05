import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PublicFooter, PublicNav } from './home'

type DocSection = 'quickstart' | 'architecture' | 'api' | 'agent' | 'deploy'

const sectionIds: { id: DocSection; labelKey: string }[] = [
  { id: 'quickstart', labelKey: 'docs.quickstart' },
  { id: 'architecture', labelKey: 'docs.architecture' },
  { id: 'api', labelKey: 'docs.api' },
  { id: 'agent', labelKey: 'docs.agent' },
  { id: 'deploy', labelKey: 'docs.deploy' },
]

function CodeBlock({ children, lang = 'bash' }: { children: string; lang?: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-sm leading-relaxed my-4 border border-gray-700">
      <code className={`language-${lang}`}>{children}</code>
    </pre>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}
      className="text-2xl md:text-3xl mb-4 text-gray-800 border-b-2 border-cyan-200 pb-2"
    >
      {children}
    </h2>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-bold mb-3 text-gray-700 mt-8">{children}</h3>
}

/* ---------- Content Sections ---------- */

function QuickstartContent() {
  const { t } = useTranslation()
  return (
    <div>
      <SectionHeading>{t('docs.quickstart')}</SectionHeading>
      <p className="text-gray-600 font-medium mb-4 leading-relaxed">{t('docs.quickstartIntro')}</p>

      <SubHeading>{t('docs.envRequirements')}</SubHeading>
      <ul className="list-disc pl-6 text-gray-600 font-medium space-y-1 mb-4">
        <li>{t('docs.envReqNode')}</li>
        <li>{t('docs.envReqPnpm')}</li>
        <li>{t('docs.envReqDocker')}</li>
        <li>{t('docs.envReqDb')}</li>
      </ul>

      <SubHeading>{t('docs.cloneInstall')}</SubHeading>
      <CodeBlock>{`git clone https://github.com/your-org/shadow.git
cd shadow
pnpm install`}</CodeBlock>

      <SubHeading>{t('docs.startInfra')}</SubHeading>
      <CodeBlock>{`docker compose up -d   # PostgreSQL + Redis + MinIO`}</CodeBlock>

      <SubHeading>{t('docs.runMigration')}</SubHeading>
      <CodeBlock>{`pnpm --filter @shadow/server db:push`}</CodeBlock>

      <SubHeading>{t('docs.startDevServer')}</SubHeading>
      <CodeBlock>{`# 同时启动前端和后端
pnpm --filter @shadow/server dev &
pnpm --filter @shadow/web dev &`}</CodeBlock>
      <p className="text-gray-600 font-medium">
        {t('docs.frontendPort', {
          frontendUrl: 'http://localhost:3000',
          backendUrl: 'http://localhost:3002',
        })}
      </p>
    </div>
  )
}

function ArchitectureContent() {
  const { t } = useTranslation()
  return (
    <div>
      <SectionHeading>{t('docs.architecture')}</SectionHeading>
      <p className="text-gray-600 font-medium mb-6 leading-relaxed">{t('docs.archIntro')}</p>

      <SubHeading>{t('docs.projectStructure')}</SubHeading>
      <CodeBlock lang="text">{`shadow/
├── apps/
│   ├── web/          # React 前端 (Rsbuild + TanStack Router)
│   └── server/       # Hono 后端 (REST + WebSocket)
├── packages/
│   ├── shared/       # 共享类型、常量、工具函数
│   ├── ui/           # 共享 UI 组件库
│   └── agenthub/     # Agent 运行时与适配器
├── docker-compose.yml
└── pnpm-workspace.yaml`}</CodeBlock>

      <SubHeading>{t('docs.techStack')}</SubHeading>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        {[
          { label: t('docs.tech_frontend'), value: 'React 19 + TypeScript' },
          { label: t('docs.tech_router'), value: 'TanStack Router' },
          { label: t('docs.tech_state'), value: 'Zustand + TanStack Query' },
          { label: t('docs.tech_style'), value: 'Tailwind CSS v4' },
          { label: t('docs.tech_build'), value: 'Rsbuild (Rspack)' },
          { label: t('docs.tech_backend'), value: 'Hono (Node.js)' },
          { label: t('docs.tech_orm'), value: 'Drizzle ORM' },
          { label: t('docs.tech_realtime'), value: 'Socket.IO' },
          { label: t('docs.tech_di'), value: 'Awilix' },
          { label: t('docs.tech_db'), value: 'PostgreSQL + Redis' },
          { label: t('docs.tech_storage'), value: t('docs.tech_storageValue') },
          { label: t('docs.tech_agentSdk'), value: t('docs.tech_agentSdkValue') },
        ].map((item) => (
          <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <span className="text-gray-500 text-sm font-bold">{item.label}</span>
            <p className="text-gray-800 font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      <SubHeading>{t('docs.dataFlow')}</SubHeading>
      <p className="text-gray-600 font-medium leading-relaxed">{t('docs.dataFlowDesc')}</p>
    </div>
  )
}

function ApiContent() {
  const { t } = useTranslation()
  return (
    <div>
      <SectionHeading>{t('docs.api')}</SectionHeading>
      <p className="text-gray-600 font-medium mb-6 leading-relaxed">{t('docs.apiIntro')}</p>

      <SubHeading>{t('docs.apiAuth')}</SubHeading>
      <CodeBlock>{`# 注册
POST /api/auth/register
{ "email": "...", "username": "...", "password": "..." }

# 登录
POST /api/auth/login
{ "email": "...", "password": "..." }
# 返回: { user, accessToken, refreshToken }

# 获取当前用户
GET /api/auth/me
Authorization: Bearer <token>

# 更新个人资料
PATCH /api/auth/me
Authorization: Bearer <token>
{ "displayName": "...", "avatarUrl": "..." }`}</CodeBlock>

      <SubHeading>{t('docs.apiServer')}</SubHeading>
      <CodeBlock>{`# 获取用户服务器列表
GET /api/servers

# 创建服务器
POST /api/servers
{ "name": "..." }

# 更新服务器
PATCH /api/servers/:id
{ "name": "..." }

# 加入服务器（by 邀请码）
POST /api/servers/join
{ "inviteCode": "..." }`}</CodeBlock>

      <SubHeading>{t('docs.apiChannel')}</SubHeading>
      <CodeBlock>{`# 获取服务器频道
GET /api/servers/:serverId/channels

# 创建频道
POST /api/servers/:serverId/channels
{ "name": "...", "type": "text" }`}</CodeBlock>

      <SubHeading>{t('docs.apiMessage')}</SubHeading>
      <CodeBlock>{`# 获取频道消息
GET /api/channels/:channelId/messages?limit=50&before=<cursor>

# 发送消息
POST /api/channels/:channelId/messages
{ "content": "..." }

# 添加反应
POST /api/messages/:messageId/reactions
{ "emoji": "👍" }`}</CodeBlock>
    </div>
  )
}

function AgentContent() {
  const { t } = useTranslation()
  return (
    <div>
      <SectionHeading>{t('docs.agent')}</SectionHeading>
      <p className="text-gray-600 font-medium mb-6 leading-relaxed">{t('docs.agentIntro')}</p>

      <SubHeading>{t('docs.agentConcept')}</SubHeading>
      <p className="text-gray-600 font-medium leading-relaxed mb-4">{t('docs.agentConceptDesc')}</p>

      <SubHeading>{t('docs.createAgent')}</SubHeading>
      <CodeBlock lang="typescript">{`import { BaseAdapter } from '@shadow/agenthub'

export class MyAgent extends BaseAdapter {
  name = 'MyAgent'
  description = '一个示例 Agent'

  async handleMessage(message: {
    content: string
    channelId: string
    userId: string
  }) {
    // 处理收到的消息
    const reply = await this.generateReply(message.content)
    return { content: reply }
  }

  private async generateReply(input: string): Promise<string> {
    // 调用你的 LLM API
    return \`你说了: \${input}\`
  }
}`}</CodeBlock>

      <SubHeading>{t('docs.mcpAdapter')}</SubHeading>
      <p className="text-gray-600 font-medium leading-relaxed mb-4">{t('docs.mcpAdapterDesc')}</p>
      <CodeBlock lang="typescript">{`import { McpAdapter } from '@shadow/agenthub'

const agent = new McpAdapter({
  serverUrl: 'http://localhost:8080',
  modelId: 'gpt-4',
  tools: ['search', 'code-review'],
})`}</CodeBlock>

      <SubHeading>{t('docs.registerAgent')}</SubHeading>
      <CodeBlock lang="typescript">{`import { AgentRegistry } from '@shadow/agenthub'

const registry = new AgentRegistry()
registry.register(new MyAgent())

// Agent 现在可以被频道召唤了！`}</CodeBlock>
    </div>
  )
}

function DeployContent() {
  const { t } = useTranslation()
  return (
    <div>
      <SectionHeading>{t('docs.deploy')}</SectionHeading>
      <p className="text-gray-600 font-medium mb-6 leading-relaxed">{t('docs.deployIntro')}</p>

      <SubHeading>{t('docs.dockerDeploy')}</SubHeading>
      <CodeBlock>{`# 1. 克隆代码
git clone https://github.com/your-org/shadow.git && cd shadow

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件设置数据库密码等

# 3. 构建并启动
docker compose -f docker-compose.prod.yml up -d

# 4. 运行数据库迁移
docker compose exec server pnpm db:push`}</CodeBlock>

      <SubHeading>{t('docs.envVariables')}</SubHeading>
      <CodeBlock lang="text">{`DATABASE_URL=postgresql://user:pass@localhost:5432/shadow
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
PORT=3002`}</CodeBlock>

      <SubHeading>{t('docs.prodTips')}</SubHeading>
      <ul className="list-disc pl-6 text-gray-600 font-medium space-y-2">
        <li>{t('docs.prodTip1')}</li>
        <li>{t('docs.prodTip2')}</li>
        <li>{t('docs.prodTip3')}</li>
        <li>{t('docs.prodTip4')}</li>
        <li>{t('docs.prodTip5')}</li>
        <li>{t('docs.prodTip6')}</li>
      </ul>
    </div>
  )
}

/* ---------- Main Page ---------- */

export function DocsPage() {
  const [activeSection, setActiveSection] = useState<DocSection>('quickstart')
  const { t } = useTranslation()

  const contentMap: Record<DocSection, React.ReactNode> = {
    quickstart: <QuickstartContent />,
    architecture: <ArchitectureContent />,
    api: <ApiContent />,
    agent: <AgentContent />,
    deploy: <DeployContent />,
  }

  return (
    <div
      className="min-h-screen bg-[#f2f7fc] text-gray-800"
      style={{ fontFamily: "'Nunito', 'ZCOOL KuaiLe', sans-serif" }}
    >
      <PublicNav />

      <div className="pt-24 flex max-w-7xl mx-auto w-full min-h-screen">
        <aside className="hidden md:block w-64 shrink-0 p-6 sticky top-24 self-start">
          <h3
            style={{ fontFamily: "'ZCOOL KuaiLe', cursive" }}
            className="text-lg text-gray-500 mb-4"
          >
            {t('docs.nav')}
          </h3>
          <nav className="space-y-1">
            {sectionIds.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`block w-full text-left px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeSection === s.id
                    ? 'bg-cyan-100 text-cyan-700 border-l-4 border-cyan-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                {t(s.labelKey)}
              </button>
            ))}
          </nav>
        </aside>

        <div className="md:hidden px-8 pt-4 pb-2 w-full">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sectionIds.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition ${
                  activeSection === s.id
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t(s.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 px-8 md:px-12 py-8 max-w-4xl">{contentMap[activeSection]}</main>
      </div>

      <PublicFooter />
    </div>
  )
}
