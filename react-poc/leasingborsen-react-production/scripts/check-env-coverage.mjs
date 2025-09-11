import { promises as fs } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

async function walk(dir, acc = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.git')) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) await walk(full, acc)
    else acc.push(full)
  }
  return acc
}

function parseEnvExample(file) {
  const keys = new Set()
  return fs.readFile(file, 'utf8')
    .then((content) => {
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const [key] = trimmed.split('=')
        if (key && /^[A-Z0-9_]+$/.test(key)) keys.add(key)
      }
      return keys
    })
    .catch(() => keys)
}

function collectEnvKeysFromText(content) {
  const viteRe = /import\.meta\.env\.([A-Z0-9_]+)/g
  const nodeRe = /process\.env\.([A-Z0-9_]+)/g
  const denoRe = /Deno\.env\.get\(['"]([A-Z0-9_]+)['"]\)/g
  const refs = new Set()
  let m
  while ((m = viteRe.exec(content))) refs.add(m[1])
  while ((m = nodeRe.exec(content))) refs.add(m[1])
  while ((m = denoRe.exec(content))) refs.add(m[1])
  return refs
}

async function main() {
  const files = await walk(ROOT)
  const codeRefs = new Set()
  for (const f of files) {
    if (!/\.(ts|tsx|js|mjs|cjs|sql|md|json)$/i.test(f)) continue
    try {
      const txt = await fs.readFile(f, 'utf8')
      collectEnvKeysFromText(txt).forEach((k) => codeRefs.add(k))
    } catch {}
  }

  const exampleFiles = [
    path.join(ROOT, '.env.example'),
    path.join(ROOT, '.env.staging.example'),
    path.join(ROOT, 'supabase', 'functions', '.env.example'),
  ]

  const declared = new Set()
  for (const ef of exampleFiles) {
    const keys = await parseEnvExample(ef)
    keys.forEach((k) => declared.add(k))
  }

  const missing = [...codeRefs].filter((k) => !declared.has(k)).sort()
  const unused = [...declared].filter((k) => !codeRefs.has(k)).sort()

  console.log('Env Coverage Report')
  console.log('===================')
  console.log(`Code-referenced keys: ${codeRefs.size}`)
  console.log(`Declared in examples: ${declared.size}`)
  console.log('')

  let fail = false
  if (missing.length) {
    console.error('Missing keys (referenced in code, not in any example env):')
    missing.forEach((k) => console.error(' -', k))
    fail = true
  } else {
    console.log('No missing keys. ✅')
  }
  if (unused.length) {
    console.log('Unused keys (declared in examples, not referenced in code):')
    unused.forEach((k) => console.log(' -', k))
  } else {
    console.log('No unused keys. ✅')
  }

  process.exit(fail ? 1 : 0)
}

main()

