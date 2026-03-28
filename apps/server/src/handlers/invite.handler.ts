import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppContainer } from '../container'
import { authMiddleware } from '../middleware/auth.middleware'

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function createInviteHandler(container: AppContainer) {
  const handler = new Hono()

  handler.use('*', authMiddleware)

  // List current user's invite codes (with usage info)
  handler.get('/', async (c) => {
    const user = c.get('user') as { userId: string }
    const inviteCodeDao = container.resolve('inviteCodeDao')
    const codes = await inviteCodeDao.findByCreator(user.userId)
    return c.json(codes)
  })

  // Get invite by code (public, for QR code scanning)
  handler.get('/:code', async (c) => {
    const inviteCodeDao = container.resolve('inviteCodeDao')
    const code = c.req.param('code')

    const invite = await inviteCodeDao.findByCode(code)
    if (!invite) {
      return c.json({ error: 'Invite not found' }, 404)
    }

    // Check if expired
    if (invite.invite.expiresAt && new Date(invite.invite.expiresAt) < new Date()) {
      return c.json({ error: 'Invite expired', code }, 410)
    }

    // Check if max uses reached
    if (invite.invite.maxUses && invite.invite.usedCount >= invite.invite.maxUses) {
      return c.json({ error: 'Invite max uses reached', code }, 410)
    }

    // Check if inactive
    if (!invite.invite.isActive) {
      return c.json({ error: 'Invite inactive', code }, 410)
    }

    return c.json({
      code: invite.invite.code,
      type: invite.invite.type,
      note: invite.invite.note,
      expiresAt: invite.invite.expiresAt,
      maxUses: invite.invite.maxUses,
      usedCount: invite.invite.usedCount,
      createdBy: invite.createdBy,
      server: invite.server,
      channel: invite.channel,
    })
  })

  // Create invite codes (any authenticated user, max 5 at a time)
  handler.post(
    '/',
    zValidator(
      'json',
      z.object({
        count: z.number().min(1).max(5).default(1),
        note: z.string().max(200).optional(),
      }),
    ),
    async (c) => {
      const inviteCodeDao = container.resolve('inviteCodeDao')
      const user = c.get('user') as { userId: string }
      const { count, note } = c.req.valid('json')
      const codes = []
      for (let i = 0; i < count; i++) {
        const code = await inviteCodeDao.create({
          code: generateCode(),
          type: 'user',
          createdBy: user.userId,
          userId: user.userId,
          note,
        })
        codes.push(code)
      }
      return c.json(codes, 201)
    },
  )

  // Create server invite
  handler.post(
    '/servers/:serverId',
    zValidator(
      'json',
      z.object({
        expiresIn: z.number().min(0).optional(), // seconds, 0 = no expiration
        maxUses: z.number().min(1).optional(),
        note: z.string().max(200).optional(),
      }),
    ),
    async (c) => {
      const inviteCodeDao = container.resolve('inviteCodeDao')
      const memberDao = container.resolve('channelMemberDao')
      const user = c.get('user') as { userId: string }
      const serverId = c.req.param('serverId')
      const { expiresIn, maxUses, note } = c.req.valid('json')

      // Check if user is a member of the server
      const membership = await memberDao.findByUserAndServer(user.userId, serverId)
      if (!membership) {
        return c.json({ error: 'Not a member of this server' }, 403)
      }

      const expiresAt =
        expiresIn && expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : undefined

      const code = await inviteCodeDao.create({
        code: generateCode(),
        type: 'server',
        createdBy: user.userId,
        serverId,
        note,
        expiresAt,
        maxUses,
      })

      return c.json(code, 201)
    },
  )

  // Create channel invite
  handler.post(
    '/channels/:channelId',
    zValidator(
      'json',
      z.object({
        expiresIn: z.number().min(0).optional(),
        maxUses: z.number().min(1).optional(),
        note: z.string().max(200).optional(),
      }),
    ),
    async (c) => {
      const inviteCodeDao = container.resolve('inviteCodeDao')
      const channelMemberDao = container.resolve('channelMemberDao')
      const channelDao = container.resolve('channelDao')
      const user = c.get('user') as { userId: string }
      const channelId = c.req.param('channelId')
      const { expiresIn, maxUses, note } = c.req.valid('json')

      // Get channel to find server
      const channel = await channelDao.findById(channelId)
      if (!channel) {
        return c.json({ error: 'Channel not found' }, 404)
      }

      // Check if user is a member of the channel
      const membership = await channelMemberDao.findByUserAndChannel(user.userId, channelId)
      if (!membership) {
        return c.json({ error: 'Not a member of this channel' }, 403)
      }

      const expiresAt =
        expiresIn && expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : undefined

      const code = await inviteCodeDao.create({
        code: generateCode(),
        type: 'channel',
        createdBy: user.userId,
        channelId,
        serverId: channel.serverId,
        note,
        expiresAt,
        maxUses,
      })

      return c.json(code, 201)
    },
  )

  // Accept/Use invite
  handler.post('/:code/accept', async (c) => {
    const inviteCodeDao = container.resolve('inviteCodeDao')
    const memberDao = container.resolve('channelMemberDao')
    const channelMemberDao = container.resolve('channelMemberDao')
    const friendshipDao = container.resolve('friendshipDao')
    const user = c.get('user') as { userId: string }
    const code = c.req.param('code')

    const invite = await inviteCodeDao.findAvailable(code)
    if (!invite) {
      return c.json({ error: 'Invite not found or expired' }, 404)
    }

    // Mark as used
    await inviteCodeDao.markUsed(invite.id, user.userId)

    // Handle different invite types
    switch (invite.type) {
      case 'server': {
        if (!invite.serverId) {
          return c.json({ error: 'Invalid server invite' }, 400)
        }
        // Check if already member
        const existing = await memberDao.findByUserAndServer(user.userId, invite.serverId)
        if (existing) {
          return c.json({ error: 'Already a member', serverId: invite.serverId }, 409)
        }
        // Add to server
        await memberDao.add({
          userId: user.userId,
          serverId: invite.serverId,
          role: 'member',
        })
        return c.json({ success: true, type: 'server', serverId: invite.serverId })
      }

      case 'channel': {
        if (!invite.channelId || !invite.serverId) {
          return c.json({ error: 'Invalid channel invite' }, 400)
        }
        // First join server if not already member
        const serverMember = await memberDao.findByUserAndServer(user.userId, invite.serverId)
        if (!serverMember) {
          await memberDao.add({
            userId: user.userId,
            serverId: invite.serverId,
            role: 'member',
          })
        }
        // Then join channel
        const existingChannel = await channelMemberDao.findByUserAndChannel(
          user.userId,
          invite.channelId,
        )
        if (existingChannel) {
          return c.json({ error: 'Already a member', channelId: invite.channelId }, 409)
        }
        await channelMemberDao.create({
          userId: user.userId,
          channelId: invite.channelId,
        })
        return c.json({
          success: true,
          type: 'channel',
          channelId: invite.channelId,
          serverId: invite.serverId,
        })
      }

      case 'user': {
        if (!invite.userId) {
          return c.json({ error: 'Invalid user invite' }, 400)
        }
        // Send friend request
        const existing = await friendshipDao.findBetweenUsers(user.userId, invite.userId)
        if (existing) {
          return c.json({ error: 'Friendship already exists', userId: invite.userId }, 409)
        }
        await friendshipDao.create({
          requesterId: user.userId,
          addresseeId: invite.userId,
          status: 'pending',
        })
        return c.json({ success: true, type: 'user', userId: invite.userId })
      }

      default:
        return c.json({ error: 'Unknown invite type' }, 400)
    }
  })

  // Reset invites for an entity
  handler.post('/reset', async (c) => {
    const inviteCodeDao = container.resolve('inviteCodeDao')
    const user = c.get('user') as { userId: string }

    // Reset user invites
    await inviteCodeDao.resetEntityInvites('user', user.userId)

    return c.json({ success: true })
  })

  handler.post('/servers/:serverId/reset', async (c) => {
    const inviteCodeDao = container.resolve('inviteCodeDao')
    const memberDao = container.resolve('channelMemberDao')
    const user = c.get('user') as { userId: string }
    const serverId = c.req.param('serverId')

    // Check if user is a member
    const membership = await memberDao.findByUserAndServer(user.userId, serverId)
    if (!membership) {
      return c.json({ error: 'Not a member of this server' }, 403)
    }

    await inviteCodeDao.resetEntityInvites('server', serverId)
    return c.json({ success: true })
  })

  handler.post('/channels/:channelId/reset', async (c) => {
    const inviteCodeDao = container.resolve('inviteCodeDao')
    const channelMemberDao = container.resolve('channelMemberDao')
    const user = c.get('user') as { userId: string }
    const channelId = c.req.param('channelId')

    // Check if user is a member
    const membership = await channelMemberDao.findByUserAndChannel(user.userId, channelId)
    if (!membership) {
      return c.json({ error: 'Not a member of this channel' }, 403)
    }

    await inviteCodeDao.resetEntityInvites('channel', channelId)
    return c.json({ success: true })
  })

  // Deactivate own invite code
  handler.patch('/:id/deactivate', async (c) => {
    const inviteCodeDao = container.resolve('inviteCodeDao')
    const user = c.get('user') as { userId: string }
    const id = c.req.param('id')

    // Verify ownership
    const codes = await inviteCodeDao.findByCreator(user.userId, 1000, 0)
    const owned = codes.find((code) => code.id === id)
    if (!owned) {
      return c.json({ error: 'Not found or not owned' }, 404)
    }

    const code = await inviteCodeDao.deactivate(id)
    return c.json(code)
  })

  // Delete own invite code
  handler.delete('/:id', async (c) => {
    const inviteCodeDao = container.resolve('inviteCodeDao')
    const user = c.get('user') as { userId: string }
    const id = c.req.param('id')

    // Verify ownership
    const codes = await inviteCodeDao.findByCreator(user.userId, 1000, 0)
    const owned = codes.find((code) => code.id === id)
    if (!owned) {
      return c.json({ error: 'Not found or not owned' }, 404)
    }

    await inviteCodeDao.delete(id)
    return c.json({ success: true })
  })

  return handler
}
