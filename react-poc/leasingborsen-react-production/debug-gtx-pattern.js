#!/usr/bin/env node

// Debug script to test GTX+ pattern matching for ID.Buzz

const testPatterns = [
  { name: 'GTX+ 4Motion exact', pattern: /GTX\+\s+4Motion\s+(\d+)\s+hk.*?\*/s },
  { name: 'GTX+ general', pattern: /GTX\+.*?(\d+)\s+hk/s },
  { name: 'GTX+ with asterisk', pattern: /GTX\+.*?(\d+)\s+hk.*?\*/s },
  { name: 'GTX+ 4Motion loose', pattern: /GTX\+.*?4Motion.*?(\d+)\s+hk/s },
  { name: 'Any GTX line', pattern: /.*GTX.*?(\d+).*?hk.*/s }
]

// Test samples based on what you mentioned
const testSamples = [
  "GTX+ 4Motion 340 hk *",
  "GTX+ 4Motion 340 hk*",
  "GTX+4Motion 340 hk *",
  "GTX+ 4Motion  340 hk *",
  "Some text GTX+ 4Motion 340 hk * more text",
  "Life+ 150 kW (204 hk)",
  "Style+ 210 kW (286 hk)",
  "GTX+ 4Motion 340 hk * \nRækkevidde: 487 km"
]

console.log('🔍 Testing GTX+ Pattern Matching')
console.log('==================================\n')

testSamples.forEach((sample, i) => {
  console.log(`📋 Sample ${i + 1}: "${sample}"`)
  
  testPatterns.forEach(({ name, pattern }) => {
    const match = sample.match(pattern)
    if (match) {
      const horsepower = parseInt(match[1]) || 0
      console.log(`  ✅ ${name}: Matched! HP: ${horsepower}`)
    } else {
      console.log(`  ❌ ${name}: No match`)
    }
  })
  console.log('')
})

console.log('💡 If none of the patterns match your actual PDF text,')
console.log('   please copy the exact GTX+ text from the PDF and we can create a custom pattern.')