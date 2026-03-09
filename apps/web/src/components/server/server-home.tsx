import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../../lib/api'
import { useChatStore } from '../../stores/chat.store'

interface ServerDetail {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  bannerUrl: string | null
  homepageHtml: string | null
  isPublic: boolean
}

/** Generate a default homepage HTML for servers with no custom homepage. */
function generateDefaultHtml(server: ServerDetail): string {
  const initial = server.name.charAt(0).toUpperCase()
  const bannerCss = server.bannerUrl
    ? `background-image: url('${server.bannerUrl}'); background-size: cover; background-position: center;`
    : 'background: linear-gradient(135deg, #5865F2 0%, #3b44c4 50%, #2d3494 100%);'

  const iconHtml = server.iconUrl
    ? `<img src="${server.iconUrl}" alt="" style="width:80px;height:80px;border-radius:16px;border:4px solid #1e1f22;object-fit:cover;box-shadow:0 4px 12px rgba(0,0,0,0.3);" />`
    : `<div style="width:80px;height:80px;border-radius:16px;border:4px solid #1e1f22;background:#5865F2;display:flex;align-items:center;justify-content:center;color:#fff;font-size:32px;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.3);">${initial}</div>`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #313338; color: #dbdee1; min-height: 100vh;
  }
  .banner { height: 160px; ${bannerCss} position: relative; }
  .banner::after { content:''; position:absolute; inset:0; background:linear-gradient(to top, rgba(49,51,56,0.8), transparent); }
  .content { max-width: 640px; margin: 0 auto; padding: 0 32px; position: relative; }
  .icon-row { display:flex; align-items:flex-end; gap:16px; margin-top:-40px; position:relative; z-index:1; margin-bottom:24px; }
  .info h1 { font-size:24px; font-weight:700; color:#f2f3f5; }
  .info .badge { font-size:12px; color:#23a559; font-weight:500; margin-top:2px; }
  .desc { color:#b5bac1; font-size:14px; line-height:1.6; margin-bottom:24px; }
  .welcome { background:#2b2d31; border-radius:12px; padding:24px; border:1px solid rgba(255,255,255,0.05); }
  .welcome h2 { font-size:16px; font-weight:600; color:#f2f3f5; margin-bottom:8px; }
  .welcome p { color:#949ba4; font-size:14px; line-height:1.5; }
  .features { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px; }
  .feature { background:#313338; border-radius:8px; padding:16px; border:1px solid rgba(255,255,255,0.05); }
  .feature .emoji { font-size:24px; margin-bottom:8px; }
  .feature h3 { font-size:13px; font-weight:600; color:#f2f3f5; margin-bottom:4px; }
  .feature p { font-size:12px; color:#949ba4; }
</style>
</head>
<body>
  <div class="banner"></div>
  <div class="content">
    <div class="icon-row">
      ${iconHtml}
      <div class="info">
        <h1>${server.name}</h1>
        ${server.isPublic ? '<div class="badge">Public</div>' : ''}
      </div>
    </div>
    ${server.description ? `<div class="desc">${server.description}</div>` : ''}
    <div class="welcome">
      <h2>👋 Welcome!</h2>
      <p>Select a channel from the sidebar to start chatting, or explore what this server has to offer.</p>
      <div class="features">
        <div class="feature">
          <div class="emoji">💬</div>
          <h3>Chat</h3>
          <p>Join channels and start conversations</p>
        </div>
        <div class="feature">
          <div class="emoji">🤖</div>
          <h3>AI Buddies</h3>
          <p>Interact with AI agents in channels</p>
        </div>
        <div class="feature">
          <div class="emoji">📢</div>
          <h3>Announcements</h3>
          <p>Stay updated with the latest news</p>
        </div>
        <div class="feature">
          <div class="emoji">🎨</div>
          <h3>Customize</h3>
          <p>Make this server your own</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
}

export function ServerHome() {
  const { t } = useTranslation()
  const { activeServerId } = useChatStore()

  const { data: server } = useQuery({
    queryKey: ['server', activeServerId],
    queryFn: () => fetchApi<ServerDetail>(`/api/servers/${activeServerId}`),
    enabled: !!activeServerId,
  })

  if (!server) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <img src="/Logo.svg" alt="Shadow" className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-text-muted text-lg">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Use custom HTML if set, otherwise generate default
  const htmlContent = server.homepageHtml || generateDefaultHtml(server)

  return (
    <div className="flex-1 flex flex-col bg-bg-primary overflow-hidden">
      {/* Header bar */}
      <div className="h-12 px-4 flex items-center border-b border-white/5 shrink-0">
        <img src="/Logo.svg" alt="" className="w-5 h-5 mr-2 opacity-60" />
        <h2 className="font-semibold text-text-primary text-sm truncate">{server.name}</h2>
      </div>
      {/* HTML content in sandboxed iframe */}
      <div className="flex-1 overflow-auto">
        <iframe
          srcDoc={htmlContent}
          title={`${server.name} homepage`}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  )
}
