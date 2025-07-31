# Solo Developer Workflow - Full Stack Edition

A streamlined workflow for PM-turned-developer working with React, Vercel, and Supabase.

## 📋 Table of Contents
1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Daily Development Flow](#daily-development-flow)
4. [Git Strategy](#git-strategy)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Process](#deployment-process)
7. [Emergency Procedures](#emergency-procedures)
8. [Quick Reference](#quick-reference)

## Overview

This workflow is designed for solo developers who:
- Come from a PM background
- Want simple, reliable processes
- Need to manage both frontend (Vercel) and backend (Supabase)
- Prefer safety nets and clear procedures

### Key Principles
- **Simple over complex**: Use the minimum viable process
- **Safety first**: Always have a way to rollback
- **Test in stages**: Local → Staging → Production
- **Clear documentation**: Your future self will thank you

## Environment Setup

### Three Synchronized Environments
```
Frontend (Vercel)          Backend (Supabase)
├── Production (main)  →   Production project
├── Preview (branches) →   Staging project  
└── Local (npm dev)    →   Local Supabase
```

### Initial Setup Checklist
- [ ] Git repository connected to GitHub
- [ ] Vercel connected to GitHub repo
- [ ] Two Supabase projects (staging + production)
- [ ] Local development environment configured
- [ ] Environment variables set correctly

## Daily Development Flow

### Morning Setup (7 minutes)
```bash
# 1. Sync your code
git pull origin main
npm install  # In case dependencies changed

# 2. Sync your database
supabase db pull --project-ref <staging>  # Get latest schema
supabase start  # Start local Supabase

# 3. Start development
npm run dev  # Frontend at localhost:5173
# Supabase Studio at localhost:54321
```

### During Development

#### Save Work Frequently (every 30-60 min)
```bash
git add -A
git commit -m "WIP: [what you're working on]"
```

#### When Changing Database Schema
```bash
# Create migration
supabase migration new descriptive_name_here

# Edit the migration file in supabase/migrations/

# Test locally
supabase db reset

# Commit the migration
git add -A
git commit -m "db: Add description of schema change"
```

### End of Day Routine
```bash
# 1. Check your work
git status
npm run build  # Ensure it builds
npm run test   # Run relevant tests

# 2. Push to GitHub (creates Vercel preview)
git push origin main  # or feature branch

# 3. Deploy to staging if needed
supabase db push --project-ref <staging>
supabase functions deploy <function> --project-ref <staging>

# 4. Test on staging environment
# Visit Vercel preview URL
# Verify backend changes work
```

## Git Strategy

### Branch Structure (Simplified)
```
main (production)
  └── work directly on main for small fixes
  └── feature/* branches for larger changes
```

### Commit Message Format
Use clear, PM-friendly messages:
```
Frontend changes:
  feat: Add PDF extraction for Toyota dealers
  fix: Resolve price display on mobile
  update: Improve loading speed for listings
  style: Adjust mobile filter layout

Backend changes:
  db: Add dealer_configurations table
  api: Create dealer management endpoints
  edge: Update extraction function for new format
  fix: Resolve RLS policy for admin users

Documentation:
  docs: Add setup instructions for new dealers
  docs: Update deployment procedures
```

### Your 5 Essential Git Commands
```bash
git status              # What's changed?
git add -A              # Stage everything
git commit -m "message" # Save changes
git push                # Send to GitHub/Vercel
git pull                # Get latest changes
```

### Your Safety Commands
```bash
git stash               # Temporarily save work
git checkout .          # Undo all local changes
git reset --hard HEAD   # Nuclear option - reset everything
git log --oneline -5    # See recent history
```

## Testing Strategy

### Level 1: Local Testing
- Frontend: `localhost:5173`
- Backend: `localhost:54321`
- Full integration testing
- Immediate feedback

### Level 2: Staging Testing
Every push creates a unique preview:
- Vercel preview URL (automatic)
- Supabase staging (manual deploy)
- Share with stakeholders
- Test on real devices

### Level 3: Production
- Only after staging approval
- Coordinate frontend + backend deployment
- Monitor for issues

## Deployment Process

### Weekly Release Cycle

**Monday**: Plan week's features (frontend + backend)
**Tuesday**: Create migrations, test locally
**Wednesday**: Build features, integrate locally
**Thursday**: Deploy to staging (both systems)
**Friday**: Thorough staging tests
**Next Monday**: Production deployment if ready

### Staging Deployment
```bash
# 1. Push code (automatic Vercel preview)
git push origin feature/new-thing

# 2. Deploy database changes
supabase db push --project-ref <staging>

# 3. Deploy Edge Functions
supabase functions deploy function-name --project-ref <staging>

# 4. Test everything on staging
```

### Production Deployment
```bash
# 1. Merge to main
git checkout main
git merge feature/new-thing
git push  # Vercel auto-deploys

# 2. Deploy database (careful!)
supabase db push --project-ref <production>

# 3. Deploy Edge Functions
supabase functions deploy function-name --project-ref <production>

# 4. Monitor for issues
```

### Deployment Order Matters!
Always deploy in this order:
1. Database migrations
2. Edge Functions
3. Frontend code

## Emergency Procedures

### "I broke something locally"

#### Frontend Issues
```bash
git stash               # Save current work
git checkout .          # Reset files
npm install            # Reinstall dependencies
npm run dev            # Try again
```

#### Database Issues
```bash
supabase stop          # Stop everything
supabase db reset      # Reset to migrations
supabase start         # Start fresh
```

### "I pushed bad code"

#### Bad Frontend Code
```bash
# Vercel preview will catch it
# Don't merge to main until fixed
# If already in main:
git revert HEAD && git push
```

#### Bad Database Migration
```bash
# For staging:
# Create a fix migration
supabase migration new fix_bad_migration
# Write the SQL to fix the issue
supabase db push --project-ref <staging>

# For production:
# CAREFUL! Test fix in staging first
# Then apply same process to production
```

### "Production is broken!"

1. **Frontend Emergency**:
   ```bash
   git log --oneline -10   # Find last good commit
   git revert HEAD         # Undo last commit
   git push                # Deploy fix immediately
   ```

2. **Database Emergency**:
   - Create hotfix migration immediately
   - Test locally first (even in emergency!)
   - Deploy to staging, verify fix
   - Deploy to production
   - Document what happened

3. **If Really Bad**:
   - Use Supabase dashboard for immediate fixes
   - Contact Supabase support for rollback
   - Vercel can instant rollback to previous deployment

### "I'm lost in Git"
```bash
git status              # Where am I?
git log --oneline -5    # What's been done?
git branch              # What branch am I on?
# Screenshot output and ask for help
```

## Quick Reference

### Daily Checklist
```
□ Morning: Pull latest + start local services
□ Before DB changes: Create migration file
□ Test locally: Both frontend and backend
□ Every hour: Commit your progress
□ Before break: Push to GitHub
□ Major changes: Deploy to staging first
□ End of day: Verify staging works
□ Weekly: Plan production deployment
```

### Your Essential Commands

#### Git Commands
```bash
git status              # Check state
git add -A              # Stage all
git commit -m "msg"     # Save work
git push                # Share work
git pull                # Get updates
```

#### Supabase Commands
```bash
supabase start          # Start local
supabase db reset       # Apply migrations
supabase migration new  # Create migration
supabase db push        # Deploy migrations
supabase functions deploy # Deploy functions
```

#### Development Commands
```bash
npm run dev             # Start frontend
npm run build           # Check build
npm run test            # Run tests
npm run lint            # Check code
```

### Environment Variables
```bash
# .env.local (for local development)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key

# Vercel (set in dashboard)
VITE_SUPABASE_URL=https://[staging-id].supabase.co  # For preview
VITE_SUPABASE_URL=https://[prod-id].supabase.co     # For production
```

## Best Practices

### For Your PM Brain
1. **Think before coding**: What problem am I solving?
2. **Document decisions**: Future you needs context
3. **Test incrementally**: Don't wait until the end
4. **Communicate clearly**: Good commit messages = good documentation

### For Safety
1. **Never skip staging**: It's your safety net
2. **Friday deployments**: Avoid database changes on Friday
3. **Backup before big changes**: Especially for database
4. **Ask for help early**: Don't struggle alone

### For Efficiency
1. **Automate repetitive tasks**: Use npm scripts
2. **Keep environments in sync**: Regular staging updates
3. **Clean up regularly**: Delete old branches
4. **Learn keyboard shortcuts**: Speed matters

## Common Scenarios

### Adding a New Feature
1. Plan the feature (PM brain)
2. Create feature branch: `git checkout -b feature/dealer-dashboard`
3. Build locally, test thoroughly
4. Push to GitHub for preview
5. Deploy backend to staging
6. Test complete feature on staging
7. Get stakeholder approval
8. Merge and deploy to production

### Fixing a Bug
1. Reproduce locally
2. Fix and test locally
3. Commit with clear message: `fix: Resolve price calculation error`
4. Push to staging
5. Verify fix works
6. Deploy to production

### Database Schema Change
1. Plan the change carefully
2. Create migration: `supabase migration new add_dealer_settings`
3. Test locally: `supabase db reset`
4. Deploy to staging first
5. Verify with real data
6. Schedule production deployment
7. Have rollback plan ready

## Resources

### Documentation
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Git Basics](https://git-scm.com/book/en/v2/Getting-Started-Git-Basics)

### Your Project Specifics
- Staging Supabase: `lpbtgtpgbnybjqcpsrrf`
- Production Supabase: `hqqouszbgskteivjoems`
- Vercel Dashboard: [Your project URL]

### Getting Help
1. Check this document first
2. Search error messages
3. Ask Claude with full context
4. Supabase Discord for backend issues
5. Vercel support for deployment issues

---

Remember: **It's better to deploy small changes frequently than large changes rarely.** Your PM experience tells you that incremental progress with quick feedback loops leads to better outcomes. Apply that same principle to your code!