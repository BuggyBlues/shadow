import type { AgentConfig, AgentResponse, ChannelMessage, IAgentKernel } from '../types'
import { BaseAdapter, BaseKernel } from './base.adapter'

/**
 * Cursor CLI 适配器
 * 封装 Cursor 编辑器的 CLI 工具
 */
export class CursorAdapter extends BaseAdapter {
  readonly kernelType = 'cursor'
  protected readonly cliCommand = 'cursor'

  async createKernel(_config: AgentConfig): Promise<IAgentKernel> {
    const kernel = new CursorKernel()
    return kernel
  }
}

class CursorKernel extends BaseKernel {
  readonly name = 'cursor-kernel'
  readonly version = '1.0.0'

  override async init(config: AgentConfig): Promise<void> {
    await super.init(config)
    this._capabilities = config.capabilities ?? ['chat', 'code-gen', 'file-access']
  }

  async onMessage(message: ChannelMessage): Promise<AgentResponse> {
    if (!this.config) {
      return { content: '[Cursor] Error: not initialized' }
    }

    try {
      const cliPath = this.config.cliPath || 'cursor'
      const args = [...(this.config.args ?? []), message.content]

      const { stdout, stderr } = await this.execCli(cliPath, args)

      const output = stdout.trim() || stderr.trim()
      if (!output) {
        return { content: '[Cursor] No output returned' }
      }

      return { content: output }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return { content: `[Cursor] Error: ${msg}` }
    }
  }
}
