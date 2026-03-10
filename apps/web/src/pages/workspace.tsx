import { useNavigate, useParams } from '@tanstack/react-router'
import { WorkspacePage } from '../components/workspace/workspace-page'

export function WorkspacePageRoute() {
  const { serverId } = useParams({ strict: false }) as { serverId: string }
  const navigate = useNavigate()

  return (
    <WorkspacePage
      serverId={serverId}
      onClose={() => navigate({ to: '/app/servers/$serverId', params: { serverId } })}
    />
  )
}
