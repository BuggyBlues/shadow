export function randomFixedDigits(length: number): string {
  const size = Number.isFinite(length) ? Math.max(1, Math.floor(length)) : 6
  const max = 10 ** Math.min(size, 15)
  const value = Math.floor(Math.random() * max)
  return value.toString().padStart(size, '0')
}

export function sanitizeSlugPart(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
