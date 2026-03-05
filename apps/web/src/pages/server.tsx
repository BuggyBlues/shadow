import { useParams } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ChannelSidebar } from '../components/channel/channel-sidebar'
import { ChatArea } from '../components/chat/chat-area'
import { MemberList } from '../components/member/member-list'
import { useChatStore } from '../stores/chat.store'

export function ServerPage() {
  const { serverId } = useParams({ strict: false })
  const setActiveServer = useChatStore((s) => s.setActiveServer)

  useEffect(() => {
    if (serverId) {
      setActiveServer(serverId)
    }
  }, [serverId, setActiveServer])

  if (!serverId) return null

  return (
    <>
      <ChannelSidebar serverId={serverId} />
      <ChatArea />
      <MemberList />
    </>
  )
}
