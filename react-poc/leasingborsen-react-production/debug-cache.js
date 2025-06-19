// Debug script to check if there are cached queries causing the issue

console.log('🔍 Debugging cache issue...');
console.log('');
console.log('The 406 error happens BEFORE our useAdminListing logs, which suggests:');
console.log('');
console.log('1. React Query has a cached query with the same key ["listing", "id"]');
console.log('2. The cached query uses the old CarListingQueries.getListingById function');
console.log('3. React Query automatically refetches stale cached queries on component mount');
console.log('');
console.log('💡 Solutions:');
console.log('');
console.log('A) Hard refresh browser (Ctrl+Shift+R) to clear React Query cache');
console.log('B) Clear browser cache completely');
console.log('C) Use different query key for admin hook to avoid conflict');
console.log('');
console.log('🧪 Testing option C - using different query key...');

// Simulate different query key approach
const adminQueryKey = ['admin', 'listing', '0814a1a1-2f4b-48f3-adcf-08ff61549236'];
const oldQueryKey = ['listing', '0814a1a1-2f4b-48f3-adcf-08ff61549236'];

console.log('');
console.log('Old query key:', JSON.stringify(oldQueryKey));
console.log('New admin key:', JSON.stringify(adminQueryKey));
console.log('');
console.log('✅ Different keys would prevent cache conflicts');
console.log('❌ But would break mutation cache updates');
console.log('');
console.log('🎯 Best solution: Hard refresh to clear stale cache!');