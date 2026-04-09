import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
  UID,
} from 'agora-rtc-sdk-ng'
import { useCallback, useEffect, useRef, useState } from 'react'
import { RTC_APP_ID, RTC_ENABLED } from '@/lib/rtc.config'

export interface VoiceChannelUser {
  uid: UID
  isLocal: boolean
  hasAudio: boolean
  hasVideo: boolean
  isScreenShare?: boolean
}

export interface UseVoiceChannelOptions {
  /** Enable microphone on join */
  enableAudio?: boolean
  /** Enable camera on join (default: false for voice channels) */
  enableVideo?: boolean
  /** Auto subscribe to remote tracks */
  autoSubscribe?: boolean
}

export function useVoiceChannel(options: UseVoiceChannelOptions = {}) {
  const { enableAudio = true, enableVideo = false, autoSubscribe = true } = options

  const clientRef = useRef<IAgoraRTCClient | null>(null)
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null)
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null)
  const screenShareTrackRef = useRef<ICameraVideoTrack | null>(null)

  const [joined, setJoined] = useState(false)
  const [channelId, setChannelId] = useState<string | null>(null)
  const [users, setUsers] = useState<VoiceChannelUser[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([])

  const uidRef = useRef<UID>(0)

  /**
   * Enumerate audio/speaker devices
   */
  const enumerateDevices = useCallback(async () => {
    const devices = await AgoraRTC.getMicrophones()
    const speakers = await AgoraRTC.getPlaybackDevices()
    setAudioDevices(devices)
    setSpeakerDevices(speakers)
  }, [])

  /**
   * Join a voice channel
   */
  const join = useCallback(
    async (channel: string, token?: string | null, userId?: string) => {
      if (!RTC_ENABLED) {
        setError('Agora App ID not configured')
        return
      }

      try {
        setError(null)
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
        clientRef.current = client

        // Generate numeric uid from userId string
        const uid = userId
          ? Math.abs([...userId].reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0))
          : 0

        uidRef.current = uid

        await client.join(RTC_APP_ID, channel, token ?? null, uid)

        // Create and publish local audio track
        if (enableAudio) {
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
          localAudioTrackRef.current = audioTrack
          await client.publish(audioTrack)
        }

        // Optionally create and publish local video track
        if (enableVideo) {
          const videoTrack = await AgoraRTC.createCameraVideoTrack()
          localVideoTrackRef.current = videoTrack
          await client.publish(videoTrack)
        }

        setJoined(true)
        setChannelId(channel)

        // Handle remote users
        client.on('user-published', async (remoteUser, mediaType) => {
          if (autoSubscribe) {
            await client.subscribe(remoteUser, mediaType)
          }

          if (mediaType === 'audio') {
            remoteUser.audioTrack?.play()
          }

          setUsers((prev) => {
            const existing = prev.find((u) => u.uid === remoteUser.uid)
            if (existing) return prev
            return [
              ...prev,
              {
                uid: remoteUser.uid,
                isLocal: false,
                hasAudio: !!remoteUser.audioTrack,
                hasVideo: !!remoteUser.videoTrack,
              },
            ]
          })
        })

        client.on('user-unpublished', async (remoteUser, mediaType) => {
          if (mediaType === 'audio') {
            remoteUser.audioTrack?.stop()
          }

          setUsers((prev) =>
            prev.map((u) =>
              u.uid === remoteUser.uid
                ? {
                    ...u,
                    hasAudio: mediaType === 'audio' ? false : u.hasAudio,
                    hasVideo: mediaType === 'video' ? false : u.hasVideo,
                  }
                : u,
            ),
          )
        })

        client.on('user-left', (_remoteUser, reason) => {
          setUsers((prev) => prev.filter((u) => u.uid !== _remoteUser.uid))
        })

        client.on('volume-indicator', (volumes) => {
          // Can be used for speaking indicator
        })

        await enumerateDevices()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to join voice channel'
        setError(message)
        throw err
      }
    },
    [enableAudio, enableVideo, autoSubscribe, enumerateDevices],
  )

  /**
   * Leave the voice channel
   */
  const leave = useCallback(async () => {
    try {
      // Stop and close local tracks
      localAudioTrackRef.current?.close()
      localVideoTrackRef.current?.close()
      screenShareTrackRef.current?.close()

      // Leave the channel
      if (clientRef.current) {
        await clientRef.current.leave()
        clientRef.current.removeAllListeners()
        clientRef.current = null
      }

      localAudioTrackRef.current = null
      localVideoTrackRef.current = null
      screenShareTrackRef.current = null

      setJoined(false)
      setChannelId(null)
      setUsers([])
      setIsMuted(false)
      setIsScreenSharing(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to leave voice channel'
      setError(message)
    }
  }, [])

  /**
   * Toggle mute/unmute microphone
   */
  const toggleMute = useCallback(() => {
    const track = localAudioTrackRef.current
    if (!track) return

    const newMuted = !track.enabled
    track.enabled = !newMuted
    setIsMuted(newMuted)
  }, [])

  /**
   * Switch audio input device
   */
  const switchAudioDevice = useCallback(async (deviceId: string) => {
    const track = localAudioTrackRef.current
    if (!track) return

    await track.setDevice(deviceId)
  }, [])

  /**
   * Switch speaker device
   */
  const switchSpeaker = useCallback(async (deviceId: string) => {
    const track = localAudioTrackRef.current
    if (!track) return

    await track.setPlaybackDevice(deviceId)
  }, [])

  /**
   * Start screen sharing
   */
  const startScreenShare = useCallback(async () => {
    const client = clientRef.current
    if (!client || !joined) return

    try {
      const screenTrack = await AgoraRTC.createScreenVideoTrack({
        optimizationMode: 'detail',
      })

      // screenTrack can be either a single video track or an array [videoTrack, audioTrack]
      if (Array.isArray(screenTrack)) {
        await client.publish(screenTrack)
        screenShareTrackRef.current = screenTrack[0] as ICameraVideoTrack
      } else {
        await client.publish(screenTrack)
        screenShareTrackRef.current = screenTrack as ICameraVideoTrack
      }

      setIsScreenSharing(true)

      // Handle screen share stop
      screenShareTrackRef.current.on('track-ended', () => {
        stopScreenShare()
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start screen sharing'
      setError(message)
      throw err
    }
  }, [joined])

  /**
   * Stop screen sharing
   */
  const stopScreenShare = useCallback(async () => {
    const client = clientRef.current
    const track = screenShareTrackRef.current
    if (!client || !track) return

    await client.unpublish(track)
    track.close()
    screenShareTrackRef.current = null
    setIsScreenSharing(false)
  }, [])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      leave()
    }
  }, [leave])

  return {
    joined,
    channelId,
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
    switchSpeaker,
    startScreenShare,
    stopScreenShare,
    enumerateDevices,
  }
}
