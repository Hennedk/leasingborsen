#!/bin/bash

# Production Monitoring Deployment Script
# This script deploys the complete monitoring system to production

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV=${1:-production}
BACKUP_ENABLED=${BACKUP_ENABLED:-true}
SKIP_TESTS=${SKIP_TESTS:-false}
FORCE_DEPLOY=${FORCE_DEPLOY:-false}

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌${NC} $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if running as correct user
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root"
    fi
    
    # Check required commands
    local required_commands=("node" "npm" "supabase" "pm2" "curl" "jq")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command '$cmd' not found"
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version | cut -d 'v' -f 2)
    local required_version="18.0.0"
    if ! node -e "process.exit(require('semver').gte('$node_version', '$required_version') ? 0 : 1)" 2>/dev/null; then
        error "Node.js version $required_version or higher required (current: $node_version)"
    fi
    
    # Check environment variables
    local required_vars=("SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Environment variable $var is not set"
        fi
    done
    
    success "Prerequisites check passed"
}

# Create backup
create_backup() {
    if [[ "$BACKUP_ENABLED" == "true" ]]; then
        log "Creating backup..."
        
        local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$backup_dir"
        
        # Backup database
        log "Backing up database..."
        npm run backup:create -- --output "$backup_dir/database.sql" || warning "Database backup failed"
        
        # Backup configuration
        log "Backing up configuration..."
        cp -r ./config "$backup_dir/" 2>/dev/null || warning "Config backup failed"
        
        # Backup current deployment
        if pm2 list | grep -q "monitoring-service"; then
            pm2 save --force
            cp ~/.pm2/dump.pm2 "$backup_dir/pm2.dump" 2>/dev/null || warning "PM2 backup failed"
        fi
        
        success "Backup created at $backup_dir"
        echo "$backup_dir" > .last_backup
    else
        warning "Backup skipped (BACKUP_ENABLED=false)"
    fi
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" != "true" ]]; then
        log "Running tests..."
        
        # Install test dependencies
        npm ci --only=dev
        
        # Run linting
        log "Running linter..."
        npm run lint || error "Linting failed"
        
        # Run unit tests
        log "Running unit tests..."
        npm test || error "Unit tests failed"
        
        # Run monitoring tests
        log "Running monitoring tests..."
        npm run test:monitoring || error "Monitoring tests failed"
        
        # Test database connection
        log "Testing database connection..."
        npm run db:test || error "Database connection test failed"
        
        success "All tests passed"
    else
        warning "Tests skipped (SKIP_TESTS=true)"
    fi
}

# Build application
build_application() {
    log "Building application..."
    
    # Clean previous builds
    rm -rf dist/ build/ .next/ 2>/dev/null || true
    
    # Install production dependencies
    npm ci --only=production
    
    # Build monitoring system
    log "Building monitoring system..."
    npm run build:monitoring || error "Monitoring build failed"
    
    # Build dashboard
    log "Building dashboard..."
    npm run build:dashboard || error "Dashboard build failed"
    
    success "Application built successfully"
}

# Deploy database changes
deploy_database() {
    log "Deploying database changes..."
    
    # Check database connectivity
    supabase status || error "Supabase not accessible"
    
    # Run migrations
    log "Running database migrations..."
    supabase db push || error "Database migration failed"
    
    # Verify schema
    log "Verifying database schema..."
    npm run db:verify-schema || warning "Schema verification failed"
    
    success "Database deployment completed"
}

# Deploy Edge Functions
deploy_edge_functions() {
    log "Deploying Edge Functions..."
    
    # Deploy health check function
    log "Deploying health-check function..."
    supabase functions deploy health-check --no-verify-jwt || error "Health check function deployment failed"
    
    # Deploy monitoring webhook
    log "Deploying monitoring-webhook function..."
    supabase functions deploy monitoring-webhook --no-verify-jwt || error "Monitoring webhook deployment failed"
    
    # Deploy metrics collector function
    log "Deploying metrics-collector function..."
    supabase functions deploy metrics-collector --no-verify-jwt || error "Metrics collector function deployment failed"
    
    success "Edge Functions deployed successfully"
}

# Deploy monitoring services
deploy_monitoring_services() {
    log "Deploying monitoring services..."
    
    # Stop existing services
    if pm2 list | grep -q "monitoring-service"; then
        log "Stopping existing monitoring services..."
        pm2 stop ecosystem.config.js || warning "Failed to stop some services"
        pm2 delete ecosystem.config.js || warning "Failed to delete some services"
    fi
    
    # Start new services
    log "Starting monitoring services..."
    pm2 start ecosystem.config.js --env "$DEPLOYMENT_ENV" || error "Failed to start monitoring services"
    
    # Save PM2 configuration
    pm2 save || warning "Failed to save PM2 configuration"
    
    # Setup PM2 startup
    pm2 startup || warning "PM2 startup setup failed"
    
    success "Monitoring services deployed"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Wait for services to start
    sleep 10
    
    # Check service status
    log "Checking service status..."
    pm2 status || error "PM2 services not running"
    
    # Test health endpoint
    log "Testing health endpoint..."
    local health_url="http://localhost:3000/health-check"
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$health_url" > /dev/null; then
            success "Health endpoint responding"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error "Health endpoint not responding after $max_attempts attempts"
        fi
        
        log "Attempt $attempt/$max_attempts: Health endpoint not ready, waiting..."
        sleep 2
        ((attempt++))
    done
    
    # Test monitoring system
    log "Testing monitoring system..."
    npm run monitoring:test || error "Monitoring system test failed"
    
    # Check metrics collection
    log "Checking metrics collection..."
    sleep 30  # Wait for metrics to be collected
    npm run metrics:verify || warning "Metrics verification failed"
    
    # Test alert system
    log "Testing alert system..."
    npm run alerts:test || warning "Alert system test failed"
    
    success "Deployment verification completed"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring configuration..."
    
    # Create log directories
    mkdir -p logs backups config
    
    # Set up log rotation
    log "Configuring log rotation..."
    sudo tee /etc/logrotate.d/monitoring-service > /dev/null << EOF
/var/www/monitoring/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $(whoami) $(whoami)
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
    
    # Setup monitoring cron jobs
    log "Setting up cron jobs..."
    (crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && npm run monitoring:cleanup") | sort -u | crontab -
    (crontab -l 2>/dev/null; echo "*/5 * * * * cd $(pwd) && npm run monitoring:health") | sort -u | crontab -
    (crontab -l 2>/dev/null; echo "0 6 * * * cd $(pwd) && npm run sla:report --email") | sort -u | crontab -
    
    success "Monitoring setup completed"
}

# Performance optimization
optimize_performance() {
    log "Applying performance optimizations..."
    
    # Optimize Node.js settings
    export NODE_OPTIONS="--max-old-space-size=1024"
    
    # Set up process limits
    echo "$(whoami) soft nofile 65536" | sudo tee -a /etc/security/limits.conf
    echo "$(whoami) hard nofile 65536" | sudo tee -a /etc/security/limits.conf
    
    # Configure PM2 for production
    pm2 set pm2:log-date-format "YYYY-MM-DD HH:mm:ss Z"
    pm2 set pm2:log-type "json"
    
    success "Performance optimizations applied"
}

# Rollback function
rollback() {
    error_msg="$1"
    error "Deployment failed: $error_msg"
    
    if [[ -f .last_backup ]]; then
        local backup_dir=$(cat .last_backup)
        warning "Attempting rollback to $backup_dir..."
        
        # Stop current services
        pm2 stop ecosystem.config.js 2>/dev/null || true
        pm2 delete ecosystem.config.js 2>/dev/null || true
        
        # Restore PM2 configuration
        if [[ -f "$backup_dir/pm2.dump" ]]; then
            cp "$backup_dir/pm2.dump" ~/.pm2/dump.pm2
            pm2 resurrect
        fi
        
        # Restore database if needed
        if [[ -f "$backup_dir/database.sql" ]]; then
            warning "Database rollback requires manual intervention"
            log "Backup available at: $backup_dir/database.sql"
        fi
        
        warning "Rollback completed. Please verify system status."
    else
        error "No backup available for rollback"
    fi
}

# Cleanup function
cleanup() {
    log "Performing cleanup..."
    
    # Remove temporary files
    rm -rf tmp/ temp/ .tmp/ 2>/dev/null || true
    
    # Clean npm cache
    npm cache clean --force 2>/dev/null || true
    
    # Remove old log files (older than 30 days)
    find logs/ -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    # Remove old backups (older than 7 days)
    find backups/ -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
    
    success "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting monitoring system deployment (Environment: $DEPLOYMENT_ENV)"
    
    # Set error trap for rollback
    trap 'rollback "Deployment interrupted"' ERR
    
    # Deployment steps
    check_prerequisites
    create_backup
    run_tests
    build_application
    deploy_database
    deploy_edge_functions
    deploy_monitoring_services
    setup_monitoring
    optimize_performance
    verify_deployment
    cleanup
    
    # Clear error trap
    trap - ERR
    
    success "🎉 Monitoring system deployment completed successfully!"
    
    # Display useful information
    log "📊 Monitoring Dashboard: http://localhost:3000/dashboard"
    log "💚 Health Check: http://localhost:3000/health-check"
    log "📈 Metrics API: http://localhost:3000/api/metrics"
    log "🚨 Alerts API: http://localhost:3000/api/alerts"
    
    log "📋 Next steps:"
    log "  1. Configure notification channels (Slack, email, etc.)"
    log "  2. Set up external monitoring (Pingdom, DataDog, etc.)"
    log "  3. Test alert escalation procedures"
    log "  4. Schedule regular backup verification"
    log "  5. Review and adjust SLA targets"
    
    log "🛠️ Useful commands:"
    log "  - Check status: npm run monitoring:status"
    log "  - View logs: pm2 logs monitoring-service"
    log "  - Restart: npm run monitoring:restart"
    log "  - Health check: npm run monitoring:health"
}

# Help function
show_help() {
    cat << EOF
Production Monitoring Deployment Script

Usage: $0 [ENVIRONMENT] [OPTIONS]

ENVIRONMENT:
    production    Deploy to production (default)
    staging       Deploy to staging
    development   Deploy to development

OPTIONS:
    Environment variables can be set to modify behavior:
    
    BACKUP_ENABLED=false     Skip backup creation
    SKIP_TESTS=true          Skip test execution
    FORCE_DEPLOY=true        Force deployment even if tests fail

Examples:
    $0                           # Deploy to production with all checks
    $0 staging                   # Deploy to staging
    SKIP_TESTS=true $0           # Deploy without running tests
    BACKUP_ENABLED=false $0      # Deploy without creating backup

For more information, see: ./deployment/MonitoringSetup.md
EOF
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    production|staging|development)
        DEPLOYMENT_ENV="$1"
        ;;
    "")
        DEPLOYMENT_ENV="production"
        ;;
    *)
        error "Invalid environment: $1. Use production, staging, or development."
        ;;
esac

# Run main function
main "$@"