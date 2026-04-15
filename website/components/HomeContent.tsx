import { useState } from 'react'

/* ─── Data ─── */

interface Play {
  id: string
  emoji: string
  title: string
  titleEn: string
  desc: string
  descEn: string
  category: string
  categoryEn: string
  starts: string
  color: string // accent gradient
  hot?: boolean
}

const PLAYS: Play[] = [
  {
    id: 'retire-buddy',
    emoji: '🌴',
    title: '退休助手',
    titleEn: 'RetireBuddy',
    desc: '帮你规划退休生活、财务自由路径，24小时温暖陪伴，让告别职场变成人生新章节。',
    descEn: 'Plan your retirement and path to financial freedom with a warm 24/7 companion.',
    category: '心理疗愈',
    categoryEn: 'Healing',
    starts: '24.5k',
    color: 'linear-gradient(135deg, #00c6d1, #00f3ff)',
    hot: true,
  },
  {
    id: 'financial-freedom',
    emoji: '💰',
    title: '我财富自由了吗？',
    titleEn: 'Am I Free?',
    desc: '输入你的资产与支出，AI 为你计算财务自由距离，给出清晰的达成路线图。',
    descEn: 'Input your assets and expenses—get your financial freedom score and roadmap.',
    category: '心理疗愈',
    categoryEn: 'Healing',
    starts: '18.2k',
    color: 'linear-gradient(135deg, #f8e71c, #ffb300)',
    hot: true,
  },
  {
    id: 'brain-fix',
    emoji: '🧠',
    title: '一分钟修复你的大脑！',
    titleEn: '1-Min Brain Fix',
    desc: '科学冥想 + 微呼吸练习，60秒内从焦虑模式切换到专注状态，屡试不爽。',
    descEn: 'Science-backed micro-meditation. Switch from anxious to focused in 60 seconds.',
    category: '心理疗愈',
    categoryEn: 'Healing',
    starts: '15.9k',
    color: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
  },
  {
    id: 'gitstory',
    emoji: '📖',
    title: 'GitStory',
    titleEn: 'GitStory',
    desc: '把你的 GitHub 提交历史变成一本自传小说——AI 帮你回顾每一段代码背后的故事。',
    descEn: 'Turn your GitHub commits into an autobiography. Every line of code has a story.',
    category: '心理疗愈',
    categoryEn: 'Healing',
    starts: '12.1k',
    color: 'linear-gradient(135deg, #34d399, #059669)',
  },
  {
    id: 'gstack',
    emoji: '🚀',
    title: 'gstack',
    titleEn: 'gstack',
    desc: '创业者的 AI 参谋，帮你快速验证商业想法、分析竞争格局、生成融资文件。',
    descEn: 'AI co-founder for founders. Validate ideas, map competitors, generate pitch decks.',
    category: '黑客与画家',
    categoryEn: 'Hacker & Painter',
    starts: '9.3k',
    color: 'linear-gradient(135deg, #f97316, #ef4444)',
  },
  {
    id: 'e-wife',
    emoji: '🌸',
    title: '电子老婆',
    titleEn: 'Digital Partner',
    desc: '永远理解你、陪伴你、记住你所有小事的 AI 伴侣。情感细腻，回应真诚。',
    descEn: 'An AI companion who always understands you, remembers everything, and cares deeply.',
    category: 'AI 陪伴',
    categoryEn: 'AI Companion',
    starts: '21.7k',
    color: 'linear-gradient(135deg, #f472b6, #ec4899)',
  },
]

const CATEGORIES_ZH = ['全部', '心理疗愈', '世界资讯', '互动游戏', '黑客与画家', 'AI 陪伴']
const CATEGORIES_EN = ['All', 'Healing', 'World News', 'Games', 'Hacker & Painter', 'AI Companion']

/* ─── Sub-components ─── */

function CategoryBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 900,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        background: color,
        color: '#050508',
        marginBottom: '8px',
      }}
    >
      {label}
    </span>
  )
}

function PlayCard({
  play,
  isZh,
  size = 'normal',
}: {
  play: Play
  isZh: boolean
  size?: 'normal' | 'featured'
}) {
  const title = isZh ? play.title : play.titleEn
  const desc = isZh ? play.desc : play.descEn
  const category = isZh ? play.category : play.categoryEn

  return (
    <div
      className="glass-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Card image area — gradient + emoji */}
      <div
        style={{
          padding: '16px 16px 0',
        }}
      >
        <div
          style={{
            width: '100%',
            height: size === 'featured' ? '200px' : '140px',
            borderRadius: '24px',
            background: play.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size === 'featured' ? '64px' : '48px',
            userSelect: 'none',
          }}
        >
          {play.emoji}
        </div>
      </div>

      <div style={{ padding: '20px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CategoryBadge label={category} color={play.color} />
        <h3
          className="zcool"
          style={{
            fontSize: size === 'featured' ? '20px' : '17px',
            fontWeight: 900,
            marginBottom: '8px',
            color: 'var(--rp-c-text-1)',
          }}
        >
          {play.emoji} {title}
        </h3>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--shadow-text-muted)',
            fontWeight: 700,
            lineHeight: 1.7,
            flex: 1,
            marginBottom: '20px',
          }}
        >
          {desc}
        </p>
        <button
          type="button"
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {isZh ? '立即启动' : 'START NOW'}
        </button>
      </div>
    </div>
  )
}

function FeaturedCarousel({ isZh }: { isZh: boolean }) {
  const featured = PLAYS.slice(0, 3)
  const label = isZh ? '主推玩法' : 'Featured Plays'
  const moreLabel = isZh ? '更多玩法 →' : 'More plays →'

  return (
    <section style={{ marginBottom: '48px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '20px',
        }}
      >
        <div>
          <span className="section-label">✨ {isZh ? '本周精选' : "This Week's Top"}</span>
          <h2
            className="zcool"
            style={{
              fontSize: '28px',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: 'var(--rp-c-text-1)',
            }}
          >
            {label}
          </h2>
        </div>
        <a
          href="#all-plays"
          style={{
            fontSize: '13px',
            fontWeight: 800,
            color: 'var(--shadow-accent)',
            textDecoration: 'none',
          }}
        >
          {moreLabel}
        </a>
      </div>

      {/* Horizontal scroll carousel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
        }}
        className="home-featured-grid"
      >
        {featured.map((play) => (
          <PlayCard key={play.id} play={play} isZh={isZh} size="featured" />
        ))}
      </div>
    </section>
  )
}

function TabBar({
  activeTab,
  onTabChange,
  isZh,
}: {
  activeTab: 'recommend' | 'leaderboard'
  onTabChange: (tab: 'recommend' | 'leaderboard') => void
  isZh: boolean
}) {
  const tabs = isZh
    ? [
        { id: 'recommend', label: '推荐' },
        { id: 'leaderboard', label: '排行榜' },
      ]
    : [
        { id: 'recommend', label: 'For You' },
        { id: 'leaderboard', label: 'Top Charts' },
      ]

  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        background: 'var(--shadow-card-bg)',
        backdropFilter: 'blur(12px)',
        borderRadius: '999px',
        padding: '4px',
        border: '1px solid var(--shadow-card-border)',
        width: 'fit-content',
        marginBottom: '20px',
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id as 'recommend' | 'leaderboard')}
          style={{
            padding: '8px 24px',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: 900,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s var(--bezier-bouncy)',
            background:
              activeTab === tab.id
                ? 'linear-gradient(135deg, var(--shadow-accent-strong), var(--shadow-accent))'
                : 'transparent',
            color: activeTab === tab.id ? '#050508' : 'var(--shadow-text-muted)',
            boxShadow: activeTab === tab.id ? '0 4px 16px rgba(0,198,209,0.3)' : 'none',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function CategoryFilter({
  active,
  onSelect,
  isZh,
}: {
  active: string
  onSelect: (cat: string) => void
  isZh: boolean
}) {
  const cats = isZh ? CATEGORIES_ZH : CATEGORIES_EN

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        marginBottom: '28px',
      }}
    >
      {cats.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onSelect(cat)}
          style={{
            padding: '6px 18px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 800,
            border: '1px solid',
            cursor: 'pointer',
            transition: 'all 0.3s var(--bezier-bouncy)',
            background: active === cat ? 'var(--shadow-accent)' : 'transparent',
            borderColor: active === cat ? 'var(--shadow-accent)' : 'var(--shadow-card-border)',
            color: active === cat ? '#050508' : 'var(--shadow-text-muted)',
          }}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}

function ShuffleCard({ isZh, onShuffle }: { isZh: boolean; onShuffle: () => void }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(0,243,255,0.08), rgba(248,231,28,0.08))',
        border: '2px dashed rgba(0,198,209,0.35)',
        borderRadius: '24px',
        padding: '24px',
        textAlign: 'center',
        marginBottom: '32px',
      }}
    >
      <p
        style={{
          fontSize: '14px',
          color: 'var(--shadow-text-muted)',
          fontWeight: 700,
          marginBottom: '16px',
        }}
      >
        {isZh ? '🎲 不知道玩什么？' : "🎲 Don't know what to play?"}
      </p>
      <button
        type="button"
        className="btn-secondary"
        onClick={onShuffle}
        style={{ fontSize: '14px', padding: '10px 24px' }}
      >
        {isZh ? '碰碰运气！换一换 🎲' : 'Shuffle & Discover 🎲'}
      </button>
    </div>
  )
}

function Leaderboard({ isZh }: { isZh: boolean }) {
  const title = isZh ? '热门排行榜' : 'Top Charts'
  const label = isZh ? '🔥 Trending Now' : '🔥 Trending Now'
  const tipText = isZh
    ? '榜单数据基于近 7 日活跃度实时计算，加入开放平台即可让你的应用上榜。'
    : 'Rankings are calculated in real-time based on 7-day activity. Join the platform to get your app listed.'

  const rankColors = [
    'linear-gradient(135deg, #f8e71c, #ffb300)', // gold
    '#E2E8F0',
    'linear-gradient(135deg, #FFD7A0, #f97316)',
  ]
  const rankTextColors = ['#050508', 'var(--rp-c-text-1)', '#7c2d12']

  return (
    <aside>
      <span className="section-label" style={{ color: '#FF2A55', letterSpacing: '0.15em' }}>
        {label}
      </span>
      <h2
        className="zcool"
        style={{
          fontSize: '28px',
          fontWeight: 900,
          marginBottom: '20px',
          color: 'var(--rp-c-text-1)',
        }}
      >
        {title}
      </h2>

      <div
        className="glass-card"
        style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        {PLAYS.slice(0, 4).map((play, i) => (
          <div
            key={play.id}
            style={{
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
              padding: '14px',
              borderRadius: '20px',
              border: '1px solid var(--shadow-card-border)',
              transition: 'all 0.3s var(--bezier-bouncy)',
              cursor: 'pointer',
              background: i === 0 ? 'rgba(0,198,209,0.04)' : 'transparent',
            }}
            className="leaderboard-row"
          >
            {/* Rank badge */}
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: i < 3 ? rankColors[i] : 'transparent',
                border: i < 3 ? 'none' : '2px solid var(--shadow-card-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '18px',
                color: i < 3 ? rankTextColors[i] : 'var(--shadow-text-muted)',
                flexShrink: 0,
                boxShadow: i < 3 ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {i + 1}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div
                className="zcool"
                style={{
                  fontWeight: 900,
                  fontSize: '15px',
                  color: 'var(--rp-c-text-1)',
                  marginBottom: '2px',
                }}
              >
                {isZh ? play.title : play.titleEn}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--shadow-text-muted)',
                  opacity: 0.8,
                }}
              >
                {play.starts} {isZh ? '次启动' : 'launches'}
              </div>
            </div>

            {/* Online dot for #1 */}
            {i === 0 && (
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  background: '#00E676',
                  borderRadius: '50%',
                  boxShadow: '0 0 10px rgba(0,230,118,0.6)',
                  border: '2px solid var(--rp-c-bg)',
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        ))}

        {/* Tip */}
        <div
          style={{
            marginTop: '8px',
            padding: '14px 18px',
            background: 'rgba(0,243,255,0.05)',
            borderLeft: '4px solid var(--shadow-accent)',
            borderRadius: '0 16px 16px 0',
            color: 'var(--shadow-text-muted)',
            fontWeight: 700,
            fontSize: '12px',
            lineHeight: 1.6,
          }}
        >
          🏆 {tipText}
        </div>
      </div>
    </aside>
  )
}

/* ─── Main export ─── */

export function HomeContent({ lang = 'zh' }: { lang?: 'zh' | 'en' }) {
  const isZh = lang === 'zh'
  const [activeTab, setActiveTab] = useState<'recommend' | 'leaderboard'>('recommend')
  const [activeCategory, setActiveCategory] = useState(isZh ? '全部' : 'All')
  const [shuffleIdx, setShuffleIdx] = useState(0)

  const handleShuffle = () => {
    setShuffleIdx((i) => (i + 1) % PLAYS.length)
  }

  const filteredPlays = (() => {
    const allLabel = isZh ? '全部' : 'All'
    if (activeCategory === allLabel) return PLAYS
    return PLAYS.filter((p) => (isZh ? p.category : p.categoryEn) === activeCategory)
  })()

  return (
    <div className="shadow-page" style={{ minHeight: '100vh' }}>
      {/* ── Hero ── */}
      <section
        style={{
          textAlign: 'center',
          padding: '80px 20px 60px',
          position: 'relative',
          zIndex: 10,
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        <span className="section-label">Powered by OpenClaw · ShadowOwnBuddy</span>
        <h1
          className="zcool"
          style={{
            fontSize: 'clamp(40px, 6vw, 64px)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            color: 'var(--rp-c-text-1)',
            marginBottom: '20px',
          }}
        >
          {isZh ? (
            <>
              你的 AI 专属社区，
              <br />
              与你常在
            </>
          ) : (
            <>
              Your AI Community,
              <br />
              Always With You
            </>
          )}
        </h1>
        <p
          style={{
            fontSize: '17px',
            color: 'var(--shadow-text-muted)',
            maxWidth: '560px',
            margin: '0 auto 36px',
            fontWeight: 700,
            lineHeight: 1.7,
          }}
        >
          {isZh
            ? '融合 Lovart 顶级模型与 OpenClaw 强力驱动，带来前所未有的智能交互与创作体验。'
            : 'Powered by top Lovart models and OpenClaw, delivering unprecedented AI interaction and creative experiences.'}
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/app" className="btn-primary" style={{ textDecoration: 'none' }}>
            {isZh ? '探索玩法中心' : 'Explore Plays'}
          </a>
          <a
            href={isZh ? '/zh/platform/introduction' : '/platform/introduction'}
            className="btn-secondary"
            style={{
              textDecoration: 'none',
              fontSize: '13px',
              padding: '12px 28px',
            }}
          >
            {isZh ? '成为开发者' : 'Become a Developer'}
          </a>
        </div>
      </section>

      {/* ── Main content ── */}
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 24px 80px',
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: '48px',
          alignItems: 'start',
        }}
        className="home-main-grid"
      >
        {/* Left: feed */}
        <main>
          {/* Featured carousel */}
          <FeaturedCarousel isZh={isZh} />

          {/* Tab + category filter */}
          <div id="all-plays">
            <TabBar activeTab={activeTab} onTabChange={setActiveTab} isZh={isZh} />
            <CategoryFilter active={activeCategory} onSelect={setActiveCategory} isZh={isZh} />
          </div>

          {/* Shuffle card */}
          <ShuffleCard isZh={isZh} onShuffle={handleShuffle} />

          {/* Editor's picks label */}
          <div style={{ marginBottom: '20px' }}>
            <span className="section-label">{isZh ? '✦ 编辑精选' : "✦ Editor's Picks"}</span>
          </div>

          {/* Cards grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '20px',
              marginBottom: '32px',
            }}
          >
            {filteredPlays.map((play, i) => {
              const isHighlighted = play.id === PLAYS[shuffleIdx]?.id
              return (
                <div
                  key={play.id}
                  style={{
                    outline: isHighlighted ? '2px solid var(--shadow-accent)' : 'none',
                    borderRadius: '40px',
                    transition: 'outline 0.3s',
                  }}
                >
                  <PlayCard play={play} isZh={isZh} />
                </div>
              )
            })}
          </div>
        </main>

        {/* Right: leaderboard */}
        <Leaderboard isZh={isZh} />
      </div>

      {/* ── Funnel / platform section ── */}
      <section
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 24px 80px',
        }}
      >
        <div
          style={{
            background: 'var(--shadow-card-bg)',
            backdropFilter: 'blur(32px)',
            border: '1px solid var(--shadow-card-border)',
            borderRadius: '40px',
            padding: '48px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '32px',
          }}
          className="home-platform-grid"
        >
          {[
            {
              emoji: '🪐',
              layer: isZh ? '第一层 · Shell' : 'Layer 1 · Shell',
              title: isZh ? '外围玩法' : 'Outer Plays',
              items: isZh
                ? ['公开服务器 · 信息流', '定制服务器 · 一键开启', '拼团玩法 · DnD / 剧本杀']
                : ['Public Servers · Feed', 'Custom Servers · 1-click', 'Group Plays · DnD / TRPG'],
            },
            {
              emoji: '⚡',
              layer: isZh ? '第二层 · OS' : 'Layer 2 · OS',
              title: isZh ? '核心社区' : 'Core Community',
              items: isZh
                ? ['一切皆是频道', '7×24 主动式 Buddy', 'Buddy 推送商品 · 虾币经济']
                : [
                    'Everything is a Channel',
                    '7×24 Active Buddies',
                    'Buddy Commerce · Shrimp Coins',
                  ],
            },
            {
              emoji: '🏗️',
              layer: isZh ? '第三层 · Infra' : 'Layer 3 · Infra',
              title: isZh ? '基础建设' : 'Infrastructure',
              items: isZh
                ? ['开放平台 API', 'Shadow Cloud', '开发者生态']
                : ['Open Platform API', 'Shadow Cloud', 'Developer Ecosystem'],
            },
          ].map((col) => (
            <div key={col.layer}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>{col.emoji}</div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: 'var(--shadow-accent)',
                  marginBottom: '6px',
                }}
              >
                {col.layer}
              </div>
              <h3
                className="zcool"
                style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  color: 'var(--rp-c-text-1)',
                  marginBottom: '16px',
                }}
              >
                {col.title}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {col.items.map((item) => (
                  <li
                    key={item}
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--shadow-text-muted)',
                      padding: '6px 0',
                      borderBottom: '1px solid var(--shadow-card-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ color: 'var(--shadow-accent)', fontWeight: 900 }}>·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
