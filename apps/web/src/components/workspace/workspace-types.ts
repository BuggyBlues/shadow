import type { WorkspaceNode } from '../../stores/workspace.store'

/* ─── Visible row for virtual tree ─── */

export interface VisibleRow {
  id: string
  node: WorkspaceNode
  depth: number
}

/* ─── Context menu target ─── */

export interface ContextMenuState {
  x: number
  y: number
  node: WorkspaceNode | null
}

/* ─── Workspace stats ─── */

export interface WorkspaceStats {
  folderCount: number
  fileCount: number
  totalCount: number
}

/* ─── File category for workbench routing ─── */

export type FileCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'markdown'
  | 'code'
  | 'text'
  | 'spreadsheet'
  | 'archive'
  | 'unknown'

/* ─── Create / Rename dialog mode ─── */

export type DialogMode =
  | { kind: 'create-folder'; parentId: string | null }
  | { kind: 'create-file'; parentId: string | null }
  | { kind: 'rename'; nodeId: string; nodeKind: 'dir' | 'file'; currentName: string }
  | null

/* ─── Drag & drop position ─── */

export type DropPosition = 'inside' | 'before' | 'after'

export interface DragOverState {
  nodeId: string
  position: DropPosition
}
