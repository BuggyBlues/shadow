import { useParams } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ChannelSidebar } from '../components/channel/channel-sidebar'
import { ChatArea } from '../components/chat/chat-area'
import { MemberList } from '../components/member/member-list'
import { useChatStore } from '../stores/chat.store'
import { useUIStore } from '../stores/ui.store'

export function ServerPage() {
  const { serverId } = useParams({ strict: false })
  const setActiveServer = useChatStore((s) => s.setActiveServer)
  const { mobileView, setMobileView } = useUIStore()

  useEffect(() => {
    if (serverId) {
      setActiveServer(serverId)
      setMobileView('channels')
    }
  }, [serverId, setActiveServer, setMobileView])

  if (!serverId) return null

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      {/* Channel sidebar: always on md+, conditionally on mobile */}
      <div
        className={`${
          mobileView === 'channels' ? 'flex' : 'hidden'
        } md:flex flex-col w-full md:w-auto`}
      >
        <ChannelSidebar serverId={serverId} />
      </div>

      {/* Chat area: always on md+, conditionally on mobile */}
      <div
        className={`${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 flex-col`}
      >
        <ChatArea />
      </div>

      {/* Member list: hidden on mobile, shown on lg+ */}
      <MemberList />
    </div>
  )
}
