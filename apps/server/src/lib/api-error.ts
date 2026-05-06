export interface StructuredApiError extends Error {
  status?: number
  code?: string
  params?: Record<string, unknown>
}

export function apiError(
  code: string,
  status = 400,
  params?: Record<string, unknown>,
): StructuredApiError {
  const error = new Error(code) as StructuredApiError
  error.code = code
  error.status = status
  if (params) error.params = params
  return error
}
