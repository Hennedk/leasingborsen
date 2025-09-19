# Deploy Staging to Vercel

## Quick Deploy (One-time)

```bash
# Build with staging environment
NODE_ENV=staging npm run build

# Deploy to Vercel with staging env
vercel --prod --build-env NODE_ENV=staging
```

## Permanent Staging URL Setup

### 1. Install Vercel CLI (if not installed)
```bash
npm i -g vercel
```

### 2. Create Staging Deployment
```bash
# Link to your Vercel project (if not already linked)
vercel link

# Deploy with staging environment variables
vercel --env-file=.env.staging
```

### 3. Set Up Automatic Staging Deployments

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy Staging
on:
  push:
    branches: [staging, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
          
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

### 4. Configure Vercel Project

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add for "Preview" environment:
   - `VITE_SUPABASE_URL` = `https://lpbtgtpgbnybjqcpsrrf.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (your staging anon key)

### 5. Create Staging Branch
```bash
git checkout -b staging
git push origin staging
```

## Result

You'll get URLs like:
- **Production**: `https://leasingborsen.vercel.app`
- **Staging**: `https://leasingborsen-staging.vercel.app` or `https://leasingborsen-git-staging.vercel.app`

## Alternative: Netlify

Similar process:
1. Create new site on Netlify
2. Set environment variables
3. Deploy from staging branch

```bash
# Netlify CLI
netlify deploy --prod --build-env NODE_ENV=staging
```