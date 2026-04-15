import { useLocation, usePageData } from 'rspress/runtime'
import Theme from 'rspress/theme'
import { PublicFooter } from '../components/Layout'
import './index.css'

function CustomNavTitle() {
  const { siteData } = usePageData()
  const { pathname } = useLocation()
  const base = (siteData.base || '/').replace(/\/$/, '')
  const isZh = pathname.startsWith(`${base}/zh`)
  const prefix = isZh ? '/zh' : ''

  return (
    <a
      href={`${base}${prefix}/`}
      className="flex items-center gap-3 w-full h-full text-base font-semibold transition-opacity duration-300 hover:opacity-60"
      style={{ textDecoration: 'none' }}
    >
      <img src={`${base}/Logo.svg`} alt="Shadow Logo" className="w-9 h-9" />
      <span
        className="zcool text-xl font-bold whitespace-nowrap"
        style={{ color: 'var(--rp-c-text-1)' }}
      >
        虾豆
        <span
          className="text-base text-cyan-600 ml-1 font-black"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          ShadowOwnBuddy
        </span>
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
      className="btn-primary zcool text-base px-5 py-1.5 ml-3 hover:scale-105 transition-transform duration-300 shadow-lg hover:shadow-cyan-500/30 whitespace-nowrap"
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

const Layout = () => (
  <Theme.Layout
    navTitle={<CustomNavTitle />}
    afterNavMenu={<LaunchButton />}
    bottom={<GlobalFooter />}
  />
)

export default {
  ...Theme,
  Layout,
}
export * from 'rspress/theme'
