import { type ChildProcess, spawn } from 'node:child_process'
import type {
  AgentConfig,
  AgentResponse,
  ChannelMessage,
  IAgentKernel,
  MCPToolDefinition,
} from '../types'
import { BaseAdapter, BaseKernel } from './base.adapter'

/**
 * MCP 标准协议适配器
 * 通过 stdio 启动 MCP Server 子进程，使用 JSON-RPC 2.0 协议通信
 */
export class MCPAdapter extends BaseAdapter {
  readonly kernelType = 'mcp-server'
  protected readonly cliCommand = 'npx'

  async createKernel(_config: AgentConfig): Promise<IAgentKernel> {
    const kernel = new MCPKernel()
    return kernel
  }

  /** MCP 适配器可用性取决于具体的 MCP server 命令 */
  override async isAvailable(): Promise<boolean> {
    return true
  }
}

class MCPKernel extends BaseKernel {
  readonly name = 'mcp-kernel'
  readonly version = '1.0.0'

  private mcpProcess: ChildProcess | null = null
  private tools: MCPToolDefinition[] = []
  private requestId = 0
  private pendingRequests = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
  >()
  private buffer = ''

  override async init(config: AgentConfig): Promise<void> {
    await super.init(config)
    this._capabilities = config.capabilities ?? ['chat', 'tools']

    // 启动 MCP Server 子进程
    const command = config.mcpCommand ?? config.cliPath
    const args = config.mcpArgs ?? config.args ?? []

    this.mcpProcess = spawn(command, args, {
      cwd: config.workDir,
      env: { ...process.env, ...config.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    this.processStartedAt = new Date().toISOString()

    // 监听 stdout（JSON-RPC 响应）
    this.mcpProcess.stdout?.on('data', (data: Buffer) => {
      this.buffer += data.toString()
      this.processBuffer()
    })

    this.mcpProcess.on('error', (error) => {
      for (const [, pending] of this.pendingRequests) {
        pending.reject(error)
      }
      this.pendingRequests.clear()
    })

    this.mcpProcess.on('exit', () => {
      for (const [, pending] of this.pendingRequests) {
        pending.reject(new Error('MCP server process exited'))
      }
      this.pendingRequests.clear()
    })

    // 初始化 MCP：发送 initialize 请求
    try {
      await this.sendJsonRpc('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'shadow-agenthub', version: '1.0.0' },
      })

      // 列出可用 tools
      const toolsResult = (await this.sendJsonRpc('tools/list', {})) as {
        tools?: MCPToolDefinition[]
      }
      this.tools = toolsResult?.tools ?? []
    } catch {
      // MCP 服务器可能不支持标准初始化，降级处理
    }
  }

  async onMessage(message: ChannelMessage): Promise<AgentResponse> {
    if (!this.mcpProcess || this.mcpProcess.exitCode !== null) {
      return { content: '[MCP Agent] Error: MCP server not running' }
    }

    try {
      // 如果有 tools，尝试调用最匹配的 tool
      if (this.tools.length > 0) {
        const result = (await this.sendJsonRpc('tools/call', {
          name: this.tools[0].name,
          arguments: { input: message.content },
        })) as { content?: Array<{ text?: string; type?: string }> }

        const text = result?.content
          ?.filter((c) => c.type === 'text')
          .map((c) => c.text)
          .join('\n')

        return { content: text || '[MCP Agent] No text response from tool' }
      }

      // 无工具时，直接通过 stdin 发送消息
      return this.sendViaStdin(message.content)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return { content: `[MCP Agent] Error: ${msg}` }
    }
  }

  override getTools(): MCPToolDefinition[] {
    return this.tools
  }

  override async destroy(): Promise<void> {
    if (this.mcpProcess && this.mcpProcess.exitCode === null) {
      this.mcpProcess.kill('SIGTERM')
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          this.mcpProcess?.kill('SIGKILL')
          resolve()
        }, 5000)
        this.mcpProcess?.on('exit', () => {
          clearTimeout(timer)
          resolve()
        })
      })
    }
    this.mcpProcess = null
    this.pendingRequests.clear()
    this.tools = []
    await super.destroy()
  }

  /** 发送 JSON-RPC 2.0 请求 */
  private sendJsonRpc(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.mcpProcess?.stdin) {
        return reject(new Error('MCP server stdin not available'))
      }

      const id = ++this.requestId
      const request = JSON.stringify({ jsonrpc: '2.0', id, method, params })

      this.pendingRequests.set(id, { resolve, reject })

      // 超时处理
      const timeout = this.config?.timeout ?? 30_000
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`MCP request timeout: ${method}`))
        }
      }, timeout)

      this.mcpProcess.stdin.write(`${request}\n`)
    })
  }

  /** 处理缓冲区中的 JSON-RPC 响应 */
  private processBuffer(): void {
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const response = JSON.parse(line) as {
          id?: number
          result?: unknown
          error?: { message: string }
        }
        if (response.id != null && this.pendingRequests.has(response.id)) {
          const pending = this.pendingRequests.get(response.id)!
          this.pendingRequests.delete(response.id)
          if (response.error) {
            pending.reject(new Error(response.error.message))
          } else {
            pending.resolve(response.result)
          }
        }
      } catch {
        // 忽略非 JSON 行
      }
    }
  }

  /** 通过 stdin/stdout 直接发送消息 */
  private sendViaStdin(content: string): Promise<AgentResponse> {
    return new Promise((resolve) => {
      if (!this.mcpProcess?.stdin || !this.mcpProcess?.stdout) {
        resolve({ content: '[MCP Agent] Error: process stdio not available' })
        return
      }

      let output = ''
      const onData = (data: Buffer) => {
        output += data.toString()
      }

      this.mcpProcess.stdout.on('data', onData)

      this.mcpProcess.stdin.write(`${content}\n`)

      // 给 MCP server 一定时间响应
      setTimeout(() => {
        this.mcpProcess?.stdout?.removeListener('data', onData)
        resolve({ content: output.trim() || '[MCP Agent] No response' })
      }, 5000)
    })
  }
}
