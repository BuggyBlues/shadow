import Editor, { type Monaco } from '@monaco-editor/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { FileJson, Layers, Save, Shield } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api, type ValidateResult } from '@/lib/api'
import { useToast } from '@/stores/toast'

// ── JSON Schema for Cloud Config (drives Monaco autocomplete) ────────────────

const CLOUD_CONFIG_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Shadow Cloud Configuration',
  description: 'Configuration file for deploying OpenClaw AI agents to Kubernetes.',
  type: 'object',
  required: ['version'],
  properties: {
    version: { type: 'string', description: 'Config version', default: '1' },
    name: { type: 'string', description: 'Human-readable name for this deployment config' },
    description: { type: 'string', description: 'Description of what this agent team does' },
    environment: {
      type: 'string',
      enum: ['development', 'staging', 'production'],
      description: 'Deployment environment',
    },
    team: {
      type: 'object',
      description: 'Team / agent pack definition',
      properties: {
        name: { type: 'string', description: 'Team display name' },
        description: { type: 'string' },
        defaultModel: { $ref: '#/definitions/AgentModel' },
        defaultCompliance: { $ref: '#/definitions/AgentCompliance' },
      },
      required: ['name'],
    },
    registry: {
      type: 'object',
      description: 'Reusable provider/configuration registry',
      properties: {
        providers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Provider identifier (e.g. "anthropic", "openai")',
              },
              type: {
                type: 'string',
                enum: ['openai', 'anthropic', 'google', 'azure-openai', 'ollama'],
              },
              apiKey: { type: 'string', description: 'Use ${env:VAR_NAME} for secret injection' },
              baseUrl: { type: 'string', description: 'Custom API base URL' },
            },
            required: ['id', 'type'],
          },
        },
        configurations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Configuration ID referenced by agents' },
              openclaw: { type: 'object', description: 'OpenClaw configuration object' },
            },
            required: ['id'],
          },
        },
      },
    },
    deployments: {
      type: 'object',
      description: 'K8s deployment definitions',
      properties: {
        agents: {
          type: 'array',
          items: { $ref: '#/definitions/AgentDeployment' },
        },
      },
    },
    workspace: {
      type: 'object',
      description: 'Shared workspace across agents',
      properties: {
        enabled: { type: 'boolean' },
        storageSize: { type: 'string', default: '5Gi' },
        storageClassName: { type: 'string' },
        mountPath: { type: 'string', default: '/workspace' },
        accessMode: { type: 'string', enum: ['ReadWriteOnce', 'ReadWriteMany', 'ReadOnlyMany'] },
      },
      required: ['enabled'],
    },
    vaults: {
      type: 'object',
      description: 'Vault definitions for secret isolation',
      additionalProperties: {
        type: 'object',
        properties: {
          keys: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  definitions: {
    AgentModel: {
      type: 'object',
      properties: {
        preferred: {
          type: 'string',
          description:
            'Primary model in "provider/model" format (e.g. "anthropic/claude-sonnet-4-5")',
        },
        fallbacks: { type: 'array', items: { type: 'string' } },
        constraints: {
          type: 'object',
          properties: {
            temperature: { type: 'number', minimum: 0, maximum: 2 },
            maxTokens: { type: 'integer' },
            topP: { type: 'number', minimum: 0, maximum: 1 },
            thinkingLevel: {
              type: 'string',
              enum: ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'adaptive'],
            },
          },
        },
      },
      required: ['preferred'],
    },
    AgentCompliance: {
      type: 'object',
      properties: {
        riskTier: { type: 'string', enum: ['low', 'standard', 'high', 'critical'] },
        frameworks: { type: 'array', items: { type: 'string' } },
        humanInTheLoop: { type: 'string', enum: ['always', 'conditional', 'advisory', 'none'] },
        auditLogging: { type: 'boolean' },
        retentionPeriod: { type: 'string', description: 'e.g. "7y", "3y", "90d"' },
      },
    },
    AgentDeployment: {
      type: 'object',
      required: ['id', 'runtime', 'configuration'],
      properties: {
        id: { type: 'string', description: 'Unique agent ID' },
        runtime: {
          type: 'string',
          enum: ['openclaw', 'claude-code', 'codex', 'gemini', 'opencode'],
          description: 'Agent runtime type',
        },
        image: { type: 'string', description: 'Custom container image' },
        replicas: { type: 'integer', minimum: 0, default: 1 },
        description: { type: 'string' },
        configuration: {
          type: 'object',
          properties: {
            extends: {
              type: 'string',
              description: 'Base configuration ID from registry.configurations',
            },
            openclaw: { type: 'object' },
          },
        },
        resources: {
          type: 'object',
          properties: {
            requests: {
              type: 'object',
              properties: { cpu: { type: 'string' }, memory: { type: 'string' } },
            },
            limits: {
              type: 'object',
              properties: { cpu: { type: 'string' }, memory: { type: 'string' } },
            },
          },
        },
        env: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Extra environment variables (use ${env:VAR} for secrets)',
        },
        identity: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            personality: { type: 'string' },
            systemPrompt: { type: 'string' },
          },
        },
        model: { $ref: '#/definitions/AgentModel' },
        compliance: { $ref: '#/definitions/AgentCompliance' },
        vault: { type: 'string', description: 'Vault reference (default: "default")' },
        source: {
          type: 'object',
          properties: {
            repo: { type: 'string' },
            branch: { type: 'string' },
            path: { type: 'string' },
            mountPath: { type: 'string', default: '/agent' },
          },
        },
      },
    },
  },
} as const

function setupMonacoJsonSchema(monaco: Monaco) {
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: false,
    schemaValidation: 'error',
    schemas: [
      {
        uri: 'https://shadowob.cloud/schema/cloud-config.json',
        fileMatch: ['*'],
        schema: CLOUD_CONFIG_SCHEMA as unknown as Record<string, unknown>,
      },
    ],
  })
}

function CodeEditor({
  value,
  onChange,
  language = 'json',
}: {
  value: string
  onChange: (val: string) => void
  language?: string
}) {
  const editorRef = useRef<unknown>(null)

  const handleMount = (editor: unknown, monaco: Monaco) => {
    editorRef.current = editor
    setupMonacoJsonSchema(monaco)
  }

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden flex-1">
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={(val) => onChange(val ?? '')}
        theme="vs-dark"
        onMount={handleMount}
        options={{
          minimap: { enabled: true, maxColumn: 80 },
          fontSize: 13,
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2,
          formatOnPaste: true,
          automaticLayout: true,
          padding: { top: 8 },
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showProperties: true,
          },
          quickSuggestions: { other: true, strings: true },
          folding: true,
          foldingStrategy: 'indentation',
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
        }}
      />
    </div>
  )
}

export function ConfigEditorPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [dirty, setDirty] = useState(false)

  // Fetch store templates for the selector
  const { data: storeTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: api.templates.list,
  })

  // Fetch user's My Templates
  const { data: myTemplates } = useQuery({
    queryKey: ['my-templates'],
    queryFn: api.myTemplates.list,
  })

  // Load current config
  const { data, isLoading, error } = useQuery({
    queryKey: ['config'],
    queryFn: () => api.config.get(),
    retry: false,
  })

  useEffect(() => {
    if (data?.content) {
      setContent(data.content)
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (text: string) => api.config.put({ content: text }),
    onSuccess: () => {
      toast.success('Config saved')
      setDirty(false)
    },
    onError: () => toast.error('Failed to save config'),
  })

  const validateMutation = useMutation({
    mutationFn: (config: unknown) => api.validate(config),
    onSuccess: (data) => {
      setValidateResult(data)
      if (data.valid) toast.success(`Valid: ${data.agents} agent(s)`)
      else toast.error(`Invalid: ${data.violations.length} violation(s)`)
    },
  })

  const handleSave = () => saveMutation.mutate(content)

  const handleValidate = () => {
    try {
      const parsed = JSON.parse(content)
      setValidateResult(null)
      validateMutation.mutate(parsed)
    } catch {
      toast.error('Invalid JSON syntax')
    }
  }

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(content)
      setContent(JSON.stringify(parsed, null, 2))
      toast.info('Formatted')
    } catch {
      toast.error('Cannot format: invalid JSON')
    }
  }

  const handleLoadTemplate = async (templateName: string) => {
    if (!templateName) return
    try {
      const tplData = await api.templates.get(templateName)
      setContent(JSON.stringify(tplData, null, 2))
      setSelectedTemplate(templateName)
      setDirty(false)
      toast.info(`Loaded template: ${templateName}`)
    } catch {
      toast.error('Failed to load template')
    }
  }

  const handleLoadMyTemplate = async (name: string) => {
    if (!name) return
    try {
      const tplData = await api.myTemplates.get(name)
      setContent(JSON.stringify(tplData.content, null, 2))
      setSelectedTemplate(`my:${name}`)
      setDirty(false)
      toast.info(`Loaded: ${name}`)
    } catch {
      toast.error('Failed to load template')
    }
  }

  const handleSaveToMyTemplates = async () => {
    try {
      const parsed = JSON.parse(content)
      const name = selectedTemplate.startsWith('my:')
        ? selectedTemplate.slice(3)
        : `my-${selectedTemplate || 'config'}-${Date.now()}`
      await api.myTemplates.save(
        name,
        parsed,
        selectedTemplate.startsWith('my:') ? undefined : selectedTemplate || undefined,
      )
      queryClient.invalidateQueries({ queryKey: ['my-templates'] })
      setDirty(false)
      toast.success(`Saved to My Templates as "${name}"`)
    } catch {
      toast.error('Invalid JSON — cannot save')
    }
  }

  const handleContentChange = (val: string) => {
    setContent(val)
    setValidateResult(null)
    setDirty(true)
  }

  const isValidJson = (() => {
    try {
      JSON.parse(content)
      return true
    } catch {
      return false
    }
  })()

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            Config Editor
            {dirty && <span className="text-xs text-yellow-400 font-normal">(unsaved)</span>}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedTemplate ? (
              <span>
                Editing:{' '}
                <code className="font-mono text-xs text-gray-400">
                  {selectedTemplate.startsWith('my:')
                    ? selectedTemplate.slice(3)
                    : selectedTemplate}
                </code>
              </span>
            ) : data?.path ? (
              <span className="font-mono text-xs">{data.path}</span>
            ) : (
              'Select a template to load, or start from scratch'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Template selector */}
          <select
            value=""
            onChange={(e) => {
              const val = e.target.value
              if (val.startsWith('store:')) handleLoadTemplate(val.slice(6))
              else if (val.startsWith('my:')) handleLoadMyTemplate(val.slice(3))
            }}
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-blue-500 max-w-[180px]"
          >
            <option value="">Load template...</option>
            {(storeTemplates ?? []).length > 0 && (
              <optgroup label="Store Templates">
                {storeTemplates?.map((t) => (
                  <option key={`store:${t.name}`} value={`store:${t.name}`}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
            {(myTemplates ?? []).length > 0 && (
              <optgroup label="My Templates">
                {myTemplates?.map((t) => (
                  <option key={`my:${t.name}`} value={`my:${t.name}`}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <button
            type="button"
            onClick={handleFormat}
            disabled={!isValidJson}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded px-3 py-1.5 transition-colors disabled:opacity-40"
          >
            <FileJson size={12} />
            Format
          </button>
          <button
            type="button"
            onClick={handleValidate}
            disabled={!isValidJson || validateMutation.isPending}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded px-3 py-1.5 transition-colors disabled:opacity-40"
          >
            <Shield size={12} />
            Validate
          </button>
          <button
            type="button"
            onClick={handleSaveToMyTemplates}
            disabled={!isValidJson || !content.trim()}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded px-3 py-1.5 transition-colors disabled:opacity-40"
            title="Save to My Templates"
          >
            <Layers size={12} />
            Save as Template
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!content.trim() || saveMutation.isPending}
            className={clsx(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors',
              saveMutation.isPending
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white',
            )}
          >
            <Save size={12} />
            Save
          </button>
        </div>
      </div>

      {isLoading && <div className="text-center text-gray-500 text-sm py-8">Loading config...</div>}

      {error && !data && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-400">
            No config file loaded. Use the template selector above to load a store template or one
            of your saved templates.
          </p>
        </div>
      )}

      {/* Validation result banner */}
      {validateResult && (
        <div
          className={clsx(
            'border rounded-lg p-3 mb-4 flex items-center gap-2',
            validateResult.valid
              ? 'bg-green-900/20 border-green-800 text-green-400'
              : 'bg-red-900/20 border-red-800 text-red-400',
          )}
        >
          <Shield size={14} />
          <span className="text-sm">
            {validateResult.valid
              ? `Valid: ${validateResult.agents} agent(s), ${validateResult.configurations} configuration(s)`
              : `Invalid: ${validateResult.violations.length} violation(s), ${validateResult.extendsErrors.length} extends error(s)`}
          </span>
        </div>
      )}

      {validateMutation.error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4 text-red-400 text-sm">
          {validateMutation.error.message}
        </div>
      )}

      {/* Editor with JSON Schema autocomplete */}
      <CodeEditor value={content} onChange={handleContentChange} language="json" />

      {/* Status bar */}
      <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
        <div className="flex items-center gap-3">
          <span>{content.split('\n').length} lines</span>
          <span>{content.length} chars</span>
        </div>
        <div className="flex items-center gap-2">
          {content.trim() && (
            <span className={isValidJson ? 'text-green-600' : 'text-red-500'}>
              {isValidJson ? 'Valid JSON' : 'Invalid JSON'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
