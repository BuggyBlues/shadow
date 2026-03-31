/**
 * CLI: shadowob-cloud console — one-click start console (serve + open browser).
 */

import { exec } from 'node:child_process'
import { Command } from 'commander'
import type { ServiceContainer } from '../../services/container.js'

export function createConsoleCommand(container: ServiceContainer) {
  return new Command('console')
    .description('Start the Shadow Cloud Console and open it in your browser')
    .option('-p, --port <number>', 'Port to listen on', '3004')
    .option('-n, --namespace <ns...>', 'Kubernetes namespace(s) to watch', ['shadowob-cloud'])
    .option('--no-open', 'Do not open browser automatically')
    .action(async (options: { port: string; namespace: string[]; open: boolean }) => {
      const port = options.port
      const url = `http://localhost:${port}`

      // Open browser after a short delay to let the server start
      if (options.open) {
        setTimeout(() => {
          container.logger.info(`Opening ${url} in browser...`)
          const cmd =
            process.platform === 'darwin'
              ? 'open'
              : process.platform === 'win32'
                ? 'start'
                : 'xdg-open'
          exec(`${cmd} ${url}`, (err) => {
            if (err) container.logger.dim('Could not open browser automatically')
          })
        }, 1500)
      }

      // Delegate to serve command
      const { createServeCommand } = await import('./serve.command.js')
      const serve = createServeCommand(container)
      await serve.parseAsync(
        ['--port', port, '--namespace', ...options.namespace, '--host', '127.0.0.1'],
        { from: 'user' },
      )
    })
}
