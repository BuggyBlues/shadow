/* SVG Gradient Definitions — must be rendered once on pages using cat SVGs */
export function CatSvgDefs() {
  return (
    <svg width="0" height="0" className="hidden" aria-hidden="true">
      <defs>
        <radialGradient id="catBody" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#2A2A4E" />
          <stop offset="50%" stopColor="#1A1A2E" />
          <stop offset="100%" stopColor="#0F0F1A" />
        </radialGradient>
        <radialGradient id="eyeYellow" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffcc" />
          <stop offset="35%" stopColor="#FFE66D" />
          <stop offset="100%" stopColor="#b3a100" />
        </radialGradient>
        <radialGradient id="eyeCyan" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ccffff" />
          <stop offset="35%" stopColor="#4ECDC4" />
          <stop offset="100%" stopColor="#0099aa" />
        </radialGradient>
        <filter id="glowYellow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glowCyan" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glowRed" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  )
}

/* Night Watch Cat - The Hero mascot */
export function NightWatchCatSvg({ className = 'w-full h-full' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} drop-shadow-2xl`}
      role="img"
      aria-label="Black Cat Mascot"
    >
      <title>Night Watch Cat</title>
      {/* Ears */}
      <path
        d="M 22,35 Q 12,10 32,15 Q 38,15 42,32"
        fill="url(#catBody)"
        stroke="#0F0F1A"
        strokeWidth="2"
      />
      <path
        d="M 78,35 Q 88,10 68,15 Q 62,15 58,32"
        fill="url(#catBody)"
        stroke="#0F0F1A"
        strokeWidth="2"
      />

      {/* Head */}
      <ellipse
        cx="50"
        cy="50"
        rx="38"
        ry="30"
        fill="url(#catBody)"
        stroke="#0F0F1A"
        strokeWidth="2"
      />

      {/* Eyes - Heterochromia (Left: Yellow, Right: Cyan) */}
      <circle
        cx="34"
        cy="46"
        r="8"
        fill="url(#eyeYellow)"
        filter="url(#glowYellow)"
        className="animate-pulse"
      />
      <circle cx="34" cy="46" r="3" fill="#000" />
      <circle cx="32" cy="43" r="1.5" fill="#fff" opacity="0.8" />

      <circle
        cx="66"
        cy="46"
        r="8"
        fill="url(#eyeCyan)"
        filter="url(#glowCyan)"
        className="animate-pulse"
      />
      <circle cx="66" cy="46" r="3" fill="#000" />
      <circle cx="64" cy="43" r="1.5" fill="#fff" opacity="0.8" />

      {/* Nose */}
      <path d="M 48,56 L 52,56 L 50,59 Z" fill="#E94560" filter="url(#glowRed)" />

      {/* Mouth */}
      <path
        d="M 44,64 Q 50,68 56,64"
        fill="none"
        stroke="#4ECDC4"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Night Watch Cape/Collar hint */}
      <path d="M 20,70 Q 50,85 80,70 L 85,90 Q 50,100 15,90 Z" fill="#E94560" opacity="0.8" />
    </svg>
  )
}
