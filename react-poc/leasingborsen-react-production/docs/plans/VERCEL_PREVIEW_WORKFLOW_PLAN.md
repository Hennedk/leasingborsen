# Vercel Preview Workflow Implementation Plan

## Overview
Use Vercel's automatic preview deployments instead of manual staging branch management. Every branch and PR gets its own live preview URL.

## Phase 1: Basic Preview Setup (30 minutes)

### 1.1 Configure Vercel Environment Variables
**Location**: Vercel Dashboard → Settings → Environment Variables

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://lpbtgtpgbnybjqcpsrrf.supabase.co` | **Preview** |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | **Preview** |
| `VITE_AI_EXTRACTION_ENABLED` | `true` | **Preview** |
| `VITE_DEBUG_MODE` | `true` | **Preview** |
| `VITE_BATCH_PROCESSING_ENABLED` | `true` | **Preview** |

**Result**: All preview deployments use staging database automatically

### 1.2 Test Preview Deployment
```bash
# Create test branch
git checkout -b test/preview-setup
git push origin test/preview-setup
```

**Expected Result**: 
- Vercel creates preview URL: `https://leasingborsen-git-test-preview-setup-[username].vercel.app`
- Preview uses staging database
- All features work in isolated environment

## Phase 2: Development Workflow (1 hour)

### 2.1 Create Branch Protection Rules
**Location**: GitHub → Settings → Branches

```yaml
Branch Protection for 'main':
- Require pull request reviews before merging
- Require status checks to pass (Vercel deployment)
- Dismiss stale PR reviews when new commits are pushed
- Require linear history
```

### 2.2 Create Pull Request Template
**File**: `.github/pull_request_template.md`

```markdown
## What Changed
- [ ] Feature addition
- [ ] Bug fix
- [ ] Refactoring
- [ ] Documentation

## Testing
- [ ] Tested locally
- [ ] Tested on preview URL
- [ ] All tests pass

## Preview URL
<!-- Vercel will auto-comment with preview URL -->

## Screenshots
<!-- Add screenshots if UI changes -->
```

### 2.3 Create GitHub Actions for Testing
**File**: `.github/workflows/preview-tests.yml`

```yaml
name: Preview Tests
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:run
      - run: npm run build
```

## Phase 3: Enhanced Workflow Tools (2 hours)

### 3.1 Create Preview Helper Scripts
**File**: `scripts/preview-tools.ts`

```typescript
// Script to help manage preview deployments
export const previewTools = {
  // Get current branch preview URL
  getPreviewUrl: () => {
    const branch = getCurrentBranch()
    return `https://leasingborsen-git-${branch}-[username].vercel.app`
  },
  
  // Reset staging data for testing
  resetStagingData: async () => {
    // Clear and reseed staging database
  },
  
  // Quick deploy current branch
  deployPreview: () => {
    execSync('vercel --prod=false')
  }
}
```

### 3.2 Add NPM Scripts for Preview Workflow
**File**: `package.json`

```json
{
  "scripts": {
    "preview:deploy": "vercel",
    "preview:url": "tsx scripts/get-preview-url.ts",
    "preview:reset-data": "tsx scripts/reset-staging-data.ts",
    "preview:test": "NODE_ENV=preview npm run test:run",
    "workflow:feature": "tsx scripts/create-feature-branch.ts",
    "workflow:pr": "gh pr create --web"
  }
}
```

### 3.3 Create Preview Environment Detection
**File**: `src/config/preview-detection.ts`

```typescript
// Detect if running in Vercel preview
export const isPreviewEnvironment = () => {
  return process.env.VERCEL_ENV === 'preview' ||
         window.location.hostname.includes('git-') ||
         window.location.hostname.includes('-git-')
}

// Show preview banner
export const PreviewBanner = () => {
  if (!isPreviewEnvironment()) return null
  
  return (
    <div className="bg-yellow-500 text-black p-2 text-center">
      🚧 Preview Environment - Using Staging Database
    </div>
  )
}
```

## Phase 4: Team Collaboration (1 hour)

### 4.1 Create Preview Review Checklist
**File**: `docs/PREVIEW_REVIEW_GUIDE.md`

```markdown
# Preview Review Guide

## For Developers
1. Create feature branch
2. Push changes
3. Create PR
4. Share preview URL with stakeholders
5. Address feedback on preview
6. Merge after approval

## For Reviewers
1. Click preview URL in PR
2. Test feature thoroughly
3. Check mobile responsiveness
4. Verify no production data visible
5. Approve PR or request changes
```

### 4.2 Configure Slack/Discord Integration
```bash
# Add Vercel Slack app to get deployment notifications
# Configure to post preview URLs in #development channel
```

## Phase 5: Advanced Features (Optional - 2 hours)

### 5.1 Visual Regression Testing
```bash
npm install -D @playwright/test
```

**File**: `tests/visual-regression.spec.ts`

```typescript
// Compare screenshots between preview and production
test('Visual regression test', async ({ page }) => {
  await page.goto(process.env.PREVIEW_URL)
  await expect(page).toHaveScreenshot('homepage.png')
})
```

### 5.2 Preview Performance Monitoring
```bash
# Lighthouse CI for preview deployments
npm install -D @lhci/cli
```

### 5.3 Automated Preview Comments
**File**: `.github/workflows/preview-comment.yml`

```yaml
# Auto-comment PR with preview URL and test results
name: Preview Comment
on:
  deployment_status:
jobs:
  comment:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployed: ${{ github.event.deployment_status.target_url }}'
            })
```

## Expected Results

### Daily Workflow
```bash
# 1. Create feature
git checkout -b feature/new-search
git push origin feature/new-search
# → Auto-preview at: https://leasingborsen-git-feature-new-search.vercel.app

# 2. Create PR
gh pr create --title "Add new search feature"
# → Vercel comments with preview URL
# → Stakeholders test on live preview

# 3. Merge to production
gh pr merge
# → Auto-deploy to production
```

### Benefits
- ✅ **Zero manual staging management**
- ✅ **Every feature gets isolated testing**
- ✅ **Stakeholders can test live previews**
- ✅ **No staging branch conflicts**
- ✅ **Automatic cleanup** (previews expire)
- ✅ **Uses staging database** safely

### URLs You'll Have
- **Production**: `https://leasingborsen.vercel.app`
- **Feature Previews**: `https://leasingborsen-git-[branch]-[user].vercel.app`
- **PR Previews**: Unique URL per PR
- **All previews use staging database automatically**

## Implementation Timeline

| Phase | Time | Priority |
|-------|------|----------|
| Phase 1: Basic Setup | 30 min | High |
| Phase 2: Workflow | 1 hour | High |
| Phase 3: Tools | 2 hours | Medium |
| Phase 4: Collaboration | 1 hour | Medium |
| Phase 5: Advanced | 2 hours | Low |

**Total**: 6.5 hours for complete implementation
**Minimum viable**: 1.5 hours (Phases 1-2)