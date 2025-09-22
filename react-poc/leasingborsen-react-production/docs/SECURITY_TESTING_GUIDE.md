# Security Testing Guide

## ⚠️ CRITICAL SECURITY REMINDER

**NEVER** hardcode credentials, API keys, or URLs in test files that could be committed to version control.

## Secure Testing Approach

### Environment Variables

Always use environment variables for sensitive data:

```javascript
// ✅ CORRECT - Use environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

// ❌ NEVER DO THIS - Hardcoded credentials
const SUPABASE_URL = 'https://project.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGc...'; // Real key
```

### Test Environment Setup

1. **Create `.env.test.local`** (gitignored):
```bash
# .env.test.local
VITE_SUPABASE_URL=https://your-test-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-test-anon-key
TEST_ADMIN_EMAIL=test-admin@example.com
TEST_ADMIN_PASSWORD=secure-test-password
```

2. **Example Secure Test**:
```typescript
// tests/e2e/admin-auth.spec.ts
import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Validate environment setup
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error('TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be set');
}

test('admin can login', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  // ... rest of test
});
```

### Running Tests Securely

```bash
# Load test environment and run tests
npm run test:e2e

# For manual testing scripts
TEST_ADMIN_EMAIL="admin@test.local" \
TEST_ADMIN_PASSWORD="secure123" \
node your-test-script.js
```

### .gitignore Patterns

The following patterns prevent credential exposure:

```gitignore
# Environment files
.env*
!.env.example

# Test files that might contain credentials
test-*.js
*-auth.js
scripts/create-*-user.js
**/admin-auth.spec.ts
```

## Incident Response

If credentials are accidentally committed:

1. **Immediately remove** the files containing credentials
2. **Rotate all exposed credentials** (API keys, passwords)
3. **Audit access logs** for unauthorized usage
4. **Update .gitignore** to prevent future exposure
5. **Review git history** and consider BFG Repo-Cleaner if needed

## Admin Authentication Testing

For testing the admin auth fix:

1. **Create test admin user** via Supabase dashboard
2. **Use environment variables** for credentials
3. **Test via UI flow** at `/login`
4. **Verify role sync** by checking `user_roles` table
5. **Test CRUD operations** at `/admin/listings`

## Remember

- Use staging/test environments for testing
- Never expose production credentials in code
- Rotate credentials immediately if exposed
- Test the auth fix without committing sensitive data