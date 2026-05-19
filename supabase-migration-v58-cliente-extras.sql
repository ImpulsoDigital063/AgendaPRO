-- ============================================================
-- v58 · Cliente · Configurações + Galeria + Fichas templates
-- ============================================================

-- Configurações do cliente (preferências + status)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS preferred_contact text CHECK (preferred_contact IS NULL OR preferred_contact IN ('whatsapp', 'sms', 'email', 'none')),
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason text;

-- Galeria de fotos do trabalho (antes/depois)
CREATE TABLE IF NOT EXISTS public.customer_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  taken_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_photos_customer ON public.customer_photos(customer_id, taken_at DESC);

-- Templates de fichas (cadastrados em Configurações)
CREATE TABLE IF NOT EXISTS public.client_form_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Respostas (preenchimento do template num cliente específico)
CREATE TABLE IF NOT EXISTS public.client_form_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.client_form_templates(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  filled_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_responses_customer ON public.client_form_responses(customer_id);
CREATE INDEX IF NOT EXISTS idx_form_templates_business ON public.client_form_templates(business_id) WHERE active = true;

-- RLS
ALTER TABLE public.customer_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_form_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_photos_business_access" ON public.customer_photos;
DROP POLICY IF EXISTS "form_templates_business_access" ON public.client_form_templates;
DROP POLICY IF EXISTS "form_responses_business_access" ON public.client_form_responses;

CREATE POLICY "customer_photos_business_access" ON public.customer_photos
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR business_id IN (
      SELECT business_id FROM public.professionals
      WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
    )
  );

CREATE POLICY "form_templates_business_access" ON public.client_form_templates
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR business_id IN (
      SELECT business_id FROM public.professionals
      WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
    )
  );

CREATE POLICY "form_responses_business_access" ON public.client_form_responses
  FOR ALL USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
    OR business_id IN (
      SELECT business_id FROM public.professionals
      WHERE auth_user_id = auth.uid() AND active = true AND is_receptionist = true
    )
  );

-- Storage bucket pra fotos · execute uma vez (no Supabase Storage UI ou via SQL)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('customer-photos', 'customer-photos', true) ON CONFLICT DO NOTHING;
