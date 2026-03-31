import chalk from 'chalk'

/**
 * Logger interface — used by service layer for dependency injection.
 * Services depend on this interface, not the concrete implementation.
 */
export interface Logger {
  info(msg: string): void
  success(msg: string): void
  warn(msg: string): void
  error(msg: string): void
  step(msg: string): void
  dim(msg: string): void
  table(rows: Array<Record<string, string>>): void
}

export const log: Logger = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  error: (msg: string) => console.error(chalk.red('✗'), msg),
  step: (msg: string) => console.log(chalk.cyan('▸'), msg),
  dim: (msg: string) => console.log(chalk.dim(msg)),
  table: (rows: Array<Record<string, string>>) => {
    if (rows.length === 0) return
    const keys = Object.keys(rows[0]!)
    const widths = keys.map((k) => Math.max(k.length, ...rows.map((r) => (r[k] ?? '').length)))
    const header = keys.map((k, i) => k.padEnd(widths[i]!)).join('  ')
    const separator = widths.map((w) => '─'.repeat(w)).join('──')
    console.log(chalk.bold(header))
    console.log(chalk.dim(separator))
    for (const row of rows) {
      console.log(keys.map((k, i) => (row[k] ?? '').padEnd(widths[i]!)).join('  '))
    }
  },
}
