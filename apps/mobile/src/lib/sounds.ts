import type { Sound } from 'expo-av'
import { Audio } from 'expo-av'

let sendSound: Sound | null = null
let receiveSound: Sound | null = null

const SEND_FREQUENCY = 800 // Hz
const RECEIVE_FREQUENCY = 600 // Hz

async function ensureSounds() {
  if (!sendSound) {
    // Create a short "pop" sound for sending
    const { sound } = await Audio.Sound.createAsync(
      // Use a small embedded base64 WAV (tiny pop sound)
      { uri: generateToneDataUri(SEND_FREQUENCY, 0.08) },
      { volume: 0.3 },
    )
    sendSound = sound
  }
  if (!receiveSound) {
    const { sound } = await Audio.Sound.createAsync(
      { uri: generateToneDataUri(RECEIVE_FREQUENCY, 0.12) },
      { volume: 0.2 },
    )
    receiveSound = sound
  }
}

function generateToneDataUri(frequency: number, duration: number): string {
  const sampleRate = 22050
  const numSamples = Math.floor(sampleRate * duration)
  const samples = new Uint8Array(numSamples)

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    // Sine wave with quick fade-in/out envelope
    const envelope = Math.min(1, t * 50) * Math.max(0, 1 - t / duration)
    const value = Math.sin(2 * Math.PI * frequency * t) * envelope
    samples[i] = Math.floor((value + 1) * 127.5)
  }

  // Build minimal WAV
  const wavSize = 44 + numSamples
  const wav = new Uint8Array(wavSize)
  const view = new DataView(wav.buffer)

  // RIFF header
  wav.set([0x52, 0x49, 0x46, 0x46], 0) // "RIFF"
  view.setUint32(4, wavSize - 8, true)
  wav.set([0x57, 0x41, 0x56, 0x45], 8) // "WAVE"

  // fmt chunk
  wav.set([0x66, 0x6d, 0x74, 0x20], 12) // "fmt "
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true) // sample rate
  view.setUint32(28, sampleRate, true) // byte rate
  view.setUint16(32, 1, true) // block align
  view.setUint16(34, 8, true) // bits per sample

  // data chunk
  wav.set([0x64, 0x61, 0x74, 0x61], 36) // "data"
  view.setUint32(40, numSamples, true)
  wav.set(samples, 44)

  // Convert to base64 data URI
  let binary = ''
  for (let i = 0; i < wav.length; i++) {
    binary += String.fromCharCode(wav[i]!)
  }
  return `data:audio/wav;base64,${btoa(binary)}`
}

export async function playSendSound() {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: false })
    await ensureSounds()
    if (sendSound) {
      await sendSound.setPositionAsync(0)
      await sendSound.playAsync()
    }
  } catch {
    // Sound playback is non-critical
  }
}

export async function playReceiveSound() {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: false })
    await ensureSounds()
    if (receiveSound) {
      await receiveSound.setPositionAsync(0)
      await receiveSound.playAsync()
    }
  } catch {
    // Sound playback is non-critical
  }
}
