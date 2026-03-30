import { memo } from 'react'

interface BuddyIconProps {
  size?: number
  className?: string
}

/**
 * Animated Buddy icon with pulsing gradient effect
 * Creates a playful, magical appearance for Buddy-related buttons
 */
export const BuddyIcon = memo(function BuddyIcon({ size = 16, className = '' }: BuddyIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Gradient definition */}
      <defs>
        <linearGradient id="buddy-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B9D">
            <animate
              attributeName="stop-color"
              values="#FF6B9D;#C44DFF;#6B8CFF;#FF6B9D"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="50%" stopColor="#C44DFF">
            <animate
              attributeName="stop-color"
              values="#C44DFF;#6B8CFF;#FF6B9D;#C44DFF"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#6B8CFF">
            <animate
              attributeName="stop-color"
              values="#6B8CFF;#FF6B9D;#C44DFF;#6B8CFF"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
        {/* Glow filter */}
        <filter id="buddy-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main cat face */}
      <g filter="url(#buddy-glow)">
        {/* Face circle */}
        <circle
          cx="12"
          cy="13"
          r="7"
          fill="url(#buddy-gradient)"
          opacity="0.9"
        >
          <animate
            attributeName="opacity"
            values="0.9;1;0.9"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Left ear */}
        <path
          d="M5 10 L7 5 L9 10 Z"
          fill="url(#buddy-gradient)"
        >
          <animate
            attributeName="opacity"
            values="1;0.85;1"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>

        {/* Right ear */}
        <path
          d="M15 10 L17 5 L19 10 Z"
          fill="url(#buddy-gradient)"
        >
          <animate
            attributeName="opacity"
            values="1;0.85;1"
            dur="2s"
            repeatCount="indefinite"
            begin="0.5s"
          />
        </path>

        {/* Eyes */}
        <ellipse cx="9" cy="12" rx="1.5" ry="2" fill="white" opacity="0.95">
          <animate
            attributeName="ry"
            values="2;0.3;2"
            dur="4s"
            repeatCount="indefinite"
            begin="0s"
          />
        </ellipse>
        <ellipse cx="15" cy="12" rx="1.5" ry="2" fill="white" opacity="0.95">
          <animate
            attributeName="ry"
            values="2;0.3;2"
            dur="4s"
            repeatCount="indefinite"
            begin="0s"
          />
        </ellipse>

        {/* Pupils */}
        <circle cx="9" cy="12.5" r="0.8" fill="#1a1a2e">
          <animate
            attributeName="cy"
            values="12.5;11.5;12.5;13.5;12.5"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="15" cy="12.5" r="0.8" fill="#1a1a2e">
          <animate
            attributeName="cy"
            values="12.5;11.5;12.5;13.5;12.5"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Nose */}
        <ellipse cx="12" cy="15" rx="1" ry="0.6" fill="#FFB6C1" />

        {/* Whiskers */}
        <g stroke="white" strokeWidth="0.5" opacity="0.6">
          <line x1="5" y1="14" x2="8" y2="14.5" />
          <line x1="5" y1="16" x2="8" y2="15.5" />
          <line x1="16" y1="14.5" x2="19" y2="14" />
          <line x1="16" y1="15.5" x2="19" y2="16" />
        </g>
      </g>

      {/* Sparkles */}
      <g fill="white" opacity="0.8">
        <circle cx="4" cy="6" r="1">
          <animate
            attributeName="opacity"
            values="0;0.8;0"
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values="0.5;1;0.5"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="20" cy="8" r="1">
          <animate
            attributeName="opacity"
            values="0;0.8;0"
            dur="1.5s"
            repeatCount="indefinite"
            begin="0.5s"
          />
          <animate
            attributeName="r"
            values="0.5;1;0.5"
            dur="1.5s"
            repeatCount="indefinite"
            begin="0.5s"
          />
        </circle>
        <circle cx="18" cy="3" r="0.8">
          <animate
            attributeName="opacity"
            values="0;0.8;0"
            dur="1.5s"
            repeatCount="indefinite"
            begin="1s"
          />
          <animate
            attributeName="r"
            values="0.3;0.8;0.3"
            dur="1.5s"
            repeatCount="indefinite"
            begin="1s"
          />
        </circle>
      </g>
    </svg>
  )
})