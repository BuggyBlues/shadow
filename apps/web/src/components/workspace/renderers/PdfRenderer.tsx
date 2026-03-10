import type { WorkspaceNode } from '../../../stores/workspace.store'

export function PdfRenderer({ node }: { node: WorkspaceNode }) {
  if (!node.contentRef) {
    return <div className="text-text-muted text-sm">PDF 暂无内容引用</div>
  }
  return (
    <iframe
      src={node.contentRef}
      title={node.name}
      className="w-full h-full rounded-lg border border-border-subtle"
    />
  )
}
