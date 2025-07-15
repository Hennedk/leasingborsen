# Prompt Manager POC

A test-driven proof of concept for managing OpenAI Responses API prompts with full CRUD operations.

## Features

- ✅ **Full CRUD Operations**: Create, Read, Update, Delete prompts via API
- ✅ **Version Control**: Git-like versioning with rollback capabilities
- ✅ **Local Registry**: Track prompts locally with metadata
- ✅ **Environment Management**: Separate dev/staging/production prompts
- ✅ **Test-Driven Development**: Comprehensive test suite
- ✅ **Type Safety**: Full TypeScript support

## Quick Start

### 1. Run Tests

```bash
# Run the test suite
npm test scripts/prompt-manager/__tests__/prompt-manager.test.ts

# Or use the test runner
npx tsx scripts/prompt-manager/run-tests.ts
```

### 2. Try the Example

```bash
# Set your OpenAI API key
export OPENAI_API_KEY=your-key-here

# Run the example usage
npx tsx scripts/prompt-manager/example-usage.ts
```

## Core Components

### PromptManager Class

The main class that handles all CRUD operations:

```typescript
const promptManager = new PromptManager(openai, registry)

// Create a prompt
await promptManager.createPrompt(template)

// List prompts
await promptManager.listPrompts({ environment: 'production' })

// Update with version tracking
await promptManager.updatePrompt('prompt-name', updates)

// Rollback to previous version
await promptManager.rollbackPrompt('prompt-name', targetVersion)
```

### Registry Options

1. **FileBasedPromptRegistry**: Persists to disk (production)
2. **InMemoryPromptRegistry**: For testing

### Integration with Vehicle Extraction

```typescript
// Get your stored prompt
const prompt = await promptManager.getPromptByName('vehicle-extraction-v1')

// Use with OpenAI Responses API
const response = await openai.responses.create({
  prompt: {
    id: prompt.id,
    version: prompt.currentVersion.toString()
  },
  model: 'gpt-4-turbo-preview',
  input: [{ /* your context */ }]
})
```

## Benefits Over UI Management

1. **Version Control**: Track all changes in Git
2. **Code Review**: Prompt changes go through PR process
3. **Rollback**: Easy rollback to any previous version
4. **Environment Separation**: Different prompts for dev/prod
5. **Testing**: Test prompts before deployment
6. **Automation**: CI/CD integration for prompt deployment

## Next Steps

1. **CLI Tool**: Build interactive CLI for prompt management
2. **Migration Scripts**: Migrate existing UI prompts to code
3. **Performance Tracking**: Add metrics collection
4. **A/B Testing**: Support for prompt experiments

## File Structure

```
scripts/prompt-manager/
├── __tests__/
│   └── prompt-manager.test.ts    # Comprehensive test suite
├── types.ts                      # TypeScript interfaces
├── index.ts                      # Main PromptManager class
├── registry.ts                   # Registry implementations
├── example-usage.ts              # Usage examples
├── run-tests.ts                  # Test runner
└── data/                         # Local storage (gitignored)
    ├── registry.json             # Prompt metadata
    └── versions/                 # Version history
        └── vehicle-extraction-v1.json
```

## Testing Philosophy

This POC follows strict TDD principles:
- Tests written before implementation
- 100% coverage of critical paths
- Mock OpenAI API for isolation
- Both unit and integration tests