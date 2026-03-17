import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg'

export function CatSvgDefs() {
  return (
    <Defs>
      <RadialGradient id="catBody" cx="50%" cy="35%" r="70%">
        <Stop offset="0%" stopColor="#5a5a5e" />
        <Stop offset="50%" stopColor="#3d3d40" />
        <Stop offset="100%" stopColor="#18181a" />
      </RadialGradient>
      <RadialGradient id="eyeYellow" cx="35%" cy="35%" r="65%">
        <Stop offset="0%" stopColor="#ffffcc" />
        <Stop offset="35%" stopColor="#f8e71c" />
        <Stop offset="100%" stopColor="#b3a100" />
      </RadialGradient>
      <RadialGradient id="eyeCyan" cx="35%" cy="35%" r="65%">
        <Stop offset="0%" stopColor="#ccffff" />
        <Stop offset="35%" stopColor="#00f3ff" />
        <Stop offset="100%" stopColor="#0099aa" />
      </RadialGradient>
    </Defs>
  )
}

// Members: Cat Family
export function AgentCatSvg({
  width = 100,
  height = 100,
  style,
}: {
  width?: number
  height?: number
  style?: any
}) {
  return (
    <Svg viewBox="0 0 100 100" width={width} height={height} style={style}>
      <CatSvgDefs />
      {/* Mom Cat (Left) */}
      <Path
        d="M 15,35 Q 10,18 20,18 Q 25,18 30,30"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M 45,35 Q 50,18 40,18 Q 35,18 30,30"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Ellipse
        cx="30"
        cy="45"
        rx="20"
        ry="16"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2"
      />
      <Circle cx="22" cy="42" r="3.5" fill="url(#eyeYellow)" stroke="#1a1a1c" strokeWidth="1" />
      <Circle cx="38" cy="42" r="3.5" fill="url(#eyeYellow)" stroke="#1a1a1c" strokeWidth="1" />
      <Ellipse cx="30" cy="46" rx="2" ry="1.5" fill="#3a2a26" />

      {/* Dad Cat (Right) */}
      <Path
        d="M 55,30 Q 50,12 62,12 Q 68,12 72,25"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M 89,30 Q 94,12 82,12 Q 76,12 72,25"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Ellipse
        cx="72"
        cy="42"
        rx="22"
        ry="18"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2"
      />
      <Circle cx="64" cy="38" r="4" fill="url(#eyeCyan)" stroke="#1a1a1c" strokeWidth="1" />
      <Circle cx="80" cy="38" r="4" fill="url(#eyeCyan)" stroke="#1a1a1c" strokeWidth="1" />
      <Ellipse cx="72" cy="42" rx="2.5" ry="2" fill="#3a2a26" />

      {/* Kitten (Center Front) */}
      <Path
        d="M 40,75 Q 36,62 44,62 Q 48,62 52,70"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Path
        d="M 64,75 Q 68,62 60,62 Q 56,62 52,70"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Ellipse
        cx="52"
        cy="80"
        rx="14"
        ry="11"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="1.5"
      />
      <Circle cx="46" cy="78" r="2.5" fill="url(#eyeYellow)" stroke="#1a1a1c" strokeWidth="1" />
      <Circle cx="58" cy="78" r="2.5" fill="url(#eyeCyan)" stroke="#1a1a1c" strokeWidth="1" />
      <Ellipse cx="52" cy="81" rx="1.5" ry="1" fill="#3a2a26" />
    </Svg>
  )
}

// Workspace: Cat organizing files
export function WorkCatSvg({
  width = 100,
  height = 100,
  style,
}: {
  width?: number
  height?: number
  style?: any
}) {
  return (
    <Svg viewBox="0 0 100 100" width={width} height={height} style={style}>
      <CatSvgDefs />
      <Path
        d="M 28,40 Q 22,20 32,20 Q 38,20 42,32"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M 72,40 Q 78,20 68,20 Q 62,20 58,32"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Ellipse
        cx="50"
        cy="50"
        rx="35"
        ry="24"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2.5"
      />
      <Circle cx="34" cy="45" r="6" fill="url(#eyeYellow)" stroke="#1a1a1c" strokeWidth="1.5" />
      <Circle cx="32" cy="43" r="2" fill="#ffffff" />
      <Circle cx="66" cy="45" r="6" fill="url(#eyeCyan)" stroke="#1a1a1c" strokeWidth="1.5" />
      <Circle cx="64" cy="43" r="2" fill="#ffffff" />

      {/* File folders */}
      <Path
        d="M 20,65 L 45,65 L 45,85 L 20,85 Z"
        fill="#3B82F6"
        stroke="#1a1a1c"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <Path
        d="M 20,65 L 25,60 L 40,60 L 45,65"
        fill="#60A5FA"
        stroke="#1a1a1c"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <Path
        d="M 30,75 L 80,75 L 80,95 L 30,95 Z"
        fill="#10B981"
        stroke="#1a1a1c"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <Path
        d="M 30,75 L 35,70 L 50,70 L 55,75"
        fill="#34D399"
        stroke="#1a1a1c"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Paw holding file */}
      <Path
        d="M 68,60 Q 68,48 60,48 Q 55,48 55,55 L 60,80"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Path
        d="M 32,60 Q 32,48 40,48 Q 45,48 45,55 L 40,75"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  )
}

// Apps: Cat playing xbox controller
export function ChannelCatSvg({
  width = 100,
  height = 100,
  style,
}: {
  width?: number
  height?: number
  style?: any
}) {
  return (
    <Svg viewBox="0 0 100 100" width={width} height={height} style={style}>
      <CatSvgDefs />
      <Path
        d="M 28,35 Q 22,12 32,12 Q 38,12 42,28"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Path
        d="M 72,35 Q 78,12 68,12 Q 62,12 58,28"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Ellipse
        cx="50"
        cy="45"
        rx="35"
        ry="24"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2.5"
      />
      <Circle cx="34" cy="40" r="6" fill="url(#eyeYellow)" stroke="#1a1a1c" strokeWidth="1.5" />
      <Circle cx="32" cy="38" r="2" fill="#ffffff" />
      <Circle cx="66" cy="40" r="6" fill="url(#eyeCyan)" stroke="#1a1a1c" strokeWidth="1.5" />
      <Circle cx="64" cy="38" r="2" fill="#ffffff" />
      <Ellipse cx="50" cy="46" rx="3" ry="2" fill="#3a2a26" />

      {/* Xbox Controller */}
      <Path
        d="M 20,70 Q 15,60 30,60 L 70,60 Q 85,60 80,70 Q 78,85 65,80 L 50,85 L 35,80 Q 22,85 20,70 Z"
        fill="#e2e8f0"
        stroke="#1a1a1c"
        strokeWidth="2.5"
      />
      {/* D-Pad */}
      <Path
        d="M 32,68 L 35,68 L 35,65 L 39,65 L 39,68 L 42,68 L 42,72 L 39,72 L 39,75 L 35,75 L 35,72 L 32,72 Z"
        fill="#1a1a1c"
      />
      {/* Buttons */}
      <Circle cx="68" cy="65" r="3" fill="#F59E0B" />
      <Circle cx="62" cy="70" r="3" fill="#3B82F6" />
      <Circle cx="74" cy="70" r="3" fill="#EF4444" />
      <Circle cx="68" cy="75" r="3" fill="#10B981" />

      {/* Paws */}
      <Path
        d="M 32,55 Q 32,45 25,45 Q 18,45 20,55 L 25,72"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Path
        d="M 68,55 Q 68,45 75,45 Q 82,45 80,55 L 75,72"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  )
}

// Shop: Fortune Cat (Maneki-neko)
export function ShopCatSvg({
  width = 100,
  height = 100,
  style,
}: {
  width?: number
  height?: number
  style?: any
}) {
  return (
    <Svg viewBox="0 0 100 100" width={width} height={height} style={style}>
      <CatSvgDefs />
      <Path
        d="M 28,40 Q 22,20 32,20 Q 38,20 42,32"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M 72,40 Q 78,20 68,20 Q 62,20 58,32"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Raised Left Paw (from cat's perspective, so right side of SVG) */}
      <Path
        d="M 70,50 Q 85,30 85,15 Q 75,10 65,30"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <Ellipse
        cx="50"
        cy="55"
        rx="35"
        ry="28"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2.5"
      />
      <Circle cx="34" cy="48" r="6" fill="url(#eyeYellow)" stroke="#1a1a1c" strokeWidth="1.5" />
      <Circle cx="32" cy="46" r="2" fill="#ffffff" />
      <Circle cx="66" cy="48" r="6" fill="url(#eyeCyan)" stroke="#1a1a1c" strokeWidth="1.5" />
      <Circle cx="64" cy="46" r="2" fill="#ffffff" />
      <Ellipse cx="50" cy="50" rx="3" ry="2" fill="#3a2a26" />
      <Path
        d="M 45,54 Q 50,58 55,54"
        fill="none"
        stroke="#1a1a1c"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Red Collar & Bell */}
      <Path
        d="M 25,65 Q 50,75 75,65"
        fill="none"
        stroke="#EF4444"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <Circle cx="50" cy="68" r="5" fill="#FBBF24" stroke="#1a1a1c" strokeWidth="1.5" />
      <Path d="M 48,70 L 52,70 M 50,68 L 50,72" stroke="#1a1a1c" strokeWidth="1" />

      {/* Koban (Gold Coin) held by right paw (left side of SVG) */}
      <Ellipse cx="35" cy="78" rx="12" ry="18" fill="#FBBF24" stroke="#1a1a1c" strokeWidth="2" />
      <Path
        d="M 30,70 L 40,70 M 30,78 L 40,78 M 30,86 L 40,86"
        stroke="#1a1a1c"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Right Paw holding coin */}
      <Path
        d="M 20,55 Q 15,65 25,75 L 32,70"
        fill="url(#catBody)"
        stroke="#1a1a1c"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  )
}
