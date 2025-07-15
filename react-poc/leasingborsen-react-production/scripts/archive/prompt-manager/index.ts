import type { OpenAI } from 'openai'
import type {
  PromptTemplate,
  PromptOperationResponse,
  ListPromptsOptions,
  UpdatePromptOptions,
  DeletePromptOptions,
  CreatePromptOptions,
  PromptRegistry,
  StoredPrompt,
  PromptVersion
} from './types'

import {
  PromptValidationError,
  PromptNotFoundError,
  PromptOperationError
} from './types'

/**
 * PromptManager - Handles CRUD operations for OpenAI Responses API prompts
 */
export class PromptManager {
  constructor(
    private openai: OpenAI,
    private registry: PromptRegistry
  ) {}

  /**
   * Create a new prompt
   */
  async createPrompt(
    template: PromptTemplate,
    options: CreatePromptOptions = {}
  ): Promise<PromptOperationResponse> {
    // Validate template
    this.validateTemplate(template)

    const { retries = 0, environment = 'development' } = options

    try {
      // Create prompt via OpenAI API
      // Note: The Responses API for creating stored prompts may not be publicly available
      // This is a placeholder - you would typically create prompts via the OpenAI UI
      // and then reference them by ID in your code
      
      // For now, we'll simulate the creation and track it locally
      const promptId = `resp-local-${Date.now()}`
      
      console.log('⚠️  Note: The OpenAI Responses API for creating stored prompts')
      console.log('   is not publicly available. You should create prompts via:')
      console.log('   https://platform.openai.com/stored-responses')
      console.log('')
      console.log('   This POC will track the prompt locally for demonstration.')

      // Save to local registry
      const storedPrompt: StoredPrompt = {
        id: response.id,
        name: template.name,
        description: template.description,
        currentVersion: template.metadata?.version || 1,
        environment,
        tags: template.metadata?.tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await this.registry.savePrompt(storedPrompt)

      // Save initial version
      const version: PromptVersion = {
        version: storedPrompt.currentVersion,
        promptId: response.id,
        messages: template.messages,
        metadata: {
          ...template.metadata,
          environment,
          createdAt: storedPrompt.createdAt
        },
        createdAt: storedPrompt.createdAt
      }

      await this.registry.saveVersion(template.name, version)

      return {
        id: response.id,
        name: template.name,
        version: storedPrompt.currentVersion,
        createdAt: storedPrompt.createdAt
      }
    } catch (error) {
      throw new PromptOperationError('create', error.message)
    }
  }

  /**
   * List all prompts with optional filtering
   */
  async listPrompts(options: ListPromptsOptions = {}): Promise<StoredPrompt[]> {
    const allPrompts = await this.registry.getAllPrompts()

    let filtered = allPrompts

    // Filter by environment
    if (options.environment) {
      filtered = filtered.filter(p => p.environment === options.environment)
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter(p => 
        p.tags?.some(tag => options.tags!.includes(tag))
      )
    }

    return filtered
  }

  /**
   * Get a prompt by ID (from OpenAI)
   */
  async getPrompt(promptId: string): Promise<any> {
    const localPrompt = await this.registry.getPrompt(promptId)
    const apiPrompt = await this.openai.responses.retrieve(promptId)

    return {
      ...apiPrompt,
      localMetadata: localPrompt
    }
  }

  /**
   * Get a prompt by name (from registry)
   */
  async getPromptByName(name: string): Promise<StoredPrompt> {
    const prompt = await this.registry.getPrompt(name)
    if (!prompt) {
      throw new PromptNotFoundError(name)
    }
    return prompt
  }

  /**
   * Update a prompt and increment version
   */
  async updatePrompt(
    nameOrId: string,
    updates: UpdatePromptOptions
  ): Promise<PromptOperationResponse> {
    // Get existing prompt
    const existing = await this.registry.getPrompt(nameOrId)
    if (!existing) {
      throw new PromptNotFoundError(nameOrId)
    }

    // Validate updates
    if (updates.messages && updates.messages.length === 0) {
      throw new PromptValidationError('Messages cannot be empty')
    }

    try {
      // Update via OpenAI API
      if (updates.messages) {
        await this.openai.responses.update(existing.id, {
          messages: updates.messages
        })
      }

      // Increment version
      const newVersion = existing.currentVersion + 1

      // Save new version
      const version: PromptVersion = {
        version: newVersion,
        promptId: existing.id,
        messages: updates.messages!,
        metadata: {
          ...updates.metadata,
          updatedAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString()
      }

      await this.registry.saveVersion(existing.name, version)

      // Update stored prompt
      const updatedPrompt: StoredPrompt = {
        ...existing,
        currentVersion: newVersion,
        updatedAt: new Date().toISOString()
      }

      await this.registry.savePrompt(updatedPrompt)

      return {
        id: existing.id,
        name: existing.name,
        version: newVersion,
        changelog: updates.metadata?.changelog
      }
    } catch (error) {
      throw new PromptOperationError('update', error.message)
    }
  }

  /**
   * Delete a prompt
   */
  async deletePrompt(
    nameOrId: string,
    options: DeletePromptOptions = { confirm: false }
  ): Promise<{ success: boolean; deletedId: string }> {
    if (!options.confirm) {
      throw new PromptValidationError('Deletion requires confirmation')
    }

    const prompt = await this.registry.getPrompt(nameOrId)
    if (!prompt) {
      throw new PromptNotFoundError(nameOrId)
    }

    // Prevent accidental production deletion
    if (prompt.environment === 'production' && !options.force) {
      throw new PromptValidationError('Cannot delete production prompt without force flag')
    }

    try {
      // Delete from OpenAI
      await this.openai.responses.del(prompt.id)

      // Delete from registry
      await this.registry.deletePrompt(prompt.name)

      return {
        success: true,
        deletedId: prompt.id
      }
    } catch (error) {
      throw new PromptOperationError('delete', error.message)
    }
  }

  /**
   * Rollback to a previous version
   */
  async rollbackPrompt(
    nameOrId: string,
    targetVersion: number
  ): Promise<PromptOperationResponse> {
    const prompt = await this.registry.getPrompt(nameOrId)
    if (!prompt) {
      throw new PromptNotFoundError(nameOrId)
    }

    // Get all versions
    const versions = await this.registry.getPromptVersions(prompt.name)
    const targetVersionData = versions.find(v => v.version === targetVersion)

    if (!targetVersionData) {
      throw new PromptValidationError(`Version ${targetVersion} not found`)
    }

    // Apply the rollback
    await this.openai.responses.update(prompt.id, {
      messages: targetVersionData.messages
    })

    // Create new version marking the rollback
    const newVersion = prompt.currentVersion + 1
    const rollbackVersion: PromptVersion = {
      version: newVersion,
      promptId: prompt.id,
      messages: targetVersionData.messages,
      metadata: {
        ...targetVersionData.metadata,
        rollbackFrom: prompt.currentVersion,
        rollbackTo: targetVersion,
        updatedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString()
    }

    await this.registry.saveVersion(prompt.name, rollbackVersion)

    // Update stored prompt
    const updatedPrompt: StoredPrompt = {
      ...prompt,
      currentVersion: newVersion,
      updatedAt: new Date().toISOString()
    }

    await this.registry.savePrompt(updatedPrompt)

    return {
      id: prompt.id,
      name: prompt.name,
      version: newVersion,
      rollbackFrom: prompt.currentVersion,
      rollbackTo: targetVersion
    }
  }

  /**
   * Validate prompt template
   */
  private validateTemplate(template: PromptTemplate): void {
    if (!template.name || template.name.trim() === '') {
      throw new PromptValidationError('Prompt name is required')
    }

    if (!template.messages || template.messages.length === 0) {
      throw new PromptValidationError('At least one message is required')
    }

    // Check that all placeholders in messages are defined in parameters
    const placeholderRegex = /\{\{(\w+)\}\}/g
    const foundPlaceholders = new Set<string>()

    template.messages.forEach(msg => {
      let match
      while ((match = placeholderRegex.exec(msg.content)) !== null) {
        foundPlaceholders.add(match[1])
      }
    })

    foundPlaceholders.forEach(placeholder => {
      if (!template.parameters.includes(placeholder)) {
        throw new PromptValidationError(
          `Message placeholder {{${placeholder}}} not found in parameters`
        )
      }
    })
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s...
          const delay = Math.pow(2, attempt) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError!
  }
}

// Re-export types for convenience
export * from './types'
export { FileBasedPromptRegistry, InMemoryPromptRegistry, createPromptRegistry } from './registry'