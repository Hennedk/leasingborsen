#!/usr/bin/env node

// Script to delete all batch import data from the database

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read environment variables from .env file manually
let supabaseUrl, supabaseKey
try {
  const envFile = readFileSync('.env', 'utf8')
  const envLines = envFile.split('\n')
  
  envLines.forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim()
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1].trim()
    }
  })
} catch (err) {
  console.error('❌ Could not read .env file:', err.message)
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function deleteAllBatches() {
  console.log('🗑️  Deleting All Batch Import Data')
  console.log('===================================\n')
  
  try {
    // 1. Delete all batch import items first (foreign key constraint)
    console.log('1. Deleting batch import items...')
    const { error: itemsError, count: itemsCount } = await supabase
      .from('batch_import_items')
      .delete()
      .gte('created_at', '1900-01-01') // Delete all rows (always true condition)
    
    if (itemsError) {
      console.error('❌ Error deleting batch items:', itemsError)
      throw itemsError
    }
    
    console.log(`✅ Deleted ${itemsCount || 'all'} batch import items\n`)
    
    // 2. Delete all batch imports
    console.log('2. Deleting batch imports...')
    const { error: batchError, count: batchCount } = await supabase
      .from('batch_imports')
      .delete()
      .gte('created_at', '1900-01-01') // Delete all rows (always true condition)
    
    if (batchError) {
      console.error('❌ Error deleting batch imports:', batchError)
      throw batchError
    }
    
    console.log(`✅ Deleted ${batchCount || 'all'} batch imports\n`)
    
    // 3. Delete any associated storage files
    console.log('3. Cleaning up storage files...')
    const { data: files, error: listError } = await supabase.storage
      .from('batch-imports')
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      })
    
    if (listError) {
      console.warn('⚠️  Could not list storage files:', listError.message)
    } else if (files && files.length > 0) {
      // Get all file paths including subdirectories
      const allFiles = []
      
      for (const file of files) {
        if (file.name) {
          // List files in subdirectories (batch folders)
          const { data: subFiles } = await supabase.storage
            .from('batch-imports')
            .list(file.name)
          
          if (subFiles) {
            subFiles.forEach(subFile => {
              if (subFile.name) {
                allFiles.push(`${file.name}/${subFile.name}`)
              }
            })
          }
        }
      }
      
      if (allFiles.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from('batch-imports')
          .remove(allFiles)
        
        if (deleteError) {
          console.warn('⚠️  Could not delete some storage files:', deleteError.message)
        } else {
          console.log(`✅ Deleted ${allFiles.length} storage files`)
        }
      }
    }
    
    console.log('\n🎉 All batch data deleted successfully!')
    console.log('You can now upload the VW PDF with fresh extraction.')
    
  } catch (error) {
    console.error('❌ Failed to delete batch data:', error)
    process.exit(1)
  }
}

deleteAllBatches()