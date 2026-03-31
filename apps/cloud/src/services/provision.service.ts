/**
 * ProvisionService — Shadow platform resource provisioning.
 *
 * Wraps provisioning/index.ts for creating servers, channels, buddies
 * and building provisioned environment variables.
 */

import type { CloudConfig } from '../config/schema.js'
import {
  buildProvisionedEnvVars,
  type ProvisionOptions,
  type ProvisionResult,
  provisionShadowResources,
} from '../provisioning/index.js'

export class ProvisionService {
  /** Provision all Shadow resources declared in the cloud config. */
  async provision(config: CloudConfig, options: ProvisionOptions): Promise<ProvisionResult> {
    return provisionShadowResources(config, options)
  }

  /** Build environment variables for an agent from provisioned resources. */
  buildEnvVars(
    agentId: string,
    config: CloudConfig,
    provision: ProvisionResult,
    serverUrl: string,
  ): Record<string, string> {
    return buildProvisionedEnvVars(agentId, config, provision, serverUrl)
  }
}
