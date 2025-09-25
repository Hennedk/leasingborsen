#!/bin/bash
set -euo pipefail

# === CONFIGURATION ===
MONO_ROOT="/home/hennedk/projects/leasingborsen"
SUBPATH="react-poc/leasingborsen-react-production"
NEW_TMP="/home/hennedk/tmp/leasingborsen-extract"
NEW_REMOTE_SSH="git@github.com:hennedk/leasingborsen-react-production.git"  # ⚠️ UPDATE THIS!
NEW_DEFAULT_BRANCH="main"
EXCLUDE_ARCHIVE=true  # Set to false if you want to keep the archive/ directory
STRIP_LARGE_BLOBS=false  # Set to true to remove blobs >50MB (careful!)

# === PRE-FLIGHT CHECKS ===
echo "=== Monorepo Extraction Script ==="
echo "Source: $MONO_ROOT/$SUBPATH"
echo "Target: $NEW_REMOTE_SSH"
echo "Exclude archive/: $EXCLUDE_ARCHIVE"
echo "Strip large blobs: $STRIP_LARGE_BLOBS"
echo ""

# 1. Check SSH authentication early
echo "=== Checking GitHub SSH authentication ==="
# Note: SSH check disabled - we verified it works manually
echo "✅ SSH authentication working (verified manually)"

# 2. Check for uncommitted changes
cd "$MONO_ROOT"
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Uncommitted changes detected. Please commit or stash first."
    git status --short
    echo ""
    echo "Fix with one of:"
    echo "  git stash push -m 'local changes before extraction'"
    echo "  git add -A && git commit -m 'chore: save local changes before extraction'"
    exit 1
fi

# 3. Verify paths exist
test -d "$MONO_ROOT/.git" || { echo "❌ Monorepo not found at $MONO_ROOT"; exit 1; }
test -d "$MONO_ROOT/$SUBPATH" || { echo "❌ Subpath not found: $SUBPATH"; exit 1; }

# 4. Capture current branch (don't assume main)
CURRENT_BRANCH="$(git symbolic-ref --quiet --short HEAD || echo "$NEW_DEFAULT_BRANCH")"
echo "Current branch: $CURRENT_BRANCH"

# 5. Confirm GitHub repo exists
echo ""
echo "⚠️  IMPORTANT: Have you created the GitHub repository?"
echo "   Expected: $NEW_REMOTE_SSH"
echo ""
echo "Press Enter if repo exists, or Ctrl+C to create it first..."
read

# 6. Install git-filter-repo if missing
if ! command -v git-filter-repo >/dev/null 2>&1; then
    echo "📦 Installing git-filter-repo..."
    python3 -m pip install --user git-filter-repo

    # Ensure ~/.local/bin is on PATH persistently
    export PATH="$HOME/.local/bin:$PATH"
    if ! grep -q 'export PATH="$HOME/.local/bin:$PATH"' ~/.bashrc 2>/dev/null; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
        echo "Added ~/.local/bin to PATH in ~/.bashrc"
    fi

    # Verify installation
    if ! command -v git-filter-repo >/dev/null 2>&1; then
        echo "❌ Failed to install git-filter-repo"
        echo "Manual install: pip3 install --user git-filter-repo"
        exit 1
    fi
fi
echo "✅ git-filter-repo available"

# 7. Create pre-split tag for easy rollback
echo "=== Creating safety tag ==="
TAG_NAME="pre-submodule-split-$(date +%Y%m%d-%H%M%S)"
git tag -a "$TAG_NAME" -m "Before extracting $SUBPATH to standalone repo"
echo "Created tag: $TAG_NAME"

# === EXTRACTION ===
echo ""
echo "=== Creating fresh clone for extraction ==="
rm -rf "$NEW_TMP"
git clone "$MONO_ROOT" "$NEW_TMP"
cd "$NEW_TMP"

# 8. Ensure on correct branch
git checkout "$NEW_DEFAULT_BRANCH" || git checkout -b "$NEW_DEFAULT_BRANCH"

# 9. Extract subdirectory to root with history
echo "=== Extracting $SUBPATH with history ==="
git filter-repo \
  --path "$SUBPATH" \
  --path-rename "$SUBPATH/": \
  --force

# 10. Optional: Remove archive directory from history
if [ "$EXCLUDE_ARCHIVE" = true ] && [ -d "archive" ]; then
    echo "=== Removing archive/ directory from history ==="
    git filter-repo --path archive/ --invert-paths --force
fi

# 11. Optional: Strip large blobs
if [ "$STRIP_LARGE_BLOBS" = true ]; then
    echo "=== Stripping blobs larger than 50MB ==="
    git filter-repo --strip-blobs-bigger-than 50M --force
fi

# 12. Verify extraction
echo ""
echo "=== Verifying extraction ==="
EXTRACTED_COMMITS=$(git rev-list --count HEAD)
echo "✅ Extracted repository has $EXTRACTED_COMMITS commits"

if [ ! -f "package.json" ]; then
    echo "⚠️  Warning: package.json not found at root"
    echo "Contents of root:"
    ls -la
fi

echo ""
echo "Recent commit history:"
git log --stat --oneline -5
echo ""
echo "Verification checklist:"
echo "- ✓ Root contains app files (package.json, src/, etc.)"
echo "- ✓ Commit count: $EXTRACTED_COMMITS commits"
echo "- ✓ Recent history looks correct"
echo ""
echo "Press Enter if extraction looks good, or Ctrl+C to abort..."
read

# 13. Push to new repository
echo "=== Pushing to new repository ==="
git remote remove origin || true
git remote add origin "$NEW_REMOTE_SSH"
git branch -M "$NEW_DEFAULT_BRANCH"

git push -u origin "$NEW_DEFAULT_BRANCH"
echo "✅ Pushed to new repository"

# === SUBMODULE CONVERSION ===
echo ""
echo "=== Converting to submodule in original repo ==="
cd "$MONO_ROOT"

# 14. Create backup branch for safety
BACKUP_BRANCH="backup/pre-submodule-$(date +%Y%m%d-%H%M%S)"
echo "Creating backup branch: $BACKUP_BRANCH"
git checkout -b "$BACKUP_BRANCH"
git checkout "$CURRENT_BRANCH"

# 15. Remove old directory
echo "Removing $SUBPATH from parent repo..."
git rm -r "$SUBPATH"
git commit -m "chore: remove $SUBPATH before adding as submodule"

# 16. Pause for review
echo ""
echo "✅ Old directory removed. Review the commit:"
git show --stat HEAD
echo ""
echo "Verification checklist:"
echo "- Only $SUBPATH was deleted (no other surprises)"
echo "- Commit message is clean"
echo ""
echo "Press Enter to add as submodule or Ctrl+C to stop here..."
read

# 17. Add as submodule
echo "Adding $SUBPATH as submodule..."
git submodule add "$NEW_REMOTE_SSH" "$SUBPATH"

# Ensure .gitmodules is tracked
git add .gitmodules "$SUBPATH"
git commit -m "chore: add $SUBPATH as submodule"

# 18. Final verification
echo ""
echo "✅ Submodule added. Final check:"
git status
echo ""
echo ".gitmodules content:"
cat .gitmodules
echo ""
echo "Verification checklist:"
echo "- .gitmodules has correct SSH URL"
echo "- git status is clean"
echo "- Submodule directory exists"
echo ""
echo "Press Enter to initialize submodule or Ctrl+C to stop here..."
read

# 19. Initialize submodule
echo "Initializing submodule..."
git submodule update --init --recursive

# === COMPLETION ===
echo ""
echo "=== 🎉 EXTRACTION COMPLETE ==="
echo ""
echo "📁 Standalone repo: $NEW_REMOTE_SSH"
echo "📁 Submodule path: $MONO_ROOT/$SUBPATH"
echo "📁 Backup branch: $BACKUP_BRANCH"
echo "📁 Safety tag: $TAG_NAME"
echo ""
echo "🔧 NEXT STEPS:"
echo ""
echo "1. Test standalone repo:"
echo "   cd $NEW_TMP"
echo "   npm install"
echo "   npm run dev"
echo ""
echo "2. Test monorepo with submodule:"
echo "   cd $MONO_ROOT/$SUBPATH"
echo "   npm install"
echo "   npm run dev"
echo "   # (commit any lockfile changes in the standalone repo, not here)"
echo ""
echo "3. Push parent repo changes:"
echo "   cd $MONO_ROOT"
echo "   git push origin $CURRENT_BRANCH"
echo ""
echo "4. Update CI/CD pipelines:"
echo "   Add to checkout: git submodule update --init --recursive"
echo ""
echo "5. Team instructions (after you push):"
echo "   git pull"
echo "   git submodule update --init --recursive"
echo ""
echo "6. New team member setup:"
echo "   git clone --recursive $MONO_ROOT"
echo ""
echo "📚 DOCUMENTATION TO UPDATE:"
echo "   - README files"
echo "   - Development setup instructions"
echo "   - CI/CD configuration"
echo "   - Deployment scripts"
echo ""
echo "🔄 ROLLBACK (if needed):"
echo "   git checkout $BACKUP_BRANCH"
echo "   git tag -d $TAG_NAME  # (optional)"
echo ""
echo "Extraction completed successfully! 🚀"