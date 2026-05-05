import { SHADOW_PLAY_SERVER_TEMPLATE } from '@shadowob/shared/play-catalog'
import type { AppContainer } from '../container'

export async function seedPlayCatalogResources(container: AppContainer) {
  const userDao = container.resolve('userDao')
  const serverDao = container.resolve('serverDao')
  const serverService = container.resolve('serverService')
  const channelService = container.resolve('channelService')

  const adminEmail = process.env.ADMIN_EMAIL
  const owner =
    (adminEmail ? await userDao.findByEmail(adminEmail) : null) ??
    (await userDao.findAll(50, 0)).find((user) => user.isAdmin)
  if (!owner) {
    return { seeded: false, reason: 'admin-user-not-found' }
  }

  let server = await serverDao.findBySlug(SHADOW_PLAY_SERVER_TEMPLATE.slug)
  if (!server) {
    const created = await serverService.create(
      {
        name: SHADOW_PLAY_SERVER_TEMPLATE.name,
        slug: SHADOW_PLAY_SERVER_TEMPLATE.slug,
        description: SHADOW_PLAY_SERVER_TEMPLATE.description,
        isPublic: true,
      },
      owner.id,
    )
    if (!created) return { seeded: false, reason: 'server-create-failed' }
    server = created
  } else if (!server.isPublic || server.description !== SHADOW_PLAY_SERVER_TEMPLATE.description) {
    const updated = await serverDao.update(server.id, {
      isPublic: true,
      description: SHADOW_PLAY_SERVER_TEMPLATE.description,
    })
    if (updated) server = updated
  }

  const existingChannels = await channelService.getByServerId(server.id)
  const existingByName = new Map(existingChannels.map((channel) => [channel.name, channel]))
  const createdChannels: string[] = []
  const updatedChannels: string[] = []

  for (const channelTemplate of SHADOW_PLAY_SERVER_TEMPLATE.channels) {
    const existing = existingByName.get(channelTemplate.name)
    if (!existing) {
      const created = await channelService.create(
        server.id,
        {
          name: channelTemplate.name,
          type: 'text',
          topic: channelTemplate.topic,
        },
        owner.id,
      )
      if (created) existingByName.set(channelTemplate.name, created)
      createdChannels.push(channelTemplate.name)
      continue
    }
    if (existing.topic !== channelTemplate.topic) {
      await channelService.update(existing.id, { topic: channelTemplate.topic }, owner.id)
      updatedChannels.push(channelTemplate.name)
    }
  }

  return {
    seeded: true,
    serverId: server.id,
    serverSlug: server.slug,
    createdChannels,
    updatedChannels,
  }
}
