import { getCatAvatarByUserId } from '@shadowob/shared'
import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'
import { getImageUrl } from '../../lib/api'
import { useColors } from '../../theme'

interface AvatarProps {
  uri: string | null | undefined
  name: string
  size?: number
  userId?: string | null
}

export function Avatar({ uri, name, size = 40, userId }: AvatarProps) {
  const colors = useColors()

  const resolvedUri = getImageUrl(uri)
  const src = resolvedUri || (userId ? getCatAvatarByUserId(userId) : null)

  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        contentFit="cover"
        transition={200}
      />
    )
  }

  const initials = (name || '?').slice(0, 2).toUpperCase()
  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.4, color: '#fff' }]}>{initials}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  image: {
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
})
