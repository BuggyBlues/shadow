import type { EntitlementDao } from '../dao/entitlement.dao'
import type { entitlements, products, shops } from '../db/schema'
import { apiError } from '../lib/api-error'
import { resolveProductEntitlementResource } from './entitlement-resource'

type EntitlementRecord = typeof entitlements.$inferSelect
type ProductRecord = typeof products.$inferSelect
type ShopRecord = typeof shops.$inferSelect

type ProvisioningStatus = 'provisioned' | 'failed'

export interface EntitlementProvisioningState {
  status: ProvisioningStatus
  code: string
  provisionedAt?: string
  checkedAt?: string
  resourceType?: string | null
  resourceId?: string | null
  capability?: string | null
}

function isActiveEntitlement(entitlement: EntitlementRecord) {
  return (
    entitlement.isActive &&
    entitlement.status === 'active' &&
    (!entitlement.expiresAt || entitlement.expiresAt.getTime() > Date.now())
  )
}

export class EntitlementProvisionerService {
  constructor(
    private deps: {
      entitlementDao: EntitlementDao
    },
  ) {}

  async validateProductConfig(input: { product: ProductRecord; shop: ShopRecord }) {
    const resource = resolveProductEntitlementResource(input.product)
    if (!resource) {
      throw apiError('ENTITLEMENT_PRODUCT_CONFIG_MISSING', 400)
    }

    return {
      serverId: input.shop.serverId ?? null,
      resourceType: resource.resourceType,
      resourceId: resource.resourceId,
      capability: resource.capability,
    }
  }

  async provision(entitlementId: string) {
    const entitlement = await this.deps.entitlementDao.findById(entitlementId)
    if (!entitlement) throw apiError('ENTITLEMENT_NOT_FOUND', 404)
    const provisioning = await this.computeProvisioning(entitlement)
    return this.updateProvisioning(entitlement, provisioning)
  }

  async verify(entitlementId: string) {
    const entitlement = await this.deps.entitlementDao.findById(entitlementId)
    if (!entitlement) throw apiError('ENTITLEMENT_NOT_FOUND', 404)
    const provisioning = await this.computeProvisioning(entitlement)
    return {
      active: isActiveEntitlement(entitlement),
      entitlement,
      provisioning,
    }
  }

  private async computeProvisioning(
    entitlement: EntitlementRecord,
  ): Promise<EntitlementProvisioningState> {
    const now = new Date().toISOString()
    if (!isActiveEntitlement(entitlement)) {
      return {
        status: 'failed',
        code: 'ENTITLEMENT_NOT_ACTIVE',
        checkedAt: now,
        resourceType: entitlement.resourceType,
        resourceId: entitlement.resourceId,
        capability: entitlement.capability,
      }
    }

    return {
      status: 'provisioned',
      code: 'RESOURCE_ENTITLEMENT_RECORDED',
      provisionedAt: now,
      checkedAt: now,
      resourceType: entitlement.resourceType,
      resourceId: entitlement.resourceId,
      capability: entitlement.capability,
    }
  }

  private async updateProvisioning(
    entitlement: EntitlementRecord,
    provisioning: EntitlementProvisioningState,
  ) {
    const metadata = {
      ...(entitlement.metadata ?? {}),
      provisioning,
    }
    const updated = await this.deps.entitlementDao.update(entitlement.id, { metadata })
    return {
      active: updated ? isActiveEntitlement(updated) : isActiveEntitlement(entitlement),
      entitlement: updated ?? entitlement,
      provisioning,
    }
  }
}
