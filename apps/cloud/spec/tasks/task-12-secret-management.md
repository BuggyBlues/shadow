# Task 12: Secret Management API + Storage

> **Priority**: P1 (Wave 2 — parallel with plugin tasks)  
> **Depends on**: Task 01 (core framework)  
> **Estimated**: ~500 lines  
> **Output**: `src/secrets/`, new API routes in `src/interfaces/http/server.ts`

## Context

Read first:
- `spec/plugin-system-architecture.md` — Section 7 (Secret Management)
- `src/interfaces/http/server.ts` — Current API endpoints (understand the pattern)

## Objective

Build a secret management subsystem that allows the console to configure plugin credentials, stores them securely, and syncs them to K8s Secrets during deployment.

## Deliverables

### 1. `src/secrets/store.ts` (~120 lines)

Secret storage layer:

```typescript
export interface SecretStore {
  /** List all secret groups (plugin → keys), no values */
  listGroups(): Promise<SecretGroup[]>

  /** Get secret value (returns undefined if not set) */
  get(pluginId: string, key: string): Promise<string | undefined>

  /** Get all secrets for a plugin */
  getAll(pluginId: string): Promise<Record<string, string>>

  /** Set a secret */
  set(pluginId: string, key: string, value: string): Promise<void>

  /** Delete a secret */
  delete(pluginId: string, key: string): Promise<void>

  /** Delete all secrets for a plugin */
  deleteAll(pluginId: string): Promise<void>
}

export interface SecretGroup {
  pluginId: string
  keys: string[]
  /** Whether all required keys (from manifest) are set */
  complete: boolean
}
```

**Storage backend**: File-based, stored in `~/.shadowob/secrets.json`. The file contains:
```json
{
  "version": 1,
  "plugins": {
    "slack": { "SLACK_BOT_TOKEN": "xoxb-encrypted...", "SLACK_SIGNING_SECRET": "..." },
    "github": { "GITHUB_TOKEN": "ghp_encrypted..." }
  }
}
```

**Encryption**: Use Node.js `crypto.createCipheriv` with a key derived from the machine ID (or OS keychain if available). For v1, AES-256-GCM with a deterministic machine key is acceptable. **Do NOT store plaintext secrets.**

```typescript
export function createFileSecretStore(filePath?: string): SecretStore
```

Default path: `~/.shadowob/secrets.json`

### 2. `src/secrets/k8s-sync.ts` (~80 lines)

Sync secrets to K8s:

```typescript
/**
 * Generate K8s Secret manifests for all configured plugins.
 * Called during deploy to create/update secrets in the cluster.
 */
export function buildK8sSecretManifests(
  secretStore: SecretStore,
  pluginRegistry: PluginRegistry,
  namespace: string,
): Promise<K8sSecret[]>

/**
 * Resolve secret references in config.
 * Handles: ${env:VAR}, ${secret:pluginId/key}
 */
export function resolveSecretRef(
  ref: string,
  secretStore: SecretStore,
  env: Record<string, string | undefined>,
): Promise<string | undefined>
```

K8s Secret naming: `shadow-cloud-{pluginId}-secrets` per plugin.

### 3. `src/secrets/index.ts` (~20 lines)

Barrel export:

```typescript
export { createFileSecretStore, type SecretStore, type SecretGroup } from './store.js'
export { buildK8sSecretManifests, resolveSecretRef } from './k8s-sync.js'
```

### 4. API Routes in `src/interfaces/http/server.ts` (~200 lines)

Add these endpoints to the existing HTTP server:

```
GET    /api/secrets
  → Returns SecretGroup[] (keys and completion status, NO values)
  → Response: { groups: [{ pluginId, keys, complete }] }

PUT    /api/secrets/:pluginId
  → Body: { secrets: Record<string, string> }
  → Sets all secrets for a plugin (overwrites)
  → Response: { ok: true }

DELETE /api/secrets/:pluginId
  → Deletes all secrets for a plugin
  → Response: { ok: true }

POST   /api/secrets/test
  → Body: { pluginId: string }
  → Resolves secrets and runs plugin.validate() to test connection
  → Response: { valid: boolean, errors: [] }
```

**Security**:
- All secret endpoints require auth token (same as existing API auth)
- `GET /api/secrets` NEVER returns secret values, only key names
- `PUT` validates that provided keys match the plugin manifest auth fields
- Rate limit: max 10 requests per minute to secret endpoints

### 5. Integration with deploy flow

Update the existing `POST /api/deploy` endpoint to:
1. Resolve secret references before deployment
2. Generate K8s Secret manifests alongside existing manifests
3. Apply secrets to the cluster before deploying pods

This means updating the deploy handler to call `buildK8sSecretManifests()` and include those manifests in the deployment.

## Acceptance Criteria

1. `createFileSecretStore()` reads/writes encrypted `~/.shadowob/secrets.json`
2. Secrets are encrypted at rest (AES-256-GCM minimum)
3. API endpoints work: list groups, set/delete secrets, test connection
4. `GET /api/secrets` never returns values
5. `buildK8sSecretManifests()` generates valid K8s Secret YAML
6. `resolveSecretRef()` handles `${env:VAR}` and `${secret:pluginId/key}` patterns
7. Unit tests: `__tests__/secrets/store.test.ts` (~80 lines)
   - Test CRUD operations
   - Test encryption round-trip
   - Test K8s manifest generation
8. Unit tests: `__tests__/secrets/resolve.test.ts` (~40 lines)
   - Test `${env:VAR}` resolution
   - Test `${secret:pluginId/key}` resolution

## Files Created

```
src/secrets/
├── index.ts
├── store.ts
└── k8s-sync.ts

__tests__/secrets/store.test.ts
__tests__/secrets/resolve.test.ts
```

## Files Modified

```
src/interfaces/http/server.ts   — Add 4 secret API endpoints
```
