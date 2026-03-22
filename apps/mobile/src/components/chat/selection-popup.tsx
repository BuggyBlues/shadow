import { Fragment } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

export interface PopupAction {
  label: string
  onPress: () => void
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

interface SelectionPopupProps {
  actions: PopupAction[]
  arrowDirection?: 'down' | 'up'
  onQuickReaction?: (emoji: string) => void
}

export function SelectionPopup({
  actions,
  arrowDirection = 'down',
  onQuickReaction,
}: SelectionPopupProps) {
  if (actions.length === 0) return null

  return (
    <View style={popupStyles.container}>
      {arrowDirection === 'up' && <View style={popupStyles.arrowUp} />}
      <View style={popupStyles.card}>
        {/* Quick emoji row */}
        {onQuickReaction && (
          <View style={popupStyles.emojiRow}>
            {QUICK_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                style={({ pressed }) => [
                  popupStyles.emojiBtn,
                  pressed && popupStyles.emojiBtnPressed,
                ]}
                onPress={() => onQuickReaction(emoji)}
              >
                <Text style={popupStyles.emojiText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {/* Action buttons */}
        <View style={popupStyles.actionRow}>
          {actions.map((action, i) => (
            <Fragment key={action.label}>
              {i > 0 && <View style={popupStyles.divider} />}
              <Pressable
                style={({ pressed }) => [popupStyles.action, pressed && popupStyles.actionPressed]}
                onPress={action.onPress}
              >
                <Text style={popupStyles.actionText}>{action.label}</Text>
              </Pressable>
            </Fragment>
          ))}
        </View>
      </View>
      {arrowDirection === 'down' && <View style={popupStyles.arrowDown} />}
    </View>
  )
}

const popupStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#4C4C4C',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
  },
  emojiBtn: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  emojiBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  emojiText: {
    fontSize: 22,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  action: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  actionPressed: {
    opacity: 0.6,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#4C4C4C',
  },
  arrowUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#4C4C4C',
  },
})
