import type { AgentConfig, AgentResponse, ChannelMessage, IAgentKernel } from '../types'
import { BaseAdapter, BaseKernel } from './base.adapter'

/**
 * Claude Code CLI 适配器
 * 封装 `claude` 命令行工具（Anthropic Claude Code CLI）
 * 通过 `claude -p <prompt>` 方式与 Claude Code 交互
 */
export class ClaudeAdapter extends BaseAdapter {
  readonly kernelType = 'claude-code'
  protected readonly cliCommand = 'claude'

  async createKernel(_config: AgentConfig): Promise<IAgentKernel> {
    const kernel = new ClaudeCodeKernel()
    return kernel
  }
}

class ClaudeCodeKernel extends BaseKernel {
  readonly name = 'claude-code-kernel'
  readonly version = '1.0.0'

  override async init(config: AgentConfig): Promise<void> {
    await super.init(config)
    this._capabilities = config.capabilities ?? ['chat', 'code-gen', 'file-access']
  }

  async onMessage(message: ChannelMessage): Promise<AgentResponse> {
    if (!this.config) {
      return { content: '[Claude Code] Error: not initialized' }
    }

    try {
      const cliPath = this.config.cliPath || 'claude'
      const args = [
        '-p', // print mode (non-interactive)
        message.content,
        ...(this.config.args ?? []),
      ]

      const { stdout, stderr } = await this.execCli(cliPath, args)

      const output = stdout.trim() || stderr.trim()
      if (!output) {
        return { content: '[Claude Code] No output returned' }
      }

      return { content: output }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return { content: `[Claude Code] Error: ${msg}` }
    }
  }
}
