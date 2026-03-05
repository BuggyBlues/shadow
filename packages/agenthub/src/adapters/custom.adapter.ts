import type { AgentConfig, AgentResponse, ChannelMessage, IAgentKernel } from '../types'
import { BaseAdapter, BaseKernel } from './base.adapter'

/**
 * 自定义 Agent 适配器
 * 封装任意 CLI 工具，通过子进程方式执行
 * 支持：自定义脚本、HTTP endpoint、任意可执行文件
 */
export class CustomAdapter extends BaseAdapter {
  readonly kernelType = 'custom'
  protected readonly cliCommand = 'sh' // custom 适配器依赖 shell

  async createKernel(_config: AgentConfig): Promise<IAgentKernel> {
    const kernel = new CustomKernel()
    return kernel
  }

  /** 自定义适配器始终可用 */
  override async isAvailable(): Promise<boolean> {
    return true
  }
}

class CustomKernel extends BaseKernel {
  readonly name = 'custom-kernel'
  readonly version = '1.0.0'

  override async init(config: AgentConfig): Promise<void> {
    await super.init(config)
    this._capabilities = config.capabilities ?? ['chat']
  }

  async onMessage(message: ChannelMessage): Promise<AgentResponse> {
    if (!this.config) {
      return { content: '[Custom Agent] Error: not initialized' }
    }

    try {
      const cliPath = this.config.cliPath
      if (!cliPath) {
        return { content: '[Custom Agent] Error: cliPath not configured' }
      }

      // 将消息内容作为参数传递给 CLI 工具
      const args = [...(this.config.args ?? []), message.content]

      const { stdout, stderr } = await this.execCli(cliPath, args)

      const output = stdout.trim() || stderr.trim()
      if (!output) {
        return { content: '[Custom Agent] No output returned' }
      }

      return { content: output }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return { content: `[Custom Agent] Error: ${msg}` }
    }
  }
}
