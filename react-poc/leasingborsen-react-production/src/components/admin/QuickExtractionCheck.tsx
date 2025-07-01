import React, { useEffect } from 'react'
import { useSessionChanges } from '@/hooks/useListingComparison'

interface QuickExtractionCheckProps {
  sessionId: string
}

export const QuickExtractionCheck: React.FC<QuickExtractionCheckProps> = ({ sessionId }) => {
  const { data: changes = [] } = useSessionChanges(sessionId)

  useEffect(() => {
    if (changes.length > 0) {
      // Count match methods
      const matchMethodCounts = changes.reduce((acc, change) => {
        const method = change.match_method || 'unmatched'
        acc[method] = (acc[method] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      console.log('\n🎯 ENHANCED VARIANT MATCHING - Latest Extraction Results:')
      console.log(`Total changes: ${changes.length}`)
      console.log('\n📈 Match Method Summary:')
      Object.entries(matchMethodCounts).forEach(([method, count]) => {
        console.log(`   ${method}: ${count} changes`)
      })

      // Look for fuzzy matches
      const fuzzyMatches = changes.filter(c => c.match_method === 'fuzzy')
      if (fuzzyMatches.length > 0) {
        console.log(`\n✅ SUCCESS! Found ${fuzzyMatches.length} fuzzy matches:`)
        fuzzyMatches.forEach((change, index) => {
          const data = change.extracted_data || {}
          console.log(`\n${index + 1}. ${data.make} ${data.model} "${data.variant}"`)
          console.log(`   Confidence: ${((change.confidence_score || 0) * 100).toFixed(1)}%`)
          console.log(`   Change Type: ${change.change_type}`)
          if (change.field_changes?.variant) {
            console.log(`   Variant Update: "${change.field_changes.variant.old}" → "${change.field_changes.variant.new}"`)
          }
        })
      }

      // Check Kodiaq specifically
      const kodiaqChanges = changes.filter(c => c.extracted_data?.model === 'Kodiaq')
      if (kodiaqChanges.length > 0) {
        console.log('\n🚗 Kodiaq Changes:')
        kodiaqChanges.forEach((change, index) => {
          console.log(`\n${index + 1}. "${change.extracted_data?.variant}"`)
          console.log(`   Type: ${change.change_type} | Method: ${change.match_method} | Confidence: ${((change.confidence_score || 0) * 100).toFixed(1)}%`)
        })
      }
    }
  }, [changes])

  const fuzzyCount = changes.filter(c => c.match_method === 'fuzzy').length
  const unmatchedCount = changes.filter(c => c.match_method === 'unmatched').length

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 className="font-semibold text-blue-900 mb-2">
        🎯 Enhanced Variant Matching Status
      </h3>
      <div className="text-sm space-y-1">
        <p>Total Changes: {changes.length}</p>
        <p className={fuzzyCount > 0 ? "text-green-700 font-semibold" : ""}>
          Fuzzy Matches: {fuzzyCount} {fuzzyCount > 0 && "✅"}
        </p>
        <p>Unmatched (New): {unmatchedCount}</p>
      </div>
      {fuzzyCount > 0 && (
        <p className="text-xs text-green-700 mt-2">
          Success! Variant matching is working. Check console for details.
        </p>
      )}
    </div>
  )
}

export default QuickExtractionCheck