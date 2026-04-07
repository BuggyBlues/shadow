import { Button, cn } from '@shadowob/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../../lib/api'

export function NotificationSettings() {
  const queryClient = useQueryClient()

  const { data: pref } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () =>
      fetchApi<{
        strategy: 'all' | 'mention_only' | 'none'
        mutedServerIds: string[]
        mutedChannelIds: string[]
      }>('/api/notifications/preferences'),
  })

  const { data: servers = [] } = useQuery({
    queryKey: ['servers'],
    queryFn: () =>
      fetchApi<
        Array<{ server: { id: string; name: string; slug: string | null; iconUrl: string | null } }>
      >('/api/servers'),
  })

  const updatePref = useMutation({
    mutationFn: (
      payload: Partial<{
        strategy: 'all' | 'mention_only' | 'none'
        mutedServerIds: string[]
        mutedChannelIds: string[]
      }>,
    ) =>
      fetchApi('/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
      queryClient.invalidateQueries({ queryKey: ['notification-scoped-unread'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const mutedServers = servers.filter((s) => (pref?.mutedServerIds ?? []).includes(s.server.id))

  return (
    <>
      <h2 className="text-2xl font-black text-text-primary mb-2">通知设置</h2>
      <p className="text-text-muted text-sm mb-6">管理通知策略、频道/服务器静音。</p>

      <div className="bg-white/[0.03] backdrop-blur-[32px] rounded-[24px] border border-white/[0.08] p-6 mb-6">
        <label className="block text-[11px] font-black uppercase text-text-muted tracking-[0.2em] ml-1 mb-4">
          通知策略
        </label>
        <div className="space-y-2">
          {[
            {
              value: 'all' as const,
              title: '全部通知',
              desc: '接收提及、回复与系统通知。',
            },
            {
              value: 'mention_only' as const,
              title: '仅提及',
              desc: '只接收@提及和系统通知。',
            },
            {
              value: 'none' as const,
              title: '仅系统',
              desc: '屏蔽消息类通知，仅保留系统通知。',
            },
          ].map((item) => {
            const checked = (pref?.strategy ?? 'all') === item.value
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => updatePref.mutate({ strategy: item.value })}
                className={cn(
                  'w-full text-left p-3 rounded-[16px] border-2 transition-all duration-300',
                  checked
                    ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(0,198,209,0.1)]'
                    : 'border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02]',
                )}
              >
                <p
                  className={cn(
                    'text-sm font-bold',
                    checked ? 'text-primary' : 'text-text-primary',
                  )}
                >
                  {item.title}
                </p>
                <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-white/[0.03] backdrop-blur-[32px] rounded-[24px] border border-white/[0.08] p-6">
        <h3 className="text-lg font-black text-text-primary mb-3">已静音服务器</h3>
        {mutedServers.length === 0 ? (
          <p className="text-sm text-text-muted">暂无已静音服务器</p>
        ) : (
          <div className="space-y-2">
            {mutedServers.map((s) => (
              <div
                key={s.server.id}
                className="flex items-center justify-between rounded-lg bg-bg-tertiary px-3 py-2"
              >
                <span className="text-sm text-text-primary truncate">{s.server.name}</span>
                <Button
                  variant="ghost"
                  size="xs"
                  type="button"
                  onClick={() =>
                    updatePref.mutate({
                      mutedServerIds: (pref?.mutedServerIds ?? []).filter(
                        (id) => id !== s.server.id,
                      ),
                    })
                  }
                  className="text-xs normal-case tracking-normal"
                >
                  取消静音
                </Button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-text-muted mt-4">频道静音可在频道列表右键菜单中设置。</p>
      </div>
    </>
  )
}
