# 🚀 Phase 2 Staging Deployment - Setup Guide

## ✅ Quick Start Staging Deployment

### 1. **Immediate Setup (5 minutes)**

```bash
# Clone the staging environment template
cp deploy/staging/.env.staging.example .env.staging

# Edit with your credentials (minimum required)
nano .env.staging
```

**Minimum Required Configuration:**
```bash
# Essential settings
VITE_AI_EXTRACTION_ENABLED=true
VITE_APP_ENV=staging

# Supabase (create staging project at supabase.com)
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_staging_anon_key

# At least one AI provider
VITE_OPENAI_API_KEY=sk-your-staging-openai-key

# Cost controls for staging
VITE_DAILY_COST_LIMIT_USD=5
VITE_MAX_COST_PER_PDF_CENTS=15
```

### 2. **Deploy to Staging (1 command)**

```bash
# Run the automated deployment
npm run staging:deploy
```

### 3. **Validate Deployment**

```bash
# Test the staging environment
npm run staging:validate
```

## 📋 Complete Deployment Process

### Step 1: Environment Setup
```bash
# 1. Copy staging configuration
cp deploy/staging/.env.staging.example .env.staging

# 2. Fill in required values
# - Supabase staging project credentials
# - OpenAI API key (staging/limited credits)
# - Cost limits and monitoring settings

# 3. Validate configuration
npm run staging:test
```

### Step 2: Database Deployment
```bash
# Deploy database schema
npm run staging:deploy:db

# Or run manually:
./deploy/staging/deploy-database.sh
```

### Step 3: Application Deployment
```bash
# Full staging deployment
npm run staging:deploy

# Or run manually:
./deploy/staging/deploy-staging.sh
```

### Step 4: Post-Deployment Testing
```bash
# Validate deployment
npm run staging:validate

# Test Phase 2 functionality
npm run phase2:test:staging

# Monitor staging environment
npm run staging:monitor
```

## 🔧 Manual Configuration Steps

### Supabase Staging Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project (staging-leasingborsen)
3. Get URL and anon key from Settings > API
4. Add to `.env.staging`

### OpenAI Staging Setup
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create staging API key with limited credits ($10)
3. Add to `.env.staging` as `VITE_OPENAI_API_KEY`

### Deployment Platform
Choose one of:

**Option A: Vercel**
```bash
npm install -g vercel
vercel --env .env.staging
```

**Option B: Netlify**
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

**Option C: Manual**
```bash
npm run build
# Upload 'dist' folder to your staging server
```

## 📊 Monitoring Setup

### Dashboard Access
- Staging URL: `https://staging.your-domain.com`
- Admin Interface: `https://staging.your-domain.com/admin`
- Health Check: `https://staging.your-domain.com/health`

### Cost Monitoring
- Daily budget: $5 USD maximum
- Per-PDF limit: 15¢ maximum
- Alerts at 80% utilization ($4 USD)

### Performance Targets
- Response time: < 3 seconds
- Success rate: > 95%
- Confidence score: > 80%

## 🧪 Testing Checklist

### Automated Tests
- [ ] Configuration validation
- [ ] Database connectivity
- [ ] AI provider availability
- [ ] Monitoring systems
- [ ] Performance benchmarks
- [ ] Integration endpoints

### Manual Testing
- [ ] Upload sample Danish car document
- [ ] Verify extraction results
- [ ] Check cost tracking
- [ ] Test error handling
- [ ] Validate alerting system

## 🚨 Troubleshooting

### Common Issues

**"AI extraction is disabled"**
```bash
# Solution: Enable in staging environment
echo "VITE_AI_EXTRACTION_ENABLED=true" >> .env.staging
```

**"No API providers configured"**
```bash
# Solution: Add at least OpenAI key
echo "VITE_OPENAI_API_KEY=sk-your-key" >> .env.staging
```

**"Database connection failed"**
```bash
# Solution: Verify Supabase staging project
# Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

**"Build failed"**
```bash
# Solution: Clean install and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Support

**Quick Fix Commands:**
```bash
# Reset staging environment
rm -f .env.staging && cp deploy/staging/.env.staging.example .env.staging

# Clean rebuild
npm run clean && npm install && npm run build

# Test core functionality
npm run phase2:test:staging

# Check deployment logs
cat deploy/staging/logs/deployment-*.log
```

## 📈 Success Criteria

### Deployment Success
✅ All tests pass (6/6)
✅ Application accessible at staging URL
✅ AI extraction functional with real documents
✅ Cost monitoring operational
✅ Performance within targets

### Ready for Production
✅ Staging validation: 100% pass rate
✅ Load testing completed
✅ Monitoring and alerting verified
✅ Documentation complete
✅ Team trained on monitoring tools

## 📚 Next Steps After Staging

1. **Integration Testing** (1-2 days)
   - Test with real PDF documents
   - Validate all Danish car brands
   - Performance optimization

2. **Load Testing** (1 day)
   - Concurrent user testing
   - Cost scaling analysis
   - Performance under load

3. **Production Preparation** (2-3 days)
   - Production environment setup
   - Monitoring dashboard configuration
   - Team training and handover

4. **Production Deployment** (1 day)
   - Final production deployment
   - Go-live validation
   - Post-deployment monitoring

---

**🎯 Staging Environment Status: READY FOR DEPLOYMENT**

The Phase 2 AI extraction system is fully prepared for staging deployment with comprehensive monitoring, cost controls, and Danish car document processing capabilities.