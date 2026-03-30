/**
 * Agent IPC Handlers
 *
 * Unified agent management API.
 */

import { ipcMain } from 'electron'
import { agentConfigStore, PRECONFIGURED_ACP_AGENTS, type AgentConfig } from './agent-config'

export function setupAgentIPC(): void {
  // Get all agents
  ipcMain.handle('desktop:getAgents', () => {
    return agentConfigStore.getAllAgents()
  })

  // Get agent templates
  ipcMain.handle('desktop:getAgentTemplates', () => {
    return PRECONFIGURED_ACP_AGENTS
  })

  // Create agent
  ipcMain.handle('desktop:createAgent', (_event, config: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    return agentConfigStore.createAgent(config)
  })

  // Update agent
  ipcMain.handle('desktop:updateAgent', (_event, { id, updates }: { id: string; updates: Partial<AgentConfig> }) => {
    return agentConfigStore.updateAgent(id, updates)
  })

  // Delete agent
  ipcMain.handle('desktop:deleteAgent', (_event, id: string) => {
    return agentConfigStore.deleteAgent(id)
  })

  // Set active agent
  ipcMain.handle('desktop:setActiveAgent', (_event, id: string | null) => {
    agentConfigStore.setActiveAgent(id)
    return { success: true }
  })

  // Get active agent
  ipcMain.handle('desktop:getActiveAgent', () => {
    return agentConfigStore.getActiveAgent()
  })

  // Check agent availability
  ipcMain.handle('desktop:checkAgent', async (_event, id: string) => {
    return agentConfigStore.checkAgentAvailable(id)
  })

  // Get ACP command for agent
  ipcMain.handle('desktop:getACPCommand', (_event, id: string) => {
    return agentConfigStore.getACPCommand(id)
  })
}
