/**
 * LLM provider presets — shared between Deploy Wizard and Settings.
 */

export interface ApiPreset {
  id: string
  api: string
  label: string
  baseUrl?: string
}

export const API_PRESETS: ApiPreset[] = [
  { id: 'anthropic', api: 'anthropic', label: 'Anthropic (Claude)' },
  { id: 'openai', api: 'openai', label: 'OpenAI (GPT)' },
  { id: 'ollama', api: 'openai', label: 'Ollama (local)', baseUrl: 'http://localhost:11434/v1' },
  { id: 'deepseek', api: 'openai', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  { id: 'groq', api: 'openai', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
]

export function getPresetById(id: string): ApiPreset | undefined {
  return API_PRESETS.find((p) => p.id === id)
}

export function getPresetByApi(api: string): ApiPreset | undefined {
  return API_PRESETS.find((p) => p.api === api)
}
