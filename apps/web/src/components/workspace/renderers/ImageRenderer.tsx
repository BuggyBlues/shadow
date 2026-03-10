import type { WorkspaceNode } from '../../../stores/workspace.store'

export function ImageRenderer({ node }: { node: WorkspaceNode }) {
  if (!node.contentRef) {
    return <div className="text-text-muted text-sm">图片暂无内容引用</div>
  }
  return (
    <img
      src={node.contentRef}
      alt={node.name}
      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
      loading="lazy"
    />
  )
}
