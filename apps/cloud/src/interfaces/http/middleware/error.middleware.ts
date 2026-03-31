/**
 * Error middleware — global error handler.
 */

import type { Context } from 'hono'
import type { Logger } from '../../../utils/logger.js'

export function createErrorHandler(logger: Logger) {
  return (err: Error, c: Context) => {
    logger.error(`Request error: ${err.message}`)
    return c.json({ error: err.message }, 500)
  }
}
