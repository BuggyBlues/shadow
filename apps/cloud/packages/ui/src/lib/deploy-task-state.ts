const ACTIVE_TASK_STATUSES = new Set([
  'pending',
  'running',
  'deploying',
  'destroying',
  'cancelling',
])
const CANCEL_REQUESTABLE_TASK_STATUSES = new Set(['pending', 'running', 'deploying', 'destroying'])

export function isTaskActive(status: string | undefined): boolean {
  return typeof status === 'string' && ACTIVE_TASK_STATUSES.has(status)
}

export function canRequestTaskCancel(status: string | undefined): boolean {
  return typeof status === 'string' && CANCEL_REQUESTABLE_TASK_STATUSES.has(status)
}
