import { contextBridge, ipcRenderer } from 'electron'

const desktopAPI = {
  platform: process.platform as 'darwin' | 'win32' | 'linux',
  isDesktop: true as const,

  // Notifications
  showNotification: (title: string, body: string, channelId?: string) => {
    ipcRenderer.invoke('desktop:showNotification', { title, body, channelId })
  },
  setBadgeCount: (count: number) => {
    ipcRenderer.invoke('desktop:setBadgeCount', count)
  },
  setNotificationMode: (mode: 'all' | 'mentions' | 'none') => {
    ipcRenderer.invoke('desktop:setNotificationMode', mode)
  },

  // Window
  minimizeToTray: () => {
    ipcRenderer.invoke('desktop:minimizeToTray')
  },

  // Process Management
  startBuddy: (config: { name: string; scriptPath: string; args?: string[] }) => {
    return ipcRenderer.invoke('desktop:startBuddy', config) as Promise<{ id: string; pid: number }>
  },
  stopBuddy: (processId: string) => {
    return ipcRenderer.invoke('desktop:stopBuddy', processId)
  },
  getBuddyStatus: (processId: string) => {
    return ipcRenderer.invoke('desktop:getBuddyStatus', processId)
  },
  listBuddies: () => {
    return ipcRenderer.invoke('desktop:listBuddies')
  },

  // Event listeners
  onNavigateToChannel: (callback: (channelId: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, channelId: string) => callback(channelId)
    ipcRenderer.on('desktop:navigateToChannel', handler)
    return () => ipcRenderer.removeListener('desktop:navigateToChannel', handler)
  },

  // Auto-update & Settings
  getVersion: () => ipcRenderer.invoke('desktop:getVersion') as Promise<string>,
  checkForUpdate: () =>
    ipcRenderer.invoke('desktop:checkForUpdate') as Promise<{
      hasUpdate: boolean
      version: string
      downloadUrl: string
      releaseNotes: string
    }>,
  getUpdateState: () =>
    ipcRenderer.invoke('desktop:getUpdateState') as Promise<{
      status: 'idle' | 'checking' | 'update-available' | 'up-to-date' | 'error'
      checkedAt: number | null
      info: {
        hasUpdate: boolean
        version: string
        downloadUrl: string
        releaseNotes: string
      } | null
      error: string | null
    }>,
  getUpdateSettings: () =>
    ipcRenderer.invoke('desktop:getUpdateSettings') as Promise<{ autoCheckOnLaunch: boolean }>,
  setUpdateSettings: (settings: { autoCheckOnLaunch: boolean }) =>
    ipcRenderer.invoke('desktop:setUpdateSettings', settings) as Promise<{
      autoCheckOnLaunch: boolean
    }>,
  downloadUpdate: (url: string) =>
    ipcRenderer.invoke('desktop:downloadUpdate', url) as Promise<boolean>,
  setOpenAtLogin: (v: boolean) => {
    ipcRenderer.invoke('desktop:setOpenAtLogin', v)
  },
  getOpenAtLogin: () => ipcRenderer.invoke('desktop:getOpenAtLogin') as Promise<boolean>,
  quitAndRestart: () => {
    ipcRenderer.invoke('desktop:quitAndRestart')
  },

  // Buddy event listeners
  onBuddyMessage: (callback: (data: { id: string; message: unknown }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { id: string; message: unknown }) =>
      callback(data)
    ipcRenderer.on('desktop:buddyMessage', handler)
    return () => ipcRenderer.removeListener('desktop:buddyMessage', handler)
  },
  onBuddyExited: (callback: (data: { id: string; code: number | null }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { id: string; code: number | null },
    ) => callback(data)
    ipcRenderer.on('desktop:buddyExited', handler)
    return () => ipcRenderer.removeListener('desktop:buddyExited', handler)
  },
  onUpdateState: (
    callback: (data: {
      status: 'idle' | 'checking' | 'update-available' | 'up-to-date' | 'error'
      checkedAt: number | null
      info: {
        hasUpdate: boolean
        version: string
        downloadUrl: string
        releaseNotes: string
      } | null
      error: string | null
    }) => void,
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: {
        status: 'idle' | 'checking' | 'update-available' | 'up-to-date' | 'error'
        checkedAt: number | null
        info: {
          hasUpdate: boolean
          version: string
          downloadUrl: string
          releaseNotes: string
        } | null
        error: string | null
      },
    ) => callback(data)
    ipcRenderer.on('desktop:updateState', handler)
    return () => ipcRenderer.removeListener('desktop:updateState', handler)
  },

  // ─── OpenClaw Gateway ───────────────────────────────────────────────

  openClaw: {
    // Gateway lifecycle
    getGatewayStatus: () => ipcRenderer.invoke('openclaw:gateway:status'),
    startGateway: () => ipcRenderer.invoke('openclaw:gateway:start'),
    stopGateway: () => ipcRenderer.invoke('openclaw:gateway:stop'),
    restartGateway: () => ipcRenderer.invoke('openclaw:gateway:restart'),
    installOpenClaw: () => ipcRenderer.invoke('openclaw:gateway:install'),
    openConsole: () => ipcRenderer.invoke('openclaw:gateway:open-console'),
    getRecentLogs: (limit?: number) => ipcRenderer.invoke('openclaw:gateway:recent-logs', limit),
    pickDirectory: (defaultPath?: string) =>
      ipcRenderer.invoke('openclaw:dialog:pick-directory', defaultPath),

    onGatewayStatusChanged: (callback: (status: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: unknown) => callback(status)
      ipcRenderer.on('openclaw:gateway:status-changed', handler)
      return () => ipcRenderer.removeListener('openclaw:gateway:status-changed', handler)
    },

    onGatewayLog: (callback: (entry: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, entry: unknown) => callback(entry)
      ipcRenderer.on('openclaw:gateway:log', handler)
      return () => ipcRenderer.removeListener('openclaw:gateway:log', handler)
    },

    // Config
    getConfig: () => ipcRenderer.invoke('openclaw:config:get'),
    saveConfig: (config: unknown) => ipcRenderer.invoke('openclaw:config:save', config),

    // Desktop Settings (autoStart, autoRestart — not in openclaw.json)
    getDesktopSettings: () => ipcRenderer.invoke('openclaw:desktop-settings:get'),
    saveDesktopSettings: (settings: unknown) =>
      ipcRenderer.invoke('openclaw:desktop-settings:save', settings),

    // Buddies
    listBuddies: () => ipcRenderer.invoke('openclaw:buddies:list'),
    getBuddy: (id: string) => ipcRenderer.invoke('openclaw:buddies:get', id),
    createBuddy: (buddy: unknown) => ipcRenderer.invoke('openclaw:buddies:create', buddy),
    updateBuddy: (id: string, updates: unknown) =>
      ipcRenderer.invoke('openclaw:buddies:update', id, updates),
    deleteBuddy: (id: string) => ipcRenderer.invoke('openclaw:buddies:delete', id),

    // Buddy Bootstrap Files
    listBootstrapFiles: (buddyId: string) =>
      ipcRenderer.invoke('openclaw:buddies:bootstrap:list', buddyId),
    readBootstrapFile: (buddyId: string, fileName: string) =>
      ipcRenderer.invoke('openclaw:buddies:bootstrap:read', buddyId, fileName),
    writeBootstrapFile: (buddyId: string, fileName: string, content: string) =>
      ipcRenderer.invoke('openclaw:buddies:bootstrap:write', buddyId, fileName, content),

    // Channels
    getChannelRegistry: () => ipcRenderer.invoke('openclaw:channels:registry'),
    getChannelMeta: (channelId: string) => ipcRenderer.invoke('openclaw:channels:meta', channelId),
    getChannelConfigs: () => ipcRenderer.invoke('openclaw:channels:configs'),
    getChannelConfig: (channelId: string) =>
      ipcRenderer.invoke('openclaw:channels:config:get', channelId),
    saveChannelConfig: (channelType: string, config: unknown) =>
      ipcRenderer.invoke('openclaw:channels:config:save', channelType, config),
    deleteChannelConfig: (channelType: string) =>
      ipcRenderer.invoke('openclaw:channels:config:delete', channelType),

    // Models
    listModels: () => ipcRenderer.invoke('openclaw:models:list'),
    saveModel: (id: string, provider: unknown) =>
      ipcRenderer.invoke('openclaw:models:save', id, provider),
    deleteModel: (id: string) => ipcRenderer.invoke('openclaw:models:delete', id),
    getDefaultModel: () => ipcRenderer.invoke('openclaw:models:default'),
    setDefaultModel: (modelKey: string) =>
      ipcRenderer.invoke('openclaw:models:default:set', modelKey),

    // Cron Config
    getCronConfig: () => ipcRenderer.invoke('openclaw:cron:config'),
    updateCronConfig: (updates: unknown) =>
      ipcRenderer.invoke('openclaw:cron:config:update', updates),

    // Cron Tasks
    listCronTasks: () => ipcRenderer.invoke('openclaw:cron:tasks:list'),
    saveCronTask: (task: unknown) => ipcRenderer.invoke('openclaw:cron:tasks:save', task),
    deleteCronTask: (id: string) => ipcRenderer.invoke('openclaw:cron:tasks:delete', id),

    // Skills
    listSkills: () => ipcRenderer.invoke('openclaw:skills:list'),
    getSkillsConfig: () => ipcRenderer.invoke('openclaw:skills:config'),
    updateSkillConfig: (skillName: string, updates: unknown) =>
      ipcRenderer.invoke('openclaw:skills:config:update', skillName, updates),
    deleteSkillEntry: (name: string) => ipcRenderer.invoke('openclaw:skills:entry:delete', name),
    getSkillReadme: (slug: string) => ipcRenderer.invoke('openclaw:skills:readme', slug),

    // SkillHub
    searchSkills: (query: string, options?: unknown) =>
      ipcRenderer.invoke('openclaw:skillhub:search', query, options),
    installSkill: (slug: string, registryId?: string) =>
      ipcRenderer.invoke('openclaw:skillhub:install', slug, registryId),
    uninstallSkill: (slug: string) => ipcRenderer.invoke('openclaw:skillhub:uninstall', slug),
    getRegistries: () => ipcRenderer.invoke('openclaw:skillhub:registries'),
    getSkillLeaderboard: (limit?: number) =>
      ipcRenderer.invoke('openclaw:skillhub:leaderboard', limit),
    updateRegistries: (registries: unknown) =>
      ipcRenderer.invoke('openclaw:skillhub:registries:update', registries),

    // Buddy Connections
    listBuddyConnections: () => ipcRenderer.invoke('openclaw:buddy:list'),
    addBuddyConnection: (connection: unknown) =>
      ipcRenderer.invoke('openclaw:buddy:add', connection),
    removeBuddyConnection: (id: string) => ipcRenderer.invoke('openclaw:buddy:remove', id),
    updateBuddyConnection: (id: string, updates: unknown) =>
      ipcRenderer.invoke('openclaw:buddy:update', id, updates),
    connectBuddy: (id: string) => ipcRenderer.invoke('openclaw:buddy:connect', id),
    disconnectBuddy: (id: string) => ipcRenderer.invoke('openclaw:buddy:disconnect', id),
    connectAllBuddies: () => ipcRenderer.invoke('openclaw:buddy:connect-all'),
    probeBuddyConnections: () => ipcRenderer.invoke('openclaw:buddy:probe-all'),

    // Debug CLI
    execCli: (args: string[]) =>
      ipcRenderer.invoke('openclaw:cli:exec', args) as Promise<{
        code: number | null
        stdout: string
        stderr: string
      }>,

    onBuddyStatusChanged: (callback: (connections: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, connections: unknown) =>
        callback(connections)
      ipcRenderer.on('openclaw:buddy:status-changed', handler)
      return () => ipcRenderer.removeListener('openclaw:buddy:status-changed', handler)
    },
  },
}

contextBridge.exposeInMainWorld('desktopAPI', desktopAPI)

export type DesktopAPI = typeof desktopAPI
