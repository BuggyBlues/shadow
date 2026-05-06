import type { AgentDao } from '../dao/agent.dao'
import type { ServerDao } from '../dao/server.dao'
import type { UserDao } from '../dao/user.dao'
import { apiError } from '../lib/api-error'
import type { ShopService } from './shop.service'

export class ShopScopeService {
  constructor(
    private deps: {
      shopService: ShopService
      serverDao: ServerDao
      userDao: UserDao
      agentDao: AgentDao
    },
  ) {}

  async getOrCreateServerShop(serverId: string) {
    const server = await this.deps.serverDao.findById(serverId)
    if (!server) throw apiError('SERVER_NOT_FOUND', 404)
    return this.deps.shopService.getOrCreateShop(server.id, server.name)
  }

  async getOrCreatePersonalShop(ownerUserId: string) {
    const owner = await this.deps.userDao.findById(ownerUserId)
    if (!owner) throw apiError('USER_NOT_FOUND', 404)
    return this.deps.shopService.getOrCreatePersonalShop(
      owner.id,
      owner.displayName || owner.username,
    )
  }

  async requireVisibleShop(shopId: string, viewerUserId: string) {
    const shop = await this.deps.shopService.getShopById(shopId)
    if (!shop || shop.status !== 'active') {
      throw apiError('SHOP_NOT_FOUND', 404)
    }
    if (shop.scopeKind === 'user' && !viewerUserId) {
      throw apiError('AUTH_REQUIRED', 401)
    }
    return shop
  }

  async requireShopManager(shopId: string, actorUserId: string) {
    const shop = await this.deps.shopService.getShopById(shopId)
    if (!shop) throw apiError('SHOP_NOT_FOUND', 404)
    if (shop.scopeKind === 'user') {
      if (shop.ownerUserId === actorUserId) {
        return shop
      }
      const ownerAgent = shop.ownerUserId
        ? await this.deps.agentDao.findByUserId(shop.ownerUserId)
        : null
      if (ownerAgent?.ownerId !== actorUserId) {
        throw apiError('SHOP_MANAGE_FORBIDDEN', 403)
      }
      return shop
    }
    if (shop.serverId) {
      const server = await this.deps.serverDao.findById(shop.serverId)
      if (server?.ownerId === actorUserId) return shop
    }
    throw apiError('SHOP_MANAGE_FORBIDDEN', 403)
  }
}
