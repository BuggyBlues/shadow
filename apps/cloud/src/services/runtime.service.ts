/**
 * RuntimeService — runtime adapter registry access.
 *
 * Wraps runtimes/index.ts for querying registered runtime adapters.
 */

import '../runtimes/loader.js'
import {
  getAllRuntimes,
  getRuntime,
  getRuntimeIds,
  type RuntimeAdapter,
} from '../runtimes/index.js'

export class RuntimeService {
  /** Get a runtime adapter by ID. Throws if not found. */
  get(id: string): RuntimeAdapter {
    return getRuntime(id)
  }

  /** Get all registered runtime adapters. */
  getAll(): RuntimeAdapter[] {
    return getAllRuntimes()
  }

  /** Get all registered runtime IDs. */
  getIds(): string[] {
    return getRuntimeIds()
  }
}
