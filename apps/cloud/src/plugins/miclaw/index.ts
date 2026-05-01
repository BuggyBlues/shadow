import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'miclaw',
  name: 'Xiaomi MiClaw',
  description:
    'Xiaomi MiClaw ecosystem workflows for uploading MCP, Skill, and Agent assets, cloud-phone previews, mobile-agent testing, and skill publishing.',
  category: 'automation',
  icon: 'scan-face',
  website: 'https://dev.mi.com',
  docs: 'https://dev.mi.com/xiaomihyperos/announcement/detail?id=41',
  fields: [
    connectorField('MICLAW_ACCESS_TOKEN', 'Access token', {
      description: 'Xiaomi MiClaw platform access token.',
      placeholder: 'Access token',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['miclaw', 'xiaomi', 'mobile-agent', 'skills', 'mcp', 'publishing'],
  popularity: 80,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use Xiaomi MiClaw for mobile-agent ecosystem workflows, uploading MCP, Skill, and Agent assets, cloud-phone previews, skill testing, and publishing. Confirm publishing actions before applying them.',
})
