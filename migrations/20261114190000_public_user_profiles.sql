-- ====================================================================
-- RICOZ PUBLIC USER AUTHENTICATION & PROFILES SCHEMA
-- Supports exactly two account types: 'talent' and 'company'
-- Strictly isolates public users from admin_users and admin RBAC.
-- ====================================================================

-- 1. Base User Profile (common authenticated identity linked to auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL CHECK (account_type IN ('talent', 'company')),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Talent Profile (Creative Directors, Brand Specialists)
CREATE TABLE IF NOT EXISTS public.talent_profiles (
  id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  headline TEXT NOT NULL DEFAULT 'Creative Director & Brand Specialist',
  bio TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  years_experience INT NOT NULL DEFAULT 0,
  hourly_rate TEXT NOT NULL DEFAULT '',
  portfolio_url TEXT NOT NULL DEFAULT '',
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  availability TEXT NOT NULL DEFAULT 'Available now',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Company Profile (Enterprise Clients)
CREATE TABLE IF NOT EXISTS public.company_profiles (
  id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  business_email TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'Technology & Innovation',
  company_size TEXT NOT NULL DEFAULT '10-50',
  website_url TEXT NOT NULL DEFAULT '',
  billing_country TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_type ON public.user_profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_talent_profiles_user_id ON public.talent_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_user_id ON public.company_profiles(user_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_talent_profiles_updated_at ON public.talent_profiles;
CREATE TRIGGER trg_talent_profiles_updated_at
  BEFORE UPDATE ON public.talent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_company_profiles_updated_at ON public.company_profiles;
CREATE TRIGGER trg_company_profiles_updated_at
  BEFORE UPDATE ON public.company_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Security Guard: Account Type Immutability (prevents role/privilege escalation)
CREATE OR REPLACE FUNCTION public.guard_account_type_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.account_type IS DISTINCT FROM NEW.account_type THEN
    RAISE EXCEPTION 'Security Violation: Account type cannot be changed once established.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_account_type ON public.user_profiles;
CREATE TRIGGER trg_guard_account_type
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_account_type_immutable();

-- Security Guard: Public User Cannot Create Admin Records
CREATE OR REPLACE FUNCTION public.guard_prevent_admin_creation_from_public()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user attempting to insert into admin_users is not already an active super_admin, reject
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND role = 'super_admin' AND status = 'active'
  ) THEN
    -- Also allow if auth.uid() is null but connection is authenticated by master service role / postgres
    IF current_user NOT IN ('postgres', 'supabase_admin') AND current_setting('request.jwt.claim.role', true) != 'service_role' THEN
      RAISE EXCEPTION 'Security Violation: Public users cannot create administrator accounts.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.talent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profiles FORCE ROW LEVEL SECURITY;

-- Permissions
REVOKE ALL ON TABLE public.user_profiles FROM anon;
REVOKE ALL ON TABLE public.talent_profiles FROM anon;
REVOKE ALL ON TABLE public.company_profiles FROM anon;

GRANT SELECT, INSERT, UPDATE ON TABLE public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.talent_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.company_profiles TO authenticated;

-- Policies for user_profiles
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
CREATE POLICY "user_profiles_select_own" ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_own" ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
CREATE POLICY "user_profiles_update_own" ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Policies for talent_profiles
DROP POLICY IF EXISTS "talent_profiles_select" ON public.talent_profiles;
CREATE POLICY "talent_profiles_select" ON public.talent_profiles
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "talent_profiles_insert_own" ON public.talent_profiles;
CREATE POLICY "talent_profiles_insert_own" ON public.talent_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "talent_profiles_update_own" ON public.talent_profiles;
CREATE POLICY "talent_profiles_update_own" ON public.talent_profiles
  FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Policies for company_profiles
DROP POLICY IF EXISTS "company_profiles_select" ON public.company_profiles;
CREATE POLICY "company_profiles_select" ON public.company_profiles
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "company_profiles_insert_own" ON public.company_profiles;
CREATE POLICY "company_profiles_insert_own" ON public.company_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "company_profiles_update_own" ON public.company_profiles;
CREATE POLICY "company_profiles_update_own" ON public.company_profiles
  FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());
