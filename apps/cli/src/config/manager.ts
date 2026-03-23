import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface Profile {
  serverUrl: string
  token: string
}

export interface Config {
  profiles: Record<string, Profile>
  currentProfile?: string
}

const CONFIG_DIR = join(homedir(), '.shadowob')
const CONFIG_FILE = join(CONFIG_DIR, 'shadowob.config.json')

export class ConfigManager {
  private config: Config | null = null

  private async load(): Promise<Config> {
    if (this.config) return this.config

    if (!existsSync(CONFIG_FILE)) {
      this.config = { profiles: {} }
      return this.config
    }

    try {
      const content = await readFile(CONFIG_FILE, 'utf-8')
      this.config = JSON.parse(content) as Config
      return this.config
    } catch {
      this.config = { profiles: {} }
      return this.config
    }
  }

  private async save(): Promise<void> {
    if (!this.config) return
    await mkdir(CONFIG_DIR, { recursive: true })
    await writeFile(CONFIG_FILE, JSON.stringify(this.config, null, 2))
  }

  async getProfile(name?: string): Promise<Profile | null> {
    const config = await this.load()
    const profileName = name ?? config.currentProfile
    if (!profileName) return null
    return config.profiles[profileName] ?? null
  }

  async getCurrentProfileName(): Promise<string | null> {
    const config = await this.load()
    return config.currentProfile ?? null
  }

  async setProfile(name: string, profile: Profile): Promise<void> {
    const config = await this.load()
    config.profiles[name] = profile
    await this.save()
  }

  async deleteProfile(name: string): Promise<boolean> {
    const config = await this.load()
    if (!config.profiles[name]) return false
    delete config.profiles[name]
    if (config.currentProfile === name) {
      delete config.currentProfile
    }
    await this.save()
    return true
  }

  async switchProfile(name: string): Promise<boolean> {
    const config = await this.load()
    if (!config.profiles[name]) return false
    config.currentProfile = name
    await this.save()
    return true
  }

  async listProfiles(): Promise<string[]> {
    const config = await this.load()
    return Object.keys(config.profiles)
  }

  getConfigPath(): string {
    return CONFIG_FILE
  }
}

export const configManager = new ConfigManager()
