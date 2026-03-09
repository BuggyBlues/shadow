import { create } from 'zustand'

type MobileView = 'servers' | 'channels' | 'chat'

interface UIState {
  /** Current mobile navigation view */
  mobileView: MobileView
  /** Whether the mobile server sidebar overlay is open */
  mobileServerSidebarOpen: boolean
  /** Whether the mobile member list overlay is open */
  mobileMemberListOpen: boolean
  /** Whether the file preview panel is open (hides member list on desktop) */
  filePreviewOpen: boolean

  setMobileView: (view: MobileView) => void
  openMobileServerSidebar: () => void
  closeMobileServerSidebar: () => void
  toggleMobileMemberList: () => void
  closeMobileMemberList: () => void
  setFilePreviewOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  mobileView: 'servers',
  mobileServerSidebarOpen: false,
  mobileMemberListOpen: false,
  filePreviewOpen: false,

  setMobileView: (view) => set({ mobileView: view, mobileMemberListOpen: false }),
  openMobileServerSidebar: () => set({ mobileServerSidebarOpen: true }),
  closeMobileServerSidebar: () => set({ mobileServerSidebarOpen: false }),
  toggleMobileMemberList: () => set((s) => ({ mobileMemberListOpen: !s.mobileMemberListOpen })),
  closeMobileMemberList: () => set({ mobileMemberListOpen: false }),
  setFilePreviewOpen: (open) => set({ filePreviewOpen: open }),
}))
