import type { WorkspaceNode } from '../../../stores/workspace.store'

export function VideoRenderer({ node }: { node: WorkspaceNode }) {
  if (!node.contentRef) {
    return <div className="text-text-muted text-sm">视频暂无内容引用</div>
  }
  return (
    <video src={node.contentRef} controls className="max-w-full max-h-full rounded-lg shadow-lg">
      <track kind="captions" />
    </video>
  )
}
