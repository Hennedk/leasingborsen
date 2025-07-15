#!/usr/bin/env node

/**
 * Simple test runner for the prompt manager POC
 * Run with: npx tsx scripts/prompt-manager/run-tests.ts
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function runTests() {
  console.log('🧪 Running Prompt Manager Tests...\n')

  try {
    // Run the tests using vitest
    const { stdout, stderr } = await execAsync(
      'npx vitest run scripts/prompt-manager/__tests__/prompt-manager.test.ts',
      { cwd: process.cwd() }
    )

    console.log(stdout)
    if (stderr) {
      console.error('Errors:', stderr)
    }

    console.log('\n✅ Tests completed!')
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  runTests()
}

export { runTests }