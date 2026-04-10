import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { useUIStore } from '../../stores/ui.store'

export function DynamicBackground() {
  const { backgroundImage, enableBackgroundMovement } = useUIStore()
  const prefersReducedMotion = useReducedMotion()

  // Disable movement if setting is off OR user prefers reduced motion
  const shouldMove = enableBackgroundMovement && !prefersReducedMotion

  // Mouse tracking values (raw pixels)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Spring physics for smooth movement with inertia
  const springConfig = { stiffness: 45, damping: 30, mass: 1 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  // Use transform for better performance (GPU accelerated)
  const translateX = useTransform(smoothX, (v) => `${v}px`)
  const translateY = useTransform(smoothY, (v) => `${v}px`)

  useEffect(() => {
    if (!shouldMove) {
      mouseX.set(0)
      mouseY.set(0)
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Range: -20 to +20 pixels movement
      const x = (e.clientX / window.innerWidth - 0.5) * -40
      const y = (e.clientY / window.innerHeight - 0.5) * -40

      mouseX.set(x)
      mouseY.set(y)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [shouldMove, mouseX, mouseY])

  if (!backgroundImage) return null

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-20">
      <motion.div
        className="absolute inset-[-40px] bg-cover bg-center"
        style={{
          backgroundImage: `url("${backgroundImage}")`,
          x: translateX,
          y: translateY,
          scale: 1.05,
          willChange: 'transform',
        }}
      />
      {/* Subtle overlay for contrast */}
      <div className="absolute inset-0 bg-black/10 dark:bg-black/20 transition-colors" />
    </div>
  )
}
