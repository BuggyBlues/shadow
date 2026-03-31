/**
 * ManifestService — K8s manifest generation.
 *
 * Wraps infra/index.ts functions for pure data transformation
 * (config → K8s resource definitions) without Pulumi dependencies.
 */

import { buildManifests, createInfraProgram, type InfraOptions } from '../infra/index.js'

export class ManifestService {
  /** Build K8s resource definitions as plain objects (serializable to YAML/JSON). */
  build(options: InfraOptions): Array<Record<string, unknown>> {
    return buildManifests(options)
  }

  /** Create a Pulumi program function for programmatic deployments. */
  createProgram(options: InfraOptions) {
    return createInfraProgram(options)
  }
}
