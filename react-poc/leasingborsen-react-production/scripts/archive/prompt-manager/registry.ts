import { promises as fs } from 'fs'
import path from 'path'
import type { PromptRegistry, StoredPrompt, PromptVersion } from './types'

/**
 * File-based prompt registry for local tracking
 */
export class FileBasedPromptRegistry implements PromptRegistry {
  private registryPath: string
  private versionsPath: string

  constructor(basePath: string = './scripts/prompt-manager/data') {
    this.registryPath = path.join(basePath, 'registry.json')
    this.versionsPath = path.join(basePath, 'versions')
  }

  async initialize(): Promise<void> {
    // Ensure directories exist
    await fs.mkdir(path.dirname(this.registryPath), { recursive: true })
    await fs.mkdir(this.versionsPath, { recursive: true })

    // Create registry file if it doesn't exist
    try {
      await fs.access(this.registryPath)
    } catch {
      await fs.writeFile(this.registryPath, JSON.stringify({}, null, 2))
    }
  }

  async savePrompt(prompt: StoredPrompt): Promise<void> {
    const registry = await this.loadRegistry()
    registry[prompt.name] = prompt
    await this.saveRegistry(registry)
  }

  async getPrompt(nameOrId: string): Promise<StoredPrompt | null> {
    const registry = await this.loadRegistry()
    
    // First try by name
    if (registry[nameOrId]) {
      return registry[nameOrId]
    }

    // Then try by ID
    const prompts = Object.values(registry)
    return prompts.find(p => p.id === nameOrId) || null
  }

  async getAllPrompts(): Promise<StoredPrompt[]> {
    const registry = await this.loadRegistry()
    return Object.values(registry)
  }

  async deletePrompt(name: string): Promise<void> {
    const registry = await this.loadRegistry()
    delete registry[name]
    await this.saveRegistry(registry)

    // Also delete version history
    const versionFile = this.getVersionFilePath(name)
    try {
      await fs.unlink(versionFile)
    } catch {
      // Ignore if file doesn't exist
    }
  }

  async saveVersion(promptName: string, version: PromptVersion): Promise<void> {
    const versionFile = this.getVersionFilePath(promptName)
    
    let versions: PromptVersion[] = []
    try {
      const content = await fs.readFile(versionFile, 'utf-8')
      versions = JSON.parse(content)
    } catch {
      // File doesn't exist yet
    }

    versions.push(version)
    await fs.writeFile(versionFile, JSON.stringify(versions, null, 2))
  }

  async getPromptVersions(promptName: string): Promise<PromptVersion[]> {
    const versionFile = this.getVersionFilePath(promptName)
    
    try {
      const content = await fs.readFile(versionFile, 'utf-8')
      return JSON.parse(content)
    } catch {
      return []
    }
  }

  private async loadRegistry(): Promise<Record<string, StoredPrompt>> {
    try {
      const content = await fs.readFile(this.registryPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return {}
    }
  }

  private async saveRegistry(registry: Record<string, StoredPrompt>): Promise<void> {
    await fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2))
  }

  private getVersionFilePath(promptName: string): string {
    // Sanitize filename
    const safeFileName = promptName.replace(/[^a-z0-9-_]/gi, '_')
    return path.join(this.versionsPath, `${safeFileName}.json`)
  }
}

/**
 * In-memory prompt registry for testing
 */
export class InMemoryPromptRegistry implements PromptRegistry {
  private prompts: Map<string, StoredPrompt> = new Map()
  private versions: Map<string, PromptVersion[]> = new Map()

  async savePrompt(prompt: StoredPrompt): Promise<void> {
    this.prompts.set(prompt.name, prompt)
  }

  async getPrompt(nameOrId: string): Promise<StoredPrompt | null> {
    // Try by name first
    if (this.prompts.has(nameOrId)) {
      return this.prompts.get(nameOrId)!
    }

    // Then try by ID
    for (const prompt of this.prompts.values()) {
      if (prompt.id === nameOrId) {
        return prompt
      }
    }

    return null
  }

  async getAllPrompts(): Promise<StoredPrompt[]> {
    return Array.from(this.prompts.values())
  }

  async deletePrompt(name: string): Promise<void> {
    this.prompts.delete(name)
    this.versions.delete(name)
  }

  async saveVersion(promptName: string, version: PromptVersion): Promise<void> {
    const versions = this.versions.get(promptName) || []
    versions.push(version)
    this.versions.set(promptName, versions)
  }

  async getPromptVersions(promptName: string): Promise<PromptVersion[]> {
    return this.versions.get(promptName) || []
  }
}

/**
 * Factory function to create appropriate registry based on environment
 */
export function createPromptRegistry(type: 'file' | 'memory' = 'file'): PromptRegistry {
  if (type === 'memory') {
    return new InMemoryPromptRegistry()
  }
  
  const registry = new FileBasedPromptRegistry()
  // Note: Caller should await registry.initialize() for file-based registry
  return registry
}