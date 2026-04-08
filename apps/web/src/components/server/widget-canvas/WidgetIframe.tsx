/* ─────────────────────────────────────────────────────────────────────────────
 *  Shadow OS — Widget Iframe Renderer
 *
 *  Renders an iframe-based widget inside the sandbox bridge.
 *  Handles lifecycle: init, config sync, resize, and cleanup.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef } from 'react'
import {
  createWidgetSandbox,
  generateWidgetSDKScript,
  useWidgetEngine,
  type WidgetInstance,
  type WidgetSandboxHandle,
} from '../../../lib/widget-engine'

interface WidgetIframeProps {
  instance: WidgetInstance
  onNavigate?: (url: string) => void
}

export function WidgetIframe({ instance, onNavigate }: WidgetIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const sandboxRef = useRef<WidgetSandboxHandle | null>(null)
  const { updateWidget } = useWidgetEngine()

  const handleConfigSave = useCallback(
    (config: Record<string, unknown>) => {
      updateWidget(instance.instanceId, { config })
    },
    [instance.instanceId, updateWidget],
  )

  const handleResizeRequest = useCallback(
    (w: number, h: number) => {
      useWidgetEngine.getState().moveWidget(instance.instanceId, { w, h })
    },
    [instance.instanceId],
  )

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const bridge = createWidgetSandbox(
      instance.instanceId,
      instance.grantedPermissions,
      {
        // Host API handlers — these are stubs that will be connected to real
        // server APIs when the backend endpoints are ready.
        'fs.read': async (path: string) => {
          return { content: `[stub] content of ${path}`, mime: 'text/plain' }
        },
        'fs.write': async () => {
          return { ok: true }
        },
        'buddy.post': async () => {
          return { ok: true }
        },
        'store.check': async () => {
          return { owned: false }
        },
      } as never,
      {
        onNavigate,
        onConfigSave: handleConfigSave,
        onResizeRequest: handleResizeRequest,
        onReady: () => {
          bridge.init(instance.config)
        },
      },
    )

    bridge.attach(iframe)
    sandboxRef.current = bridge

    return () => {
      bridge.destroy()
      sandboxRef.current = null
    }
  }, [
    instance.instanceId,
    instance.grantedPermissions,
    instance.config,
    onNavigate,
    handleConfigSave,
    handleResizeRequest,
  ])

  // Determine iframe source
  const srcDoc = instance.sourceUrl
    ? undefined
    : `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${generateWidgetSDKScript(instance.instanceId)}
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, sans-serif; background: transparent; color: #e5e5e5; }
</style>
</head>
<body>
<div id="widget-root"></div>
<script>
  ShadowWidget.ready().then(function(config) {
    document.getElementById('widget-root').innerHTML =
      '<div style="padding:20px;text-align:center;opacity:0.5">' +
      '<p style="font-size:13px">Widget: ' + ShadowWidget.instanceId + '</p>' +
      '<p style="font-size:11px;margin-top:4px">Config: ' + JSON.stringify(config) + '</p>' +
      '</div>';
  });
</script>
</body>
</html>`

  return (
    <iframe
      ref={iframeRef}
      src={instance.sourceUrl || undefined}
      srcDoc={srcDoc}
      title={`Widget ${instance.widgetId}`}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-forms allow-popups allow-modals"
      allow="fullscreen; clipboard-write"
      style={{ background: 'transparent' }}
    />
  )
}
