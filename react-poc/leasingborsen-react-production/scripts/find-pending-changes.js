#!/usr/bin/env node

/**
 * Find pending changes that we can test the function with
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function findPendingChanges() {
  console.log('🔍 Finding pending changes to test with...\n')

  try {
    // Look for recent sessions with pending changes
    console.log('📋 1. Recent extraction sessions:')
    const { data: sessions, error: sessionsError } = await supabase
      .from('extraction_sessions')
      .select('id, session_name, status, created_at, total_extracted')
      .order('created_at', { ascending: false })
      .limit(10)

    if (sessionsError) {
      throw new Error(`Error fetching sessions: ${sessionsError.message}`)
    }

    sessions.forEach((session, idx) => {
      console.log(`   ${idx + 1}. ${session.session_name} (${session.id})`)
      console.log(`      Status: ${session.status}, Extracted: ${session.total_extracted}, Created: ${session.created_at}`)
    })
    console.log()

    // Look for pending changes in recent sessions
    console.log('📋 2. Looking for pending changes:')
    for (const session of sessions.slice(0, 5)) {
      const { data: pendingChanges, error: changesError } = await supabase
        .from('extraction_listing_changes')
        .select('id, change_type, change_status')
        .eq('session_id', session.id)
        .eq('change_status', 'pending')
        .limit(3)

      if (changesError) {
        console.log(`   ❌ Error checking session ${session.session_name}: ${changesError.message}`)
        continue
      }

      if (pendingChanges && pendingChanges.length > 0) {
        console.log(`   ✅ Session ${session.session_name} has ${pendingChanges.length} pending changes:`)
        pendingChanges.forEach((change, idx) => {
          console.log(`      ${idx + 1}. ${change.change_type} - ${change.id}`)
        })
        
        // Test with the first pending change
        console.log()
        console.log('🧪 3. Testing with first pending change...')
        const testChange = pendingChanges[0]
        
        const { data: functionResult, error: functionError } = await supabase.functions.invoke('apply-extraction-changes', {
          body: {
            sessionId: session.id,
            selectedChangeIds: [testChange.id],
            appliedBy: 'test-pending'
          }
        })

        if (functionError) {
          console.log(`❌ Function call failed: ${functionError.message}`)
          if (functionError.context) {
            console.log('   Context:', JSON.stringify(functionError.context, null, 2))
          }
        } else {
          console.log('✅ Function call succeeded!')
          console.log(`   Result:`, JSON.stringify(functionResult.result, null, 2))
        }
        
        return // Exit after testing one change
      }
    }

    console.log('   ❌ No pending changes found in recent sessions')
    console.log()

    // Show distribution of change statuses
    console.log('📊 4. Change status distribution:')
    const { data: statusCounts, error: statusError } = await supabase
      .from('extraction_listing_changes')
      .select('change_status')

    if (statusError) {
      throw new Error(`Error fetching status counts: ${statusError.message}`)
    }

    const statusMap = statusCounts.reduce((acc, change) => {
      acc[change.change_status] = (acc[change.change_status] || 0) + 1
      return acc
    }, {})

    Object.entries(statusMap).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`)
    })

  } catch (error) {
    console.error('❌ Search failed:', error.message)
    process.exit(1)
  }
}

// Run the search
findPendingChanges()