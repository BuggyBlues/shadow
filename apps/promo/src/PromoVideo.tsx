import type { CSSProperties } from 'react'
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { type PromoSlide, slideDuration, slides } from './slides'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

function fade(frame: number) {
  return Math.min(
    interpolate(frame, [0, 18], [0, 1], clamp),
    interpolate(frame, [slideDuration - 18, slideDuration], [1, 0], clamp),
  )
}

function BrandMark() {
  return (
    <div style={styles.brand}>
      <Img src={staticFile('brand/Logo.svg')} style={styles.logo} />
      <div>
        <div style={styles.brandName}>Shadow / 虾豆</div>
        <div style={styles.brandLine}>Cloud OS for AI Buddies</div>
      </div>
    </div>
  )
}

function Slide({ slide, index }: { slide: PromoSlide; index: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const opacity = fade(frame)
  const imageIn = spring({
    fps,
    frame,
    config: { damping: 24, mass: 1, stiffness: 90 },
  })
  const copyIn = spring({
    fps,
    frame: frame - 10,
    config: { damping: 22, mass: 0.85, stiffness: 110 },
  })

  const copyPosition =
    slide.align === 'center'
      ? styles.copyCenter
      : slide.align === 'right'
        ? styles.copyRight
        : styles.copyLeft

  return (
    <AbsoluteFill style={{ ...styles.slide, opacity }}>
      <Img
        src={staticFile(slide.asset)}
        style={{
          ...styles.material,
          transform: `scale(${interpolate(imageIn, [0, 1], [1.06, 1], clamp)})`,
        }}
      />
      <div style={styles.vignette} />
      <BrandMark />
      <div
        style={{
          ...styles.copy,
          ...copyPosition,
          transform: `translateY(${interpolate(copyIn, [0, 1], [36, 0], clamp)}px)`,
        }}
      >
        <div style={{ ...styles.eyebrow, color: slide.tint }}>{slide.eyebrow}</div>
        <h1 style={styles.title}>{slide.title}</h1>
        <p style={styles.body}>{slide.body}</p>
      </div>
      <div style={styles.progressShell}>
        {slides.map((_, dotIndex) => (
          <div
            key={dotIndex}
            style={{
              ...styles.progressDot,
              background: dotIndex === index ? slide.tint : 'rgba(255,255,255,0.36)',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  )
}

export function PromoVideo() {
  return (
    <AbsoluteFill style={styles.canvas}>
      {slides.map((slide, index) => (
        <Sequence durationInFrames={slideDuration} from={index * slideDuration} key={slide.asset}>
          <Slide index={index} slide={slide} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}

const styles = {
  canvas: {
    background: '#111827',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  slide: {
    background: '#111827',
    overflow: 'hidden',
  },
  material: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  vignette: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(90deg, rgba(17,24,39,0.78) 0%, rgba(17,24,39,0.18) 48%, rgba(17,24,39,0.72) 100%)',
  },
  brand: {
    position: 'absolute',
    top: 58,
    left: 72,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    color: '#ffffff',
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 8,
  },
  brandName: {
    fontSize: 25,
    fontWeight: 900,
  },
  brandLine: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: 750,
    color: 'rgba(255,255,255,0.72)',
  },
  copy: {
    position: 'absolute',
    width: 720,
    color: '#ffffff',
  },
  copyLeft: {
    left: 112,
    top: 270,
    textAlign: 'left',
  },
  copyRight: {
    right: 112,
    top: 270,
    textAlign: 'right',
  },
  copyCenter: {
    left: 360,
    right: 360,
    top: 290,
    width: 1200,
    textAlign: 'center',
  },
  eyebrow: {
    fontSize: 28,
    fontWeight: 950,
    marginBottom: 24,
  },
  title: {
    fontSize: 76,
    lineHeight: 1.04,
    letterSpacing: 0,
    fontWeight: 950,
    margin: 0,
    textShadow: '0 18px 60px rgba(0,0,0,0.38)',
  },
  body: {
    fontSize: 29,
    lineHeight: 1.4,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 30,
    textShadow: '0 10px 40px rgba(0,0,0,0.36)',
  },
  progressShell: {
    position: 'absolute',
    left: 112,
    bottom: 72,
    display: 'flex',
    gap: 12,
  },
  progressDot: {
    width: 54,
    height: 7,
    borderRadius: 7,
  },
} satisfies Record<string, CSSProperties>
