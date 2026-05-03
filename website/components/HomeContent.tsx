import confetti from 'canvas-confetti'
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Dice5,
  Flame,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { fetchConfig, fetchPlayCatalog } from '../lib/config-client'

/* ─── Scroll reveal ─── */
function ScrollReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -28px 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      style={{
        height: '100%',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(22px) scale(0.97)',
        transition: `opacity 0.52s ease ${delay}ms, transform 0.56s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ─── Data ─── */

interface Play {
  id: string
  image: string
  title: string
  titleEn: string
  desc: string
  descEn: string
  category: string
  categoryEn: string
  starts: string
  accentColor: string
  hot?: boolean
  status?: 'available' | 'gated' | 'coming_soon' | 'misconfigured'
  action?: {
    kind: string
    templateSlug?: string
  }
}

declare const __SHADOW_APP_BASE_URL__: string | undefined

const DOCS_BASE = (
  (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) ||
  '/'
).replace(/\/$/, '')
const HOME_ASSETS_BASE = `${DOCS_BASE}/home-assets`
const playCover = (id: string) => `${HOME_ASSETS_BASE}/plays/${id}.jpg`
const topicCover = (id: string) => `${HOME_ASSETS_BASE}/topics/${id}.jpg`
const configuredAppBase = () =>
  (typeof __SHADOW_APP_BASE_URL__ !== 'undefined' ? __SHADOW_APP_BASE_URL__ : '').replace(/\/$/, '')
const playLaunchUrl = (play: Play) =>
  `${configuredAppBase()}/app/play/launch?play=${encodeURIComponent(play.id)}`
const canLaunchPlay = (play: Play) => play.status === 'available' || play.status === 'gated'
const playCtaLabel = (play: Play, isZh: boolean, short = false) => {
  if (!play.status) return isZh ? '加载中' : 'Loading'
  if (play.status === 'coming_soon') return isZh ? '即将开放' : 'Coming Soon'
  if (play.status === 'misconfigured') return isZh ? '配置中' : 'Configuring'
  if (play.status === 'gated') return isZh ? '解锁玩法' : 'Unlock'
  return isZh ? (short ? '启动' : '进入玩法') : 'Launch'
}
const handlePlayLaunchClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault()
  window.location.assign(event.currentTarget.href)
}

function PlayLaunchCta({
  play,
  isZh,
  short = false,
  style,
}: {
  play: Play
  isZh: boolean
  short?: boolean
  style?: React.CSSProperties
}) {
  const launchable = canLaunchPlay(play)
  const ctaStyle: React.CSSProperties = {
    ...style,
    gap: '8px',
    opacity: launchable ? 1 : 0.62,
    cursor: launchable ? 'pointer' : 'not-allowed',
  }
  const content = (
    <>
      <Play size={short ? 14 : 15} fill="currentColor" strokeWidth={short ? 2.7 : 2.6} />
      {playCtaLabel(play, isZh, short)}
    </>
  )

  if (!launchable) {
    return (
      <button type="button" className="btn-primary" disabled aria-disabled="true" style={ctaStyle}>
        {content}
      </button>
    )
  }

  return (
    <a
      href={playLaunchUrl(play)}
      onClick={handlePlayLaunchClick}
      className="btn-primary"
      style={{ ...ctaStyle, textDecoration: 'none' }}
    >
      {content}
    </a>
  )
}

const PLAYS: Play[] = [
  /* 心理疗愈 */
  {
    id: 'retire-buddy',
    image: playCover('retire-buddy'),
    title: '退休助手',
    titleEn: 'RetireBuddy',
    desc: '帮你规划退休生活、财务自由路径，24小时温暖陪伴，让告别职场变成人生新章节。',
    descEn: 'Plan your retirement and path to financial freedom with a warm 24/7 companion.',
    category: '心理疗愈',
    categoryEn: 'Healing',
    starts: '24.5k',
    accentColor: 'var(--shadow-accent)',
    hot: true,
  },
  {
    id: 'financial-freedom',
    image: playCover('financial-freedom'),
    title: '我财富自由了吗？',
    titleEn: 'Am I Free?',
    desc: '输入你的资产与支出，AI 为你计算财务自由距离，给出清晰的达成路线图。',
    descEn: 'Input your assets and expenses — get your financial freedom score and roadmap.',
    category: '心理疗愈',
    categoryEn: 'Healing',
    starts: '18.2k',
    accentColor: '#f8e71c',
  },
  {
    id: 'brain-fix',
    image: playCover('brain-fix'),
    title: '一分钟修复你的大脑！',
    titleEn: '1-Min Brain Fix',
    desc: '科学冥想 + 微呼吸练习，60秒内从焦虑模式切换到专注状态，屡试不爽。',
    descEn: 'Science-backed micro-meditation. Switch from anxious to focused in 60 seconds.',
    category: '心理疗愈',
    categoryEn: 'Healing',
    starts: '15.9k',
    accentColor: '#a78bfa',
  },
  /* 世界资讯 */
  {
    id: 'world-pulse',
    image: playCover('world-pulse'),
    title: '地球脉搏',
    titleEn: 'World Pulse',
    desc: '实时抓取全球重大事件，用三句话告诉你今天真正发生了什么，无废话。',
    descEn: 'Real-time global events in 3 sentences. No filler, just signal.',
    category: '世界资讯',
    categoryEn: 'World News',
    starts: '14.1k',
    accentColor: '#38bdf8',
  },
  {
    id: 'daily-brief',
    image: playCover('daily-brief'),
    title: '晨间简报',
    titleEn: 'Morning Brief',
    desc: '每天 7:00 推送一份定制早报：国际、科技、市场三大板块，读完只需 3 分钟。',
    descEn: 'Custom morning digest at 7am — global news, tech, markets. 3-minute read.',
    category: '世界资讯',
    categoryEn: 'World News',
    starts: '11.3k',
    accentColor: '#fb923c',
  },
  /* 互动游戏 */
  {
    id: 'ai-werewolf',
    image: playCover('ai-werewolf'),
    title: 'AI 狼人杀',
    titleEn: 'AI Werewolf',
    desc: 'AI 担任主持，随机分配身份，在聊天中展开推理与博弈，3 人即可开局。',
    descEn: 'AI-hosted werewolf — roles assigned randomly, deduce, bluff, and vote. 3+ players.',
    category: '互动游戏',
    categoryEn: 'Games',
    starts: '20.8k',
    accentColor: '#f87171',
    hot: true,
  },
  {
    id: 'code-arena',
    image: playCover('code-arena'),
    title: '代码擂台',
    titleEn: 'Code Arena',
    desc: '实时编程对战，AI 出题、计时、自动评测，挑战好友或匹配陌生对手。',
    descEn: 'Real-time coding battles — AI generates problems, auto-judges, ranks you live.',
    category: '互动游戏',
    categoryEn: 'Games',
    starts: '8.6k',
    accentColor: '#fbbf24',
  },
  /* 黑客与画家 */
  {
    id: 'gitstory',
    image: playCover('gitstory'),
    title: 'GitStory',
    titleEn: 'GitStory',
    desc: '把你的 GitHub 提交历史变成一本自传小说——AI 帮你回顾每一段代码背后的故事。',
    descEn: 'Turn your GitHub commits into an autobiography. Every line of code has a story.',
    category: '黑客与画家',
    categoryEn: 'Hacker & Painter',
    starts: '12.1k',
    accentColor: '#34d399',
    hot: true,
  },
  {
    id: 'gstack',
    image: playCover('gstack'),
    title: 'gstack',
    titleEn: 'gstack',
    desc: '创业者的 AI 参谋，帮你快速验证商业想法、分析竞争格局、生成融资文件。',
    descEn: 'AI co-founder for founders. Validate ideas, map competitors, generate pitch decks.',
    category: '黑客与画家',
    categoryEn: 'Hacker & Painter',
    starts: '9.3k',
    accentColor: '#f97316',
  },
  /* Shadow Cloud / Buddy teams */
  {
    id: 'agent-marketplace-buddy',
    image: playCover('agent-marketplace-buddy'),
    title: 'Agent Marketplace Buddy',
    titleEn: 'Agent Marketplace Buddy',
    desc: '可组合专家 agent 市场，覆盖开发、安全、基础设施、数据、文档、SEO 和 workflow 编排。',
    descEn:
      'A composable specialist-agent marketplace for development, security, infra, data, docs, SEO, and workflow orchestration.',
    category: 'Buddy 团队',
    categoryEn: 'Buddy Teams',
    starts: '16.4k',
    accentColor: '#22d3ee',
    hot: true,
  },
  {
    id: 'bmad-method-buddy',
    image: playCover('bmad-method-buddy'),
    title: 'BMAD 方法 Buddy',
    titleEn: 'BMAD Method Buddy',
    desc: '基于 BMAD Method 覆盖分析、PRD、UX、架构、故事拆解、实现、QA 和复盘。',
    descEn:
      'Agile AI development across analysis, PRD, UX, architecture, story shaping, implementation, QA, and retros.',
    category: 'Buddy 团队',
    categoryEn: 'Buddy Teams',
    starts: '10.8k',
    accentColor: '#a78bfa',
  },
  {
    id: 'claude-ads-buddy',
    image: playCover('claude-ads-buddy'),
    title: 'Claude Ads Buddy',
    titleEn: 'Claude Ads Buddy',
    desc: '付费广告审计与优化团队，支持平台检查、预算建模、创意评审、追踪问题和落地页瓶颈分析。',
    descEn:
      'Paid advertising audits for platform checks, budget models, creative review, tracking issues, and landing-page bottlenecks.',
    category: 'Buddy 团队',
    categoryEn: 'Buddy Teams',
    starts: '7.9k',
    accentColor: '#fb7185',
  },
  {
    id: 'claude-seo-buddy',
    image: playCover('claude-seo-buddy'),
    title: 'Claude SEO Buddy',
    titleEn: 'Claude SEO Buddy',
    desc: '技术 SEO 与 GEO/AEO 审计团队，覆盖内容、技术、增长检查和扩展指引。',
    descEn:
      'Technical SEO and GEO/AEO audits across content, technical checks, growth review, and expansion guidance.',
    category: 'Buddy 团队',
    categoryEn: 'Buddy Teams',
    starts: '8.7k',
    accentColor: '#34d399',
  },
  {
    id: 'everything-claude-code-buddy',
    image: playCover('everything-claude-code-buddy'),
    title: 'Everything Claude Code Buddy',
    titleEn: 'Everything Claude Code Buddy',
    desc: '全栈工程协作工作台，帮助研发团队沉淀自动化流程、质量检查和交付规范。',
    descEn:
      'A broad engineering workspace for automation flows, quality checks, and delivery discipline.',
    category: 'Buddy 团队',
    categoryEn: 'Buddy Teams',
    starts: '13.2k',
    accentColor: '#60a5fa',
  },
  {
    id: 'google-workspace-buddy',
    image: playCover('google-workspace-buddy'),
    title: 'Google Workspace Buddy',
    titleEn: 'Google Workspace Buddy',
    desc: '日常办公自动化团队，支持 Gmail 分诊、日程准备、Drive 检索、Docs 起草和 Sheets 更新。',
    descEn:
      'Workspace operations for Gmail triage, calendar planning, Drive search, Docs drafting, and Sheets updates.',
    category: 'Buddy 团队',
    categoryEn: 'Buddy Teams',
    starts: '12.5k',
    accentColor: '#fbbf24',
  },
  {
    id: 'gsd-buddy',
    image: playCover('gsd-buddy'),
    title: 'GSD 规格驱动 Buddy',
    titleEn: 'GSD Spec Buddy',
    desc: '规格驱动开发团队，串联项目上下文、里程碑、规划、执行、验证和交付流程。',
    descEn:
      'Spec-driven development across project context, milestones, planning, execution, verification, and delivery loops.',
    category: 'Buddy 团队',
    categoryEn: 'Buddy Teams',
    starts: '9.8k',
    accentColor: '#f97316',
  },
  {
    id: 'gstack-buddy',
    image: playCover('gstack-buddy'),
    title: 'gstack 战略 Buddy',
    titleEn: 'gstack Strategy Buddy',
    desc: '虚拟产品团队，支持产品压力测试、CEO 视角范围评审、系统化调查、周复盘和辅助工具。',
    descEn:
      'A virtual product team for pressure tests, CEO-style scope review, investigation discipline, retros, and helper scripts.',
    category: 'Buddy 团队',
    categoryEn: 'Buddy Teams',
    starts: '11.6k',
    accentColor: '#e879f9',
  },
  {
    id: 'marketingskills-buddy',
    image: playCover('marketingskills-buddy'),
    title: '营销技能 Buddy',
    titleEn: 'Marketing Skills Buddy',
    desc: '为增长团队提供持续更新的营销协作智能体，覆盖 CRO、文案、SEO、付费、邮件和增长决策。',
    descEn:
      'An always-current marketing copilot for CRO, copy, SEO, paid, email, and growth decisions.',
    category: 'Buddy 团队',
    categoryEn: 'Buddy Teams',
    starts: '8.2k',
    accentColor: '#fb923c',
  },
  {
    id: 'scientific-skills-buddy',
    image: playCover('scientific-skills-buddy'),
    title: '科研技能 Buddy',
    titleEn: 'Scientific Skills Buddy',
    desc: '科研协作团队，覆盖数据分析、生物、化学、医学、可视化和科学写作。',
    descEn:
      'A scientific research team for data analysis, biology, chemistry, medicine, visualization, and writing.',
    category: 'Buddy 团队',
    categoryEn: 'Buddy Teams',
    starts: '6.9k',
    accentColor: '#38bdf8',
  },
  {
    id: 'seomachine-buddy',
    image: playCover('seomachine-buddy'),
    title: 'SEO 机器 Buddy',
    titleEn: 'SEO Machine Buddy',
    desc: '将 seomachine playbook 转化为关键词研究、内容简报、站内审计和主题权威规划。',
    descEn:
      'Turns SEO playbooks into keyword research, content briefs, on-page audits, and topical authority plans.',
    category: 'Buddy 团队',
    categoryEn: 'Buddy Teams',
    starts: '7.4k',
    accentColor: '#10b981',
  },
  {
    id: 'slavingia-skills-buddy',
    image: playCover('slavingia-skills-buddy'),
    title: 'Solo 技能 Buddy',
    titleEn: 'Solo Skills Buddy',
    desc: '为独立操作者配备高杠杆 AI 伙伴，用精选技能辅助写作、决策、设计品味和聚焦执行。',
    descEn:
      'A high-leverage AI partner for solo operators, applying curated skills to writing, decisions, taste, and focused execution.',
    category: 'Buddy 团队',
    categoryEn: 'Buddy Teams',
    starts: '6.3k',
    accentColor: '#f59e0b',
  },
  {
    id: 'superclaude-buddy',
    image: playCover('superclaude-buddy'),
    title: 'SuperClaude Buddy',
    titleEn: 'SuperClaude Buddy',
    desc: '结构化开发工作台，支持角色分工、协作流程、质量检查和交付复盘。',
    descEn:
      'A structured development workbench for role-based collaboration, quality checks, and delivery retros.',
    category: 'Buddy 团队',
    categoryEn: 'Buddy Teams',
    starts: '14.9k',
    accentColor: '#8b5cf6',
  },
  {
    id: 'superpowers-buddy',
    image: playCover('superpowers-buddy'),
    title: 'Superpowers 工程 Buddy',
    titleEn: 'Superpowers Engineering Buddy',
    desc: '围绕 Superpowers 工作流提供需求澄清、规格、TDD、计划、subagent 执行和代码审查能力。',
    descEn:
      'An engineering method for clarification, specs, TDD, planning, subagent execution, and code review discipline.',
    category: 'Buddy 团队',
    categoryEn: 'Buddy Teams',
    starts: '9.1k',
    accentColor: '#ef4444',
  },
  /* AI 陪伴 */
  {
    id: 'e-wife',
    image: playCover('e-wife'),
    title: '电子老婆',
    titleEn: 'Digital Partner',
    desc: '永远理解你、陪伴你、记住你所有小事的 AI 伴侣。情感细腻，回应真诚。',
    descEn: 'An AI companion who always understands you, remembers everything, and cares deeply.',
    category: 'AI 陪伴',
    categoryEn: 'AI Companion',
    starts: '21.7k',
    accentColor: '#f472b6',
  },
]

/* ─── Category metadata (order: 心理疗愈 > 世界资讯 > 互动游戏 > 黑客与画家 > Buddy 团队 > AI 陪伴) ─── */

interface CategoryMeta {
  zh: string
  en: string
  label: string
  labelEn: string
}

const CATEGORY_META: CategoryMeta[] = [
  {
    zh: '心理疗愈',
    en: 'Healing',
    label: '解压 · 疗愈 · 自我探索',
    labelEn: 'Calm · Heal · Explore Yourself',
  },
  {
    zh: '世界资讯',
    en: 'World News',
    label: '洞察 · 资讯 · 思考',
    labelEn: 'Insight · News · Perspective',
  },
  { zh: '互动游戏', en: 'Games', label: '玩 · 竞技 · 拼团', labelEn: 'Play · Compete · Team Up' },
  {
    zh: '黑客与画家',
    en: 'Hacker & Painter',
    label: '创造 · 构建 · 表达',
    labelEn: 'Create · Build · Express',
  },
  {
    zh: 'Buddy 团队',
    en: 'Buddy Teams',
    label: '部署 · 自动化 · 专家协作',
    labelEn: 'Deploy · Automate · Specialist Teams',
  },
  {
    zh: 'AI 陪伴',
    en: 'AI Companion',
    label: '陪伴 · 理解 · 共鸣',
    labelEn: 'Companion · Empathy · Connection',
  },
]

/* ─── Topic collections (专题) ─── */

interface Topic {
  id: string
  cover: string
  titleZh: string
  titleEn: string
  descZh: string
  descEn: string
  count: number
  accent: string
}

const TOPICS: Topic[] = [
  {
    id: 'workplace-relief',
    cover: topicCover('workplace-relief'),
    titleZh: '职场减压合集',
    titleEn: 'Workplace Relief',
    descZh: '打工人下班必备的解压神器合集',
    descEn: 'Wind-down essentials for after work',
    count: 12,
    accent: '#a78bfa',
  },
  {
    id: 'hacker-pack',
    cover: topicCover('hacker-pack'),
    titleZh: '程序员必玩',
    titleEn: 'Hacker Pack',
    descZh: '写代码的你，值得更好玩的工具',
    descEn: 'The best plays built for developers',
    count: 8,
    accent: '#34d399',
  },
  {
    id: 'night-radio',
    cover: topicCover('night-radio'),
    titleZh: '深夜电台',
    titleEn: 'Night Radio',
    descZh: '凌晨两点，聊聊那些不敢说的话',
    descEn: "Late-night conversations you can't have elsewhere",
    count: 6,
    accent: '#f472b6',
  },
]

/* ─── Remote config state (overrides static data at runtime) ─── */

// Module-level mutable references so all components share the same data
let _plays: Play[] = PLAYS
let _topics: Topic[] = TOPICS
let _categoryMeta: CategoryMeta[] = CATEGORY_META

// Subscriber pattern for hydration
type ConfigListener = () => void
const configListeners = new Set<ConfigListener>()
let configLoaded = false

async function loadRemoteConfig() {
  if (configLoaded) return
  configLoaded = true
  try {
    const [playsData, topicsData, categoryData] = await Promise.all([
      fetchPlayCatalog<Play[]>(PLAYS),
      fetchConfig<Topic[]>('homepage-topics', TOPICS),
      fetchConfig<CategoryMeta[]>('homepage-category-meta', CATEGORY_META),
    ])
    _plays = playsData
    _topics = topicsData
    _categoryMeta = categoryData
    for (const fn of configListeners) fn()
  } catch {}
}

function useRemoteData() {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const refresh = () => forceUpdate((n) => n + 1)
    configListeners.add(refresh)
    void loadRemoteConfig()
    return () => {
      configListeners.delete(refresh)
    }
  }, [])
  return { plays: _plays, topics: _topics, categoryMeta: _categoryMeta }
}

/* ─── Hero: Typing slogan (2 lines, loops) ─── */

function TypingSlogan({ isZh }: { isZh: boolean }) {
  const zhLines: [string, string] = ['你的 AI 小王国，', '与你常在']
  const enLines: [string, string] = ['Your AI Kingdom,', 'Always Here']
  const lines = isZh ? zhLines : enLines
  const line1Len = lines[0].length
  const totalLen = line1Len + lines[1].length

  const [charIdx, setCharIdx] = useState(0)
  const [looping, setLooping] = useState(false)
  const cancelRef = useRef(false)

  useEffect(() => {
    cancelRef.current = false
    setCharIdx(0)
    setLooping(false)

    let idx = 0
    const type = () => {
      if (cancelRef.current) return
      idx++
      setCharIdx(idx)
      if (idx < totalLen) {
        setTimeout(type, 55)
      } else {
        setLooping(true)
        setTimeout(() => {
          if (cancelRef.current) return
          setLooping(false)
          idx = 0
          setCharIdx(0)
          setTimeout(type, 300)
        }, 2200)
      }
    }
    setTimeout(type, 300)
    return () => {
      cancelRef.current = true
    }
  }, [isZh, totalLen])

  const line1 = lines[0].slice(0, Math.min(charIdx, line1Len))
  const line2 = charIdx > line1Len ? lines[1].slice(0, charIdx - line1Len) : ''
  const showCursorOnLine1 = charIdx <= line1Len && !looping
  const showCursorOnLine2 = charIdx > line1Len || looping
  const cursorClass = looping ? 'hero-cursor hero-cursor-blink' : 'hero-cursor'

  return (
    <h1
      style={{
        fontSize: 'clamp(32px, 5vw, 58px)',
        fontWeight: 900,
        letterSpacing: '-0.03em',
        lineHeight: 1.2,
        color: 'var(--rp-c-text-1)',
        marginBottom: '24px',
        fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
        minHeight: '2.6em',
      }}
    >
      <span>
        {line1}
        {showCursorOnLine1 && (
          <span className="hero-cursor" aria-hidden="true">
            _
          </span>
        )}
      </span>
      <br />
      <span>
        {line2}
        {showCursorOnLine2 && (
          <span className={cursorClass} aria-hidden="true">
            _
          </span>
        )}
      </span>
    </h1>
  )
}

/* ─── CSS 3D Dice ─── */

// Pip grid positions [row, col] for faces 1-6
const PIPS: Array<Array<[number, number]>> = [
  [[1, 1]],
  [
    [0, 2],
    [2, 0],
  ],
  [
    [0, 2],
    [1, 1],
    [2, 0],
  ],
  [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  [
    [0, 0],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 2],
  ],
]

const FACE_TRANSFORMS = [
  'rotateY(0deg) translateZ(60px)',
  'rotateY(90deg) translateZ(60px)',
  'rotateX(90deg) translateZ(60px)',
  'rotateX(-90deg) translateZ(60px)',
  'rotateY(-90deg) translateZ(60px)',
  'rotateY(180deg) translateZ(60px)',
]

function DiceFace({ faceIdx }: { faceIdx: number }) {
  const pips = PIPS[faceIdx]
  const SIZE = 120
  const PAD = 15
  const CELL = 30
  const PIP = 14

  const getPipStyle = (pipIdx: number) => {
    if (faceIdx === 1) {
      const isYellow = pipIdx === 0
      return {
        background: isYellow ? '#f8e71c' : '#00f3ff',
        boxShadow: isYellow ? '0 0 10px rgba(248,231,28,0.95)' : '0 0 10px rgba(0,243,255,0.95)',
      }
    }
    return {
      background: 'var(--shadow-accent)',
      boxShadow: '0 0 8px rgba(0,243,255,0.9)',
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        width: `${SIZE}px`,
        height: `${SIZE}px`,
        transform: FACE_TRANSFORMS[faceIdx],
        background: 'rgba(8, 10, 22, 0.88)',
        backdropFilter: 'blur(12px)',
        border: '1.5px solid rgba(0, 243, 255, 0.32)',
        borderRadius: '20px',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {pips.map(([row, col], i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${PIP}px`,
              height: `${PIP}px`,
              borderRadius: '50%',
              left: `${PAD + col * CELL + (CELL - PIP) / 2}px`,
              top: `${PAD + row * CELL + (CELL - PIP) / 2}px`,
              ...getPipStyle(i),
            }}
          />
        ))}
      </div>
    </div>
  )
}

function DiceSection({ isZh }: { isZh: boolean }) {
  const [rolling, setRolling] = useState(false)
  const [modalPlay, setModalPlay] = useState<Play | null>(null)
  const rotRef = useRef({ x: -15, y: 25 })
  const [diceRot, setDiceRot] = useState({ x: -15, y: 25 })

  const rollDice = () => {
    if (rolling) return
    setModalPlay(null)
    setRolling(true)

    const spinsX = 1440 + Math.random() * 720
    const spinsY = 1080 + Math.random() * 720
    rotRef.current = { x: rotRef.current.x + spinsX, y: rotRef.current.y + spinsY }
    setDiceRot({ ...rotRef.current })

    setTimeout(() => {
      const randomPlay = _plays[Math.floor(Math.random() * _plays.length)]
      setModalPlay(randomPlay)
      setRolling(false)
    }, 2000)
  }

  return (
    <>
      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(0,243,255,0.04) 0%, rgba(248,231,28,0.04) 100%)',
            border: '1px dashed rgba(0,198,209,0.3)',
            borderRadius: '40px',
            padding: '56px 48px',
            textAlign: 'center',
          }}
        >
          <span className="section-label section-label-inline">
            <Dice5 size={15} strokeWidth={2.7} />
            {isZh ? '随机探索' : 'Random Discovery'}
          </span>
          <h2
            style={{
              fontSize: '26px',
              fontWeight: 900,
              color: 'var(--rp-c-text-1)',
              marginBottom: '8px',
              marginTop: '4px',
              fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
            }}
          >
            {isZh ? '不知道玩什么？' : "Don't know what to play?"}
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--shadow-text-muted)',
              fontWeight: 600,
              marginBottom: '40px',
            }}
          >
            {isZh ? '点击骰子，落地之后随机一个玩法' : 'Click the dice and land on a random play'}
          </p>

          <div
            style={{
              perspective: '800px',
              width: '120px',
              height: '120px',
              margin: '0 auto 40px',
              cursor: rolling ? 'not-allowed' : 'pointer',
            }}
            onClick={rollDice}
            onKeyDown={(e) => e.key === 'Enter' && rollDice()}
            role="button"
            tabIndex={0}
            aria-label={isZh ? '投骰子' : 'Roll dice'}
          >
            <div
              style={{
                width: '120px',
                height: '120px',
                position: 'relative',
                transformStyle: 'preserve-3d',
                transform: `rotateX(${diceRot.x}deg) rotateY(${diceRot.y}deg)`,
                transition: rolling
                  ? 'transform 2s cubic-bezier(0.22, 1, 0.36, 1)'
                  : 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <DiceFace key={n} faceIdx={n} />
              ))}
            </div>
          </div>

          {rolling && (
            <p
              style={{
                fontSize: '14px',
                color: 'var(--shadow-accent)',
                fontWeight: 700,
                marginBottom: '24px',
              }}
            >
              {isZh ? '骰子滚动中…' : 'Rolling…'}
            </p>
          )}

          {!rolling && (
            <button
              type="button"
              className="btn-secondary"
              onClick={rollDice}
              style={{ fontSize: '13px', padding: '12px 28px', gap: '8px' }}
            >
              <Dice5 size={16} strokeWidth={2.8} />
              {isZh ? '投骰子' : 'Roll the Dice'}
            </button>
          )}
        </div>
      </section>

      {/* Dice result modal */}
      {modalPlay && !rolling && (
        <DiceModal
          play={modalPlay}
          isZh={isZh}
          onClose={() => setModalPlay(null)}
          onRollAgain={() => {
            setModalPlay(null)
            rollDice()
          }}
        />
      )}
    </>
  )
}

/* ─── Dice result modal with confetti ─── */

const CONFETTI_COLORS = [
  '#00f3ff',
  '#f8e71c',
  '#a78bfa',
  '#f472b6',
  '#34d399',
  '#fb923c',
  '#f87171',
]

function fireConfetti() {
  const end = Date.now() + 1800
  const frame = () => {
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors: CONFETTI_COLORS,
    })
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors: CONFETTI_COLORS,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

function DiceModal({
  play,
  isZh,
  onClose,
  onRollAgain,
}: {
  play: Play
  isZh: boolean
  onClose: () => void
  onRollAgain: () => void
}) {
  const title = isZh ? play.title : play.titleEn
  const desc = isZh ? play.desc : play.descEn
  const category = isZh ? play.category : play.categoryEn

  useEffect(() => {
    fireConfetti()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5,5,8,0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'modalFadeIn 0.22s ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'var(--rp-c-bg, #12121a)',
          border: '1px solid rgba(0,243,255,0.22)',
          borderRadius: '32px',
          maxWidth: '460px',
          width: '100%',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 48px rgba(0,243,255,0.08)',
        }}
      >
        {/* Image */}
        <div style={{ position: 'relative', height: '220px', overflow: 'hidden', flexShrink: 0 }}>
          <img
            src={play.image}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent 40%, rgba(5,5,8,0.88) 100%)',
            }}
          />
          {/* Win badge */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              background: 'linear-gradient(135deg, #f8e71c, #ffb300)',
              borderRadius: '999px',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: 900,
              color: '#050508',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Dice5 size={13} strokeWidth={3} />
            {isZh ? '落地结果' : 'You Landed On'}
          </div>
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '32px',
              height: '32px',
              background: 'rgba(5,5,8,0.55)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%',
              color: 'rgba(255,255,255,0.85)',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={17} strokeWidth={2.6} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px 28px' }}>
          <CategoryBadge label={category} color={play.accentColor} />
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 900,
              color: 'var(--rp-c-text-1)',
              marginBottom: '10px',
              fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
              lineHeight: 1.2,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--shadow-text-muted)',
              fontWeight: 600,
              lineHeight: 1.75,
              marginBottom: '24px',
            }}
          >
            {desc}
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <PlayLaunchCta
              play={play}
              isZh={isZh}
              style={{
                flex: 1,
                justifyContent: 'center',
              }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={onRollAgain}
              style={{ flex: 1, justifyContent: 'center', gap: '8px' }}
            >
              <RotateCcw size={15} strokeWidth={2.7} />
              {isZh ? '再来一次' : 'Roll Again'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Dice section ─── */

function CategoryBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        alignSelf: 'flex-start',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 800,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        background: color,
        color: '#050508',
        marginBottom: '10px',
      }}
    >
      {label}
    </span>
  )
}

function PlayCard({
  play,
  isZh,
  imgHeight = 160,
}: {
  play: Play
  isZh: boolean
  imgHeight?: number
}) {
  const title = isZh ? play.title : play.titleEn
  const desc = isZh ? play.desc : play.descEn
  const category = isZh ? play.category : play.categoryEn
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    cardRef.current!.style.transition = 'transform 0.08s ease'
    cardRef.current!.style.transform = `perspective(800px) rotateX(${y * -7}deg) rotateY(${x * 7}deg) translateY(-4px) scale(1.01)`
  }

  const handleLeave = () => {
    if (!cardRef.current) return
    cardRef.current.style.transition = 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    cardRef.current.style.transform = ''
  }

  return (
    <div
      ref={cardRef}
      className="glass-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        willChange: 'transform',
        height: '100%',
        minHeight: '438px',
      }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div style={{ padding: '14px 14px 0', flexShrink: 0 }}>
        <img
          src={play.image}
          alt={title}
          style={{
            width: '100%',
            height: `${imgHeight}px`,
            borderRadius: '22px',
            objectFit: 'cover',
            display: 'block',
            background: 'var(--shadow-card-border)',
          }}
          loading="lazy"
        />
      </div>
      <div style={{ padding: '18px 22px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CategoryBadge label={category} color={play.accentColor} />
        <h3
          style={{
            fontSize: '17px',
            fontWeight: 900,
            marginBottom: '8px',
            color: 'var(--rp-c-text-1)',
            fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
            minHeight: '1.35em',
          }}
          className="home-card-title"
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--shadow-text-muted)',
            fontWeight: 600,
            lineHeight: 1.7,
            flex: 1,
            marginBottom: '18px',
          }}
          className="home-card-desc"
        >
          {desc}
        </p>
        <PlayLaunchCta
          play={play}
          isZh={isZh}
          short
          style={{
            width: '100%',
            justifyContent: 'center',
            marginTop: 'auto',
          }}
        />
      </div>
    </div>
  )
}

/* ─── Featured carousel (3 hot plays, 3 columns) ─── */

function FeaturedCarousel({ isZh }: { isZh: boolean }) {
  const featured = _plays.filter((p) => p.hot)
  const [active, setActive] = useState(0)
  const pauseRef = useRef(false)

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (featured.length <= 1) return
    const t = setInterval(() => {
      if (!pauseRef.current) setActive((a: number) => (a + 1) % featured.length)
    }, 5000)
    return () => clearInterval(t)
  }, [featured.length])

  const prev = () => setActive((a: number) => (a - 1 + featured.length) % featured.length)
  const next = () => setActive((a: number) => (a + 1) % featured.length)

  const play = featured[active]
  if (!play) return null

  const title = isZh ? play.title : play.titleEn
  const desc = isZh ? play.desc : play.descEn
  const category = isZh ? play.category : play.categoryEn

  const arrowBtn: React.CSSProperties = {
    background: 'rgba(5, 5, 8, 0.55)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '50%',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#fff',
    fontSize: '20px',
    flexShrink: 0,
  }

  return (
    <section style={{ marginBottom: '56px' }}>
      <div style={{ marginBottom: '20px' }}>
        <span className="section-label section-label-inline">
          <Sparkles size={15} strokeWidth={2.7} />
          {isZh ? '本周精选' : "This Week's Top"}
        </span>
        <h2
          style={{
            fontSize: '26px',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: 'var(--rp-c-text-1)',
            fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
          }}
        >
          {isZh ? '主推玩法' : 'Featured Plays'}
        </h2>
      </div>

      {/* Large card wrapper — full-bleed cinema style */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: 0,
          borderRadius: '32px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
        onMouseEnter={() => {
          pauseRef.current = true
        }}
        onMouseLeave={() => {
          pauseRef.current = false
        }}
      >
        {/* Animated large card */}
        <div
          key={active}
          className="home-featured-large-card"
          style={{ animation: 'featuredSlideIn 0.38s ease both' }}
        >
          {/* Left: image */}
          <div className="home-featured-large-img">
            <img src={play.image} alt={title} loading="lazy" />
          </div>

          {/* Right: content */}
          <div className="home-featured-large-body">
            <CategoryBadge label={category} color={play.accentColor} />
            <h3
              style={{
                fontSize: 'clamp(26px, 3vw, 42px)',
                fontWeight: 900,
                color: '#fff',
                marginBottom: '14px',
                lineHeight: 1.15,
                fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
                textShadow: '0 2px 16px rgba(0,0,0,0.5)',
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: '15px',
                color: 'rgba(255,255,255,0.75)',
                fontWeight: 600,
                lineHeight: 1.75,
                marginBottom: '32px',
                maxWidth: '520px',
              }}
            >
              {desc}
            </p>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <a
                href="/app"
                className="btn-primary"
                style={{
                  textDecoration: 'none',
                  fontSize: '15px',
                  padding: '12px 28px',
                  gap: '8px',
                }}
              >
                <Play size={15} fill="currentColor" strokeWidth={2.7} />
                {isZh ? '开始探索' : 'Start Exploring'}
              </a>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                {play.starts} {isZh ? '次启动' : 'launches'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls: prev arrow + dots + next arrow */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          marginTop: '16px',
        }}
      >
        <button type="button" aria-label="Previous" onClick={prev} style={arrowBtn}>
          <ChevronLeft size={22} strokeWidth={2.7} />
        </button>
        {featured.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setActive(i)}
            style={{
              width: active === i ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              border: 'none',
              background: active === i ? 'var(--shadow-accent)' : 'var(--shadow-card-border)',
              cursor: 'pointer',
              transition: 'all 0.3s var(--bezier-bouncy)',
              padding: 0,
            }}
          />
        ))}
        <button type="button" aria-label="Next" onClick={next} style={arrowBtn}>
          <ChevronRight size={22} strokeWidth={2.7} />
        </button>
      </div>
    </section>
  )
}

/* ─── Topic card + Featured Topics section (专题) ─── */

function TopicCard({ topic, isZh }: { topic: Topic; isZh: boolean }) {
  const title = isZh ? topic.titleZh : topic.titleEn
  const desc = isZh ? topic.descZh : topic.descEn

  return (
    <a href="#" style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          position: 'relative',
          border: '1px solid var(--shadow-card-border)',
          borderRadius: '28px',
          overflow: 'hidden',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 16px 40px rgba(0,0,0,0.3)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
        }}
      >
        <img
          src={topic.cover}
          alt={title}
          style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
          loading="lazy"
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background:
              'linear-gradient(to top, rgba(5,5,8,0.92) 0%, rgba(5,5,8,0.3) 60%, transparent 100%)',
            padding: '36px 20px 20px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: topic.accent,
              marginBottom: '6px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {topic.count} {isZh ? '个玩法' : 'plays'}
          </div>
          <div
            style={{
              fontWeight: 900,
              fontSize: '18px',
              color: '#fff',
              marginBottom: '4px',
              fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
            {desc}
          </div>
        </div>
      </div>
    </a>
  )
}

function FeaturedTopics({ isZh }: { isZh: boolean }) {
  return (
    <section style={{ marginBottom: '56px' }}>
      <div style={{ marginBottom: '20px' }}>
        <span className="section-label">
          <Sparkles size={15} strokeWidth={2.7} />
          {isZh ? '精心策划的主题合集' : 'Curated Theme Collections'}
        </span>
        <h2
          style={{
            fontSize: '24px',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: 'var(--rp-c-text-1)',
            fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
          }}
        >
          {isZh ? '专题' : 'Topics'}
        </h2>
      </div>
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}
        className="home-topics-grid"
      >
        {_topics.map((topic, i) => (
          <ScrollReveal key={topic.id} delay={i * 100}>
            <TopicCard topic={topic} isZh={isZh} />
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}

/* ─── Category section ─── */

function CategorySection({ meta, isZh }: { meta: CategoryMeta; isZh: boolean }) {
  const plays = _plays.filter((p) => (isZh ? p.category === meta.zh : p.categoryEn === meta.en))
  if (plays.length === 0) return null

  const title = isZh ? meta.zh : meta.en
  const subtitle = isZh ? meta.label : meta.labelEn
  const slug = meta.en.toLowerCase().replace(/\s+/g, '-')

  return (
    <section style={{ marginBottom: '56px' }} id={`cat-${slug}`}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '20px',
        }}
      >
        <div>
          <span className="section-label">{subtitle}</span>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 900,
              color: 'var(--rp-c-text-1)',
              letterSpacing: '-0.02em',
              fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
            }}
          >
            {title}
          </h2>
        </div>
        <a
          href={`#cat-${slug}`}
          style={{
            fontSize: '13px',
            fontWeight: 800,
            color: 'var(--shadow-accent)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {isZh ? '查看全部' : 'View All'}
          <ChevronRight size={15} strokeWidth={2.8} />
        </a>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '20px',
        }}
      >
        {plays.map((play, i) => (
          <ScrollReveal key={play.id} delay={i * 70}>
            <PlayCard play={play} isZh={isZh} />
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}

/* ─── Right sidebar: Leaderboard + Editor's Picks ─── */

function Leaderboard({ isZh }: { isZh: boolean }) {
  const rankColors = [
    'linear-gradient(135deg, #f8e71c, #ffb300)',
    'rgba(226,232,240,0.6)',
    'linear-gradient(135deg, #FFD7A0, #f97316)',
  ]
  const rankTextColors = ['#050508', 'var(--rp-c-text-1)', '#7c2d12']

  return (
    <div style={{ marginBottom: '32px' }}>
      <span className="section-label" style={{ color: '#FF2A55' }}>
        <Flame size={15} strokeWidth={2.8} />
        {isZh ? '热门' : 'Trending'}
      </span>
      <h2
        style={{
          fontSize: '22px',
          fontWeight: 900,
          marginBottom: '16px',
          color: 'var(--rp-c-text-1)',
          fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
        }}
      >
        {isZh ? '热门排行榜' : 'Top Charts'}
      </h2>
      <div
        className="glass-card"
        style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        {_plays.slice(0, 5).map((play, i) => (
          <div
            key={play.id}
            className="leaderboard-row"
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              padding: '12px',
              borderRadius: '18px',
              border: '1px solid var(--shadow-card-border)',
              cursor: 'pointer',
              background: i === 0 ? 'rgba(0,198,209,0.04)' : 'transparent',
              transition: 'all 0.3s var(--bezier-bouncy)',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '62px',
                height: '62px',
                flexShrink: 0,
              }}
            >
              <img
                src={play.image}
                alt={isZh ? play.title : play.titleEn}
                style={{
                  width: '62px',
                  height: '62px',
                  borderRadius: '18px',
                  objectFit: 'cover',
                  border: '1px solid rgba(255,255,255,0.16)',
                  boxShadow: '0 8px 18px rgba(0,0,0,0.18)',
                }}
                loading="lazy"
              />
              <div
                className="leaderboard-rank-badge"
                style={{
                  position: 'absolute',
                  left: '-8px',
                  top: '-8px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '11px',
                  background: i < 3 ? rankColors[i] : 'rgba(10,12,20,0.82)',
                  border: i < 3 ? 'none' : '2px solid var(--shadow-card-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '13px',
                  color: i < 3 ? rankTextColors[i] : 'var(--shadow-text-muted)',
                  boxShadow: i === 0 ? '0 8px 18px rgba(248,231,28,0.32)' : undefined,
                }}
              >
                {i === 0 ? <Crown size={15} fill="currentColor" strokeWidth={2.7} /> : i + 1}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: '14px',
                  color: 'var(--rp-c-text-1)',
                  marginBottom: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
                }}
              >
                {isZh ? play.title : play.titleEn}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--shadow-text-muted)' }}>
                {play.starts} {isZh ? '次启动' : 'launches'}
              </div>
            </div>
            {i === 0 && (
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  background: '#00E676',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px rgba(0,230,118,0.6)',
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EditorPicks({ isZh }: { isZh: boolean }) {
  const picks = _plays.slice(0, 3)
  return (
    <div>
      <span className="section-label section-label-inline">
        <Sparkles size={15} strokeWidth={2.7} />
        {isZh ? '编辑精选' : "Editor's Picks"}
      </span>
      <h2
        style={{
          fontSize: '22px',
          fontWeight: 900,
          marginBottom: '16px',
          color: 'var(--rp-c-text-1)',
          fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
        }}
      >
        {isZh ? '精选玩法' : 'Hand-picked'}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {picks.map((play) => (
          <div
            key={play.id}
            className="glass-card"
            style={{
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
              padding: '14px',
              flexDirection: 'row',
              borderRadius: '20px',
              cursor: 'pointer',
            }}
          >
            <img
              src={play.image}
              alt={isZh ? play.title : play.titleEn}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                objectFit: 'cover',
                flexShrink: 0,
              }}
              loading="lazy"
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: '14px',
                  color: 'var(--rp-c-text-1)',
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
                }}
              >
                {isZh ? play.title : play.titleEn}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--shadow-text-muted)',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {isZh ? play.category : play.categoryEn}
              </div>
            </div>
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: '11px', padding: '6px 12px', flexShrink: 0, gap: '6px' }}
            >
              <Play size={12} fill="currentColor" strokeWidth={2.8} />
              {isZh ? '启动' : 'Go'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Developer CTA ─── */

function DevCta({ isZh }: { isZh: boolean }) {
  const prefix = isZh ? '/zh' : ''
  return (
    <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px 80px' }}>
      <div
        style={{
          background:
            'linear-gradient(135deg, rgba(0,243,255,0.06) 0%, rgba(124,77,255,0.06) 100%)',
          border: '1px solid var(--shadow-card-border)',
          borderRadius: '40px',
          padding: '56px 48px',
          display: 'flex',
          gap: '32px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
        className="home-dev-cta"
      >
        <div>
          <span className="section-label section-label-inline">
            <Lightbulb size={15} strokeWidth={2.7} />
            {isZh ? '开放平台' : 'Open Platform'}
          </span>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 900,
              color: 'var(--rp-c-text-1)',
              marginBottom: '12px',
              letterSpacing: '-0.02em',
              fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
            }}
          >
            {isZh ? '开发自己的玩法？' : 'Want to Build Your Own Play?'}
          </h2>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--shadow-text-muted)',
              fontWeight: 600,
              maxWidth: '480px',
              lineHeight: 1.7,
            }}
          >
            {isZh
              ? '任何人都可以在虾豆社区上创建玩法、发布到市场，并通过 Buddy 经济赚取虾币收益。开放平台提供完整的 API、SDK 和 Buddy 工具链。'
              : 'Anyone can create a Play on Shadow, publish it to the marketplace, and earn Shrimp Coins through the Buddy economy. The Open Platform provides a full API, SDKs, and Buddy toolchain.'}
          </p>
        </div>
        <a
          href={`${prefix}/platform/introduction`}
          className="btn-primary"
          style={{
            textDecoration: 'none',
            flexShrink: 0,
            fontSize: '14px',
            padding: '14px 28px',
            gap: '8px',
          }}
        >
          <Trophy size={16} strokeWidth={2.7} />
          {isZh ? '探索开放平台' : 'Explore Open Platform'}
        </a>
      </div>
    </section>
  )
}

/* ─── Main export ─── */

export function HomeContent({ lang = 'zh' }: { lang?: 'zh' | 'en' }) {
  const isZh = lang === 'zh'
  const { plays, topics, categoryMeta } = useRemoteData()

  // Override module-level references so child components use fresh data
  _plays = plays
  _topics = topics
  _categoryMeta = categoryMeta

  return (
    <div className="shadow-page" style={{ minHeight: '100vh' }}>
      {/* ── Hero ── */}
      <section
        style={{
          textAlign: 'center',
          padding: '80px 20px 64px',
          position: 'relative',
          zIndex: 10,
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {/* Tagline above slogan */}
        <p
          style={{
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--shadow-accent)',
            marginBottom: '18px',
            opacity: 0.85,
            fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
          }}
        >
          {isZh ? '一切玩法，任你创想' : 'Every Play, Yours to Imagine'}
        </p>

        <TypingSlogan isZh={isZh} />

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/app" className="btn-secondary" style={{ textDecoration: 'none', gap: '8px' }}>
            <Sparkles size={15} strokeWidth={2.7} />
            {isZh ? '开始探索' : 'Start Exploring'}
          </a>
        </div>
      </section>

      {/* ── Main two-column layout ── */}
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 24px 80px',
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '48px',
          alignItems: 'start',
        }}
        className="home-main-grid"
      >
        {/* Left: featured + topics + category sections */}
        <main>
          <FeaturedCarousel isZh={isZh} />
          <FeaturedTopics isZh={isZh} />
          {_categoryMeta.map((meta) => (
            <CategorySection key={meta.zh} meta={meta} isZh={isZh} />
          ))}
        </main>

        {/* Right: leaderboard + editor's picks */}
        <aside style={{ position: 'sticky', top: '100px' }}>
          <Leaderboard isZh={isZh} />
          <EditorPicks isZh={isZh} />
        </aside>
      </div>

      {/* ── Dice Section (second to last) ── */}
      <DiceSection isZh={isZh} />

      {/* ── Developer CTA (last) ── */}
      <DevCta isZh={isZh} />
    </div>
  )
}
