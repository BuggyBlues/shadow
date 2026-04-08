/* ─────────────────────────────────────────────────────────────────────────────
 *  Shadow OS — Widget Sandbox (iframe bridge)
 *
 *  Provides a secure communication layer between widget iframes and the host.
 *  Each iframe widget gets a postMessage-based API bridge that validates
 *  permissions before forwarding calls to the host runtime.
 * ───────────────────────────────────────────────────────────────────────────── */

import type {
  HostToWidgetMessage,
  WidgetHostAPI,
  WidgetPermission,
  WidgetToHostMessage,
} from './types'

type APIHandler = WidgetHostAPI[keyof WidgetHostAPI]

/**
 * Create a sandbox bridge for a single widget iframe.
 * Returns an `attach(iframe)` / `destroy()` handle.
 */
export function createWidgetSandbox(
  instanceId: string,
  grantedPermissions: WidgetPermission[],
  handlers: Partial<Record<keyof WidgetHostAPI, APIHandler>>,
  options?: {
    onNavigate?: (url: string) => void
    onConfigSave?: (config: Record<string, unknown>) => void
    onReady?: () => void
    onResizeRequest?: (w: number, h: number) => void
  },
) {
  let iframe: HTMLIFrameElement | null = null
  let disposed = false

  function hasPermission(method: string): boolean {
    // Permission name is the method prefix, e.g. "fs.read" → "fs.read"
    return grantedPermissions.includes(method as WidgetPermission)
  }

  function postToWidget(msg: HostToWidgetMessage) {
    if (!iframe?.contentWindow || disposed) return
    iframe.contentWindow.postMessage(msg, '*')
  }

  async function handleMessage(event: MessageEvent<WidgetToHostMessage>) {
    if (disposed) return
    if (!iframe || event.source !== iframe.contentWindow) return
    if (!event.data || typeof event.data !== 'object') return

    const msg = event.data

    switch (msg.type) {
      case 'widget:ready':
        options?.onReady?.()
        break

      case 'widget:api-call': {
        const { callId, method, args } = msg

        if (!hasPermission(method)) {
          postToWidget({
            type: 'widget:api-response',
            callId,
            result: null,
            error: `Permission denied: ${method}`,
          })
          return
        }

        const handler = handlers[method]
        if (!handler) {
          postToWidget({
            type: 'widget:api-response',
            callId,
            result: null,
            error: `Unknown method: ${method}`,
          })
          return
        }

        try {
          const result = await (handler as (...a: unknown[]) => Promise<unknown>)(...args)
          postToWidget({ type: 'widget:api-response', callId, result })
        } catch (err) {
          postToWidget({
            type: 'widget:api-response',
            callId,
            result: null,
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        }
        break
      }

      case 'widget:navigate':
        options?.onNavigate?.(msg.url)
        break

      case 'widget:config-save':
        options?.onConfigSave?.(msg.config)
        break

      case 'widget:resize-request':
        options?.onResizeRequest?.(msg.width, msg.height)
        break
    }
  }

  return {
    /** Attach to an iframe element and start listening */
    attach(el: HTMLIFrameElement) {
      iframe = el
      window.addEventListener('message', handleMessage)
    },

    /** Send the init payload to the widget */
    init(config: Record<string, unknown>) {
      postToWidget({ type: 'widget:init', instanceId, config })
    },

    /** Update the widget config */
    updateConfig(config: Record<string, unknown>) {
      postToWidget({ type: 'widget:config-update', config })
    },

    /** Notify the widget of a resize */
    notifyResize(width: number, height: number) {
      postToWidget({ type: 'widget:resize', width, height })
    },

    /** Push an arbitrary event to the widget */
    pushEvent(event: string, payload: unknown) {
      postToWidget({ type: 'widget:event', event, payload })
    },

    /** Tear down the bridge */
    destroy() {
      disposed = true
      iframe = null
      window.removeEventListener('message', handleMessage)
    },
  }
}

export type WidgetSandboxHandle = ReturnType<typeof createWidgetSandbox>

/**
 * Generate the client-side SDK script that gets injected into iframe widgets.
 * This gives the widget access to `window.ShadowWidget` API.
 */
export function generateWidgetSDKScript(instanceId: string): string {
  return `<script>
(function() {
  var _pending = {};
  var _callIdCounter = 0;
  var _initResolver = null;
  var _initPromise = new Promise(function(resolve) { _initResolver = resolve; });
  var _eventListeners = {};

  window.ShadowWidget = {
    instanceId: "${instanceId}",

    /** Wait for the host to send the init config */
    ready: function() {
      window.parent.postMessage({ type: "widget:ready", instanceId: "${instanceId}" }, "*");
      return _initPromise;
    },

    /** Call a host API method */
    call: function(method, args) {
      return new Promise(function(resolve, reject) {
        var callId = "wc_" + (++_callIdCounter);
        _pending[callId] = { resolve: resolve, reject: reject };
        window.parent.postMessage({
          type: "widget:api-call",
          callId: callId,
          method: method,
          args: args || []
        }, "*");
      });
    },

    /** Convenience: fs.read */
    fsRead: function(path) { return this.call("fs.read", [path]); },
    /** Convenience: fs.write */
    fsWrite: function(path, content) { return this.call("fs.write", [path, content]); },
    /** Convenience: buddy.post */
    buddyPost: function(buddyId, message) { return this.call("buddy.post", [buddyId, message]); },
    /** Convenience: store.check */
    storeCheck: function(productId) { return this.call("store.check", [productId]); },

    /** Request a resize */
    requestResize: function(w, h) {
      window.parent.postMessage({ type: "widget:resize-request", width: w, height: h }, "*");
    },

    /** Navigate the host app */
    navigate: function(url) {
      window.parent.postMessage({ type: "widget:navigate", url: url }, "*");
    },

    /** Save config back to the host */
    saveConfig: function(config) {
      window.parent.postMessage({ type: "widget:config-save", config: config }, "*");
    },

    /** Listen to events pushed by the host */
    on: function(event, cb) {
      if (!_eventListeners[event]) _eventListeners[event] = [];
      _eventListeners[event].push(cb);
    },

    off: function(event, cb) {
      if (!_eventListeners[event]) return;
      _eventListeners[event] = _eventListeners[event].filter(function(f) { return f !== cb; });
    }
  };

  window.addEventListener("message", function(e) {
    if (!e.data || typeof e.data !== "object") return;
    var d = e.data;
    if (d.type === "widget:init") {
      if (_initResolver) _initResolver(d.config || {});
    } else if (d.type === "widget:config-update") {
      if (_initResolver) _initResolver(d.config || {});
    } else if (d.type === "widget:api-response") {
      var p = _pending[d.callId];
      if (!p) return;
      delete _pending[d.callId];
      if (d.error) { p.reject(new Error(d.error)); }
      else { p.resolve(d.result); }
    } else if (d.type === "widget:event") {
      var listeners = _eventListeners[d.event] || [];
      for (var i = 0; i < listeners.length; i++) { listeners[i](d.payload); }
    }
  });
})();
</script>`
}
