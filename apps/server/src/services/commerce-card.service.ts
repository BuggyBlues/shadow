import { nanoid } from 'nanoid'
import type { ChannelDao } from '../dao/channel.dao'
import type { ServerDao } from '../dao/server.dao'
import { apiError } from '../lib/api-error'
import type { CommerceOfferService } from './commerce-offer.service'
import type { DmService } from './dm.service'
import { resolveProductEntitlementResource } from './entitlement-resource'

export type CommerceCardTarget =
  | { kind: 'channel'; channelId: string }
  | { kind: 'dm'; dmChannelId: string }

export interface CommerceCard {
  id: string
  kind: 'offer'
  offerId: string
  shopId: string
  shopScope: { kind: 'server' | 'user'; id: string }
  productId: string
  skuId?: string
  snapshot: {
    name: string
    summary?: string | null
    imageUrl?: string | null
    price: number
    currency: string
    productType: 'physical' | 'entitlement'
    billingMode?: 'one_time' | 'fixed_duration' | 'subscription'
    durationSeconds?: number | null
    resourceType?: string
    resourceId?: string
    capability?: string
  }
  purchase: { mode: 'direct' | 'select_sku' | 'open_detail' }
}

function normalizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return {}
  const json = JSON.stringify(metadata)
  if (json.length > 24_000) {
    throw apiError('MESSAGE_METADATA_TOO_LARGE', 400, { maxBytes: 24_000 })
  }
  return metadata
}

const COMMERCE_INTENT_PATTERN =
  /(买|购买|下单|付款|付费|价格|多少钱|商品|想要|给我看看|可以给我看看|来一[个份盒]|buy|purchase|price|order|pay|paid|card)/i

const COMMERCE_REPLY_CUE_PATTERN =
  /(点击下面|下面的|商品卡片|购买|下单|付款|付费|请看|这就是|带.*回家|要.*带|buy|purchase|order|card)/i

function normalizeText(value: string | null | undefined) {
  return (value ?? '').toLowerCase()
}

function offerMatchesText(
  offer: { id: string },
  product: { name: string; summary: string | null },
  text: string,
) {
  const cjkKeywords = [product.name, product.summary].flatMap((value) => {
    const terms = normalizeText(value).match(/\p{Script=Han}{2,}/gu) ?? []
    return terms.flatMap((term) => {
      const keywords = [term]
      if (term.length >= 4) keywords.push(term.slice(-2), term.slice(-4))
      return keywords
    })
  })
  const candidates = [offer.id, product.name, product.summary, ...cjkKeywords]
    .map(normalizeText)
    .filter((value) => value.length >= 2)
  return candidates.some((candidate) => text.includes(candidate))
}

export class CommerceCardService {
  constructor(
    private deps: {
      channelDao: ChannelDao
      serverDao: ServerDao
      dmService: DmService
      commerceOfferService: CommerceOfferService
    },
  ) {}

  private async assertOfferTarget(input: {
    target: CommerceCardTarget
    shop: { scopeKind: 'server' | 'user'; serverId: string | null; ownerUserId: string | null }
    sellerUserId?: string | null
    sellerBuddyUserId?: string | null
  }) {
    if (input.target.kind === 'channel') {
      const channel = await this.deps.channelDao.findById(input.target.channelId)
      if (!channel) throw apiError('CHANNEL_NOT_FOUND', 404)
      if (input.shop.scopeKind === 'server') {
        if (!input.shop.serverId || channel.serverId !== input.shop.serverId) {
          throw apiError('SERVER_SHOP_PRODUCT_CHANNEL_SCOPE_MISMATCH', 403)
        }
        return
      }
      const sellerIds = [
        input.shop.ownerUserId,
        input.sellerUserId,
        input.sellerBuddyUserId,
      ].filter((id): id is string => Boolean(id))
      const hasSellerInServer = await Promise.all(
        sellerIds.map((sellerId) => this.deps.serverDao.getMember(channel.serverId, sellerId)),
      )
      if (!hasSellerInServer.some(Boolean)) {
        throw apiError('USER_SHOP_PRODUCT_CHANNEL_SCOPE_MISMATCH', 403)
      }
      return
    }

    const dmChannel = await this.deps.dmService.getChannelById(input.target.dmChannelId)
    if (!dmChannel) throw apiError('DM_CHANNEL_NOT_FOUND', 404)
    const participants = new Set([dmChannel.userAId, dmChannel.userBId])
    const sellerIds = [input.shop.ownerUserId, input.sellerUserId, input.sellerBuddyUserId].filter(
      (id): id is string => Boolean(id),
    )
    if (
      input.shop.scopeKind !== 'user' ||
      !sellerIds.some((sellerId) => participants.has(sellerId))
    ) {
      throw apiError('DM_PRODUCT_CARD_REQUIRES_PERSONAL_SHOP', 403)
    }
  }

  async buildOfferCard(input: {
    offerId: string
    skuId?: string
    target: CommerceCardTarget
  }): Promise<CommerceCard> {
    const { offer, product, shop } =
      await this.deps.commerceOfferService.requireActiveOfferForSurface(
        input.offerId,
        input.target.kind,
      )
    await this.assertOfferTarget({
      target: input.target,
      shop,
      sellerUserId: offer.sellerUserId,
      sellerBuddyUserId: offer.sellerBuddyUserId,
    })

    const sku = input.skuId ? product.skus.find((item) => item.id === input.skuId) : undefined
    const config = Array.isArray(product.entitlementConfig)
      ? product.entitlementConfig[0]
      : product.entitlementConfig
    const resource = resolveProductEntitlementResource(product)
    const imageUrl = sku?.imageUrl ?? product.media?.[0]?.url ?? null

    return {
      id: nanoid(12),
      kind: 'offer',
      offerId: offer.id,
      shopId: product.shopId,
      shopScope: {
        kind: shop.scopeKind,
        id: shop.scopeKind === 'server' ? shop.serverId! : shop.ownerUserId!,
      },
      productId: product.id,
      skuId: input.skuId,
      snapshot: {
        name: product.name,
        summary: product.summary,
        imageUrl,
        price: offer.priceOverride ?? sku?.price ?? product.basePrice,
        currency: offer.currency ?? product.currency,
        productType: product.type,
        billingMode: product.billingMode,
        durationSeconds: config?.durationSeconds ?? null,
        resourceType: resource?.resourceType,
        resourceId: resource?.resourceId,
        capability: resource?.capability,
      },
      purchase: { mode: input.skuId || !product.skus?.length ? 'direct' : 'select_sku' },
    }
  }

  async buildProductCard(input: {
    productId: string
    skuId?: string
    target: CommerceCardTarget
  }): Promise<CommerceCard> {
    const offer = await this.deps.commerceOfferService.ensureDefaultOfferForProduct({
      productId: input.productId,
    })
    return this.buildOfferCard({ offerId: offer.id, skuId: input.skuId, target: input.target })
  }

  async normalizeMessageMetadata(
    metadata: Record<string, unknown> | undefined,
    target: CommerceCardTarget,
  ) {
    const normalized = normalizeMetadata(metadata)
    const directOfferId =
      typeof normalized.commerceOfferId === 'string' ? normalized.commerceOfferId : undefined
    const rawCards =
      normalized.commerceCards ??
      (directOfferId ? [{ kind: 'offer', offerId: directOfferId }] : undefined)
    if (rawCards === undefined) return normalized
    if (!Array.isArray(rawCards) || rawCards.length > 3) {
      throw apiError('INVALID_COMMERCE_CARDS_METADATA', 400, { maxCards: 3 })
    }
    const cards: CommerceCard[] = []
    for (const raw of rawCards) {
      if (!raw || typeof raw !== 'object') {
        throw apiError('INVALID_COMMERCE_CARD', 400)
      }
      const record = raw as Record<string, unknown>
      if (record.kind === 'offer' && typeof record.offerId === 'string') {
        cards.push(
          await this.buildOfferCard({
            offerId: record.offerId,
            skuId: typeof record.skuId === 'string' ? record.skuId : undefined,
            target,
          }),
        )
        continue
      }
      if (record.kind !== 'product' || typeof record.productId !== 'string') {
        throw apiError('INVALID_PRODUCT_COMMERCE_CARD', 400)
      }
      cards.push(
        await this.buildProductCard({
          productId: record.productId,
          skuId: typeof record.skuId === 'string' ? record.skuId : undefined,
          target,
        }),
      )
    }
    return { ...normalized, commerceCards: cards }
  }

  async inferMessageMetadata(input: {
    metadata: Record<string, unknown> | undefined
    target: CommerceCardTarget
    authorId: string
    content: string
  }) {
    const normalized = normalizeMetadata(input.metadata)
    if (normalized.commerceCards !== undefined) {
      return this.normalizeMessageMetadata(normalized, input.target)
    }

    const text = normalizeText(input.content)
    if (!COMMERCE_INTENT_PATTERN.test(text) && !COMMERCE_REPLY_CUE_PATTERN.test(text)) {
      return normalized
    }

    const bundles = await this.deps.commerceOfferService.listActiveOfferBundlesForSeller({
      sellerUserId: input.authorId,
      surface: input.target.kind === 'channel' ? 'channel' : 'dm',
      limit: 10,
    })
    if (bundles.length === 0) return normalized

    const matched = bundles.filter((bundle) => offerMatchesText(bundle.offer, bundle.product, text))
    const selected = matched.length === 1 ? matched[0] : bundles.length === 1 ? bundles[0] : null
    if (!selected) return normalized

    return this.normalizeMessageMetadata(
      {
        ...normalized,
        commerceCards: [{ kind: 'offer', offerId: selected.offer.id }],
      },
      input.target,
    )
  }
}
