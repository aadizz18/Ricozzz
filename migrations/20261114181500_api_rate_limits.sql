-- ============================================================================
-- RICOZ DISTRIBUTED API RATE LIMITS SCHEMA
-- Migration: 20261114181500_api_rate_limits.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  expire_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_expire ON public.api_rate_limits(key, expire_at);

-- Enable Row-Level Security
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limits_authenticated_access" ON public.api_rate_limits;
CREATE POLICY "rate_limits_authenticated_access" ON public.api_rate_limits
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
