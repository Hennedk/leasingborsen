/**
 * TypeScript interfaces for OpenAI Responses API prompt management
 */

/**
 * Message structure for OpenAI prompts
 */
export interface PromptMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Template for creating or updating prompts
 */
export interface PromptTemplate {
  name: string
  description: string
  messages: PromptMessage[]
  parameters: string[] // Expected placeholder parameters like 'pdfContent', 'dealerName'
  metadata?: PromptMetadata
}

/**
 * Metadata for prompt versioning and tracking
 */
export interface PromptMetadata {
  version?: number
  tags?: string[]
  environment?: 'development' | 'staging' | 'production'
  changelog?: string
  author?: string
  createdAt?: string
  updatedAt?: string
  // Vehicle extraction specific metadata
  extractionConfig?: {
    model?: string
    temperature?: number
    maxTokens?: number
    jsonSchema?: any
  }
}

/**
 * Version information for a prompt
 */
export interface PromptVersion {
  version: number
  promptId: string
  messages: PromptMessage[]
  metadata?: PromptMetadata
  createdAt: string
}

/**
 * Stored prompt information in local registry
 */
export interface StoredPrompt {
  id: string // OpenAI prompt ID (resp-xxx)
  name: string // Local name for the prompt
  description: string
  currentVersion: number
  environment?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Response from prompt operations
 */
export interface PromptOperationResponse {
  id: string
  name: string
  version: number
  createdAt?: string
  changelog?: string
  rollbackFrom?: number
  rollbackTo?: number
}

/**
 * Options for listing prompts
 */
export interface ListPromptsOptions {
  environment?: 'development' | 'staging' | 'production'
  tags?: string[]
  includeVersions?: boolean
}

/**
 * Options for updating prompts
 */
export interface UpdatePromptOptions {
  messages?: PromptMessage[]
  description?: string
  metadata?: PromptMetadata
}

/**
 * Options for deleting prompts
 */
export interface DeletePromptOptions {
  confirm: boolean
  force?: boolean // Required for production prompts
}

/**
 * Options for creating prompts
 */
export interface CreatePromptOptions {
  retries?: number
  environment?: 'development' | 'staging' | 'production'
}

/**
 * Registry interface for local prompt storage
 */
export interface PromptRegistry {
  savePrompt(prompt: StoredPrompt): Promise<void>
  getPrompt(nameOrId: string): Promise<StoredPrompt | null>
  getAllPrompts(): Promise<StoredPrompt[]>
  deletePrompt(name: string): Promise<void>
  saveVersion(promptName: string, version: PromptVersion): Promise<void>
  getPromptVersions(promptName: string): Promise<PromptVersion[]>
}

/**
 * OpenAI Responses API types (simplified)
 */
export interface OpenAIResponse {
  id: string
  name: string
  description?: string
  messages: PromptMessage[]
  created_at: string
}

export interface OpenAIResponsesList {
  data: OpenAIResponse[]
  has_more: boolean
}

/**
 * Error types for better error handling
 */
export class PromptValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PromptValidationError'
  }
}

export class PromptNotFoundError extends Error {
  constructor(promptName: string) {
    super(`Prompt not found: ${promptName}`)
    this.name = 'PromptNotFoundError'
  }
}

export class PromptOperationError extends Error {
  constructor(operation: string, message: string) {
    super(`Failed to ${operation} prompt: ${message}`)
    this.name = 'PromptOperationError'
  }
}

/**
 * Vehicle extraction specific types
 */
export interface VehicleExtractionPromptConfig {
  prioritizeExistingVariants: boolean
  mergeTransmissionVariants: boolean
  handleRangeSpecifications: 'use-context' | 'expand' | 'ignore'
  includeExistingListings: boolean
  maxExistingListings?: number
}

export interface PromptPerformanceMetrics {
  promptId: string
  promptVersion: number
  totalCalls: number
  successRate: number
  averageTokensUsed: number
  averageResponseTime: number
  errorTypes: Record<string, number>
  lastUpdated: string
}