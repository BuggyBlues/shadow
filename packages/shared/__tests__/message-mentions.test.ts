import { describe, expect, it } from 'vitest'
import type { MessageMention } from '../src/types'
import {
  assignMentionRanges,
  buildMentionMarkdownLinks,
  canonicalizeMentionContent,
  canonicalMentionToken,
  parseCanonicalMentionToken,
  segmentTextByMentions,
} from '../src/utils/message-mentions'

function channelMention(input: Partial<MessageMention>): MessageMention {
  return {
    kind: 'channel',
    targetId: input.targetId ?? 'channel-1',
    token: input.token ?? '#general',
    label: input.label ?? '#general',
    channelId: input.channelId ?? input.targetId ?? 'channel-1',
    serverId: input.serverId ?? 'server-1',
    ...input,
  }
}

describe('message mention segmentation', () => {
  it('uses Discord-style canonical references as stable identity tokens', () => {
    expect(canonicalMentionToken({ kind: 'user', targetId: 'user-1' })).toBe('<@user-1>')
    expect(canonicalMentionToken({ kind: 'channel', targetId: 'channel-1' })).toBe('<#channel-1>')
    expect(canonicalMentionToken({ kind: 'server', targetId: 'server-1' })).toBe(
      '<@server:server-1>',
    )
    expect(parseCanonicalMentionToken('<@server:server-1>')).toEqual({
      kind: 'server',
      targetId: 'server-1',
    })
  })

  it('uses explicit ranges to keep same visible tokens mapped to different targets', () => {
    const content = 'Discuss #general then #general'
    const first = content.indexOf('#general')
    const second = content.indexOf('#general', first + 1)

    const segments = segmentTextByMentions(content, [
      channelMention({
        targetId: 'channel-a',
        channelId: 'channel-a',
        range: { start: first, end: first + '#general'.length },
      }),
      channelMention({
        targetId: 'channel-b',
        channelId: 'channel-b',
        range: { start: second, end: second + '#general'.length },
      }),
    ])

    const mentionSegments = segments.filter((segment) => segment.type === 'mention')
    expect(mentionSegments).toHaveLength(2)
    expect(mentionSegments.map((segment) => segment.mention.targetId)).toEqual([
      'channel-a',
      'channel-b',
    ])
  })

  it('ignores invalid overlapping ranges and falls back to token occurrences', () => {
    const content = '#docs and #docs'

    const mentions = assignMentionRanges(content, [
      channelMention({
        targetId: 'docs',
        channelId: 'docs',
        token: '#docs',
        label: '#Docs',
        range: { start: 20, end: 25 },
      }),
    ])

    expect(mentions).toHaveLength(2)
    expect(mentions.map((mention) => mention.range)).toEqual([
      { start: 0, end: 5 },
      { start: 10, end: 15 },
    ])
  })

  it('prefers the longest token before assigning shorter prefix tokens', () => {
    const content = 'See #general-news and #general'

    const mentions = assignMentionRanges(content, [
      channelMention({
        targetId: 'general',
        channelId: 'general',
        token: '#general',
      }),
      channelMention({
        targetId: 'general-news',
        channelId: 'general-news',
        token: '#general-news',
        label: '#general-news',
      }),
    ])

    expect(mentions.map((mention) => [mention.targetId, mention.range])).toEqual([
      ['general-news', { start: 4, end: 17 }],
      ['general', { start: 22, end: 30 }],
    ])
  })

  it('builds markdown links without losing mention order', () => {
    const content = 'Ping @admin in #general'
    const result = buildMentionMarkdownLinks(
      content,
      [
        {
          kind: 'user',
          targetId: 'admin',
          userId: 'admin',
          token: '@admin',
          label: '@Admin',
        },
        channelMention({ targetId: 'general', channelId: 'general' }),
      ],
      (_mention, index) => `#shadow-mention-${index}`,
    )

    expect(result.markdown).toBe(
      'Ping [@Admin](#shadow-mention-0) in [#general](#shadow-mention-1)',
    )
    expect(result.mentions.map((mention) => mention.targetId)).toEqual(['admin', 'general'])
  })

  it('canonicalizes selected display mentions before persistence', () => {
    const content = 'Ping @admin in #general'
    const result = canonicalizeMentionContent(content, [
      {
        kind: 'user',
        targetId: 'admin-id',
        userId: 'admin-id',
        token: '<@admin-id>',
        sourceToken: '@admin',
        label: '@Admin',
        range: { start: 5, end: 11 },
      },
      channelMention({
        targetId: 'general-id',
        channelId: 'general-id',
        token: '<#general-id>',
        sourceToken: '#general',
        range: { start: 15, end: 23 },
      }),
    ])

    expect(result.content).toBe('Ping <@admin-id> in <#general-id>')
    expect(result.mentions.map((mention) => [mention.token, mention.range])).toEqual([
      ['<@admin-id>', { start: 5, end: 16 }],
      ['<#general-id>', { start: 20, end: 33 }],
    ])
  })
})
