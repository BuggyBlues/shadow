import type React from 'react'
import { useState } from 'react'
import { Helmet, useLang, useLocation, usePageData } from 'rspress/runtime'
import Theme from 'rspress/theme'
import { HomeContent } from '../components/HomeContent'
import { PublicFooter } from '../components/Layout'
import { LoginModal } from '../components/LoginModal'
import './index.css'

/**
 * Background orbs — injected only on the homepage to avoid showing on doc pages.
 * position:fixed so they cover the full viewport even when scrolling.
 */
function HomeOrbs() {
  return (
    <>
      <div className="shadow-orb shadow-orb-1" aria-hidden="true" />
      <div className="shadow-orb shadow-orb-2" aria-hidden="true" />
    </>
  )
}

type HomeNavItem = {
  label: string
  href: string
  desc: string
}

function HomeNavDropdown({ label, items }: { label: string; items: HomeNavItem[] }) {
  return (
    <div className="shadow-home-nav-dropdown">
      <button className="shadow-home-nav-link shadow-home-nav-dropdown-trigger" type="button">
        <span>{label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="shadow-home-nav-dropdown-menu">
        {items.map((item) => (
          <a
            key={`${item.href}:${item.label}`}
            href={item.href}
            className="shadow-home-nav-dropdown-item"
            style={{ textDecoration: 'none' }}
          >
            <span>{item.label}</span>
            <small>{item.desc}</small>
          </a>
        ))}
      </div>
    </div>
  )
}

/**
 * Floating capsule nav — homepage only (rspress nav hidden via uiSwitch).
 * Matches preview.html: centered full-width pill, logo left, links+launch right.
 */
function HomeCapsuleNav() {
  const { siteData } = usePageData()
  const currentLang = useLang()
  const base = (siteData.base || '/').replace(/\/$/, '')
  const isZh = currentLang === 'zh'
  const prefix = isZh ? '/zh' : ''
  const docsHref = (path: string) => `${base}${prefix}${path}`
  const productItems = isZh
    ? [
        {
          label: '产品介绍',
          href: docsHref('/product/'),
          desc: '了解虾豆如何连接社区、Buddy 和玩法',
        },
        { label: '帮助中心', href: docsHref('/product/'), desc: '新用户、频道、虾币和 Buddy 指南' },
        {
          label: '首页玩法',
          href: docsHref('/product/play-launch'),
          desc: '点玩法后直接进入可用空间',
        },
        {
          label: 'DIY Cloud',
          href: '/app/cloud/diy',
          desc: '描述需求，生成自己的 Cloud 空间',
        },
        { label: '下载桌面端', href: docsHref('/product/download'), desc: '连接本地 Buddy 和工具' },
      ]
    : [
        {
          label: 'Product Overview',
          href: docsHref('/product/'),
          desc: 'See how Shadow connects communities, Buddies, and plays',
        },
        {
          label: 'Help Center',
          href: docsHref('/product/'),
          desc: 'Guides for channels, coins, and Buddies',
        },
        {
          label: 'Play Launch',
          href: docsHref('/product/play-launch'),
          desc: 'Start from a play and land in a ready space',
        },
        {
          label: 'DIY Cloud',
          href: '/app/cloud/diy',
          desc: 'Describe a space and generate a Cloud plan',
        },
        {
          label: 'Desktop App',
          href: docsHref('/product/download'),
          desc: 'Connect local Buddies and tools',
        },
      ]
  const platformItems = isZh
    ? [
        {
          label: '开发者平台',
          href: docsHref('/platform/introduction'),
          desc: 'API、OAuth、SDK 和实时事件',
        },
        {
          label: '虾豆 Cloud',
          href: docsHref('/platform/cloud'),
          desc: '用模版一键部署 Buddy 空间',
        },
        {
          label: 'Cloud CLI',
          href: docsHref('/platform/cloud-cli'),
          desc: '独立命令行与 Kubernetes 部署',
        },
        {
          label: '模版与插件',
          href: docsHref('/platform/cloud-templates'),
          desc: '沉淀玩法资产和扩展能力',
        },
      ]
    : [
        {
          label: 'Developer Platform',
          href: docsHref('/platform/introduction'),
          desc: 'APIs, OAuth, SDKs, and real-time events',
        },
        {
          label: 'Shadow Cloud',
          href: docsHref('/platform/cloud'),
          desc: 'Deploy Buddy spaces from templates',
        },
        {
          label: 'Cloud CLI',
          href: docsHref('/platform/cloud-cli'),
          desc: 'Standalone Kubernetes deployment workflow',
        },
        {
          label: 'Templates & Plugins',
          href: docsHref('/platform/cloud-templates'),
          desc: 'Package repeatable plays and capabilities',
        },
      ]
  const resourceItems = isZh
    ? [
        { label: '价格', href: docsHref('/pricing'), desc: '查看虾币和会员权益' },
        { label: '博客', href: docsHref('/blog/'), desc: '产品进展与实践文章' },
        { label: 'GitHub', href: 'https://github.com/buggyblues/shadow', desc: '源代码和开发路线' },
      ]
    : [
        {
          label: 'Pricing',
          href: docsHref('/pricing'),
          desc: 'Coins, membership, and usage plans',
        },
        { label: 'Blog', href: docsHref('/blog/'), desc: 'Product updates and field notes' },
        {
          label: 'GitHub',
          href: 'https://github.com/buggyblues/shadow',
          desc: 'Source code and roadmap',
        },
      ]

  return (
    <header className="shadow-home-capsule-nav">
      <div className="shadow-home-capsule-inner">
        {/* Logo — left */}
        <a
          href={`${base}${prefix}/`}
          className="shadow-home-logo"
          style={{ textDecoration: 'none' }}
        >
          <img src={`${base}/Logo.svg`} alt="Shadow Logo" className="w-8 h-8" />
          <span
            className="text-xl font-bold whitespace-nowrap"
            style={{
              color: 'var(--rp-c-text-1)',
              fontFamily: '"Nunito", "Noto Sans SC", sans-serif',
            }}
          >
            {isZh ? '虾豆' : 'Shadow'}
            <span className="text-base text-cyan-600 ml-1 font-black">
              {isZh ? 'OwnBuddy' : 'OwnBuddy'}
            </span>
          </span>
        </a>

        {/* Right group: nav links + launch */}
        <div className="shadow-home-nav-right">
          <HomeNavDropdown label={isZh ? '产品' : 'PRODUCT'} items={productItems} />
          <HomeNavDropdown label={isZh ? '开放平台' : 'PLATFORM'} items={platformItems} />
          <HomeNavDropdown label={isZh ? '资源' : 'RESOURCES'} items={resourceItems} />
          <a href="/app" className="btn-primary" style={{ textDecoration: 'none' }}>
            {isZh ? '启动！' : 'Launch'}
          </a>
        </div>
      </div>
    </header>
  )
}

/**
 * Full logo for doc-page rspress nav — shows complete "虾豆 OwnBuddy" / "Shadow OwnBuddy" text.
 * navTitleMask (in sidebar) is hidden via CSS to avoid double-logo.
 */
function DocNavTitle() {
  const { siteData } = usePageData()
  const { pathname } = useLocation()
  const base = (siteData.base || '/').replace(/\/$/, '')
  const isZh = pathname.startsWith(`${base}/zh`)
  const prefix = isZh ? '/zh' : ''

  return (
    <a
      href={`${base}${prefix}/`}
      className="flex items-center gap-3 w-full h-full transition-opacity duration-300 hover:opacity-60"
      style={{ textDecoration: 'none' }}
    >
      <img src={`${base}/Logo.svg`} alt="Shadow Logo" className="w-8 h-8" />
      <span
        className="text-xl font-bold whitespace-nowrap"
        style={{ color: 'var(--rp-c-text-1)', fontFamily: '"Nunito", "Noto Sans SC", sans-serif' }}
      >
        {isZh ? '虾豆' : 'Shadow'}
        <span className="text-base text-cyan-600 ml-1 font-black">OwnBuddy</span>
      </span>
    </a>
  )
}

function LaunchButton() {
  const { pathname } = useLocation()
  const isZh = pathname.includes('/zh')
  return (
    <a
      href="/app"
      className="btn-primary ml-3 whitespace-nowrap"
      style={{ textDecoration: 'none' }}
    >
      {isZh ? '启动！' : 'Launch'}
    </a>
  )
}

function GlobalFooter() {
  const { pathname } = useLocation()
  const isZh = pathname.includes('/zh')
  return <PublicFooter lang={isZh ? 'zh' : 'en'} />
}

const Layout = () => {
  const { page, siteData } = usePageData()
  const { pathname } = useLocation()
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginRedirect, setLoginRedirect] = useState('/app')
  const base = (siteData.base || '/').replace(/\/$/, '')
  const routePath =
    base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname
  // Only locale index pages use the custom homepage shell. Other custom MDX pages must render normally.
  const isHomepage =
    page.pageType === 'custom' && /^(\/|\/index\.html|\/zh\/?|\/zh\/index\.html)$/.test(routePath)

  if (isHomepage) {
    const isZh =
      page.lang === 'zh' ||
      (typeof window !== 'undefined' && window.location.pathname.startsWith('/zh'))
    const title = isZh
      ? '虾豆 OwnBuddy - 可玩的 AI 社区'
      : 'Shadow OwnBuddy - Playable AI Communities'
    const handleAppClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (!(event.target instanceof Element)) return
      const anchor = event.target.closest<HTMLAnchorElement>('a[href]')
      if (!anchor) return
      const url = new URL(anchor.href, window.location.href)
      const isAppPath = url.pathname === '/app' || url.pathname.startsWith('/app/')
      if (url.origin !== window.location.origin || !isAppPath) return
      event.preventDefault()
      setLoginRedirect(`${url.pathname}${url.search}${url.hash}`)
      setLoginOpen(true)
    }

    return (
      <div onClickCapture={handleAppClick}>
        <Helmet htmlAttributes={{ lang: isZh ? 'zh' : 'en' }}>
          <title>{title}</title>
        </Helmet>
        <HomeOrbs />
        <HomeCapsuleNav />
        <HomeContent lang={isZh ? 'zh' : 'en'} />
        <GlobalFooter />
        <LoginModal
          open={loginOpen}
          lang={isZh ? 'zh' : 'en'}
          redirect={loginRedirect}
          onClose={() => setLoginOpen(false)}
        />
      </div>
    )
  }

  // Doc pages — full-width rspress nav with custom logo text + Launch button
  // (.translation lang switcher hidden via CSS; lang in footer only)
  const footer = page.pageType === 'custom' ? undefined : <GlobalFooter />
  return <Theme.Layout navTitle={<DocNavTitle />} afterNavMenu={<LaunchButton />} bottom={footer} />
}

export default {
  ...Theme,
  Layout,
}
export * from 'rspress/theme'
