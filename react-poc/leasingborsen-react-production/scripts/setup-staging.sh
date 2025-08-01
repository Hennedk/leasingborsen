#!/bin/bash

# Staging Environment Setup Script
# This script helps set up a staging environment on Supabase free tier

set -e

echo "🚀 Leasingborsen Staging Setup"
echo "================================"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found!${NC}"
    echo "Please install it first:"
    echo "  brew install supabase/tap/supabase"
    echo "  or visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"

# Function to check if we're in the right directory
check_directory() {
    if [ ! -f "package.json" ] || [ ! -d "supabase" ]; then
        echo -e "${RED}❌ Please run this script from the project root directory${NC}"
        exit 1
    fi
}

# Function to create staging environment file
create_staging_env() {
    if [ -f ".env.staging" ]; then
        echo -e "${YELLOW}⚠️  .env.staging already exists${NC}"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi

    echo -e "${GREEN}Creating .env.staging file...${NC}"
    cat > .env.staging << EOL
# Staging environment configuration
# Created: $(date)

# Staging Supabase Project
VITE_SUPABASE_URL=https://$STAGING_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=$STAGING_ANON_KEY

# Feature flags for staging
VITE_AI_EXTRACTION_ENABLED=true
VITE_BATCH_PROCESSING_ENABLED=true
VITE_MOBILE_FILTERS_ENABLED=true
VITE_DEBUG_MODE=true
VITE_PERFORMANCE_MONITORING=true

# Staging-specific services
VITE_PDF_SERVICE_URL=https://leasingborsen-staging.up.railway.app
EOL

    echo -e "${GREEN}✓ Created .env.staging${NC}"
}

# Main setup flow
echo
echo "📋 Prerequisites:"
echo "1. Create a new Supabase project at https://app.supabase.com"
echo "2. Name it: leasingborsen-staging"
echo "3. Save the project credentials"
echo

read -p "Have you created the staging project? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Please create the staging project first, then run this script again.${NC}"
    exit 0
fi

# Get staging project details
echo
echo "Please enter your staging project details:"
read -p "Staging Project Reference ID (e.g., abcdefghijklmnop): " STAGING_PROJECT_REF
read -p "Staging Anon Key (starts with eyJ...): " STAGING_ANON_KEY

# Validate inputs
if [ -z "$STAGING_PROJECT_REF" ] || [ -z "$STAGING_ANON_KEY" ]; then
    echo -e "${RED}❌ Project reference and anon key are required${NC}"
    exit 1
fi

# Check directory
check_directory

# Create staging environment file
create_staging_env

# Link to staging project
echo
echo -e "${GREEN}Linking to staging project...${NC}"
supabase link --project-ref $STAGING_PROJECT_REF

echo
echo "🎯 Next Steps:"
echo "============="
echo
echo "1. Export production schema (manual step required):"
echo "   - Go to https://app.supabase.com/project/hqqouszbgskteivjoems/editor"
echo "   - Click 'Schema' tab"
echo "   - Click 'Export' button"
echo "   - Save as: supabase/migrations/20250101000000_initial_schema.sql"
echo
echo "2. Apply schema to staging:"
echo "   supabase db push"
echo
echo "3. Deploy Edge Functions:"
echo "   npm run staging:deploy-functions"
echo
echo "4. Test staging connection:"
echo "   npm run staging:test"
echo
echo "5. (Optional) Seed staging data:"
echo "   npm run staging:seed"
echo
echo -e "${GREEN}✅ Staging setup partially complete!${NC}"
echo "Follow the next steps above to finish the setup."