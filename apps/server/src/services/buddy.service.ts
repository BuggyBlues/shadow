import type { Logger } from 'pino'
import type { BuddyDao } from '../dao/buddy.dao'
import type { UserDao } from '../dao/user.dao'
import { signBuddyToken } from '../lib/jwt'

export class BuddyService {
  constructor(private deps: { buddyDao: BuddyDao; userDao: UserDao; logger: Logger }) {}

  async create(data: {
    name: string
    username: string
    description?: string
    avatarUrl?: string
    kernelType: string
    config: Record<string, unknown>
    ownerId: string
  }) {
    // Create a buddy user for the buddy with the provided username.
    let buddyUser: Awaited<ReturnType<typeof this.deps.buddyDao.createBuddyUser>>
    try {
      buddyUser = await this.deps.buddyDao.createBuddyUser({
        username: data.username,
        displayName: data.name,
      })
    } catch (err) {
      const pgCode =
        (err as { code?: string })?.code ?? (err as { cause?: { code?: string } })?.cause?.code
      if (
        pgCode === '23505' ||
        (err instanceof Error && /unique.*constraint|duplicate key/i.test(err.message))
      ) {
        throw Object.assign(new Error('Username already taken'), { status: 409 })
      }
      throw err
    }

    if (!buddyUser) {
      throw Object.assign(new Error('Username already taken'), { status: 409 })
    }

    // Update avatar if provided
    if (data.avatarUrl) {
      await this.deps.userDao.update(buddyUser.id, { avatarUrl: data.avatarUrl })
    }

    // Create the buddy record (default to running)
    const buddy = await this.deps.buddyDao.create({
      userId: buddyUser.id,
      kernelType: data.kernelType,
      config: {
        ...data.config,
        ...(data.description ? { description: data.description } : {}),
      },
      ownerId: data.ownerId,
    })

    // Set initial status to running
    await this.deps.buddyDao.updateStatus(buddy!.id, 'running')

    return {
      ...buddy,
      status: 'running' as const,
      buddyUser: { ...buddyUser, avatarUrl: data.avatarUrl ?? buddyUser.avatarUrl },
    }
  }

  async getById(id: string) {
    const buddy = await this.deps.buddyDao.findById(id)
    if (!buddy) return null
    const buddyUser = await this.deps.userDao.findById(buddy.userId)
    const owner = await this.deps.userDao.findById(buddy.ownerId)
    return { ...buddy, buddyUser, owner }
  }

  async update(
    id: string,
    ownerId: string,
    data: { name?: string; description?: string; avatarUrl?: string | null },
  ) {
    const buddy = await this.deps.buddyDao.findById(id)
    if (!buddy) {
      throw Object.assign(new Error('Buddy not found'), { status: 404 })
    }
    if (buddy.ownerId !== ownerId) {
      throw Object.assign(new Error('Not the owner of this buddy'), { status: 403 })
    }

    const updates: any = {}
    if (data.name !== undefined) updates.displayName = data.name
    if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl

    if (Object.keys(updates).length > 0) {
      await this.deps.userDao.update(buddy.userId, updates)
    }

    if (data.description !== undefined) {
      const config = (buddy.config as Record<string, unknown>) ?? {}
      config.description = data.description
      await this.deps.buddyDao.updateConfig(id, config)
    }

    return this.getById(id)
  }

  async getAll() {
    return this.deps.buddyDao.findAll()
  }

  async getByOwnerId(ownerId: string) {
    return this.deps.buddyDao.findByOwnerId(ownerId)
  }

  /** Generate a long-lived JWT token for the buddy's buddy user */
  async generateToken(buddyId: string, ownerId: string) {
    const buddy = await this.deps.buddyDao.findById(buddyId)
    if (!buddy) {
      throw Object.assign(new Error('Buddy not found'), { status: 404 })
    }
    if (buddy.ownerId !== ownerId) {
      throw Object.assign(new Error('Not the owner of this buddy'), { status: 403 })
    }

    const buddyUser = await this.deps.userDao.findById(buddy.userId)
    if (!buddyUser) {
      throw Object.assign(new Error('Buddy user not found'), { status: 404 })
    }

    const token = signBuddyToken({
      userId: buddyUser.id,
      email: buddyUser.email,
      username: buddyUser.username,
    })

    // Persist the token in buddy config so it can be viewed again later
    await this.deps.buddyDao.updateConfig(buddyId, {
      ...((buddy.config as Record<string, unknown>) ?? {}),
      lastToken: token,
    })

    return { token, buddy, buddyUser }
  }

  async start(id: string) {
    const buddy = await this.deps.buddyDao.findById(id)
    if (!buddy) {
      throw Object.assign(new Error('Buddy not found'), { status: 404 })
    }

    // TODO: Start Docker container via BuddyRuntime
    await this.deps.buddyDao.updateStatus(id, 'running')
    this.deps.logger.info({ buddyId: id }, 'Buddy started')

    return this.deps.buddyDao.findById(id)
  }

  async stop(id: string) {
    const buddy = await this.deps.buddyDao.findById(id)
    if (!buddy) {
      throw Object.assign(new Error('Buddy not found'), { status: 404 })
    }

    // TODO: Stop Docker container via BuddyRuntime
    await this.deps.buddyDao.updateStatus(id, 'stopped')
    this.deps.logger.info({ buddyId: id }, 'Buddy stopped')

    return this.deps.buddyDao.findById(id)
  }

  async restart(id: string) {
    await this.stop(id)
    return this.start(id)
  }

  /** Record a heartbeat from the buddy — marks it as running */
  async heartbeat(buddyId: string, buddyUserId: string) {
    // Verify the buddy exists and the buddy user matches
    const buddy = await this.deps.buddyDao.findById(buddyId)
    if (!buddy) {
      throw Object.assign(new Error('Buddy not found'), { status: 404 })
    }
    if (buddy.userId !== buddyUserId) {
      throw Object.assign(new Error('User does not match buddy'), { status: 403 })
    }

    return this.deps.buddyDao.updateHeartbeat(buddyId)
  }

  async delete(id: string) {
    const buddy = await this.deps.buddyDao.findById(id)
    if (!buddy) {
      throw Object.assign(new Error('Buddy not found'), { status: 404 })
    }

    if (buddy.status === 'running') {
      await this.stop(id)
    }

    // Delete the buddy record first (cascade deletes agent_policies)
    await this.deps.buddyDao.delete(id)

    // Delete the buddy user — cascade removes members entries from all servers
    await this.deps.userDao.delete(buddy.userId)
  }
}
