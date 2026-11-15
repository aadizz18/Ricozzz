-- ====================================================================
-- RICOZ PLATFORM CORE WORKSPACE SCHEMA
-- Migration: 20261116000000_platform_core_schema.sql
-- 
-- Defines tables supporting the Talent and Company interactive workspaces:
-- 1. client_projects: Company-created rebranding briefs and mandates
-- 2. project_applications: Talent proposals/applications to project briefs
-- 3. conversations: Direct message threads between companies and talent
-- 4. messages: Individual chat messages within conversations
-- 5. user_shortlists: Company bookmarks/shortlists of talent candidates
-- ====================================================================

-- 1. Client Projects Table
CREATE TABLE IF NOT EXISTS public.client_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'Technology',
  status TEXT NOT NULL DEFAULT 'Discovery' CHECK (status IN ('Discovery', 'Matching', 'Proposal', 'Active', 'Completed', 'Archived')),
  timeline TEXT NOT NULL DEFAULT '8-10 weeks',
  start_date TEXT NOT NULL DEFAULT 'Within 2 weeks',
  budget_range TEXT NOT NULL DEFAULT '$60,000 - $90,000',
  budget_tier TEXT NOT NULL DEFAULT '$$$$',
  rebranding_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_audience TEXT NOT NULL DEFAULT '',
  brand_personality JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_services JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_styles JSONB NOT NULL DEFAULT '[]'::jsonb,
  availability_requirement TEXT NOT NULL DEFAULT 'Immediate',
  project_brief TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Project Applications Table
CREATE TABLE IF NOT EXISTS public.project_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  talent_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  pitch TEXT NOT NULL,
  proposed_rate TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_project_application UNIQUE (project_id, talent_user_id)
);

-- 3. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  participant_b UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.client_projects(id) ON DELETE SET NULL,
  last_message_text TEXT NOT NULL DEFAULT '',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_different_participants CHECK (participant_a != participant_b)
);

-- 4. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. User Shortlists Table
CREATE TABLE IF NOT EXISTS public.user_shortlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  talent_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_shortlist UNIQUE (user_id, talent_profile_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_projects_company ON public.client_projects(company_user_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_status ON public.client_projects(status);
CREATE INDEX IF NOT EXISTS idx_project_applications_project ON public.project_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_project_applications_talent ON public.project_applications(talent_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations(participant_a, participant_b);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_user_shortlists_user ON public.user_shortlists(user_id);

-- Row-Level Security (RLS)
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shortlists ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON TABLE public.client_projects TO authenticated;
GRANT ALL ON TABLE public.project_applications TO authenticated;
GRANT ALL ON TABLE public.conversations TO authenticated;
GRANT ALL ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.user_shortlists TO authenticated;

-- Policies for client_projects
DROP POLICY IF EXISTS client_projects_select_own ON public.client_projects;
CREATE POLICY client_projects_select_own ON public.client_projects
  FOR SELECT
  USING (company_user_id = auth.uid() OR status IN ('Matching', 'Active', 'Discovery') OR public.is_admin());

DROP POLICY IF EXISTS client_projects_modify_own ON public.client_projects;
CREATE POLICY client_projects_modify_own ON public.client_projects
  FOR ALL
  USING (company_user_id = auth.uid() OR public.is_admin())
  WITH CHECK (company_user_id = auth.uid() OR public.is_admin());

-- Policies for project_applications
DROP POLICY IF EXISTS project_applications_select ON public.project_applications;
CREATE POLICY project_applications_select ON public.project_applications
  FOR SELECT
  USING (talent_user_id = auth.uid() OR project_id IN (SELECT id FROM public.client_projects WHERE company_user_id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS project_applications_insert ON public.project_applications;
CREATE POLICY project_applications_insert ON public.project_applications
  FOR INSERT
  WITH CHECK (talent_user_id = auth.uid() OR public.is_admin());

-- Policies for conversations
DROP POLICY IF EXISTS conversations_access ON public.conversations;
CREATE POLICY conversations_access ON public.conversations
  FOR ALL
  USING (participant_a = auth.uid() OR participant_b = auth.uid() OR public.is_admin())
  WITH CHECK (participant_a = auth.uid() OR participant_b = auth.uid() OR public.is_admin());

-- Policies for messages
DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages
  FOR SELECT
  USING (conversation_id IN (SELECT id FROM public.conversations WHERE participant_a = auth.uid() OR participant_b = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages
  FOR INSERT
  WITH CHECK (sender_id = auth.uid() OR public.is_admin());

-- Policies for user_shortlists
DROP POLICY IF EXISTS user_shortlists_own ON public.user_shortlists;
CREATE POLICY user_shortlists_own ON public.user_shortlists
  FOR ALL
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
