# 🚀 Vercel Preview Quickstart

## What You've Set Up

✅ **Staging Database**: `lpbtgtpgbnybjqcpsrrf.supabase.co`
✅ **Preview Environment Variables**: Configured in Vercel
✅ **Preview Detection**: Orange banner shows in preview mode
✅ **Helper Scripts**: NPM commands for preview management

## How It Works

Every time you push a branch, Vercel automatically creates a preview URL:

```bash
git checkout -b feature/new-button
git push origin feature/new-button
```

**Result**: `https://leasingborsen-git-feature-new-button-[username].vercel.app`

## Quick Commands

```bash
# See current branch's preview URL
npm run preview:url

# Deploy current branch to preview
npm run preview:deploy

# Show branch info
npm run preview:branch

# Reset staging data for testing
npm run preview:reset-data

# Show all commands
npm run preview:help
```

## Daily Workflow

### 1. Start New Feature
```bash
git checkout -b feature/admin-improvements
# Make changes...
git add .
git commit -m "Improve admin panel"
git push origin feature/admin-improvements
```

### 2. Get Preview URL
```bash
npm run preview:url
```
**Copy URL and share with team for testing**

### 3. Create Pull Request
```bash
gh pr create --title "Admin improvements"
```
**Vercel automatically comments with preview URL**

### 4. Merge to Production
```bash
gh pr merge
```
**Automatically deploys to production**

## What Happens in Previews

- 🎯 **Uses staging database** (safe!)
- 🎯 **Orange banner** shows it's preview mode
- 🎯 **All features work** exactly like production
- 🎯 **AI extraction** uses staging data
- 🎯 **No impact** on production users

## Team Benefits

- ✅ **Share live previews** with stakeholders
- ✅ **Test features** before production
- ✅ **No staging conflicts** - each branch isolated
- ✅ **Automatic cleanup** - previews expire
- ✅ **Same database** - consistent testing

## Next Steps

1. **Configure Vercel Environment Variables** (you need to do this):
   - Go to: https://vercel.com/dashboard
   - Add staging variables to "Preview" environment

2. **Test it out**:
   ```bash
   git checkout -b test/preview-system
   git push origin test/preview-system
   npm run preview:url
   ```

3. **Share with team** and start using preview URLs for all feature reviews!

## URLs You'll Have

- **Production**: `https://leasingborsen.vercel.app`
- **Feature Preview**: `https://leasingborsen-git-[branch]-[user].vercel.app`
- **All previews use staging database** 🎯