# 🚀 Phase 2 Staging Deployment Guide

This directory contains all the necessary files and scripts for deploying the Phase 2 AI extraction system to a staging environment.

## 📋 Prerequisites

Before deploying to staging, ensure you have:

- [ ] Staging Supabase project created
- [ ] OpenAI API key with sufficient credits
- [ ] Anthropic API key (optional, for fallback)
- [ ] Domain/subdomain for staging (e.g., `staging-leasingborsen.com`)
- [ ] SSL certificate configured
- [ ] Deployment platform access (Vercel, Netlify, or custom server)

## 🔧 Quick Deployment

### 1. Environment Setup
```bash
# Copy staging environment template
cp deploy/staging/.env.staging.example .env.staging

# Edit with your staging credentials
nano .env.staging
```

### 2. Database Setup
```bash
# Deploy AI extraction schema to staging
npm run deploy:staging:db

# Verify schema deployment
npm run verify:staging:db
```

### 3. Application Deployment
```bash
# Build and deploy to staging
npm run deploy:staging

# Run post-deployment tests
npm run test:staging
```

### 4. Monitoring Setup
```bash
# Initialize monitoring dashboards
npm run setup:staging:monitoring

# Test alerting system
npm run test:staging:alerts
```

## 📊 Staging Environment Specifications

### Infrastructure
- **Environment**: Staging/Pre-production
- **Database**: Supabase staging project
- **AI Providers**: OpenAI GPT-4, Anthropic Claude (fallback)
- **Monitoring**: Real-time cost and performance tracking
- **Alerting**: Budget alerts and error notifications

### Cost Controls
- **Daily Budget**: $5 USD (50% of production limit)
- **Per-PDF Limit**: 15¢ (75% of production limit)
- **Alert Threshold**: $2 USD daily spending
- **Auto-cutoff**: Extraction disabled if daily budget exceeded

### Performance Targets
- **Response Time**: <3 seconds per extraction
- **Success Rate**: >95% for Danish documents
- **Confidence Score**: >80% average
- **Uptime**: >99% availability

## 🧪 Testing Strategy

### Automated Tests
1. **Infrastructure Tests**: API connectivity, database access
2. **Extraction Tests**: Sample Danish car documents
3. **Monitoring Tests**: Cost tracking, performance metrics
4. **Integration Tests**: End-to-end PDF processing

### Manual Testing
1. **UI Testing**: Admin interface functionality
2. **Error Handling**: Provider failure scenarios
3. **Cost Monitoring**: Budget alert triggers
4. **Performance**: Load testing with multiple documents

## 📈 Monitoring & Alerts

### Dashboards
- Real-time extraction metrics
- Cost tracking and budget utilization
- Provider performance comparison
- Error rates and failure analysis

### Alert Conditions
- Daily budget >80% utilized
- Extraction failure rate >5%
- Average response time >5 seconds
- Provider API errors

## 🔒 Security Considerations

### API Key Management
- Staging API keys separate from production
- Limited credit allocation for cost control
- Key rotation schedule (monthly)

### Access Control
- Staging environment access restricted to development team
- Admin interface protected with authentication
- Database access logged and monitored

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Staging environment variables configured
- [ ] Database schema deployed and verified
- [ ] API keys tested and validated
- [ ] SSL certificate active
- [ ] Monitoring systems configured

### Post-Deployment
- [ ] Application health check passed
- [ ] Sample extraction test successful
- [ ] Monitoring dashboards operational
- [ ] Alert system tested
- [ ] Performance benchmarks met

### Validation
- [ ] Integration tests passed
- [ ] Manual testing completed
- [ ] Cost controls verified
- [ ] Documentation updated

## 🚨 Troubleshooting

### Common Issues
1. **API Key Errors**: Verify staging keys in environment
2. **Database Connection**: Check Supabase staging URL
3. **Build Failures**: Ensure all dependencies installed
4. **Monitoring Issues**: Verify localStorage/session storage

### Support Contacts
- **Technical Lead**: Development team lead
- **DevOps**: Infrastructure team
- **Product**: Product owner for requirements

## 📚 Additional Resources

- [Phase 2 Technical Documentation](../docs/phase2-technical.md)
- [Monitoring Guide](../docs/monitoring-guide.md)
- [API Reference](../docs/api-reference.md)
- [Production Deployment Guide](../production/README.md)