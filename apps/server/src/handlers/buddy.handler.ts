import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { AppContainer } from '../container'
import { authMiddleware } from '../middleware/auth.middleware'
import { createBuddySchema } from '../validators/buddy.schema'

export function createBuddyHandler(container: AppContainer) {
  const buddyHandler = new Hono()

  buddyHandler.use('*', authMiddleware)

  // GET /api/buddies — list current user's buddies (with rental status)
  buddyHandler.get('/', async (c) => {
    const buddyService = container.resolve('buddyService')
    const clawListingDao = container.resolve('clawListingDao')
    const rentalContractDao = container.resolve('rentalContractDao')
    const user = c.get('user')
    const buddies = await buddyService.getByOwnerId(user.userId)
    // Enrich with buddy user info
    const enriched = await Promise.all(
      buddies.map(async (buddy) => {
        const full = await buddyService.getById(buddy.id)
        return full
      }),
    )
    const result = enriched.filter(Boolean)

    // Enrich with rental status: check all listings (any status) for each buddy
    const buddyIds = result.map((a) => a!.id)
    const allListings = await clawListingDao.findByBuddyIds(buddyIds)
    const rentedBuddyIds = new Set<string>()
    const listedBuddyIds = new Set<string>()
    // Map buddyId → listing status for detailed display
    const buddyListingStatus = new Map<
      string,
      { listingId: string; listingStatus: string; isListed: boolean }
    >()
    for (const listing of allListings) {
      if (!listing.buddyId) continue
      // Track any listing (regardless of status) → buddyListingStatus
      const existing = buddyListingStatus.get(listing.buddyId)
      // Prefer active > paused > draft > others
      const priority: Record<string, number> = { active: 4, paused: 3, draft: 2 }
      const existingPriority = existing ? (priority[existing.listingStatus] ?? 1) : 0
      const currentPriority = priority[listing.listingStatus] ?? 1
      if (currentPriority > existingPriority) {
        buddyListingStatus.set(listing.buddyId, {
          listingId: listing.id,
          listingStatus: listing.listingStatus,
          isListed: listing.isListed,
        })
      }
      // isListed = has an active+listed listing
      if (listing.listingStatus === 'active' && listing.isListed) {
        listedBuddyIds.add(listing.buddyId)
      }
      // isRented = has an active contract on any listing
      if (listing.listingStatus === 'active') {
        const activeContract = await rentalContractDao.findActiveByListingId(listing.id)
        if (activeContract) {
          rentedBuddyIds.add(listing.buddyId)
        }
      }
    }

    return c.json(
      result.map((buddy) => ({
        ...buddy,
        isListed: listedBuddyIds.has(buddy!.id),
        isRented: rentedBuddyIds.has(buddy!.id),
        listingInfo: buddyListingStatus.get(buddy!.id) ?? null,
      })),
    )
  })

  // POST /api/buddies — create a new buddy
  buddyHandler.post('/', zValidator('json', createBuddySchema), async (c) => {
    try {
      const buddyService = container.resolve('buddyService')
      const user = c.get('user')
      const input = c.req.valid('json')
      const buddy = await buddyService.create({
        name: input.name,
        username: input.username,
        description: input.description,
        avatarUrl: input.avatarUrl,
        kernelType: input.kernelType,
        config: input.config,
        ownerId: user.userId,
      })
      return c.json(buddy, 201)
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      return c.json({ error: (err as Error).message || 'Internal Server Error' }, status as 409)
    }
  })

  // GET /api/buddies/:id — get buddy details
  buddyHandler.get('/:id', async (c) => {
    const buddyService = container.resolve('buddyService')
    const id = c.req.param('id')
    const buddy = await buddyService.getById(id)
    if (!buddy) {
      return c.json({ error: 'Buddy not found' }, 404)
    }
    return c.json(buddy)
  })

  // PATCH /api/buddies/:id — update existing buddy
  buddyHandler.patch('/:id', async (c) => {
    const buddyService = container.resolve('buddyService')
    const user = c.get('user')
    const id = c.req.param('id')
    const body = await c.req.json()

    const buddy = await buddyService.update(id, user.userId, body)
    if (!buddy) {
      return c.json({ error: 'Buddy not found' }, 404)
    }
    return c.json(buddy)
  })

  // POST /api/buddies/:id/token — generate buddy token
  buddyHandler.post('/:id/token', async (c) => {
    const buddyService = container.resolve('buddyService')
    const user = c.get('user')
    const id = c.req.param('id')
    const result = await buddyService.generateToken(id, user.userId)
    return c.json({
      token: result.token,
      buddy: {
        id: result.buddy.id,
        userId: result.buddy.userId,
        status: result.buddy.status,
      },
      buddyUser: {
        id: result.buddyUser.id,
        username: result.buddyUser.username,
        displayName: result.buddyUser.displayName,
        avatarUrl: result.buddyUser.avatarUrl,
      },
    })
  })

  // DELETE /api/buddies/:id — delete buddy
  buddyHandler.delete('/:id', async (c) => {
    const buddyService = container.resolve('buddyService')
    const user = c.get('user')
    const id = c.req.param('id')

    // Verify ownership
    const buddy = await buddyService.getById(id)
    if (!buddy) {
      return c.json({ error: 'Buddy not found' }, 404)
    }
    if (buddy.ownerId !== user.userId) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    await buddyService.delete(id)
    return c.json({ success: true })
  })

  // POST /api/buddies/:id/start — start buddy
  buddyHandler.post('/:id/start', async (c) => {
    const buddyService = container.resolve('buddyService')
    const id = c.req.param('id')
    const buddy = await buddyService.start(id)
    return c.json(buddy)
  })

  // POST /api/buddies/:id/stop — stop buddy
  buddyHandler.post('/:id/stop', async (c) => {
    const buddyService = container.resolve('buddyService')
    const id = c.req.param('id')
    const buddy = await buddyService.stop(id)
    return c.json(buddy)
  })

  // POST /api/buddies/:id/heartbeat — record heartbeat from buddy
  buddyHandler.post('/:id/heartbeat', async (c) => {
    const buddyService = container.resolve('buddyService')
    const user = c.get('user')
    const id = c.req.param('id')
    try {
      const buddy = await buddyService.heartbeat(id, user.userId)
      return c.json({ ok: true, status: buddy?.status, lastHeartbeat: buddy?.lastHeartbeat })
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      return c.json({ error: (err as Error).message }, status as 404 | 403)
    }
  })

  // GET /api/buddies/:id/config — full remote config for the plugin
  buddyHandler.get('/:id/config', async (c) => {
    const buddyPolicyService = container.resolve('buddyPolicyService')
    const id = c.req.param('id')
    try {
      const config = await buddyPolicyService.getRemoteConfig(id)
      return c.json(config)
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      return c.json({ error: (err as Error).message }, status as 404)
    }
  })

  // GET /api/buddies/:id/policies — list all policies for a buddy
  buddyHandler.get('/:id/policies', async (c) => {
    const buddyPolicyService = container.resolve('buddyPolicyService')
    const id = c.req.param('id')
    try {
      const policies = await buddyPolicyService.getPolicies(id)
      return c.json(policies)
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      return c.json({ error: (err as Error).message }, status as 404)
    }
  })

  // PUT /api/buddies/:id/policies — upsert policies (batch)
  buddyHandler.put('/:id/policies', async (c) => {
    const buddyPolicyService = container.resolve('buddyPolicyService')
    const user = c.get('user')
    const id = c.req.param('id')

    // Verify ownership
    const buddyService = container.resolve('buddyService')
    const buddy = await buddyService.getById(id)
    if (!buddy) {
      return c.json({ error: 'Buddy not found' }, 404)
    }
    if (buddy.ownerId !== user.userId) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const body = await c.req.json<{
      policies: Array<{
        serverId: string
        channelId?: string | null
        listen?: boolean
        reply?: boolean
        mentionOnly?: boolean
        config?: Record<string, unknown>
      }>
    }>()

    if (!Array.isArray(body.policies) || body.policies.length === 0) {
      return c.json({ error: 'policies array is required' }, 400)
    }

    try {
      const results = await buddyPolicyService.upsertPolicies(id, body.policies)
      return c.json(results)
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      return c.json({ error: (err as Error).message }, status as 404)
    }
  })

  // DELETE /api/buddies/:id/policies/:policyId — delete a specific policy
  buddyHandler.delete('/:id/policies/:policyId', async (c) => {
    const buddyPolicyService = container.resolve('buddyPolicyService')
    const user = c.get('user')
    const id = c.req.param('id')
    const policyId = c.req.param('policyId')

    // Verify ownership
    const buddyService = container.resolve('buddyService')
    const buddy = await buddyService.getById(id)
    if (!buddy) {
      return c.json({ error: 'Buddy not found' }, 404)
    }
    if (buddy.ownerId !== user.userId) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    await buddyPolicyService.deletePolicy(policyId)
    return c.json({ success: true })
  })

  return buddyHandler
}
