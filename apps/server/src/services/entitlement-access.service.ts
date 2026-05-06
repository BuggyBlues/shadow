import type { EntitlementDao } from '../dao/entitlement.dao'

type EntitlementAccessStatus =
  | 'active'
  | 'not_found'
  | 'expired'
  | 'cancelled'
  | 'revoked'
  | 'renewal_failed'
  | 'pending_force_majeure_review'
  | 'inactive'

type EntitlementAccessRecord = {
  id: string
  status: string
  capability: string
  expiresAt: Date | null
  isActive: boolean
}

function summarize(entitlement: EntitlementAccessRecord | null) {
  if (!entitlement) return null
  return {
    id: entitlement.id,
    status: entitlement.status,
    capability: entitlement.capability,
    expiresAt: entitlement.expiresAt,
  }
}

function accessStatus(entitlement: EntitlementAccessRecord | null): EntitlementAccessStatus {
  if (!entitlement) return 'not_found'
  if (!entitlement.isActive) return 'inactive'
  if (entitlement.status !== 'active') return entitlement.status as EntitlementAccessStatus
  if (entitlement.expiresAt && entitlement.expiresAt.getTime() <= Date.now()) return 'expired'
  return 'active'
}

export class EntitlementAccessService {
  constructor(private deps: { entitlementDao: EntitlementDao }) {}

  async checkResourceAccess(input: {
    userId: string
    resourceType: string
    resourceId: string
    capability?: string
    capabilities?: string[]
    serverId?: string | null
  }) {
    const capabilities = input.capabilities?.length
      ? input.capabilities
      : [input.capability ?? 'use']
    const entitlements = await this.deps.entitlementDao.findResourceEntitlements({
      userId: input.userId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      capabilities,
      serverId: input.serverId,
      limit: 10,
    })
    const active =
      entitlements.find((entitlement) => accessStatus(entitlement) === 'active') ?? null
    const fallback = active ?? entitlements[0] ?? null
    const status = accessStatus(fallback)

    return {
      allowed: status === 'active',
      status,
      reasonCode: status === 'active' ? null : `ENTITLEMENT_${status.toUpperCase()}`,
      entitlement: summarize(fallback),
    }
  }
}
