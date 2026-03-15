import { create } from 'zustand'

interface AppItem {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  sourceFileId: string | null
  serverId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface AppStoreState {
  activeAppId: string | null
  setActiveAppId: (id: string | null) => void
  overlay: 'create' | 'publish' | null
  setOverlay: (o: AppStoreState['overlay']) => void
  editingApp: AppItem | null
  setEditingApp: (app: AppItem | null) => void
  publishFileId: string | null
  publishFileName: string | null
  setPublishFile: (fileId: string | null, fileName?: string | null) => void
}

export const useAppStore = create<AppStoreState>((set) => ({
  activeAppId: null,
  setActiveAppId: (id) => set({ activeAppId: id }),
  overlay: null,
  setOverlay: (o) => set({ overlay: o }),
  editingApp: null,
  setEditingApp: (app) => set({ editingApp: app }),
  publishFileId: null,
  publishFileName: null,
  setPublishFile: (fileId, fileName) =>
    set({ publishFileId: fileId, publishFileName: fileName ?? null }),
}))
