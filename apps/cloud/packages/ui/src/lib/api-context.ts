/**
 * ApiClientContext — dependency injection for the API client.
 *
 * Design:
 * - Default value is the local `api` object (dashboard mode pointing at /api)
 * - web-saas wraps the app with <ApiClientProvider value={saasApiAdapter}> to
 *   override with the SaaS API client pointing at /api/cloud-saas/*
 * - All pages use `useApiClient()` to get the current client; they do NOT
 *   import `api` directly, enabling zero-duplication mode switching.
 */

import { createContext, useContext } from 'react'
import { api } from './api'

// The shared CloudApiClient type (exported from api.ts)
export type { CloudApiClient } from './api'

// Context — default is the local dashboard api
// biome-ignore lint/suspicious/noExplicitAny: intentional loose typing for the context default
export const ApiClientContext = createContext<typeof api>(api)

/**
 * Hook to get the current API client.
 * In dashboard mode: returns the local Hono API client.
 * In web-saas mode: returns the SaaS API adapter.
 */
export function useApiClient() {
  return useContext(ApiClientContext)
}
