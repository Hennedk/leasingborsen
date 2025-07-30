#!/bin/bash

echo "🧹 Workspace Cleanup for Fresh Start"
echo "===================================="

# Files to keep (useful documentation)
echo "📁 Keeping useful documentation..."
mkdir -p docs/archive 2>/dev/null

# Move useful docs to archive if they exist
[ -f "docs/COMPARISON_ENGINE_TESTING.md" ] && mv docs/COMPARISON_ENGINE_TESTING.md docs/archive/
[ -f "docs/COMPARISON_ENGINE_TEST_PLAN.md" ] && mv docs/COMPARISON_ENGINE_TEST_PLAN.md docs/archive/
[ -f "docs/SESSION_HANDOFF_EXTRACTION_DELETE_FIX.md" ] && mv docs/SESSION_HANDOFF_EXTRACTION_DELETE_FIX.md docs/archive/
[ -f "docs/STAGING_PRODUCTION_WORKFLOW.md" ] && mv docs/STAGING_PRODUCTION_WORKFLOW.md docs/archive/

# Files to discard (temporary/local)
echo "🗑️  Removing temporary files..."
rm -f supabase/.temp/cli-latest
rm -f deno.lock
rm -f .claude/settings.local.json

# Git cleanup
echo "📝 Git status before cleanup:"
git status --short

echo ""
echo "Would you like to:"
echo "1) Commit all changes to current branch before switching"
echo "2) Discard all changes and start fresh"
echo "3) Cancel and handle manually"
read -p "Choose (1/2/3): " choice

case $choice in
  1)
    echo "💾 Committing all changes..."
    git add -A
    git commit -m "WIP: Save work before switching to simplified workflow"
    git push origin test/staging-banner-verification
    echo "✅ Changes saved!"
    
    echo "🔄 Switching to main..."
    git checkout main
    git pull origin main
    echo "✅ Ready for simplified workflow on main!"
    ;;
  2)
    echo "🗑️  Discarding all changes..."
    git stash save "Backup before workflow change"
    git clean -fd
    git checkout .
    
    echo "🔄 Switching to main..."
    git checkout main
    git pull origin main
    echo "✅ Clean slate on main!"
    ;;
  3)
    echo "❌ Cancelled. Handle cleanup manually."
    exit 0
    ;;
esac

echo ""
echo "✨ Your workspace is ready for the simplified workflow!"
echo ""
echo "Next steps:"
echo "1. Start your work: npm run dev"
echo "2. Make changes"
echo "3. Commit often: git add -A && git commit -m 'your message'"
echo "4. Push to see preview: git push origin main"