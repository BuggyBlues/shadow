import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { AppContainer } from '../container'
import { authMiddleware } from '../middleware/auth.middleware'
import {
  browseListingsSchema,
  createListingSchema,
  recordUsageSchema,
  reportViolationSchema,
  signContractSchema,
  terminateContractSchema,
  toggleListingSchema,
  updateListingSchema,
} from '../validators/rental.schema'

export function createRentalHandler(container: AppContainer) {
  const h = new Hono()

  /* ══════════════════════════════════════════
     Marketplace — Browsing (Public, no auth)
     ══════════════════════════════════════════ */

  /** Browse marketplace listings with search & filters */
  h.get('/marketplace/listings', zValidator('query', browseListingsSchema), async (c) => {
    const rentalService = container.resolve('rentalService')
    const query = c.req.valid('query')
    const result = await rentalService.browseListings(query)
    return c.json(result)
  })

  /** Get listing detail (increments view count) */
  h.get('/marketplace/listings/:listingId', async (c) => {
    const rentalService = container.resolve('rentalService')
    const listing = await rentalService.getListingDetail(c.req.param('listingId'))
    return c.json(listing)
  })

  /** Estimate cost for a listing */
  h.get('/marketplace/listings/:listingId/estimate', async (c) => {
    const rentalService = container.resolve('rentalService')
    const hours = Number(c.req.query('hours') || '1')
    if (hours < 1 || hours > 8760) {
      throw Object.assign(new Error('Invalid hours'), { status: 400 })
    }
    const estimate = await rentalService.estimateCost(c.req.param('listingId'), hours)
    return c.json(estimate)
  })

  /* ══════════════════════════════════════════
     Authenticated routes — all below require auth
     ══════════════════════════════════════════ */
  h.use('*', authMiddleware)

  /* ══════════════════════════════════════════
     Listings — Owner Management
     ══════════════════════════════════════════ */

  /** Get my listings (as owner) — returns all listings with enrichment */
  h.get('/marketplace/my-listings', async (c) => {
    const user = c.get('user')
    const rentalService = container.resolve('rentalService')
    const buddyDao = container.resolve('buddyDao')
    const limit = Number(c.req.query('limit') || '50')
    const offset = Number(c.req.query('offset') || '0')
    const listings = await rentalService.getMyListings(user.userId, { limit, offset })

    // Filter to only include active, listed, and not-rented listings
    const filtered = listings.filter(
      (l) => l.listingStatus === 'active' && l.isListed === true && l.isRented === false,
    )

    // Enrich listings with buddy status
    const enriched = await Promise.all(
      filtered.map(async (l) => {
        let buddy: {
          status: string
          lastHeartbeat: Date | null
          totalOnlineSeconds: number
        } | null = null
        if (l.buddyId) {
          const buddyData = await buddyDao.findById(l.buddyId)
          if (buddyData) {
            buddy = {
              status: buddyData.status,
              lastHeartbeat: buddyData.lastHeartbeat,
              totalOnlineSeconds: buddyData.totalOnlineSeconds,
            }
          }
        }
        return {
          ...l,
          buddy,
        }
      }),
    )

    return c.json({ listings: enriched })
  })

  /** Create a new listing */
  h.post('/marketplace/listings', zValidator('json', createListingSchema), async (c) => {
    const user = c.get('user')
    const rentalService = container.resolve('rentalService')
    const listing = await rentalService.createListing(user.userId, c.req.valid('json'))
    return c.json(listing, 201)
  })

  /** Update a listing */
  h.put('/marketplace/listings/:listingId', zValidator('json', updateListingSchema), async (c) => {
    const user = c.get('user')
    const rentalService = container.resolve('rentalService')
    const listing = await rentalService.updateListing(
      c.req.param('listingId'),
      user.userId,
      c.req.valid('json'),
    )
    return c.json(listing)
  })

  /** Toggle listing on/off marketplace */
  h.put(
    '/marketplace/listings/:listingId/toggle',
    zValidator('json', toggleListingSchema),
    async (c) => {
      const user = c.get('user')
      const rentalService = container.resolve('rentalService')
      const listing = await rentalService.toggleListing(
        c.req.param('listingId'),
        user.userId,
        c.req.valid('json').isListed,
      )
      return c.json(listing)
    },
  )

  /** Delete a listing */
  h.delete('/marketplace/listings/:listingId', async (c) => {
    const user = c.get('user')
    const rentalService = container.resolve('rentalService')
    await rentalService.deleteListing(c.req.param('listingId'), user.userId)
    return c.json({ ok: true })
  })

  /* ══════════════════════════════════════════
     Contracts — Signing & Management
     ══════════════════════════════════════════ */

  /** Sign a rental contract (tenant rents a claw) */
  h.post('/marketplace/contracts', zValidator('json', signContractSchema), async (c) => {
    const user = c.get('user')
    const rentalService = container.resolve('rentalService')
    const contract = await rentalService.signContract(user.userId, c.req.valid('json'))
    return c.json(contract, 201)
  })

  /** Get my contracts (both as owner and tenant), enriched with listing info */
  h.get('/marketplace/contracts', async (c) => {
    const user = c.get('user')
    const rentalService = container.resolve('rentalService')
    const clawListingDao = container.resolve('clawListingDao')
    const buddyDao = container.resolve('buddyDao')
    const role = c.req.query('role') as 'tenant' | 'owner' | undefined
    const status = c.req.query('status')
    const limit = Number(c.req.query('limit') || '50')
    const offset = Number(c.req.query('offset') || '0')
    const contracts = await rentalService.getMyContracts(user.userId, {
      role,
      status,
      limit,
      offset,
    })
    // Enrich each contract with listing summary and buddy buddy user ID
    const enriched = await Promise.all(
      contracts.map(async (contract) => {
        const listing = await clawListingDao.findById(contract.listingId)
        let buddyUserId: string | null = null
        if (listing?.buddyId) {
          const buddy = await buddyDao.findById(listing.buddyId)
          if (buddy) buddyUserId = buddy.userId
        }
        return {
          ...contract,
          listing: listing
            ? { title: listing.title, deviceTier: listing.deviceTier, osType: listing.osType }
            : null,
          buddyUserId,
        }
      }),
    )
    return c.json({ contracts: enriched })
  })

  /** Get contract detail */
  h.get('/marketplace/contracts/:contractId', async (c) => {
    const user = c.get('user')
    const rentalService = container.resolve('rentalService')
    const clawListingDao = container.resolve('clawListingDao')
    const buddyDao = container.resolve('buddyDao')
    const detail = await rentalService.getContractDetail(c.req.param('contractId'))
    // Ensure the user is a party to the contract
    if (detail.tenantId !== user.userId && detail.ownerId !== user.userId) {
      throw Object.assign(new Error('Not a party to this contract'), { status: 403 })
    }
    // Enrich with listing summary and buddy buddy user ID
    const listing = await clawListingDao.findById(detail.listingId)
    let buddyUserId: string | null = null
    if (listing?.buddyId) {
      const buddy = await buddyDao.findById(listing.buddyId)
      if (buddy) buddyUserId = buddy.userId
    }
    return c.json({
      ...detail,
      listing: listing
        ? { title: listing.title, deviceTier: listing.deviceTier, osType: listing.osType }
        : null,
      buddyUserId,
    })
  })

  /** Terminate a contract */
  h.post(
    '/marketplace/contracts/:contractId/terminate',
    zValidator('json', terminateContractSchema),
    async (c) => {
      const user = c.get('user')
      const rentalService = container.resolve('rentalService')
      const input = c.req.valid('json')
      const contract = await rentalService.terminateContract(
        c.req.param('contractId'),
        user.userId,
        input.reason,
      )
      return c.json(contract)
    },
  )

  /* ══════════════════════════════════════════
     Usage & Billing
     ══════════════════════════════════════════ */

  /** Check if chat is disabled for a buddy buddy user (listed or rented-out).
   *  Also returns rental info when the requesting user is the active tenant. */
  h.get('/marketplace/buddy-chat-status/:buddyUserId', async (c) => {
    const buddyDao = container.resolve('buddyDao')
    const clawListingDao = container.resolve('clawListingDao')
    const rentalContractDao = container.resolve('rentalContractDao')
    const user = c.get('user')
    const buddyUserId = c.req.param('buddyUserId')

    // Find buddy by userId
    const buddy = await buddyDao.findByUserId(buddyUserId)
    if (!buddy) {
      return c.json({ chatDisabled: false })
    }

    // Check if buddy has any listing
    const listings = await clawListingDao.findByOwnerId(buddy.ownerId)
    const buddyListing = listings.find((l) => l.buddyId === buddy.id)
    if (!buddyListing) {
      // No listing for this buddy - always allow chat
      return c.json({ chatDisabled: false })
    }

    const isListed = buddyListing.isListed && buddyListing.listingStatus === 'active'
    const activeContract = await rentalContractDao.findActiveByListingId(buddyListing.id)
    const isRentedOut = !!activeContract

    // If the requesting user is the active tenant, chat is ENABLED + return rental info
    if (activeContract && activeContract.tenantId === user.userId) {
      return c.json({
        chatDisabled: false,
        rental: {
          contractId: activeContract.id,
          baseDailyRate: activeContract.baseDailyRate ?? 0,
          messageFee: activeContract.messageFee ?? 0,
          totalCost: activeContract.totalCost ?? 0,
          messageCount: activeContract.messageCount ?? 0,
          pricingVersion: activeContract.pricingVersion ?? 1,
        },
      })
    }

    // Buddy is listed or rented out - chat is disabled for everyone (including owner)
    if (isRentedOut) {
      return c.json({ chatDisabled: true, reason: 'rented_out' })
    }
    if (isListed) {
      return c.json({ chatDisabled: true, reason: 'listed' })
    }

    // Buddy has a listing but not listed and no active contract
    // Owner can chat, but non-owner cannot (rental expired)
    if (buddy.ownerId === user.userId) {
      return c.json({ chatDisabled: false })
    }

    return c.json({ chatDisabled: true, reason: 'expired' })
  })

  /** Record a usage session (typically called by the system/buddy) */
  h.post(
    '/marketplace/contracts/:contractId/usage',
    zValidator('json', recordUsageSchema),
    async (c) => {
      const rentalService = container.resolve('rentalService')
      const usage = await rentalService.recordUsage(c.req.param('contractId'), c.req.valid('json'))
      return c.json(usage, 201)
    },
  )

  /* ══════════════════════════════════════════
     Violations
     ══════════════════════════════════════════ */

  /** Report a contract violation */
  h.post(
    '/marketplace/contracts/:contractId/violate',
    zValidator('json', reportViolationSchema),
    async (c) => {
      const user = c.get('user')
      const rentalService = container.resolve('rentalService')
      const violation = await rentalService.reportViolation(
        c.req.param('contractId'),
        user.userId,
        c.req.valid('json'),
      )
      return c.json(violation, 201)
    },
  )

  return h
}
