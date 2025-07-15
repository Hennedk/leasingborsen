# Claude Code Migration Plan: Vehicle Extraction System to OpenAI Responses API

## 🎯 Executive Summary
Migrate the vehicle extraction system from Chat Completions to Responses API with enhanced variant tracking, comprehensive testing, and minimal service disruption. The migration includes the new `variantSource` field for complete audit transparency.

## 📋 Claude Code Terminal Commands & Workflow

### Phase 1: Environment Setup (Day 1)
```bash
# 1. Create feature branch
git checkout -b feature/responses-api-migration

# 2. Update dependencies
npm update openai@latest
npm install --save-dev @types/openai@latest

# 3. Verify OpenAI library version
npm list openai

# 4. Create migration directory structure
mkdir -p src/migration/{schemas,validators,extractors,monitors}
mkdir -p tests/{unit,integration,regression}
mkdir -p docs/migration

# 5. Set up environment variables
cp .env.example .env.migration
echo "USE_RESPONSES_API=false" >> .env.migration
echo "OPENAI_STORED_PROMPT_ID=pmpt_68677b2c8ebc819584c1af3875e5af5f0bd2f952f3e39828" >> .env.migration
echo "OPENAI_STORED_PROMPT_VERSION=6" >> .env.migration
```

### Phase 2: Schema & Interface Implementation (Day 2-3)
```bash
# 1. Create TypeScript interfaces with variant source
cat > src/migration/schemas/vehicle.schema.ts << 'EOF'
export interface VehicleOffer {
  monthly_price: number;
  down_payment: number;
  months: number;
  km_per_year: number;
  total_price: number | null;
}

export interface ExtractedVehicle {
  make: string;
  model: string;
  variant: string;
  hp: number | null;
  ft: number;
  tr: number;
  bt: number;
  wltp: number | null;
  co2: number | null;
  kwh100: number | null;
  l100: number | null;
  tax: number | null;
  offers: number[][];
  
  // Variant tracking
  variantSource: "existing" | "reference" | "inferred";
  variantConfidence: number;
  variantMatchDetails?: {
    matchedId?: string;
    matchScore?: number;
    matchCriteria?: string[];
  };
}

export interface ExtractionResponse {
  cars: ExtractedVehicle[];
  metadata?: {
    extractionTime: number;
    tokensUsed: number;
    apiVersion: string;
  };
}
EOF

# 2. Generate JSON Schema validator
npx typescript-json-schema src/migration/schemas/vehicle.schema.ts ExtractionResponse \
  --required --strictNullChecks \
  > src/migration/schemas/extraction-response.schema.json

# 3. Create the prompt file for version control
cat > src/migration/prompts/vehicle-extraction-v6.md << 'EOF'
[Insert the comprehensive vehicle extraction prompt here]
EOF
```

### Phase 3: Core Implementation (Day 4-6)
```bash
# 1. Implement the new extractor
cat > src/migration/extractors/ResponsesAPIExtractor.ts << 'EOF'
import { OpenAI } from 'openai';
import { ExtractedVehicle, ExtractionResponse } from '../schemas/vehicle.schema';
import { VariantResolver } from './VariantResolver';
import { ExtractionMonitor } from '../monitors/ExtractionMonitor';

export class ResponsesAPIExtractor {
  private client: OpenAI;
  private variantResolver: VariantResolver;
  private monitor: ExtractionMonitor;

  constructor(config: ExtractorConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.variantResolver = new VariantResolver(config);
    this.monitor = new ExtractionMonitor(config);
  }

  async extract(params: ExtractionParams): Promise<ExtractionResponse> {
    const startTime = Date.now();
    
    try {
      // Build optimized context
      const context = await this.buildContext(params);
      
      // Call Responses API
      const response = await this.client.responses.create({
        prompt: {
          id: process.env.OPENAI_STORED_PROMPT_ID!,
          version: process.env.OPENAI_STORED_PROMPT_VERSION!
        },
        model: 'gpt-4o-2025-04-14',
        context,
        response_format: {
          type: "json_schema",
          json_schema: require('../schemas/extraction-response.schema.json')
        },
        temperature: 0.1,
        max_tokens: 16000
      });

      // Process and enrich with variant sources
      const enrichedCars = await this.enrichWithVariantSources(
        response.data.cars,
        context
      );

      // Monitor and log
      await this.monitor.trackExtraction({
        request: params,
        response: enrichedCars,
        metrics: {
          duration: Date.now() - startTime,
          tokensUsed: response.usage?.total_tokens || 0
        }
      });

      return {
        cars: enrichedCars,
        metadata: {
          extractionTime: Date.now() - startTime,
          tokensUsed: response.usage?.total_tokens || 0,
          apiVersion: 'responses-v1'
        }
      };
    } catch (error) {
      await this.handleError(error, params);
      throw error;
    }
  }

  private async enrichWithVariantSources(
    cars: ExtractedVehicle[],
    context: ExtractionContext
  ): Promise<ExtractedVehicle[]> {
    return Promise.all(
      cars.map(async (car) => {
        const resolution = await this.variantResolver.resolveVariant(car, context);
        return {
          ...car,
          variantSource: resolution.source,
          variantConfidence: resolution.confidence,
          variantMatchDetails: resolution.matchDetails
        };
      })
    );
  }
}
EOF

# 2. Create feature flag manager
cat > src/migration/FeatureFlagManager.ts << 'EOF'
export class FeatureFlagManager {
  private static rolloutPercentages = {
    phase1: 0.05,  // 5%
    phase2: 0.25,  // 25%
    phase3: 1.00   // 100%
  };

  static async shouldUseResponsesAPI(dealerId: string): boolean {
    if (process.env.USE_RESPONSES_API === 'false') return false;
    
    const phase = await this.getCurrentPhase();
    const dealerHash = this.hashDealerId(dealerId);
    const threshold = this.rolloutPercentages[`phase${phase}`];
    
    return dealerHash < threshold;
  }
}
EOF

# 3. Create monitoring dashboard
cat > src/migration/monitors/dashboard.ts << 'EOF'
export class MigrationDashboard {
  async generateReport(): Promise<DashboardReport> {
    const metrics = await this.collectMetrics();
    
    return {
      variantSourceDistribution: {
        existing: metrics.existing,
        reference: metrics.reference,
        inferred: metrics.inferred
      },
      inferenceRate: metrics.inferred / metrics.total,
      avgConfidenceBySource: metrics.avgConfidence,
      topInferredVariants: metrics.topInferred,
      performanceComparison: {
        oldAPI: metrics.oldAPIMetrics,
        newAPI: metrics.newAPIMetrics
      }
    };
  }
}
EOF
```

### Phase 4: Testing Implementation (Day 7-8)
```bash
# 1. Create test fixtures
mkdir -p tests/fixtures
cp production-pdfs/*.pdf tests/fixtures/

# 2. Generate test suite
cat > tests/integration/variant-consistency.test.ts << 'EOF'
import { ResponsesAPIExtractor } from '../../src/migration/extractors/ResponsesAPIExtractor';
import { loadTestPDF, loadExistingListings } from '../helpers';

describe('Variant Consistency Tests', () => {
  let extractor: ResponsesAPIExtractor;
  
  beforeAll(() => {
    extractor = new ResponsesAPIExtractor({
      apiKey: process.env.OPENAI_API_KEY!
    });
  });

  test('should reuse existing variant names', async () => {
    const pdf = await loadTestPDF('toyota-corolla-hybrid.pdf');
    const existingListings = await loadExistingListings('toyota-dealer-001');
    
    const result = await extractor.extract({
      pdfText: pdf.text,
      dealerId: 'toyota-dealer-001',
      existingListings
    });
    
    const corollaHybrid = result.cars.find(
      car => car.make === 'Toyota' && car.model === 'Corolla' && car.hp === 140
    );
    
    expect(corollaHybrid?.variantSource).toBe('existing');
    expect(corollaHybrid?.variant).toBe('1.8 Hybrid Active Plus');
    expect(corollaHybrid?.variantConfidence).toBeGreaterThan(0.9);
  });

  test('should flag inferred variants for review', async () => {
    const pdf = await loadTestPDF('new-model-no-reference.pdf');
    
    const result = await extractor.extract({
      pdfText: pdf.text,
      dealerId: 'generic-dealer-001'
    });
    
    const inferredVehicles = result.cars.filter(
      car => car.variantSource === 'inferred'
    );
    
    expect(inferredVehicles.length).toBeGreaterThan(0);
    inferredVehicles.forEach(vehicle => {
      expect(vehicle.variantConfidence).toBeLessThan(0.8);
    });
  });
});
EOF

# 3. Run regression tests
npm test -- --testPathPattern=regression
```

### Phase 5: Gradual Rollout (Day 9-14)
```bash
# 1. Deploy Phase 1 (5% of dealers)
export MIGRATION_PHASE=1
npm run deploy:migration

# 2. Monitor Phase 1 metrics
npm run monitor:migration -- --phase 1 --duration 24h

# 3. Generate Phase 1 report
npm run report:migration -- --phase 1 > reports/phase1-metrics.json

# 4. Validate Phase 1 success criteria
npm run validate:phase -- --phase 1

# 5. If validation passes, proceed to Phase 2
export MIGRATION_PHASE=2
npm run deploy:migration

# 6. Monitor and validate Phase 2
npm run monitor:migration -- --phase 2 --duration 48h
npm run validate:phase -- --phase 2

# 7. Full rollout to Phase 3
export MIGRATION_PHASE=3
npm run deploy:migration
```

### Phase 6: Production Monitoring (Ongoing)
```bash
# 1. Set up automated monitoring
cat > scripts/monitor-production.sh << 'EOF'
#!/bin/bash
while true; do
  # Check inference rates
  INFERENCE_RATE=$(npm run metrics:inference-rate --silent)
  if (( $(echo "$INFERENCE_RATE > 0.20" | bc -l) )); then
    npm run alert:high-inference-rate
  fi
  
  # Check API errors
  ERROR_RATE=$(npm run metrics:error-rate --silent)
  if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
    npm run alert:high-error-rate
  fi
  
  # Generate hourly report
  npm run report:hourly
  
  sleep 3600
done
EOF

chmod +x scripts/monitor-production.sh
nohup ./scripts/monitor-production.sh &

# 2. Set up daily quality reports
crontab -e
# Add: 0 9 * * * cd /path/to/project && npm run report:daily-quality

# 3. Create rollback script
cat > scripts/emergency-rollback.sh << 'EOF'
#!/bin/bash
echo "EMERGENCY ROLLBACK INITIATED"
export USE_RESPONSES_API=false
npm run deploy:emergency
npm run alert:rollback-executed
EOF
```

### Phase 7: Documentation & Training (Day 15)
```bash
# 1. Generate API documentation
npm run docs:generate

# 2. Create training materials
mkdir -p docs/training
cat > docs/training/variant-source-guide.md << 'EOF'
# Understanding Variant Sources

## What is variantSource?
- `existing`: Matched to current dealer inventory
- `reference`: Matched to our reference database
- `inferred`: AI-generated (requires review)

## Review Process
1. Check daily review queue
2. Focus on `inferred` variants
3. Use similarity suggestions
4. Approve or correct variants
EOF

# 3. Create troubleshooting guide
cat > docs/TROUBLESHOOTING.md << 'EOF'
# Common Issues and Solutions

## High Inference Rate
- Check PDF quality
- Verify existing listings are current
- Review prompt effectiveness

## Schema Validation Errors
- Check for API version mismatch
- Validate JSON structure
- Review error logs
EOF
```

## 📊 Success Metrics Dashboard

```bash
# Create real-time dashboard
npm run dashboard:migration

# Metrics to track:
# - Variant source distribution (pie chart)
# - Inference rate over time (line graph)
# - API response times (histogram)
# - Error rates by dealer (heat map)
# - Token usage comparison (bar chart)
```

## 🚨 Emergency Procedures

```bash
# Quick rollback
export USE_RESPONSES_API=false && npm run deploy:emergency

# Check system health
npm run health:check

# View recent errors
npm run logs:errors -- --last 1h

# Generate incident report
npm run incident:report -- --severity high
```

## ✅ Migration Completion Checklist

- [ ] All dealers migrated to Responses API
- [ ] Inference rate < 20%
- [ ] Error rate < 0.1%
- [ ] Average response time < 2.5s
- [ ] All regression tests passing
- [ ] Documentation updated
- [ ] Team trained on new system
- [ ] Monitoring dashboards active
- [ ] Rollback procedures tested
- [ ] Cost analysis completed

## 🎯 Post-Migration Optimization

```bash
# Analyze variant patterns
npm run analyze:variant-patterns

# Optimize prompt based on inference data
npm run optimize:prompt -- --use-inference-data

# Update reference database
npm run update:reference-db -- --from-inferred-variants

# Schedule regular quality audits
npm run schedule:quality-audits
```

This Claude Code-friendly plan provides copy-paste terminal commands for each phase, making the migration process systematic and trackable.