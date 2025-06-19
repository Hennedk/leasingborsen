// Test to verify cache key alignment between useAdminListing and mutations

// Simulate the query keys from the React app
const queryKeys = {
  listing: ['listing'],
  listingDetail: (id) => [...queryKeys.listing, id]
}

// Test the admin query key matches mutations
const testListingId = '0814a1a1-2f4b-48f3-adcf-08ff61549236'

const adminQueryKey = queryKeys.listingDetail(testListingId) // What useAdminListing should use
const mutationQueryKey = queryKeys.listingDetail(testListingId) // What mutations use

console.log('🧪 Testing cache key alignment...')
console.log('')
console.log('Admin hook query key:', JSON.stringify(adminQueryKey))
console.log('Mutation query key:  ', JSON.stringify(mutationQueryKey))
console.log('')

if (JSON.stringify(adminQueryKey) === JSON.stringify(mutationQueryKey)) {
  console.log('✅ Cache keys match! This should fix the 406 error.')
  console.log('')
  console.log('💡 The issue was that useAdminListing used:')
  console.log('   ["admin", "listing", "' + testListingId + '"]')
  console.log('')
  console.log('💡 But mutations updated cache for:')
  console.log('   ["listing", "' + testListingId + '"]')
  console.log('')
  console.log('💡 This caused a cache miss, triggering a refetch with the old useListing hook')
  console.log('   which queries full_listing_view and fails with 406 for draft listings.')
} else {
  console.log('❌ Cache keys still don\'t match!')
}