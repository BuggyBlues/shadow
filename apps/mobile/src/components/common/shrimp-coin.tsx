import React from 'react'
import { View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'

interface ShrimpCoinProps {
  size?: number
  color?: string
}

export function ShrimpCoin({ size = 20, color = '#FF6B35' }: ShrimpCoinProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Outer circle - coin border */}
        <Circle cx="12" cy="12" r="11" stroke={color} strokeWidth="2" fill="none" />
        
        {/* Inner circle - coin background */}
        <Circle cx="12" cy="12" r="9" fill={color} fillOpacity="0.15" />
        
        {/* Shrimp body */}
        <Path
          d="M8 14c0-2 1.5-4 4-4s4 2 4 4-1.5 3-4 3-4-1-4-3z"
          fill={color}
        />
        
        {/* Shrimp head */}
        <Path
          d="M7 14c-1 0-2-1-2-2s1-2 2-2 2 1 2 2"
          fill={color}
        />
        
        {/* Shrimp tail */}
        <Path
          d="M16 14c1 0 2-1 2-2s-1-2-2-2"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Shrimp legs */}
        <Path
          d="M9 16l-1 2M11 17v2M13 17v2M15 16l1 2"
          stroke={color}
          strokeWidth="1"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  )
}

export function ShrimpCoinSmall({ size = 16 }: ShrimpCoinProps) {
  return <ShrimpCoin size={size} />
}

export function ShrimpCoinLarge({ size = 32 }: ShrimpCoinProps) {
  return <ShrimpCoin size={size} />
}
