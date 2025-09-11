import { promises as fs } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const functionsDir = path.join(root, 'supabase', 'functions')
const required = ['staging-check', 'test-function']

const missing = []
for (const name of required) {
  try {
    const stat = await fs.stat(path.join(functionsDir, name))
    if (!stat.isDirectory()) missing.push(name)
  } catch {
    missing.push(name)
  }
}

if (missing.length) {
  console.error('Missing edge functions:', missing.join(', '))
  process.exit(1)
} else {
  console.log('All required edge functions present.')
}

