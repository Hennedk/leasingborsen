-- Staging Schema Setup
-- Based on production schema export

-- 1. EXTENSIONS (if not auto-enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
CREATE TYPE drive_type AS ENUM ('FWD', 'RWD', 'AWD', '4WD');

-- 3. TABLES (from your export)
CREATE TABLE public.makes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  CONSTRAINT makes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.body_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  CONSTRAINT body_types_pkey PRIMARY KEY (id)
);

CREATE TABLE public.colours (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  CONSTRAINT colours_pkey PRIMARY KEY (id)
);

CREATE TABLE public.fuel_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  CONSTRAINT fuel_types_pkey PRIMARY KEY (id)
);

CREATE TABLE public.transmissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  CONSTRAINT transmissions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.models (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  make_id uuid NOT NULL,
  name text NOT NULL,
  CONSTRAINT models_pkey PRIMARY KEY (id),
  CONSTRAINT models_make_id_fkey FOREIGN KEY (make_id) REFERENCES public.makes(id)
);

CREATE TABLE public.sellers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  country text,
  logo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  company text,
  batch_config jsonb DEFAULT '{}'::jsonb,
  total_listings integer DEFAULT 0,
  last_import_date timestamp with time zone,
  make_id uuid,
  pdf_url text,
  pdf_urls jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT sellers_pkey PRIMARY KEY (id),
  CONSTRAINT sellers_make_id_fkey FOREIGN KEY (make_id) REFERENCES public.makes(id)
);

CREATE TABLE public.listings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  seller_id uuid,
  make_id uuid NOT NULL,
  model_id uuid NOT NULL,
  variant text,
  year integer,
  image text,
  mileage integer,
  body_type_id uuid,
  fuel_type_id uuid,
  transmission_id uuid,
  horsepower integer,
  kw integer,
  wltp integer,
  consumption_l_100km numeric,
  consumption_kwh_100km numeric,
  seats integer,
  doors integer,
  co2_emission integer,
  co2_tax_half_year integer,
  description text,
  drive_type drive_type,
  updated_at timestamp with time zone DEFAULT now(),
  extraction_method text,
  extraction_timestamp timestamp without time zone,
  processed_image_grid text,
  processed_image_detail text,
  images text[] DEFAULT '{}'::text[],
  retail_price numeric,
  lease_score integer CHECK (lease_score >= 0 AND lease_score <= 100),
  lease_score_calculated_at timestamp with time zone,
  lease_score_breakdown jsonb,
  status text DEFAULT 'active',
  dealer_id text,
  CONSTRAINT listings_pkey PRIMARY KEY (id),
  CONSTRAINT listings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id),
  CONSTRAINT listings_make_id_fkey FOREIGN KEY (make_id) REFERENCES public.makes(id),
  CONSTRAINT listings_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id),
  CONSTRAINT listings_body_type_id_fkey FOREIGN KEY (body_type_id) REFERENCES public.body_types(id),
  CONSTRAINT listings_fuel_type_id_fkey FOREIGN KEY (fuel_type_id) REFERENCES public.fuel_types(id),
  CONSTRAINT listings_transmission_id_fkey FOREIGN KEY (transmission_id) REFERENCES public.transmissions(id)
);

CREATE TABLE public.lease_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  mileage_per_year integer NOT NULL,
  first_payment integer NOT NULL,
  period_months integer NOT NULL,
  monthly_price integer NOT NULL,
  is_primary boolean DEFAULT false,
  CONSTRAINT lease_pricing_pkey PRIMARY KEY (id),
  CONSTRAINT lease_pricing_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE
);

CREATE TABLE public.dealers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  total_listings integer DEFAULT 0,
  last_import_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  pdf_url text,
  is_active boolean DEFAULT true,
  ai_config jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT dealers_pkey PRIMARY KEY (id)
);

CREATE TABLE public.responses_api_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  openai_prompt_id character varying NOT NULL,
  openai_prompt_version character varying NOT NULL DEFAULT 'latest'::character varying,
  model character varying NOT NULL DEFAULT 'gpt-4-1106-preview'::character varying,
  temperature numeric NOT NULL DEFAULT 0.1,
  max_completion_tokens integer,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT responses_api_configs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.input_schemas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  schema_definition jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT input_schemas_pkey PRIMARY KEY (id)
);

CREATE TABLE public.text_format_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL,
  format_type character varying NOT NULL,
  format_name character varying,
  strict boolean DEFAULT false,
  schema_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT text_format_configs_pkey PRIMARY KEY (id),
  CONSTRAINT text_format_configs_schema_id_fkey FOREIGN KEY (schema_id) REFERENCES public.input_schemas(id),
  CONSTRAINT text_format_configs_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.responses_api_configs(id)
);

CREATE TABLE public.api_call_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL,
  openai_prompt_id character varying NOT NULL,
  openai_prompt_version character varying NOT NULL,
  model character varying NOT NULL,
  temperature numeric NOT NULL,
  completion_tokens integer,
  total_tokens integer,
  response_status character varying,
  error_message text,
  request_start timestamp with time zone DEFAULT now(),
  request_end timestamp with time zone,
  duration_ms integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_call_logs_pkey PRIMARY KEY (id),
  CONSTRAINT api_call_logs_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.responses_api_configs(id)
);

CREATE TABLE public.extraction_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_name text NOT NULL,
  pdf_url text NOT NULL,
  seller_id uuid NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'partially_applied'::text])),
  extraction_type text NOT NULL CHECK (extraction_type = ANY (ARRAY['create'::text, 'update'::text])),
  total_extracted integer DEFAULT 0,
  total_matched integer DEFAULT 0,
  total_new integer DEFAULT 0,
  total_updated integer DEFAULT 0,
  total_unchanged integer DEFAULT 0,
  total_deleted integer DEFAULT 0,
  started_at timestamp without time zone,
  completed_at timestamp without time zone,
  processing_time_ms integer,
  ai_provider text,
  model_version text,
  tokens_used integer,
  cost_cents integer,
  reviewed_at timestamp without time zone,
  reviewed_by text,
  applied_at timestamp without time zone,
  applied_by text,
  created_at timestamp without time zone DEFAULT now(),
  created_by text,
  api_version text DEFAULT 'chat-completions'::text,
  inference_rate numeric,
  variant_source_stats jsonb,
  CONSTRAINT extraction_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT extraction_sessions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);

CREATE TABLE public.extraction_listing_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  existing_listing_id uuid,
  change_type text NOT NULL CHECK (change_type = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text, 'unchanged'::text, 'missing_model'::text])),
  change_status text NOT NULL CHECK (change_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'applied'::text, 'discarded'::text])),
  confidence_score numeric,
  extracted_data jsonb NOT NULL,
  field_changes jsonb,
  change_summary text,
  match_method text CHECK (match_method = ANY (ARRAY['exact'::text, 'fuzzy'::text, 'manual'::text, 'unmatched'::text, 'model_not_found'::text])),
  match_details jsonb,
  reviewed_at timestamp without time zone,
  reviewed_by text,
  review_notes text,
  applied_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  applied_by text,
  variant_source text,
  variant_confidence numeric,
  variant_match_details jsonb,
  CONSTRAINT extraction_listing_changes_pkey PRIMARY KEY (id),
  CONSTRAINT extraction_listing_changes_existing_listing_id_fkey FOREIGN KEY (existing_listing_id) REFERENCES public.listings(id),
  CONSTRAINT extraction_listing_changes_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.extraction_sessions(id)
);

CREATE TABLE public.body_type_mapping (
  old_name text NOT NULL,
  new_name text NOT NULL,
  CONSTRAINT body_type_mapping_pkey PRIMARY KEY (old_name),
  CONSTRAINT body_type_mapping_new_name_fkey FOREIGN KEY (new_name) REFERENCES public.body_types(name)
);

CREATE TABLE public.batch_imports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  status text DEFAULT 'pending'::text,
  stats jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  created_by text,
  extraction_method text DEFAULT 'pattern'::text,
  ai_model text,
  ai_tokens_used integer,
  ai_cost numeric,
  applied_at timestamp with time zone,
  CONSTRAINT batch_imports_pkey PRIMARY KEY (id),
  CONSTRAINT batch_imports_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);

CREATE TABLE public.batch_import_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_id uuid,
  action text NOT NULL,
  parsed_data jsonb NOT NULL,
  current_data jsonb,
  changes jsonb,
  confidence_score numeric DEFAULT 1.0,
  status text DEFAULT 'pending'::text,
  line_number integer,
  created_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by text,
  existing_data jsonb,
  CONSTRAINT batch_import_items_pkey PRIMARY KEY (id),
  CONSTRAINT batch_import_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batch_imports(id)
);

CREATE TABLE public.processing_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_id text NOT NULL,
  status text NOT NULL DEFAULT 'queued'::text CHECK (status = ANY (ARRAY['queued'::text, 'processing'::text, 'completed'::text, 'failed'::text])),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  progress_message text,
  current_step text,
  dealer_type text,
  seller_id uuid,
  filename text,
  total_items integer DEFAULT 0,
  processed_items integer DEFAULT 0,
  stats jsonb DEFAULT '{}'::jsonb,
  error_message text,
  ai_spending numeric DEFAULT 0,
  extraction_method text DEFAULT 'pattern'::text,
  ai_model text,
  ai_tokens_used integer DEFAULT 0,
  ai_cost numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT processing_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT processing_jobs_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);

-- 4. CRITICAL VIEW - full_listing_view (from production)
CREATE OR REPLACE VIEW public.full_listing_view AS
 SELECT l.id,
    l.created_at,
    l.seller_id,
    l.make_id,
    l.model_id,
    l.variant,
    l.year,
    l.image,
    l.mileage,
    l.body_type_id,
    l.fuel_type_id,
    l.transmission_id,
    l.horsepower,
    l.kw,
    l.wltp,
    l.consumption_l_100km,
    l.consumption_kwh_100km,
    l.seats,
    l.doors,
    l.co2_emission,
    l.co2_tax_half_year,
    l.description,
    l.drive_type,
    l.updated_at,
    l.extraction_method,
    l.extraction_timestamp,
    l.processed_image_grid,
    l.processed_image_detail,
    l.images,
    l.retail_price,
    l.lease_score,
    l.lease_score_calculated_at,
    l.lease_score_breakdown,
    COALESCE(json_agg(json_build_object('monthly_price', lp.monthly_price, 'first_payment', lp.first_payment, 'period_months', lp.period_months, 'mileage_per_year', lp.mileage_per_year) ORDER BY lp.monthly_price) FILTER (WHERE (lp.listing_id IS NOT NULL)), '[]'::json) AS lease_pricing,
    min(lp.monthly_price) AS monthly_price,
    (array_agg(lp.first_payment ORDER BY lp.monthly_price))[1] AS first_payment,
    (array_agg(lp.period_months ORDER BY lp.monthly_price))[1] AS period_months,
    (array_agg(lp.mileage_per_year ORDER BY lp.monthly_price))[1] AS mileage_per_year,
    s.name AS seller_name,
    s.phone AS seller_phone,
    s.address AS seller_location,
    m.name AS make,
    mo.name AS model,
    bt.name AS body_type,
    ft.name AS fuel_type,
    t.name AS transmission,
    l.id AS listing_id,
    l.status,
    l.dealer_id
   FROM (((((((listings l
     LEFT JOIN lease_pricing lp ON ((l.id = lp.listing_id)))
     LEFT JOIN sellers s ON ((l.seller_id = s.id)))
     LEFT JOIN makes m ON ((l.make_id = m.id)))
     LEFT JOIN models mo ON ((l.model_id = mo.id)))
     LEFT JOIN body_types bt ON ((l.body_type_id = bt.id)))
     LEFT JOIN fuel_types ft ON ((l.fuel_type_id = ft.id)))
     LEFT JOIN transmissions t ON ((l.transmission_id = t.id)))
  GROUP BY l.id, l.created_at, l.seller_id, l.make_id, l.model_id, l.variant, l.year, l.image, l.mileage, l.body_type_id, l.fuel_type_id, l.transmission_id, l.horsepower, l.kw, l.wltp, l.consumption_l_100km, l.consumption_kwh_100km, l.seats, l.doors, l.co2_emission, l.co2_tax_half_year, l.description, l.drive_type, l.updated_at, l.extraction_method, l.extraction_timestamp, l.processed_image_grid, l.processed_image_detail, l.images, l.retail_price, l.lease_score, l.lease_score_calculated_at, l.lease_score_breakdown, s.name, s.phone, s.address, m.name, mo.name, bt.name, ft.name, t.name, l.status, l.dealer_id;

-- 5. Other views
CREATE OR REPLACE VIEW public.extraction_session_summary AS
 SELECT es.id,
    es.session_name,
    es.pdf_url,
    es.seller_id,
    es.status,
    es.extraction_type,
    es.total_extracted,
    es.total_matched,
    es.total_new,
    es.total_updated,
    es.total_unchanged,
    es.total_deleted,
    es.started_at,
    es.completed_at,
    es.processing_time_ms,
    es.ai_provider,
    es.model_version,
    es.tokens_used,
    es.cost_cents,
    es.reviewed_at,
    es.reviewed_by,
    es.applied_at,
    es.applied_by,
    es.created_at,
    es.created_by,
    count(DISTINCT lc.id) AS total_changes,
    count(DISTINCT
        CASE
            WHEN (lc.change_type = 'create'::text) THEN lc.id
            ELSE NULL::uuid
        END) AS creates_count,
    count(DISTINCT
        CASE
            WHEN (lc.change_type = 'update'::text) THEN lc.id
            ELSE NULL::uuid
        END) AS updates_count,
    count(DISTINCT
        CASE
            WHEN (lc.change_type = 'delete'::text) THEN lc.id
            ELSE NULL::uuid
        END) AS deletes_count,
    count(DISTINCT
        CASE
            WHEN (lc.change_status = 'approved'::text) THEN lc.id
            ELSE NULL::uuid
        END) AS approved_count,
    count(DISTINCT
        CASE
            WHEN (lc.change_status = 'rejected'::text) THEN lc.id
            ELSE NULL::uuid
        END) AS rejected_count,
    count(DISTINCT
        CASE
            WHEN (lc.change_status = 'applied'::text) THEN lc.id
            ELSE NULL::uuid
        END) AS applied_count
   FROM (extraction_sessions es
     LEFT JOIN extraction_listing_changes lc ON ((es.id = lc.session_id)))
  GROUP BY es.id;

-- 6. Functions (add all 15 functions here - this is a sample)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Triggers
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON public.sellers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Indexes
CREATE INDEX idx_listings_make_id ON public.listings(make_id);
CREATE INDEX idx_listings_model_id ON public.listings(model_id);
CREATE INDEX idx_listings_seller_id ON public.listings(seller_id);
CREATE INDEX idx_models_make_id ON public.models(make_id);
CREATE INDEX idx_lease_pricing_listing_id ON public.lease_pricing(listing_id);

-- 9. RLS Policies (if using)
-- ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable read access for all users" ON public.listings FOR SELECT USING (true);
-- Add other policies as needed