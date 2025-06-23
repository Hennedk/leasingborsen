-- Template System for PDFPlumber Integration
-- Migration: 20250622_create_template_system.sql

-- Core template table
CREATE TABLE pdf_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  
  -- PDFPlumber Configuration
  pdfplumber_config JSONB NOT NULL,
  extraction_rules JSONB NOT NULL,
  validation_rules JSONB NOT NULL,
  
  -- Template Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'testing', 'approved', 'deprecated')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Testing & Metrics
  test_file_url TEXT,
  success_rate DECIMAL(5,2),
  avg_extraction_time INTEGER, -- milliseconds
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Link dealers/sellers to templates
CREATE TABLE dealer_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  template_id UUID REFERENCES pdf_templates(id),
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  
  -- Usage tracking
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(seller_id, template_id)
);

-- Template test results
CREATE TABLE template_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES pdf_templates(id),
  test_file_url TEXT NOT NULL,
  
  -- Results
  success BOOLEAN NOT NULL,
  items_extracted INTEGER,
  extraction_time INTEGER, -- milliseconds
  error_message TEXT,
  extracted_data JSONB,
  
  -- Verification
  manually_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verification_notes TEXT,
  
  tested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add template reference to processing jobs
ALTER TABLE processing_jobs 
ADD COLUMN template_id UUID REFERENCES pdf_templates(id),
ADD COLUMN template_version VARCHAR(50);

-- Indexes for performance
CREATE INDEX idx_pdf_templates_status ON pdf_templates(status);
CREATE INDEX idx_dealer_templates_active ON dealer_templates(seller_id, is_active);
CREATE INDEX idx_template_test_results_template ON template_test_results(template_id);

-- Row Level Security
ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_test_results ENABLE ROW LEVEL SECURITY;

-- Policies (admin only for now)
CREATE POLICY "Admin can manage templates" ON pdf_templates 
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can manage dealer templates" ON dealer_templates 
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can view test results" ON template_test_results 
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');