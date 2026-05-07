import type { ShadowClient } from '@shadowob/sdk'
import type { ShadowAccountConfig, ShadowCommerceOfferContext } from '../types.js'

function isResolvedId(value: string | undefined | null): value is string {
  return Boolean(value && value.trim() && !value.includes('${env:'))
}

export function listResolvedCommerceOffers(
  account: ShadowAccountConfig,
): ShadowCommerceOfferContext[] {
  return (account.commerceOffers ?? []).filter((offer) => isResolvedId(offer.offerId))
}

export function buildCommerceContextForAgent(account: ShadowAccountConfig): string {
  const offers = listResolvedCommerceOffers(account)
  if (offers.length === 0) return ''

  return [
    'Shadow commerce offers available to this Buddy:',
    ...offers.map((offer) => {
      const label = offer.name ?? offer.seedId ?? offer.offerId
      const summary = offer.summary ? ` — ${offer.summary}` : ''
      const fileHint = offer.fileId ? ` paid file ${offer.fileId}` : ''
      return `- ${label}${summary}. CommerceOfferId: ${offer.offerId}.${fileHint}`
    }),
    'To sell an offer, use the Shadow message tool with action "send", the current target, a natural sales message, and commerceOfferId set to the CommerceOfferId above.',
  ].join('\n')
}

export async function buildCommerceViewerContextForAgent(params: {
  account: ShadowAccountConfig
  client: ShadowClient
  viewerUserId?: string
}): Promise<string> {
  if (!params.viewerUserId) return ''
  const offers = listResolvedCommerceOffers(params.account)
  if (offers.length === 0) return ''

  const lines: string[] = []
  const commerceClient = params.client as ShadowClient & {
    getCommerceOfferCheckoutPreview?: (
      offerId: string,
      params?: { viewerUserId?: string },
    ) => Promise<{ viewerState: string; nextAction: string }>
  }
  if (!commerceClient.getCommerceOfferCheckoutPreview) return ''
  for (const offer of offers) {
    try {
      const preview = await commerceClient.getCommerceOfferCheckoutPreview(offer.offerId, {
        viewerUserId: params.viewerUserId,
      })
      const label = offer.name ?? offer.seedId ?? offer.offerId
      lines.push(
        `- ${label}: viewerState=${preview.viewerState}; nextAction=${preview.nextAction}.`,
      )
    } catch {
      // Viewer state is advisory context. If the server refuses or the offer is unavailable,
      // leave the sales flow unchanged.
    }
  }
  if (lines.length === 0) return ''
  return [
    'Current viewer commerce state for the user you are speaking with:',
    ...lines,
    'If viewerState is active, do not ask them to buy again; help them open or use the unlocked content instead.',
  ].join('\n')
}

export function commerceContextFields(account: ShadowAccountConfig): Record<string, unknown> {
  const offers = listResolvedCommerceOffers(account)
  if (offers.length === 0) return {}
  return {
    CommerceOffers: offers,
    CommerceOfferIds: offers.map((offer) => offer.offerId).join(','),
  }
}

const COMMERCE_INTENT_PATTERN =
  /(买|购买|下单|付款|付费|价格|多少钱|商品|想要|给我看看|可以给我看看|来一[个份盒]|buy|purchase|price|order|pay|paid|card)/i

const COMMERCE_REPLY_CUE_PATTERN =
  /(点击下面|下面的|商品卡片|购买|下单|付款|付费|请看|这就是|带.*回家|要.*带|buy|purchase|order|card)/i

const ERROR_REPLY_PATTERN =
  /(something went wrong|processing your request|please try again|\/new to start|official model provider authentication failed|failovererror|embedded agent failed|request failed|模型.*失败|请求.*失败|处理.*出错|请稍后再试)/i

function normalizeText(value: string | undefined | null) {
  return (value ?? '').toLowerCase()
}

function offerMatchesText(offer: ShadowCommerceOfferContext, text: string) {
  const cjkKeywords = [offer.name, offer.summary].flatMap((value) => {
    const terms = normalizeText(value).match(/\p{Script=Han}{2,}/gu) ?? []
    return terms.flatMap((term) => {
      const keywords = [term]
      if (term.length >= 4) keywords.push(term.slice(-2), term.slice(-4))
      return keywords
    })
  })
  const candidates = [offer.offerId, offer.seedId, offer.name, offer.summary, ...cjkKeywords]
    .map(normalizeText)
    .filter((value) => value.length >= 2)
  return candidates.some((candidate) => text.includes(candidate))
}

export function inferCommerceOfferIdForReply(params: {
  account: ShadowAccountConfig
  inboundText?: string
  replyText?: string
}): string | undefined {
  const offers = listResolvedCommerceOffers(params.account)
  if (offers.length === 0) return undefined

  const inboundText = normalizeText(params.inboundText)
  const replyText = normalizeText(params.replyText)
  if (!replyText || ERROR_REPLY_PATTERN.test(replyText)) return undefined

  const matchedOffers = offers.filter((offer) => offerMatchesText(offer, replyText))
  if (matchedOffers.length === 1) return matchedOffers[0]?.offerId

  if (
    offers.length === 1 &&
    COMMERCE_INTENT_PATTERN.test(inboundText) &&
    COMMERCE_REPLY_CUE_PATTERN.test(replyText)
  ) {
    return offers[0]?.offerId
  }

  return undefined
}
