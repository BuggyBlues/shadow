import {
  attachConnectorRuntimeAssets,
  connectorField,
  connectorManifest,
  installedCheck,
  npmGlobalDependency,
} from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'supabase',
  name: 'Supabase',
  description:
    'Supabase operations for Auth, RLS, schema design, migrations, logs, storage, edge functions, and database troubleshooting.',
  category: 'database',
  icon: 'database',
  website: 'https://supabase.com',
  docs: 'https://supabase.com/docs/guides/getting-started/mcp',
  fields: [
    connectorField('SUPABASE_ACCESS_TOKEN', 'Supabase access token', {
      description: 'Personal access token for Supabase management APIs.',
      placeholder: 'sbp_...',
      helpUrl: 'https://supabase.com/docs/guides/platform/access-control/personal-access-tokens',
    }),
    connectorField('SUPABASE_PROJECT_REF', 'Project ref', {
      description: 'Default project ref.',
      required: false,
      sensitive: false,
      placeholder: 'abcdefghijklmnopqrst',
    }),
    connectorField('SUPABASE_DB_PASSWORD', 'Database password', {
      description: 'Database password for migration and SQL tasks.',
      required: false,
      placeholder: 'Database password',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'cli', 'mcp'],
  tags: ['supabase', 'postgres', 'auth', 'rls', 'migrations', 'mcp'],
  popularity: 94,
})

const runtimeDependencies = [npmGlobalDependency('supabase', ['supabase'], 'Supabase CLI')]
const verificationChecks = [
  installedCheck('supabase-cli-installed', 'Supabase CLI installed', ['supabase', '--version']),
]

const plugin = defineConnectorPlugin(manifest, {
  cli: [
    {
      name: 'supabase',
      command: 'supabase',
      description: 'Supabase CLI for projects, migrations, functions, and local development',
    },
  ],
  mcp: {
    id: 'supabase-mcp',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@supabase/mcp-server-supabase@latest'],
    description: 'Supabase MCP server for project and database operations',
    requiredEnv: ['SUPABASE_ACCESS_TOKEN'],
  },
  runtimeDependencies,
  verificationChecks,
  prompt:
    'Use Supabase for Auth, RLS, schema, migrations, logs, storage, edge functions, and database diagnostics. Confirm destructive SQL, migration, auth, or policy changes before running them.',
})

export default attachConnectorRuntimeAssets(plugin, { runtimeDependencies })
