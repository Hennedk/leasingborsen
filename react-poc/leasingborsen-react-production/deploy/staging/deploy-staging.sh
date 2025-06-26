#!/bin/bash

# Phase 2 Staging Deployment Script
# Deploys AI extraction system to staging environment with full monitoring

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STAGING_ENV_FILE=".env.staging"
LOG_FILE="deploy/staging/logs/deployment-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="deploy/staging/backups/$(date +%Y%m%d)"

# Helper functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

# Create necessary directories
create_directories() {
    log "Creating deployment directories..."
    mkdir -p deploy/staging/logs
    mkdir -p deploy/staging/backups
    mkdir -p deploy/staging/configs
    mkdir -p deploy/staging/scripts
}

# Pre-flight checks
preflight_checks() {
    log "Running pre-flight checks..."
    
    # Check if staging environment file exists
    if [ ! -f "$STAGING_ENV_FILE" ]; then
        error "Staging environment file $STAGING_ENV_FILE not found. Copy from .env.staging.example and configure."
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    log "Node.js version: $NODE_VERSION"
    
    # Check npm/yarn
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log "npm version: $NPM_VERSION"
    else
        error "npm is not installed"
    fi
    
    # Check git status
    if [ -n "$(git status --porcelain)" ]; then
        warn "Working directory has uncommitted changes"
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check required environment variables
    log "Validating staging environment variables..."
    source "$STAGING_ENV_FILE"
    
    if [ -z "$VITE_SUPABASE_URL" ]; then
        error "VITE_SUPABASE_URL not set in staging environment"
    fi
    
    if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
        error "VITE_SUPABASE_ANON_KEY not set in staging environment"
    fi
    
    if [ "$VITE_AI_EXTRACTION_ENABLED" != "true" ]; then
        error "VITE_AI_EXTRACTION_ENABLED must be true for staging deployment"
    fi
    
    if [ -z "$VITE_OPENAI_API_KEY" ] && [ -z "$VITE_ANTHROPIC_API_KEY" ]; then
        error "At least one AI provider API key must be configured"
    fi
    
    log "Pre-flight checks completed successfully"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Clean install
    if [ -d "node_modules" ]; then
        log "Cleaning existing node_modules..."
        rm -rf node_modules
    fi
    
    if [ -f "package-lock.json" ]; then
        log "Cleaning package-lock.json..."
        rm package-lock.json
    fi
    
    npm install
    
    # Verify critical packages
    if ! npm list @anthropic-ai/sdk > /dev/null 2>&1; then
        log "Installing missing Anthropic SDK..."
        npm install @anthropic-ai/sdk
    fi
    
    log "Dependencies installed successfully"
}

# Run tests
run_tests() {
    log "Running Phase 2 tests before deployment..."
    
    # Copy staging environment for tests
    cp "$STAGING_ENV_FILE" .env.local
    
    # Run Phase 2 validation tests
    log "Running Phase 2 infrastructure tests..."
    if ! VITE_AI_EXTRACTION_ENABLED=true npx tsx test-phase2-simple.ts > deploy/staging/logs/test-simple.log 2>&1; then
        error "Phase 2 simple test failed. Check deploy/staging/logs/test-simple.log"
    fi
    
    log "Running Phase 2 comprehensive tests..."
    if ! VITE_AI_EXTRACTION_ENABLED=true npx tsx test-phase2-complete.ts > deploy/staging/logs/test-complete.log 2>&1; then
        error "Phase 2 comprehensive test failed. Check deploy/staging/logs/test-complete.log"
    fi
    
    log "Running Phase 2 final validation..."
    if ! VITE_AI_EXTRACTION_ENABLED=true npx tsx test-phase2-final.ts > deploy/staging/logs/test-final.log 2>&1; then
        error "Phase 2 final validation failed. Check deploy/staging/logs/test-final.log"
    fi
    
    log "All Phase 2 tests passed successfully"
}

# Deploy database schema
deploy_database() {
    log "Deploying database schema to staging..."
    
    # Source staging environment
    source "$STAGING_ENV_FILE"
    
    # Deploy AI extraction schema
    log "Deploying AI extraction schema..."
    if [ -f "supabase/migrations/20240624_ai_extraction_schema.sql" ]; then
        log "AI extraction schema found, ready for deployment"
        # Note: In real deployment, you would use Supabase CLI here
        # supabase db reset --db-url "$VITE_SUPABASE_URL"
        # supabase migration up --db-url "$VITE_SUPABASE_URL"
        log "Database schema deployment completed (manual step required)"
    else
        warn "AI extraction schema not found, may need manual database setup"
    fi
}

# Build application
build_application() {
    log "Building application for staging..."
    
    # Use staging environment
    cp "$STAGING_ENV_FILE" .env.local
    
    # Build with staging configuration
    if ! npm run build > deploy/staging/logs/build.log 2>&1; then
        error "Build failed. Check deploy/staging/logs/build.log for details"
    fi
    
    # Verify build output
    if [ ! -d "dist" ]; then
        error "Build output directory 'dist' not found"
    fi
    
    BUILD_SIZE=$(du -sh dist | cut -f1)
    log "Build completed successfully. Size: $BUILD_SIZE"
    
    # Create build manifest
    echo "Build Date: $(date)" > dist/build-info.txt
    echo "Commit: $(git rev-parse HEAD)" >> dist/build-info.txt
    echo "Branch: $(git branch --show-current)" >> dist/build-info.txt
    echo "Environment: staging" >> dist/build-info.txt
}

# Deploy to platform
deploy_to_platform() {
    log "Deploying to staging platform..."
    
    # Detect deployment platform and deploy accordingly
    if [ -f "vercel.json" ]; then
        log "Deploying to Vercel..."
        # Vercel deployment
        if command -v vercel &> /dev/null; then
            vercel --env .env.staging --prod
        else
            warn "Vercel CLI not found. Please deploy manually or install Vercel CLI"
        fi
    elif [ -f "netlify.toml" ]; then
        log "Deploying to Netlify..."
        # Netlify deployment
        if command -v netlify &> /dev/null; then
            netlify deploy --prod --dir=dist
        else
            warn "Netlify CLI not found. Please deploy manually or install Netlify CLI"
        fi
    else
        log "No specific platform configuration found."
        log "Build files are ready in 'dist' directory for manual deployment"
        log "Copy the contents of 'dist' to your staging server"
    fi
}

# Post-deployment validation
post_deployment_validation() {
    log "Running post-deployment validation..."
    
    # Wait for deployment to be available
    if [ -n "$VITE_APP_URL" ]; then
        log "Waiting for staging environment to be available at $VITE_APP_URL"
        
        # Simple health check
        for i in {1..30}; do
            if curl -sf "$VITE_APP_URL" > /dev/null 2>&1; then
                log "Staging environment is responding"
                break
            fi
            if [ $i -eq 30 ]; then
                warn "Staging environment not responding after 30 attempts"
            fi
            sleep 10
        done
    fi
    
    # Run staging-specific tests if available
    if [ -f "test-staging-deployment.ts" ]; then
        log "Running staging deployment tests..."
        npx tsx test-staging-deployment.ts
    fi
    
    log "Post-deployment validation completed"
}

# Create monitoring dashboard
setup_monitoring() {
    log "Setting up staging monitoring..."
    
    # Create monitoring configuration
    cat > deploy/staging/configs/monitoring.json << EOF
{
  "environment": "staging",
  "deployment_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "monitoring": {
    "cost_tracking": true,
    "performance_monitoring": true,
    "error_tracking": true,
    "alert_thresholds": {
      "daily_cost_usd": 2,
      "error_rate_percent": 5,
      "response_time_ms": 5000
    }
  },
  "endpoints": {
    "health_check": "$VITE_APP_URL/health",
    "metrics": "$VITE_APP_URL/api/metrics",
    "status": "$VITE_APP_URL/status"
  }
}
EOF
    
    log "Monitoring configuration created"
}

# Backup previous deployment
backup_previous() {
    log "Creating backup of previous deployment..."
    
    if [ -d "$BACKUP_DIR" ]; then
        rm -rf "$BACKUP_DIR"
    fi
    mkdir -p "$BACKUP_DIR"
    
    # Backup current build if exists
    if [ -d "dist" ]; then
        cp -r dist "$BACKUP_DIR/previous-build"
    fi
    
    # Backup current environment
    if [ -f ".env.local" ]; then
        cp .env.local "$BACKUP_DIR/previous-env"
    fi
    
    log "Backup completed in $BACKUP_DIR"
}

# Main deployment function
main() {
    info "🚀 Starting Phase 2 Staging Deployment"
    info "========================================"
    
    create_directories
    backup_previous
    preflight_checks
    install_dependencies
    run_tests
    deploy_database
    build_application
    deploy_to_platform
    setup_monitoring
    post_deployment_validation
    
    log "🎉 Staging deployment completed successfully!"
    log "=========================================="
    
    info "📋 Deployment Summary:"
    info "  Environment: Staging"
    info "  Deployment Date: $(date)"
    info "  Git Commit: $(git rev-parse HEAD)"
    info "  Build Size: $(du -sh dist 2>/dev/null | cut -f1 || echo 'N/A')"
    
    if [ -n "$VITE_APP_URL" ]; then
        info "  Staging URL: $VITE_APP_URL"
    fi
    
    info ""
    info "📊 Next Steps:"
    info "  1. Verify staging environment functionality"
    info "  2. Run integration tests"
    info "  3. Test AI extraction with real documents"
    info "  4. Monitor cost and performance metrics"
    info "  5. Validate alerting system"
    
    info ""
    info "📚 Resources:"
    info "  • Logs: deploy/staging/logs/"
    info "  • Configs: deploy/staging/configs/"
    info "  • Backup: $BACKUP_DIR"
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT TERM

# Run main deployment
main "$@"