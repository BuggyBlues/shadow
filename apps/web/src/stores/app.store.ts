import { create } from 'zustand'
import type { AppItem } from '../components/app/app-page'

interface AppStoreState {
  /** Currently viewing app ID (for detail view) */
  activeAppId: string | null
  setActiveAppId: (id: string | null) => void
  /** View mode for app detail */
  viewMode: 'embedded' | 'fullscreen'
  setViewMode: (m: AppStoreState['viewMode']) => void
  /** Admin overlay panel */
  overlay: 'create' | 'publish' | null
  setOverlay: (o: AppStoreState['overlay']) => void
  /** App being edited (null = create mode) */
  editingApp: AppItem | null
  setEditingApp: (app: AppItem | null) => void
  /** Pre-selected workspace file for publishing (fileId from workspace) */
  publishFileId: string | null
  publishFileName: string | null
  setPublishFile: (fileId: string | null, fileName?: string | null) => void
}

export const useAppStore = create<AppStoreState>((set) => ({
  activeAppId: null,
  setActiveAppId: (id) => set({ activeAppId: id }),
  viewMode: 'embedded',
  setViewMode: (m) => set({ viewMode: m }),
  overlay: null,
  setOverlay: (o) => set({ overlay: o }),
  editingApp: null,
  setEditingApp: (app) => set({ editingApp: app }),
  publishFileId: null,
  publishFileName: null,
  setPublishFile: (fileId, fileName) =>
    set({ publishFileId: fileId, publishFileName: fileName ?? null }),
}))
