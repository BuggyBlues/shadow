import type { Logger } from 'pino'
import type { AgentDao } from '../dao/agent.dao'

export class AgentService {
  constructor(private deps: { agentDao: AgentDao; logger: Logger }) {}

  async create(data: {
    name: string
    kernelType: string
    config: Record<string, unknown>
    ownerId: string
  }) {
    // Create a bot user for the agent
    const username = `agent-${data.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`
    const botUser = await this.deps.agentDao.createBotUser({
      username,
      displayName: data.name,
    })

    // Create the agent record
    const agent = await this.deps.agentDao.create({
      userId: botUser.id,
      kernelType: data.kernelType,
      config: data.config,
      ownerId: data.ownerId,
    })

    return { ...agent, botUser }
  }

  async getAll() {
    return this.deps.agentDao.findAll()
  }

  async getByOwnerId(ownerId: string) {
    return this.deps.agentDao.findByOwnerId(ownerId)
  }

  async start(id: string) {
    const agent = await this.deps.agentDao.findById(id)
    if (!agent) {
      throw Object.assign(new Error('Agent not found'), { status: 404 })
    }

    // TODO: Start Docker container via AgentRuntime
    await this.deps.agentDao.updateStatus(id, 'running')
    this.deps.logger.info({ agentId: id }, 'Agent started')

    return this.deps.agentDao.findById(id)
  }

  async stop(id: string) {
    const agent = await this.deps.agentDao.findById(id)
    if (!agent) {
      throw Object.assign(new Error('Agent not found'), { status: 404 })
    }

    // TODO: Stop Docker container via AgentRuntime
    await this.deps.agentDao.updateStatus(id, 'stopped')
    this.deps.logger.info({ agentId: id }, 'Agent stopped')

    return this.deps.agentDao.findById(id)
  }

  async restart(id: string) {
    await this.stop(id)
    return this.start(id)
  }

  async delete(id: string) {
    const agent = await this.deps.agentDao.findById(id)
    if (!agent) {
      throw Object.assign(new Error('Agent not found'), { status: 404 })
    }

    if (agent.status === 'running') {
      await this.stop(id)
    }

    await this.deps.agentDao.delete(id)
  }
}
