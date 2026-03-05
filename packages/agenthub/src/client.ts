import { EventEmitter } from 'node:events'
import type { AgentResponse, ChannelMessage } from './types'

export interface AgentClientOptions {
  serverUrl: string
  agentId: string
  token: string
  autoReconnect?: boolean
  reconnectInterval?: number
}

/**
 * Agent WebSocket 客户端
 * 用于 Agent 进程连接到 Shadow Server
 */
export class AgentClient extends EventEmitter {
  private socket: import('socket.io-client').Socket | null = null
  private options: AgentClientOptions
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: AgentClientOptions) {
    super()
    this.options = {
      autoReconnect: true,
      reconnectInterval: 5000,
      ...options,
    }
  }

  /** 连接到 Shadow Server */
  async connect(): Promise<void> {
    const { io } = await import('socket.io-client')

    this.socket = io(this.options.serverUrl, {
      auth: {
        agentId: this.options.agentId,
        token: this.options.token,
      },
      transports: ['websocket'],
    })

    this.socket.on('connect', () => {
      this.emit('connected')
    })

    this.socket.on('disconnect', (reason) => {
      this.emit('disconnected', reason)
      if (this.options.autoReconnect && reason !== 'io client disconnect') {
        this.scheduleReconnect()
      }
    })

    this.socket.on('message:new', (message: ChannelMessage) => {
      this.emit('message', message)
    })

    this.socket.on('error', (error: Error) => {
      this.emit('error', error)
    })
  }

  /** 发送消息到频道 */
  async sendMessage(channelId: string, content: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Not connected to server')
    }

    this.socket.emit('agent:message', {
      agentId: this.options.agentId,
      channelId,
      content,
    })
  }

  /** 发送带附件的响应 */
  async sendResponse(channelId: string, response: AgentResponse): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Not connected to server')
    }

    this.socket.emit('agent:response', {
      agentId: this.options.agentId,
      channelId,
      ...response,
    })
  }

  /** 断开连接 */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.socket?.disconnect()
    this.socket = null
  }

  /** 是否已连接 */
  get connected(): boolean {
    return this.socket?.connected ?? false
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.emit('reconnecting')
      void this.connect()
    }, this.options.reconnectInterval)
  }
}
