/**
 * Sound effects using the Web Audio API — no external audio files needed.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.15,
) {
  try {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch {
    // Audio not available — silently ignore
  }
}

/** Short ascending "bloop" for sending a message */
export function playSendSound() {
  playTone(440, 0.08, 'sine', 0.1)
  setTimeout(() => playTone(587, 0.08, 'sine', 0.1), 60)
}

/** Soft descending tone for receiving a message */
export function playReceiveSound() {
  playTone(523, 0.1, 'sine', 0.12)
  setTimeout(() => playTone(440, 0.12, 'sine', 0.08), 80)
}

/** Quick click for UI interactions */
export function playClickSound() {
  playTone(800, 0.03, 'square', 0.05)
}
