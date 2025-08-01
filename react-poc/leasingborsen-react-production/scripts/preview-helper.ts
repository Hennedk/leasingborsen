#!/usr/bin/env tsx

import { execSync } from 'child_process'
import { readFileSync } from 'fs'

// Get current git branch
function getCurrentBranch(): string {
  try {
    return execSync('git branch --show-current', { encoding: 'utf-8' }).trim()
  } catch (error) {
    console.error('Error getting current branch:', error)
    return 'unknown'
  }
}

// Get Vercel team/user from vercel.json or git config
function getVercelUser(): string {
  try {
    // Try to read from vercel.json first
    const vercelConfig = JSON.parse(readFileSync('.vercel/project.json', 'utf-8'))
    return vercelConfig.orgId || 'your-username'
  } catch {
    try {
      // Fallback to git config
      const gitUser = execSync('git config user.name', { encoding: 'utf-8' }).trim()
      return gitUser.toLowerCase().replace(/\s+/g, '-')
    } catch {
      return 'your-username'
    }
  }
}

// Generate preview URL for current branch
function getPreviewUrl(): string {
  const branch = getCurrentBranch()
  const user = getVercelUser()
  
  if (branch === 'main' || branch === 'master') {
    return 'https://leasingborsen.vercel.app (Production)'
  }
  
  // Vercel preview URL format
  const sanitizedBranch = branch.replace(/[^a-zA-Z0-9-]/g, '-')
  return `https://leasingborsen-git-${sanitizedBranch}-${user}.vercel.app`
}

// Main command handler
const command = process.argv[2]

switch (command) {
  case 'url':
    console.log('🔗 Preview URL for current branch:')
    console.log(getPreviewUrl())
    break
    
  case 'deploy':
    console.log('🚀 Deploying current branch to preview...')
    try {
      execSync('vercel --prod=false', { stdio: 'inherit' })
      console.log('✅ Preview deployed!')
      console.log('URL:', getPreviewUrl())
    } catch (error) {
      console.error('❌ Deployment failed:', error)
    }
    break
    
  case 'branch':
    const branch = getCurrentBranch()
    console.log(`📋 Current branch: ${branch}`)
    console.log(`🔗 Preview URL: ${getPreviewUrl()}`)
    break
    
  case 'reset-data':
    console.log('🗃️ Resetting staging data...')
    try {
      execSync('npm run staging:seed', { stdio: 'inherit' })
      console.log('✅ Staging data reset complete!')
    } catch (error) {
      console.error('❌ Data reset failed:', error)
    }
    break
    
  default:
    console.log(`
🚀 Preview Helper Commands:

  npm run preview:url         - Get preview URL for current branch
  npm run preview:deploy      - Deploy current branch to preview
  npm run preview:branch      - Show current branch info
  npm run preview:reset-data  - Reset staging database

Examples:
  npm run preview:url
  npm run preview:deploy
    `)
}