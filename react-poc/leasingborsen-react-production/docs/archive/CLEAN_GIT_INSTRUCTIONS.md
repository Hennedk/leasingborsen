# Git History Cleanup Instructions

The git repository contains API keys in previous commits that need to be removed from the entire history.

## Option 1: Quick Fix - Use GitHub Allow Links

GitHub provided these links to bypass push protection. Click each one:

1. https://github.com/Hennedk/leasingborsen/security/secret-scanning/unblock-secret/2z3ZwYWfqsRLRR6f8lgiZvXfOPH
2. https://github.com/Hennedk/leasingborsen/security/secret-scanning/unblock-secret/2z3ZwW4QdM6suO2cTlGZbK43VH9  
3. https://github.com/Hennedk/leasingborsen/security/secret-scanning/unblock-secret/2z3ZwVFbyWkAXb7FNyHBpT0g0HE
4. https://github.com/Hennedk/leasingborsen/security/secret-scanning/unblock-secret/2z3ZwY9D3BtNDPqSNVPWenNLSwv

After clicking all 4 links, try:
```bash
git push origin main
```

## Option 2: Clean Git History (More Secure)

If you prefer to permanently remove the secrets from git history:

1. Navigate to the git repository root:
```bash
cd /home/hennedk/projects/leasingborsen
```

2. Run this command to remove sensitive files from entire history:
```bash
export FILTER_BRANCH_SQUELCH_WARNING=1

git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch \
  "react-poc/leasingborsen-react-production/.env.staging" \
  "react-poc/leasingborsen-react-production/.claude/settings.local.json" \
  "react-poc/leasingborsen-react-production/CONFIGURE_NEW_API_KEY.md" \
  "react-poc/leasingborsen-react-production/CONFIGURE_WORKING_API_KEY.md" \
  "react-poc/leasingborsen-react-production/OPENAI_SETUP_GUIDE.md" \
  "react-poc/leasingborsen-react-production/TEST_OPENAI_EXTRACTION.md" \
  "react-poc/leasingborsen-react-production/DEBUG_API_KEY_ISSUE.md"' \
  --prune-empty --tag-name-filter cat -- --all
```

3. Clean up the filter-branch references:
```bash
git for-each-ref --format='delete %(refname)' refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now
```

4. Force push the cleaned history:
```bash
git push --force-with-lease origin main
```

## Recommendation

Use **Option 1** (GitHub allow links) for speed, then rotate the API keys later for security.
Use **Option 2** if you want to permanently remove all traces of the secrets.