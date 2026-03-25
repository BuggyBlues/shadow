import { type ChildProcess, fork } from 'node:child_process'
import { resolve } from 'node:path'
import { app, ipcMain } from 'electron'
import { resolveElectronNodeBinary } from './openclaw/service/paths'

interface ManagedProcess {
  process: ChildProcess
  name: string
  startedAt: number
}

const managedProcesses = new Map<string, ManagedProcess>()
let processIdCounter = 0

export function setupProcessManager(): void {
  ipcMain.handle(
    'desktop:startBuddy',
    (_event, args: { name: string; scriptPath: string; args?: string[] }) => {
      // Validate scriptPath is within the app directory
      const resolvedPath = resolve(args.scriptPath)
      const appPath = app.getAppPath()
      if (!resolvedPath.startsWith(appPath)) {
        throw new Error('Buddy script must be within the application directory')
      }

      const id = `buddy-${++processIdCounter}`
      const child = fork(resolvedPath, args.args ?? [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        silent: true,
        execPath: resolveElectronNodeBinary(),
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', ELECTRON_NO_ATTACH_CONSOLE: '1' },
      })

      managedProcesses.set(id, {
        process: child,
        name: args.name,
        startedAt: Date.now(),
      })

      child.on('exit', (code) => {
        managedProcesses.delete(id)
        _event.sender.send('desktop:buddyExited', { id, code })
      })

      child.on('error', (err) => {
        console.error(`Buddy process ${id} error:`, err)
        managedProcesses.delete(id)
        _event.sender.send('desktop:buddyExited', { id, code: 1 })
      })

      child.on('message', (msg) => {
        _event.sender.send('desktop:buddyMessage', { id, message: msg })
      })

      return { id, pid: child.pid }
    },
  )

  ipcMain.handle('desktop:stopBuddy', (_event, processId: string) => {
    const managed = managedProcesses.get(processId)
    if (managed) {
      managed.process.kill('SIGTERM')
      managedProcesses.delete(processId)
    }
  })

  ipcMain.handle('desktop:getBuddyStatus', (_event, processId: string) => {
    const managed = managedProcesses.get(processId)
    if (!managed) return { running: false }
    return {
      running: !managed.process.killed,
      name: managed.name,
      pid: managed.process.pid,
      uptime: Date.now() - managed.startedAt,
    }
  })

  ipcMain.handle('desktop:listBuddies', () => {
    return Array.from(managedProcesses.entries()).map(([id, m]) => ({
      id,
      name: m.name,
      pid: m.process.pid,
      running: !m.process.killed,
      uptime: Date.now() - m.startedAt,
    }))
  })
}

export function killAllBuddies(): void {
  for (const [id, managed] of managedProcesses) {
    managed.process.kill('SIGTERM')
    managedProcesses.delete(id)
  }
}
