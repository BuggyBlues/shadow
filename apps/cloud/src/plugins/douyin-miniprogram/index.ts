import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'douyin-miniprogram',
  name: 'Douyin Mini Program',
  description:
    'Douyin Mini Program CI workflows for login, preview, upload, review submission, npm build, release notes, and version management.',
  category: 'devops',
  icon: 'badge-play',
  website: 'https://developer.open-douyin.com',
  docs: 'https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/dev-tools/developer-instrument/development-assistance/ide-cli',
  fields: [
    connectorField('DOUYIN_MINIPROGRAM_APP_ID', 'Mini Program app ID', {
      description: 'Douyin Mini Program app ID.',
      sensitive: false,
      placeholder: 'App ID',
    }),
    connectorField('DOUYIN_MINIPROGRAM_PRIVATE_KEY', 'Private key', {
      description: 'Private key or CI credential for automated workflows.',
      required: false,
      placeholder: 'Private key',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'cli'],
  tags: ['douyin', 'mini-program', 'ci', 'preview', 'upload', 'review'],
  popularity: 84,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use Douyin Mini Program for CI workflows, preview, upload, review submission, npm build, release records, and configuration checks. Confirm publish or submission actions before running them.',
})
