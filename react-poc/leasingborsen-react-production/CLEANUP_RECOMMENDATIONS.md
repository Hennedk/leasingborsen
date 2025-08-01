# Project Cleanup Recommendations

## Files to Archive

### 1. Root Directory SQL Scripts (Archive to `scripts/archive/`)
These appear to be one-time fixes or debug scripts:
- `fix-full-listing-view.sql`
- `investigate-deletion-failure.sql`
- `test-manual-deletion.sql`
- `fix-deletion-issue.sql`
- `test-deletion-fix.sql`
- `apply-function-update.sql`
- `fix-extraction-session-26665971.sql`
- `debug-session-64ad98ac.sql`
- `fix-json-response-fields.sql`
- `fix-apply-function-json-fields.sql`
- `debug-offers-update-issue.sql`
- `debug-offers-comparison.sql`
- `fix-deletion-phase1.sql`
- `fix-deletion-complete.sql`
- `quick-fix-ambiguous-column.sql`
- `check_rls_policies.sql`

### 2. Root Directory Test Scripts (Archive to `scripts/archive/`)
- `investigate-session-f6bbd219.js`
- `test-array-comparison.js`
- `test-ford-capri-consistency.js`
- `test-deletion-fix.js`
- `deploy-fix.js`

### 3. Old Reports/Documentation (Move to `docs/archive/`)
These are completed reports or one-time documentation:
- `WEEK1_SECURITY_MIGRATION_COMPLETE.md`
- `DUPLICATE_DATA_FIXES_IMPLEMENTED.md`
- `TECHNICAL_REVIEW_REPORT.md`
- `deploy-deletion-fix.md`
- `DATABASE_CLEANUP_PHASE1_SUMMARY.md`
- `DELETION_FIX_RESOLUTION.md`
- `EXTRACTION_INVESTIGATION_FINDINGS.md`
- `CODEBASE_REVIEW_REPORT_2025_07_31.md`
- `UPDATED_DOCUMENTATION_SUMMARY.md`
- `BACKGROUND_REMOVAL_POC_GUIDE.md` (if POC is complete)

### 4. Backup Files
- `CLAUDE.md.backup` (if current CLAUDE.md is up to date)

### 5. Deprecated/Disabled Source Files
These should be archived or removed after confirming they're no longer needed:
- `src/stores/persistentFilterStore.ts.deprecated`
- `src/stores/filterStore.ts.deprecated`
- `src/hooks/mutations/useListingMutations.ts.deprecated`
- `src/components/admin/processing/IntelligenceDashboard.tsx.disabled`
- `src/components/admin/processing/PatternLearningManager.tsx.disabled`

## Files to Delete

### 1. Log Files
- `dev.log` (not tracked by git, can be safely deleted)

### 2. Miscellaneous
- `højde skydedør.txt` (appears to be unrelated to the project)
- `test-deno.ts` (if no longer needed)

## Directories to Review

### 1. Railway POC Directory
- `railway-pdfplumber-poc/` - If this POC is complete and no longer needed, consider archiving

### 2. Scripts Directory
The `scripts/` directory has many files that might be one-time scripts. Consider reviewing:
- Scripts with names like `fix-*`, `debug-*`, `test-*` that are older than 1 month
- Scripts that were created for specific issues that have been resolved

## Recommendations

1. **Create Archive Structure**:
   ```
   archive/
   ├── sql-fixes/       # One-time SQL fixes
   ├── scripts/         # One-time scripts
   ├── reports/         # Old reports and documentation
   └── deprecated-code/ # Deprecated source files
   ```

2. **Keep Active Documentation**:
   - `README.md`
   - `CLAUDE.md` (active project instructions)
   - `LICENSE`
   - Active configuration files (`*.config.js`, `*.json`)

3. **Regular Cleanup Process**:
   - Archive completed session reports monthly
   - Move one-time fix scripts to archive after verification
   - Remove deprecated code after 30 days in archive

4. **Git Cleanup**:
   - After archiving, consider removing large files from git history if needed
   - Update `.gitignore` to prevent similar accumulation in the future

## Implementation Steps

1. Create archive directories
2. Move files in batches, testing after each batch
3. Update any references to moved files
4. Commit with clear message: "chore: archive completed fixes and reports"
5. Update `.gitignore` if needed

## Files to Keep in Root

Essential files that should remain:
- `package.json`, `package-lock.json`
- Configuration files (`vite.config.ts`, `tsconfig.json`, etc.)
- `vercel.json` (deployment config)
- `components.json` (shadcn/ui config)
- `.gitignore`
- Active documentation (`README.md`, `CLAUDE.md`)