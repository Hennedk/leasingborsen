import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PromptManager } from '../index'
import type { PromptTemplate, PromptVersion, StoredPrompt } from '../types'

// Mock OpenAI client
const mockOpenAI = {
  responses: {
    create: vi.fn(),
    list: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    del: vi.fn()
  }
}

describe('PromptManager', () => {
  let promptManager: PromptManager
  let mockRegistry: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockRegistry = {
      savePrompt: vi.fn(),
      getPrompt: vi.fn(),
      getAllPrompts: vi.fn(),
      deletePrompt: vi.fn(),
      getPromptVersions: vi.fn(),
      saveVersion: vi.fn()
    }
    promptManager = new PromptManager(mockOpenAI as any, mockRegistry)
  })

  describe('createPrompt', () => {
    it('should create a new prompt and save to registry', async () => {
      const template: PromptTemplate = {
        name: 'vehicle-extraction',
        description: 'Extract vehicle data from PDF content',
        messages: [
          { role: 'system', content: 'You are an expert at extracting vehicle information.' },
          { role: 'user', content: '{{pdfContent}}' }
        ],
        parameters: ['pdfContent'],
        metadata: {
          version: 1,
          tags: ['extraction', 'vehicles'],
          environment: 'development'
        }
      }

      const mockResponse = {
        id: 'resp-abc123',
        name: 'vehicle-extraction',
        description: 'Extract vehicle data from PDF content',
        messages: template.messages,
        created_at: new Date().toISOString()
      }

      mockOpenAI.responses.create.mockResolvedValue(mockResponse)
      mockRegistry.savePrompt.mockResolvedValue(undefined)
      mockRegistry.saveVersion.mockResolvedValue(undefined)

      const result = await promptManager.createPrompt(template)

      expect(mockOpenAI.responses.create).toHaveBeenCalledWith({
        name: template.name,
        description: template.description,
        messages: template.messages
      })

      expect(mockRegistry.savePrompt).toHaveBeenCalledWith({
        id: 'resp-abc123',
        name: 'vehicle-extraction',
        description: 'Extract vehicle data from PDF content',
        currentVersion: 1,
        environment: 'development',
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      })

      expect(mockRegistry.saveVersion).toHaveBeenCalledWith('vehicle-extraction', {
        version: 1,
        promptId: 'resp-abc123',
        messages: template.messages,
        metadata: template.metadata,
        createdAt: expect.any(String)
      })

      expect(result).toEqual({
        id: 'resp-abc123',
        name: 'vehicle-extraction',
        version: 1,
        createdAt: expect.any(String)
      })
    })

    it('should validate required parameters', async () => {
      const invalidTemplate: PromptTemplate = {
        name: '',
        description: 'Test prompt',
        messages: [],
        parameters: []
      }

      await expect(promptManager.createPrompt(invalidTemplate)).rejects.toThrow('Prompt name is required')
    })

    it('should validate message placeholders match parameters', async () => {
      const template: PromptTemplate = {
        name: 'test-prompt',
        description: 'Test prompt',
        messages: [
          { role: 'user', content: '{{param1}} and {{param2}}' }
        ],
        parameters: ['param1'] // Missing param2
      }

      await expect(promptManager.createPrompt(template)).rejects.toThrow('Message placeholder {{param2}} not found in parameters')
    })
  })

  describe('listPrompts', () => {
    it('should list all prompts from registry', async () => {
      const mockPrompts = [
        {
          id: 'resp-abc123',
          name: 'vehicle-extraction',
          description: 'Extract vehicles',
          currentVersion: 2,
          environment: 'production'
        },
        {
          id: 'resp-def456',
          name: 'compare-listings',
          description: 'Compare listings',
          currentVersion: 1,
          environment: 'development'
        }
      ]

      mockRegistry.getAllPrompts.mockResolvedValue(mockPrompts)

      const result = await promptManager.listPrompts()

      expect(result).toEqual(mockPrompts)
      expect(mockRegistry.getAllPrompts).toHaveBeenCalled()
    })

    it('should filter prompts by environment', async () => {
      const mockPrompts = [
        {
          id: 'resp-abc123',
          name: 'vehicle-extraction',
          environment: 'production'
        },
        {
          id: 'resp-def456',
          name: 'compare-listings',
          environment: 'development'
        }
      ]

      mockRegistry.getAllPrompts.mockResolvedValue(mockPrompts)

      const result = await promptManager.listPrompts({ environment: 'production' })

      expect(result).toEqual([mockPrompts[0]])
    })

    it('should filter prompts by tags', async () => {
      const mockPrompts = [
        {
          id: 'resp-abc123',
          name: 'vehicle-extraction',
          tags: ['extraction', 'vehicles']
        },
        {
          id: 'resp-def456',
          name: 'compare-listings',
          tags: ['comparison']
        }
      ]

      mockRegistry.getAllPrompts.mockResolvedValue(mockPrompts)

      const result = await promptManager.listPrompts({ tags: ['extraction'] })

      expect(result).toEqual([mockPrompts[0]])
    })
  })

  describe('getPrompt', () => {
    it('should retrieve prompt by ID', async () => {
      const mockStoredPrompt = {
        id: 'resp-abc123',
        name: 'vehicle-extraction',
        currentVersion: 2
      }

      const mockAPIPrompt = {
        id: 'resp-abc123',
        name: 'vehicle-extraction',
        messages: [{ role: 'system', content: 'Test' }]
      }

      mockRegistry.getPrompt.mockResolvedValue(mockStoredPrompt)
      mockOpenAI.responses.retrieve.mockResolvedValue(mockAPIPrompt)

      const result = await promptManager.getPrompt('resp-abc123')

      expect(mockOpenAI.responses.retrieve).toHaveBeenCalledWith('resp-abc123')
      expect(result).toEqual({
        ...mockAPIPrompt,
        localMetadata: mockStoredPrompt
      })
    })

    it('should retrieve prompt by name', async () => {
      const mockStoredPrompt = {
        id: 'resp-abc123',
        name: 'vehicle-extraction',
        currentVersion: 2
      }

      mockRegistry.getPrompt.mockResolvedValue(mockStoredPrompt)

      const result = await promptManager.getPromptByName('vehicle-extraction')

      expect(mockRegistry.getPrompt).toHaveBeenCalledWith('vehicle-extraction')
      expect(result).toEqual(mockStoredPrompt)
    })

    it('should throw error for non-existent prompt', async () => {
      mockRegistry.getPrompt.mockResolvedValue(null)

      await expect(promptManager.getPromptByName('non-existent')).rejects.toThrow('Prompt not found: non-existent')
    })
  })

  describe('updatePrompt', () => {
    it('should update prompt and increment version', async () => {
      const mockExisting = {
        id: 'resp-abc123',
        name: 'vehicle-extraction',
        currentVersion: 1
      }

      const updates = {
        messages: [
          { role: 'system', content: 'Updated system prompt' },
          { role: 'user', content: '{{pdfContent}}' }
        ],
        metadata: {
          changelog: 'Improved extraction accuracy'
        }
      }

      mockRegistry.getPrompt.mockResolvedValue(mockExisting)
      mockOpenAI.responses.update.mockResolvedValue({ success: true })

      const result = await promptManager.updatePrompt('vehicle-extraction', updates)

      expect(mockOpenAI.responses.update).toHaveBeenCalledWith('resp-abc123', {
        messages: updates.messages
      })

      expect(mockRegistry.saveVersion).toHaveBeenCalledWith('vehicle-extraction', {
        version: 2,
        promptId: 'resp-abc123',
        messages: updates.messages,
        metadata: expect.objectContaining({
          changelog: 'Improved extraction accuracy'
        }),
        createdAt: expect.any(String)
      })

      expect(result).toEqual({
        id: 'resp-abc123',
        name: 'vehicle-extraction',
        version: 2,
        changelog: 'Improved extraction accuracy'
      })
    })

    it('should validate updates before applying', async () => {
      const mockExisting = {
        id: 'resp-abc123',
        name: 'vehicle-extraction',
        currentVersion: 1
      }

      mockRegistry.getPrompt.mockResolvedValue(mockExisting)

      const invalidUpdates = {
        messages: [] // Empty messages
      }

      await expect(promptManager.updatePrompt('vehicle-extraction', invalidUpdates)).rejects.toThrow('Messages cannot be empty')
    })
  })

  describe('deletePrompt', () => {
    it('should delete prompt with confirmation', async () => {
      const mockPrompt = {
        id: 'resp-abc123',
        name: 'vehicle-extraction',
        environment: 'development'
      }

      mockRegistry.getPrompt.mockResolvedValue(mockPrompt)
      mockOpenAI.responses.del.mockResolvedValue({ success: true })

      const result = await promptManager.deletePrompt('vehicle-extraction', { confirm: true })

      expect(mockOpenAI.responses.del).toHaveBeenCalledWith('resp-abc123')
      expect(mockRegistry.deletePrompt).toHaveBeenCalledWith('vehicle-extraction')
      expect(result).toEqual({ success: true, deletedId: 'resp-abc123' })
    })

    it('should prevent deletion without confirmation', async () => {
      await expect(promptManager.deletePrompt('vehicle-extraction')).rejects.toThrow('Deletion requires confirmation')
    })

    it('should prevent deletion of production prompts without force flag', async () => {
      const mockPrompt = {
        id: 'resp-abc123',
        name: 'vehicle-extraction',
        environment: 'production'
      }

      mockRegistry.getPrompt.mockResolvedValue(mockPrompt)

      await expect(promptManager.deletePrompt('vehicle-extraction', { confirm: true }))
        .rejects.toThrow('Cannot delete production prompt without force flag')
    })
  })

  describe('rollbackPrompt', () => {
    it('should rollback to previous version', async () => {
      const mockPrompt = {
        id: 'resp-abc123',
        name: 'vehicle-extraction',
        currentVersion: 3
      }

      const mockVersion2 = {
        version: 2,
        promptId: 'resp-abc123',
        messages: [{ role: 'system', content: 'Version 2 content' }],
        metadata: { changelog: 'Version 2 changes' }
      }

      mockRegistry.getPrompt.mockResolvedValue(mockPrompt)
      mockRegistry.getPromptVersions.mockResolvedValue([
        { version: 3 },
        mockVersion2,
        { version: 1 }
      ])

      const result = await promptManager.rollbackPrompt('vehicle-extraction', 2)

      expect(mockOpenAI.responses.update).toHaveBeenCalledWith('resp-abc123', {
        messages: mockVersion2.messages
      })

      expect(mockRegistry.saveVersion).toHaveBeenCalledWith('vehicle-extraction', {
        version: 4,
        promptId: 'resp-abc123',
        messages: mockVersion2.messages,
        metadata: expect.objectContaining({
          rollbackFrom: 3,
          rollbackTo: 2
        })
      })

      expect(result).toEqual({
        id: 'resp-abc123',
        name: 'vehicle-extraction',
        version: 4,
        rollbackFrom: 3,
        rollbackTo: 2
      })
    })
  })

  describe('error handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      const template: PromptTemplate = {
        name: 'test-prompt',
        description: 'Test',
        messages: [{ role: 'system', content: 'Test' }],
        parameters: []
      }

      mockOpenAI.responses.create.mockRejectedValue(new Error('API rate limit exceeded'))

      await expect(promptManager.createPrompt(template)).rejects.toThrow('Failed to create prompt: API rate limit exceeded')
    })

    it('should handle network errors with retry', async () => {
      const template: PromptTemplate = {
        name: 'test-prompt',
        description: 'Test',
        messages: [{ role: 'system', content: 'Test' }],
        parameters: []
      }

      mockOpenAI.responses.create
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          id: 'resp-abc123',
          name: 'test-prompt'
        })

      const result = await promptManager.createPrompt(template, { retries: 1 })

      expect(mockOpenAI.responses.create).toHaveBeenCalledTimes(2)
      expect(result.id).toBe('resp-abc123')
    })
  })
})