#!/usr/bin/env node

/**
 * CLI Test Runner for AI Extraction Service
 * 
 * Provides command-line interface for testing and validating the AI extraction service.
 * Useful for CI/CD pipelines and automated testing.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { validatePhase1, runComprehensiveTests } from './test-runner'
import { createTestService } from '../extraction/extractor'
import { 
  TOYOTA_SAMPLE_CONTENT,
  // BMW_SAMPLE_CONTENT,
  // MERCEDES_SAMPLE_CONTENT,
  TEST_CASES,
  COST_TEST_SCENARIOS
} from './sample-data'

// Command line argument parsing
const args = process.argv.slice(2)
const command = args[0] || 'help'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`
}

function printHeader(title: string): void {
  console.log('\n' + '='.repeat(60))
  console.log(colorize(title, 'cyan'))
  console.log('='.repeat(60))
}

function printSuccess(message: string): void {
  console.log(colorize('✅ ' + message, 'green'))
}

function printError(message: string): void {
  console.log(colorize('❌ ' + message, 'red'))
}

function printWarning(message: string): void {
  console.log(colorize('⚠️  ' + message, 'yellow'))
}

function printInfo(message: string): void {
  console.log(colorize('ℹ️  ' + message, 'blue'))
}

async function runSingleExtraction(content: string, dealer: string = 'Test Dealer'): Promise<boolean> {
  try {
    const service = createTestService()
    const startTime = Date.now()
    
    const result = await service.extract(content, {
      dealer,
      language: 'da',
      strategy: 'primary_only',
      enableValidation: true,
      enableCostChecking: false
    })
    
    const endTime = Date.now()
    const processingTime = endTime - startTime
    
    if (result.success) {
      printSuccess(`Extraction successful (${processingTime}ms)`)
      console.log(`  Brand: ${result.data?.documentInfo.brand}`)
      console.log(`  Vehicles: ${result.data?.vehicles.length || 0}`)
      console.log(`  Variants: ${result.data?.vehicles.reduce((sum, v) => sum + v.variants.length, 0) || 0}`)
      console.log(`  Confidence: ${Math.round((result.validationResult?.confidence || 0) * 100)}%`)
      console.log(`  Validation: ${result.validationResult?.isValid ? 'PASS' : 'FAIL'}`)
      
      if (result.validationResult && !result.validationResult.isValid) {
        printWarning(`Validation errors: ${result.validationResult.errors.length}`)
      }
      
      return true
    } else {
      printError(`Extraction failed: ${result.error?.message}`)
      return false
    }
  } catch (error) {
    printError(`Extraction crashed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return false
  }
}

async function runValidationCommand(): Promise<void> {
  printHeader('🔍 Phase 1 Validation')
  
  try {
    const isValid = await validatePhase1()
    
    if (isValid) {
      printSuccess('Phase 1 validation passed')
      process.exit(0)
    } else {
      printError('Phase 1 validation failed')
      process.exit(1)
    }
  } catch (error) {
    printError(`Validation failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    process.exit(1)
  }
}

async function runComprehensiveCommand(): Promise<void> {
  printHeader('🧪 Comprehensive Test Suite')
  
  try {
    const results = await runComprehensiveTests()
    
    console.log('\n📊 Test Results:')
    console.log(`  Total Tests: ${results.totalTests}`)
    console.log(`  Passed: ${colorize(String(results.passedTests), 'green')}`)
    console.log(`  Failed: ${colorize(String(results.failedTests), results.failedTests > 0 ? 'red' : 'green')}`)
    console.log(`  Success Rate: ${Math.round((results.passedTests / results.totalTests) * 100)}%`)
    console.log(`  Duration: ${results.endTime.getTime() - results.startTime.getTime()}ms`)
    
    console.log('\n📋 Component Results:')
    for (const [component, result] of Object.entries(results.components)) {
      const status = result.failed === 0 ? '✅' : '❌'
      console.log(`  ${status} ${component}: ${result.passed}/${result.tests}`)
    }
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:')
      results.errors.forEach(error => console.log(`  • ${error}`))
    }
    
    // Write results to file
    const reportPath = join(process.cwd(), 'test-results.json')
    writeFileSync(reportPath, JSON.stringify(results, null, 2))
    printInfo(`Full results written to ${reportPath}`)
    
    if (results.failedTests === 0) {
      printSuccess('All tests passed')
      process.exit(0)
    } else {
      printError(`${results.failedTests} tests failed`)
      process.exit(1)
    }
  } catch (error) {
    printError(`Comprehensive tests failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    process.exit(1)
  }
}

async function runQuickCommand(): Promise<void> {
  printHeader('⚡ Quick Test')
  
  const tests = [
    { name: 'Minimal Content', content: TEST_CASES.minimal, dealer: 'Test Dealer' },
    { name: 'Toyota Sample', content: TOYOTA_SAMPLE_CONTENT.substring(0, 500), dealer: 'Toyota Denmark' },
    { name: 'Special Characters', content: TEST_CASES.specialCharacters, dealer: 'Test Dealer' }
  ]
  
  let passed = 0
  let total = tests.length
  
  for (const test of tests) {
    console.log(`\n🔍 Testing: ${test.name}`)
    const success = await runSingleExtraction(test.content, test.dealer)
    if (success) passed++
  }
  
  console.log(`\n📊 Quick Test Results: ${passed}/${total} passed`)
  
  if (passed === total) {
    printSuccess('Quick test passed')
    process.exit(0)
  } else {
    printError('Quick test failed')
    process.exit(1)
  }
}

async function runBenchmarkCommand(): Promise<void> {
  printHeader('📈 Performance Benchmark')
  
  const benchmarks = [
    { name: 'Low Cost', content: COST_TEST_SCENARIOS.lowCost.content },
    { name: 'Medium Cost', content: COST_TEST_SCENARIOS.mediumCost.content },
    { name: 'High Cost', content: COST_TEST_SCENARIOS.highCost.content }
  ]
  
  const results = []
  
  for (const benchmark of benchmarks) {
    console.log(`\n⏱️  Benchmarking: ${benchmark.name}`)
    
    const times = []
    const iterations = 3
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now()
      await runSingleExtraction(benchmark.content)
      const endTime = Date.now()
      times.push(endTime - startTime)
    }
    
    const avgTime = times.reduce((sum, time) => sum + time, 0) / iterations
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    
    results.push({
      name: benchmark.name,
      avgTime,
      minTime,
      maxTime,
      iterations
    })
    
    console.log(`  Average: ${Math.round(avgTime)}ms`)
    console.log(`  Range: ${minTime}ms - ${maxTime}ms`)
  }
  
  console.log('\n📊 Benchmark Summary:')
  results.forEach(result => {
    console.log(`  ${result.name}: ${Math.round(result.avgTime)}ms avg`)
  })
}

async function runFileCommand(filePath: string): Promise<void> {
  printHeader(`📄 Testing File: ${filePath}`)
  
  if (!existsSync(filePath)) {
    printError(`File not found: ${filePath}`)
    process.exit(1)
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8')
    const success = await runSingleExtraction(content)
    
    if (success) {
      printSuccess('File test passed')
      process.exit(0)
    } else {
      printError('File test failed')
      process.exit(1)
    }
  } catch (error) {
    printError(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    process.exit(1)
  }
}

function showHelp(): void {
  console.log(`
${colorize('AI Extraction Service CLI Test Runner', 'cyan')}

Usage: node cli-runner.js [command] [options]

Commands:
  ${colorize('validate', 'green')}     Validate Phase 1 implementation
  ${colorize('comprehensive', 'green')} Run comprehensive test suite
  ${colorize('quick', 'green')}        Run quick smoke tests
  ${colorize('benchmark', 'green')}    Run performance benchmarks
  ${colorize('file <path>', 'green')}  Test extraction on specific file
  ${colorize('help', 'green')}         Show this help message

Examples:
  node cli-runner.js validate
  node cli-runner.js comprehensive
  node cli-runner.js quick
  node cli-runner.js file ./test-content.txt
  node cli-runner.js benchmark

Exit Codes:
  0 - Success
  1 - Failure

For CI/CD integration, use the exit codes to determine test success.
`)
}

async function main(): Promise<void> {
  switch (command) {
    case 'validate':
      await runValidationCommand()
      break
      
    case 'comprehensive':
      await runComprehensiveCommand()
      break
      
    case 'quick':
      await runQuickCommand()
      break
      
    case 'benchmark':
      await runBenchmarkCommand()
      break
      
    case 'file':
      const filePath = args[1]
      if (!filePath) {
        printError('Please provide a file path')
        showHelp()
        process.exit(1)
      }
      await runFileCommand(filePath)
      break
      
    case 'help':
    default:
      showHelp()
      process.exit(0)
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  printError(`Uncaught exception: ${error.message}`)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  printError(`Unhandled rejection: ${reason}`)
  process.exit(1)
})

// Run the CLI
if (require.main === module) {
  main().catch((error) => {
    printError(`CLI failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    process.exit(1)
  })
}

export { main as runCLI }