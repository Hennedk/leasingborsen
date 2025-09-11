/**
 * Env Coverage Check
 *
 * Scans the repository for:
 * - import.meta.env.VAR in frontend code
 * - process.env.VAR occurrences
 * - Deno.env.get('VAR') in Edge Functions
 * and compares against declared keys in .env.example, .env.staging.example,
 * and supabase/functions/.env.example.
 *
 * Outputs:
 * - Missing: referenced in code but absent from any example env file
 * - Unused: present in example envs but not referenced in code
 */

import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc)
    else acc.push(full)
  }
  return acc
}

function collectEnvKeysFromFiles(files: string[]) {
  const viteRe = /import\.meta\.env\.([A-Z0-9_]+)/g
  const nodeRe = /process\.env\.([A-Z0-9_]+)/g
  const denoRe = /Deno\.env\.get\(['"]([A-Z0-9_]+)['"]\)/g

  const refs = new Set<string>()
  for (const file of files) {
    // Limit to text files we care about
    if (!/\.(ts|tsx|js|mjs|cjs|md|sql|json)$/i.test(file)) continue
    const content = fs.readFileSync(file, 'utf8')
    let m: RegExpExecArray | null
    while ((m = viteRe.exec(content))) refs.add(m[1])
    while ((m = nodeRe.exec(content))) refs.add(m[1])
    while ((m = denoRe.exec(content))) refs.add(m[1])
  }
  return refs
}

function parseEnvExample(file: string): Set<string> {
  const keys = new Set<string>()
  if (!fs.existsSync(file)) return keys
  const content = fs.readFileSync(file, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key] = trimmed.split('=')
    if (key && /^[A-Z0-9_]+$/.test(key)) keys.add(key)
  }
  return keys
}

function main() {
  const files = walk(ROOT)
  const codeRefs = collectEnvKeysFromFiles(files)

  const exampleFiles = [
    path.join(ROOT, '.env.example'),
    path.join(ROOT, '.env.staging.example'),
    path.join(ROOT, 'supabase', 'functions', '.env.example'),
  ]

  const declared = new Set<string>()
  for (const ef of exampleFiles) {
    parseEnvExample(ef).forEach((k) => declared.add(k))
  }

  // Findings
  const missing = [...codeRefs].filter((k) => !declared.has(k)).sort()
  const unused = [...declared].filter((k) => !codeRefs.has(k)).sort()

  console.log('Env Coverage Report')
  console.log('===================')
  console.log(`Code-referenced keys: ${codeRefs.size}`)
  console.log(`Declared in examples: ${declared.size}`)
  console.log('')

  if (missing.length) {
    console.log('Missing keys (referenced in code, not in any example env):')
    for (const k of missing) console.log(` - ${k}`)
    console.log('')
  } else {
    console.log('No missing keys. ✅')
  }

  if (unused.length) {
    console.log('Unused keys (declared in examples, not referenced in code):')
    for (const k of unused) console.log(` - ${k}`)
    console.log('')
  } else {
    console.log('No unused keys. ✅')
  }

  // Non-failing exit; integrate into CI to fail on missing if desired
}

main()

