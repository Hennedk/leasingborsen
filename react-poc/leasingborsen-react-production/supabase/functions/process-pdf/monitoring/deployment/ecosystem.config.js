module.exports = {
  apps: [
    {
      name: 'monitoring-service',
      script: './monitoring-service.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        MONITORING_ENABLED: true,
        ALERTS_ENABLED: true,
        LOG_LEVEL: 'info'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        MONITORING_ENABLED: true,
        ALERTS_ENABLED: false,
        LOG_LEVEL: 'debug'
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        MONITORING_ENABLED: true,
        ALERTS_ENABLED: true,
        LOG_LEVEL: 'info'
      },
      error_file: './logs/monitoring-error.log',
      out_file: './logs/monitoring-out.log',
      log_file: './logs/monitoring-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_type: 'json'
    },
    {
      name: 'metrics-collector',
      script: './metrics-collector-service.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        COLLECTION_INTERVAL: 30000,
        BATCH_SIZE: 100
      },
      error_file: './logs/metrics-error.log',
      out_file: './logs/metrics-out.log',
      log_file: './logs/metrics-combined.log',
      time: true
    },
    {
      name: 'alert-manager',
      script: './alert-manager-service.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        ALERT_CHECK_INTERVAL: 60000,
        ESCALATION_ENABLED: true
      },
      error_file: './logs/alerts-error.log',
      out_file: './logs/alerts-out.log',
      log_file: './logs/alerts-combined.log',
      time: true
    },
    {
      name: 'health-checker',
      script: './health-checker-service.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        HEALTH_CHECK_INTERVAL: 60000,
        COMPONENT_TIMEOUT: 5000
      },
      error_file: './logs/health-error.log',
      out_file: './logs/health-out.log',
      log_file: './logs/health-combined.log',
      time: true
    }
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: ['production-server-1', 'production-server-2'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/pdf-processing-monitoring.git',
      path: '/var/www/monitoring',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save',
      'pre-setup': 'apt update && apt install git -y'
    },
    staging: {
      user: 'deploy',
      host: 'staging-server',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/pdf-processing-monitoring.git',
      path: '/var/www/monitoring-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging && pm2 save',
      'pre-setup': 'apt update && apt install git -y'
    }
  }
};