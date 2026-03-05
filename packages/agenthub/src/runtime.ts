import type { AgentConfig } from './types'

export interface ContainerOptions {
  image: string
  name: string
  env?: Record<string, string>
  ports?: Array<{ host: number; container: number }>
  volumes?: Array<{ host: string; container: string }>
  memory?: number // bytes
  cpus?: number
}

/**
 * Agent 容器运行时管理
 * 通过 Docker 隔离运行 Agent
 */
export class AgentRuntime {
  private docker: import('dockerode') | null = null

  /** 初始化 Docker 客户端 */
  async init(): Promise<void> {
    try {
      const Dockerode = (await import('dockerode')).default
      this.docker = new Dockerode()
      await this.docker.ping()
    } catch {
      this.docker = null
    }
  }

  /** 检查 Docker 是否可用 */
  isAvailable(): boolean {
    return this.docker !== null
  }

  /** 创建并启动容器 */
  async startContainer(options: ContainerOptions): Promise<string> {
    if (!this.docker) {
      throw new Error('Docker is not available')
    }

    const container = await this.docker.createContainer({
      Image: options.image,
      name: options.name,
      Env: options.env ? Object.entries(options.env).map(([k, v]) => `${k}=${v}`) : undefined,
      HostConfig: {
        PortBindings: options.ports?.reduce(
          (acc, p) => {
            acc[`${p.container}/tcp`] = [{ HostPort: String(p.host) }]
            return acc
          },
          {} as Record<string, Array<{ HostPort: string }>>,
        ),
        Binds: options.volumes?.map((v) => `${v.host}:${v.container}`),
        Memory: options.memory,
        NanoCpus: options.cpus ? options.cpus * 1e9 : undefined,
      },
    })

    await container.start()
    return container.id
  }

  /** 停止并删除容器 */
  async stopContainer(containerId: string): Promise<void> {
    if (!this.docker) return

    try {
      const container = this.docker.getContainer(containerId)
      await container.stop({ t: 10 })
      await container.remove()
    } catch {
      // Container may already be stopped/removed
    }
  }

  /** 获取容器日志 */
  async getContainerLogs(containerId: string, tail = 100): Promise<string> {
    if (!this.docker) {
      throw new Error('Docker is not available')
    }

    const container = this.docker.getContainer(containerId)
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
    })

    return logs.toString()
  }

  /** 检查容器状态 */
  async getContainerStatus(containerId: string): Promise<'running' | 'stopped' | 'not-found'> {
    if (!this.docker) return 'not-found'

    try {
      const container = this.docker.getContainer(containerId)
      const info = await container.inspect()
      return info.State.Running ? 'running' : 'stopped'
    } catch {
      return 'not-found'
    }
  }

  /** 根据 Agent 配置构建容器选项 */
  buildContainerOptions(agentId: string, config: AgentConfig): ContainerOptions {
    return {
      image: (config.image as string) ?? 'shadow-agent:latest',
      name: `shadow-agent-${agentId}`,
      env: {
        AGENT_ID: agentId,
        AGENT_NAME: config.name,
        AGENT_KERNEL_TYPE: config.kernelType,
        CLI_PATH: config.cliPath,
        ...(config.workDir ? { WORK_DIR: config.workDir } : {}),
        ...config.env,
      },
      memory: 512 * 1024 * 1024, // 512MB
      cpus: 0.5,
    }
  }
}
