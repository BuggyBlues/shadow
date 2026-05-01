import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'baidu-smartprogram',
  name: 'Baidu Smart Program',
  description:
    'Baidu Smart Program workflows for app login, build checks, preview, publish support, configuration review, and small-program release operations.',
  category: 'devops',
  icon: 'app-window',
  website: 'https://smartprogram.baidu.com',
  docs: 'https://smartprogram.baidu.com/docs/develop/devtools/smartapp_cli_function/',
  fields: [
    connectorField('BAIDU_SMARTPROGRAM_APP_KEY', 'App key', {
      description: 'Baidu Smart Program app key.',
      sensitive: false,
      placeholder: 'App key',
    }),
    connectorField('BAIDU_SMARTPROGRAM_APP_SECRET', 'App secret', {
      description: 'Baidu Smart Program app secret.',
      placeholder: 'App secret',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'cli'],
  tags: ['baidu-smartprogram', 'mini-program', 'ci', 'preview', 'publish'],
  popularity: 82,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use Baidu Smart Program for login, project checks, preview, publish support, configuration validation, and release operations. Confirm publish actions before running them.',
})
