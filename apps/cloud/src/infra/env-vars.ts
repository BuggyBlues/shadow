type NamedEnvVar = { name?: unknown }

/**
 * Kubernetes rejects duplicated `env[].name` entries. Runtime plugins are
 * allowed to override base environment variables, so keep the later value while
 * preserving the original position for stable manifests.
 */
export function dedupeEnvVars<T extends NamedEnvVar>(envVars: T[]): T[] {
  const result: T[] = []
  const indexByName = new Map<string, number>()

  for (const envVar of envVars) {
    const name = envVar.name
    if (typeof name !== 'string' || name.length === 0) {
      result.push(envVar)
      continue
    }

    const existingIndex = indexByName.get(name)
    if (existingIndex === undefined) {
      indexByName.set(name, result.length)
      result.push(envVar)
      continue
    }

    result[existingIndex] = envVar
  }

  return result
}
