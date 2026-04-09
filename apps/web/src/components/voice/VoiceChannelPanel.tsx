import { Button } from '@shadowob/ui'
import { Mic, MicOff, Monitor, MonitorOff, PhoneOff, Settings2, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { useVoiceChannel } from '@/hooks/useVoiceChannel'

interface VoiceChannelPanelProps {
  channelId: string
  channelName: string
  token?: string
  userId?: string
  onLeave?: () => void
}

export function VoiceChannelPanel({
  channelId,
  channelName,
  token,
  userId,
  onLeave,
}: VoiceChannelPanelProps) {
  const {
    joined,
    users,
    isMuted,
    isScreenSharing,
    error,
    audioDevices,
    speakerDevices,
    join,
    leave,
    toggleMute,
    switchAudioDevice,
    startScreenShare,
    stopScreenShare,
  } = useVoiceChannel({ enableAudio: true, enableVideo: false })

  const [showSettings, setShowSettings] = useState(false)
  const [selectedMic, setSelectedMic] = useState('')
  const [selectedSpeaker, setSelectedSpeaker] = useState('')

  const handleJoin = async () => {
    try {
      await join(channelId, token, userId)
    } catch {
      // Error handled in hook
    }
  }

  const handleLeave = async () => {
    await leave()
    onLeave?.()
  }

  const handleMicChange = async (deviceId: string) => {
    setSelectedMic(deviceId)
    await switchAudioDevice(deviceId)
  }

  if (!joined) {
    return (
      <div className="flex items-center gap-2 p-2">
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{channelName}</span>
        <Button variant="ghost" size="sm" onClick={handleJoin} className="ml-auto">
          加入
        </Button>
      </div>
    )
  }

  return (
    <div className="border-t bg-muted/30">
      {/* Error */}
      {error && <div className="px-3 py-2 text-xs text-destructive">{error}</div>}

      {/* Channel name */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Volume2 className="h-4 w-4 text-green-500" />
        <span className="text-sm font-medium">{channelName}</span>
      </div>

      {/* Users */}
      <div className="px-3 pb-2">
        <div className="text-xs text-muted-foreground mb-1">{users.length + 1} 人在频道</div>
        <div className="space-y-1">
          {/* Local user */}
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>你 {isMuted && '(静音)'}</span>
          </div>
          {/* Remote users */}
          {users.map((user) => (
            <div key={user.uid} className="flex items-center gap-2 text-sm">
              <div
                className={`h-2 w-2 rounded-full ${user.hasAudio ? 'bg-green-500' : 'bg-muted'}`}
              />
              <span>
                用户 {user.uid} {!user.hasAudio && '(静音)'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 px-3 pb-3">
        <Button
          variant={isMuted ? 'danger' : 'secondary'}
          size="sm"
          onClick={toggleMute}
          className="h-8 w-8 p-0"
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        <Button
          variant={isScreenSharing ? 'primary' : 'secondary'}
          size="sm"
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          className="h-8 w-8 p-0"
        >
          {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="h-8 w-8 p-0"
        >
          <Settings2 className="h-4 w-4" />
        </Button>

        <Button variant="danger" size="sm" onClick={handleLeave} className="ml-auto h-8">
          <PhoneOff className="mr-1 h-3 w-3" />
          离开
        </Button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="border-t px-3 py-2 space-y-2">
          <div>
            <label className="text-xs text-muted-foreground">麦克风</label>
            <select
              className="w-full mt-1 text-sm bg-background border rounded px-2 py-1"
              value={selectedMic}
              onChange={(e) => handleMicChange(e.target.value)}
            >
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `麦克风 ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">扬声器</label>
            <select
              className="w-full mt-1 text-sm bg-background border rounded px-2 py-1"
              value={selectedSpeaker}
              onChange={(e) => setSelectedSpeaker(e.target.value)}
            >
              {speakerDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `扬声器 ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
