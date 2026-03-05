import type { ServerDao } from '../dao/server.dao'

export class PermissionService {
  constructor(private deps: { serverDao: ServerDao }) {}

  async requireMember(serverId: string, userId: string) {
    const member = await this.deps.serverDao.getMember(serverId, userId)
    if (!member) {
      throw Object.assign(new Error('Not a member of this server'), { status: 403 })
    }
    return member
  }

  async requireRole(serverId: string, userId: string, minRole: 'owner' | 'admin' | 'member') {
    const member = await this.requireMember(serverId, userId)
    const hierarchy: Record<string, number> = { member: 0, admin: 1, owner: 2 }

    if (hierarchy[member.role] < hierarchy[minRole]) {
      throw Object.assign(new Error(`Requires ${minRole} role or higher`), { status: 403 })
    }

    return member
  }
}
