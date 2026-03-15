import { create } from 'zustand'

export interface WorkspaceNode {
  id: string
  workspaceId: string
  parentId: string | null
  kind: 'dir' | 'file'
  name: string
  path: string
  pos: number
  ext: string | null
  mime: string | null
  sizeBytes: number | null
  contentRef: string | null
  previewUrl: string | null
  flags: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  children?: WorkspaceNode[]
}

export interface WorkspaceInfo {
  id: string
  serverId: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface ClipboardPayload {
  mode: 'copy' | 'cut'
  sourceWorkspaceId: string
  nodeIds: string[]
  updatedAt: number
}

interface WorkspaceState {
  workspace: WorkspaceInfo | null
  setWorkspace: (ws: WorkspaceInfo | null) => void

  tree: WorkspaceNode[]
  setTree: (nodes: WorkspaceNode[]) => void

  childrenCache: Map<string, WorkspaceNode[]>
  setChildren: (parentId: string | null, children: WorkspaceNode[]) => void
  clearChildrenCache: () => void

  expandedIds: Set<string>
  toggleExpanded: (id: string) => void
  setExpanded: (id: string, expanded: boolean) => void

  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void

  activeFileId: string | null
  setActiveFileId: (id: string | null) => void

  renamingNodeId: string | null
  setRenamingNodeId: (id: string | null) => void

  loadingFolderIds: Set<string>
  setFolderLoading: (id: string, loading: boolean) => void

  clipboard: ClipboardPayload | null
  setClipboard: (payload: ClipboardPayload | null) => void

  searchQuery: string
  setSearchQuery: (query: string) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspace: null,
  setWorkspace: (ws) => set({ workspace: ws }),

  tree: [],
  setTree: (nodes) => set({ tree: nodes }),

  childrenCache: new Map(),
  setChildren: (parentId, children) =>
    set((state) => {
      const cache = new Map(state.childrenCache)
      cache.set(parentId ?? '__ROOT__', children)
      return { childrenCache: cache }
    }),
  clearChildrenCache: () => set({ childrenCache: new Map() }),

  expandedIds: new Set(),
  toggleExpanded: (id) =>
    set((state) => {
      const next = new Set(state.expandedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { expandedIds: next }
    }),
  setExpanded: (id, expanded) =>
    set((state) => {
      const next = new Set(state.expandedIds)
      if (expanded) next.add(id)
      else next.delete(id)
      return { expandedIds: next }
    }),

  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  activeFileId: null,
  setActiveFileId: (id) => set({ activeFileId: id }),

  renamingNodeId: null,
  setRenamingNodeId: (id) => set({ renamingNodeId: id }),

  loadingFolderIds: new Set(),
  setFolderLoading: (id, loading) =>
    set((state) => {
      const next = new Set(state.loadingFolderIds)
      if (loading) next.add(id)
      else next.delete(id)
      return { loadingFolderIds: next }
    }),

  clipboard: null,
  setClipboard: (payload) => set({ clipboard: payload }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
