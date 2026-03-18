import { useCallback, useRef, useState } from 'react'

type SpeechResultEvent = {
  results?: Array<{ transcript?: string }>
  isFinal?: boolean
}

type SpeechModuleLike = {
  start: (options?: Record<string, unknown>) => void
  stop: () => void
  requestPermissionsAsync: () => Promise<{ granted: boolean }>
}

let speechModule: SpeechModuleLike | null = null
let useSpeechRecognitionEventSafe: (
  eventName: string,
  listener: (event: SpeechResultEvent) => void,
) => void = () => {}

try {
  const speech = require('expo-speech-recognition') as {
    ExpoSpeechRecognitionModule?: SpeechModuleLike
    useSpeechRecognitionEvent?: (
      eventName: string,
      listener: (event: SpeechResultEvent) => void,
    ) => void
  }
  speechModule = speech.ExpoSpeechRecognitionModule ?? null
  useSpeechRecognitionEventSafe = speech.useSpeechRecognitionEvent ?? (() => {})
} catch {
  speechModule = null
}

interface UseChatVoiceInputOptions {
  speechLang: string
  onPermissionDenied: () => void
  onUnavailable: () => void
  onCommitTranscript: (transcript: string) => void
}

export function useChatVoiceInput({
  speechLang,
  onPermissionDenied,
  onUnavailable,
  onCommitTranscript,
}: UseChatVoiceInputOptions) {
  const [isRecording, setIsRecording] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const lastCommittedTranscript = useRef('')

  useSpeechRecognitionEventSafe('result', (event) => {
    const transcript = event.results?.[0]?.transcript
    if (!transcript) return

    if (event.isFinal) {
      if (transcript !== lastCommittedTranscript.current) {
        lastCommittedTranscript.current = transcript
        onCommitTranscript(transcript)
      }
      setVoiceTranscript('')
    } else {
      setVoiceTranscript(transcript)
    }
  })

  useSpeechRecognitionEventSafe('end', () => {
    setIsRecording(false)
    lastCommittedTranscript.current = ''
    setVoiceTranscript('')
  })

  useSpeechRecognitionEventSafe('error', () => {
    setIsRecording(false)
    lastCommittedTranscript.current = ''
    setVoiceTranscript('')
  })

  const toggleVoiceInput = useCallback(async () => {
    if (!speechModule) {
      onUnavailable()
      return
    }

    if (isRecording) {
      speechModule.stop()
      return
    }

    const { granted } = await speechModule.requestPermissionsAsync()
    if (!granted) {
      onPermissionDenied()
      return
    }

    setVoiceTranscript('')
    lastCommittedTranscript.current = ''
    speechModule.start({ lang: speechLang, interimResults: true })
    setIsRecording(true)
  }, [isRecording, onPermissionDenied, onUnavailable, speechLang])

  return {
    isRecording,
    voiceTranscript,
    toggleVoiceInput,
    speechSupported: !!speechModule,
  }
}
