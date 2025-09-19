# Vercel Staging Setup for Hobby Plan (Free)

Based on Vercel's official guide for Hobby users, you can use **Preview Deployments** as your staging environment.

## Setup Steps

### 1. Create a Staging Branch
```bash
git checkout -b staging
git push origin staging
```

### 2. Configure Environment Variables in Vercel

1. Go to your Vercel project: https://vercel.com/dashboard
2. Navigate to **Settings → Environment Variables**
3. Add your staging variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://lpbtgtpgbnybjqcpsrrf.supabase.co` | Preview |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Preview |
| `VITE_AI_EXTRACTION_ENABLED` | `true` | Preview |
| `VITE_DEBUG_MODE` | `true` | Preview |

**Important**: Set these for "Preview" environment, not "Production"

### 3. Deploy to Staging

Every push to your `staging` branch will automatically create a preview deployment:

```bash
# Make changes
git add .
git commit -m "Update staging"
git push origin staging
```

### 4. Access Your Staging URL

Vercel will provide URLs like:
- `https://leasingborsen-staging-[unique-hash].vercel.app`
- `https://leasingborsen-git-staging-[username].vercel.app`

You can find the exact URL in:
- Vercel dashboard → Your project → Deployments
- GitHub PR comments (if you create a PR)
- Vercel CLI output

## Permanent Staging URL (Workaround)

Since Hobby plan doesn't support custom environments, you can create a more stable URL:

### Option A: Use Branch Preview URL
The branch preview URL remains relatively stable:
```
https://leasingborsen-git-staging-[your-username].vercel.app
```

### Option B: Create a Separate Vercel Project
1. Create a new project: `leasingborsen-staging`
2. Connect it to the same GitHub repo
3. Set it to deploy from `staging` branch
4. Configure with staging environment variables

This gives you a permanent URL:
```
https://leasingborsen-staging.vercel.app
```

## Workflow

### Development Flow
```bash
# 1. Work on feature branch
git checkout -b feature/new-feature

# 2. Merge to staging for testing
git checkout staging
git merge feature/new-feature
git push origin staging
# → Creates preview at: https://leasingborsen-git-staging-[username].vercel.app

# 3. After testing, merge to main
git checkout main
git merge staging
git push origin main
# → Deploys to production
```

### Quick Deploy Command
```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy current branch to preview
vercel

# Force deploy to preview with staging env
vercel --build-env NODE_ENV=staging
```

## Environment Detection

Update your app to detect staging environment:

```typescript
// src/config/environments.ts
export const isStaging = () => {
  return window.location.hostname.includes('staging') || 
         window.location.hostname.includes('git-staging')
}
```

## Current Setup Status

✅ You already have:
- Staging database on Supabase
- Staging environment variables in `.env.staging`
- All Edge Functions deployed to staging

❌ You need to:
1. Push your code to GitHub (if not already)
2. Connect GitHub to Vercel
3. Create `staging` branch
4. Configure environment variables in Vercel
5. Push to staging branch

## Result

You'll have:
- **Production**: `https://leasingborsen.vercel.app` (from main branch)
- **Staging**: `https://leasingborsen-git-staging-[username].vercel.app` (from staging branch)
- **Feature Previews**: Unique URL for each PR/branch

This gives you a complete staging environment accessible via web URL without needing a paid Vercel plan!