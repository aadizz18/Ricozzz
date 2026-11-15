-- ============================================================================
-- RICOZ PUBLIC WEBSITE CMS & INQUIRIES SCHEMA MIGRATION
-- Migration: 20261114160000_public_website_cms.sql
-- ============================================================================

-- 1. Website Global Settings (Key-Value configuration for hero stats, banners, contact info)
CREATE TABLE IF NOT EXISTS public.website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Website Content Sections (Homepage, About, Services content blocks)
CREATE TABLE IF NOT EXISTS public.website_content_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT UNIQUE NOT NULL,
  page_slug TEXT NOT NULL DEFAULT 'home',
  title TEXT NOT NULL,
  subtitle TEXT,
  content_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Website FAQs (Dynamic question & answer catalogue)
CREATE TABLE IF NOT EXISTS public.website_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Website Testimonials & Client Endorsements
CREATE TABLE IF NOT EXISTS public.website_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  quote TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  avatar_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Website Contact & Briefing Enquiries
CREATE TABLE IF NOT EXISTS public.website_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  mandate_type TEXT NOT NULL DEFAULT 'Brand Architecture & Rebrand',
  timeline TEXT NOT NULL DEFAULT 'Within 4 weeks',
  project_brief TEXT NOT NULL,
  budget_range TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted', 'converted', 'archived')),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_website_sections_pub ON public.website_content_sections(page_slug, is_published, display_order);
CREATE INDEX IF NOT EXISTS idx_website_faqs_pub ON public.website_faqs(category, is_published, display_order);
CREATE INDEX IF NOT EXISTS idx_website_testimonials_pub ON public.website_testimonials(is_published, is_featured, display_order);
CREATE INDEX IF NOT EXISTS idx_website_enquiries_status ON public.website_enquiries(status, created_at DESC);

-- Enable Row-Level Security
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_content_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_enquiries ENABLE ROW LEVEL SECURITY;

-- Anonymous public read policies (Only published items visible)
DROP POLICY IF EXISTS "public_sections_read" ON public.website_content_sections;
CREATE POLICY "public_sections_read" ON public.website_content_sections FOR SELECT TO anon USING (is_published = TRUE);

DROP POLICY IF EXISTS "public_faqs_read" ON public.website_faqs;
CREATE POLICY "public_faqs_read" ON public.website_faqs FOR SELECT TO anon USING (is_published = TRUE);

DROP POLICY IF EXISTS "public_testimonials_read" ON public.website_testimonials;
CREATE POLICY "public_testimonials_read" ON public.website_testimonials FOR SELECT TO anon USING (is_published = TRUE);

DROP POLICY IF EXISTS "public_settings_read" ON public.website_settings;
CREATE POLICY "public_settings_read" ON public.website_settings FOR SELECT TO anon USING (TRUE);

-- Anonymous public enquiry submission policy
DROP POLICY IF EXISTS "public_enquiry_insert" ON public.website_enquiries;
CREATE POLICY "public_enquiry_insert" ON public.website_enquiries FOR INSERT TO anon WITH CHECK (TRUE);

-- Authenticated Admin Policies (Full access for staff)
DROP POLICY IF EXISTS "admin_sections_all" ON public.website_content_sections;
CREATE POLICY "admin_sections_all" ON public.website_content_sections FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_faqs_all" ON public.website_faqs;
CREATE POLICY "admin_faqs_all" ON public.website_faqs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_testimonials_all" ON public.website_testimonials;
CREATE POLICY "admin_testimonials_all" ON public.website_testimonials FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_settings_all" ON public.website_settings;
CREATE POLICY "admin_settings_all" ON public.website_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_enquiries_all" ON public.website_enquiries;
CREATE POLICY "admin_enquiries_all" ON public.website_enquiries FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Register Permissions in admin_permissions
INSERT INTO public.admin_permissions (id, slug, name, description, module, action, created_at)
VALUES 
  (gen_random_uuid(), 'website.view', 'View Website Content & Enquiries', 'Read access to public website CMS and incoming client inquiries.', 'website', 'view', NOW()),
  (gen_random_uuid(), 'website.edit', 'Edit Website Content & Enquiries', 'Modify public website content, settings, and update inquiry statuses.', 'website', 'edit', NOW()),
  (gen_random_uuid(), 'website.publish', 'Publish Website Content', 'Publish or unpublish public website content and testimonials.', 'website', 'publish', NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Grant permissions to Super Admin and Ops Admin roles
INSERT INTO public.admin_role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.slug IN ('super_admin', 'ops_admin', 'marketing_manager', 'exec_director')
  AND p.slug IN ('website.view', 'website.edit', 'website.publish')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Seed Initial Content: Website Global Settings
INSERT INTO public.website_settings (key, value, description, updated_at)
VALUES 
  ('hero_metrics', '{"talentCount": 57, "disciplinesCount": 19, "matchRate": "98%", "satisfactionRate": "99.4%"}'::jsonb, 'Homepage hero statistics and badge numbers', NOW()),
  ('announcement_banner', '{"enabled": false, "text": "Q4 Enterprise Mandate Window Open", "link": "/start-project"}'::jsonb, 'Global announcement banner', NOW()),
  ('contact_info', '{"email": "concierge@ricoz.io", "phone": "+1 (800) 742-6900", "address": "RICOZ Global Operations, New York & London"}'::jsonb, 'Public company contact info', NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value;

-- Seed Initial Content: Homepage Content Sections
INSERT INTO public.website_content_sections (section_key, page_slug, title, subtitle, content_payload, is_published, display_order)
VALUES 
  (
    'hero_section',
    'home',
    'Great Projects Start With The Right Creative Talent.',
    'CURATED CREATIVE TALENT NETWORK',
    '{
      "eyebrow": "CURATED CREATIVE TALENT NETWORK",
      "headline": "Great Projects Start With The Right Creative Talent.",
      "headlineAccent": "Right Creative Talent.",
      "description": "RICOZ connects visionary enterprises with curated Creative Directors, Brand Architects, and Specialized Design Teams for transformational brand and product mandates.",
      "primaryCtaText": "Explore Talent",
      "secondaryCtaText": "Start a Project",
      "pillars": ["Curated Studio Principals", "Project-Based Matching", "19 Creative Disciplines"]
    }'::jsonb,
    TRUE,
    1
  ),
  (
    'brand_artifacts',
    'home',
    'Production Artifacts Shipped Across Mandates',
    'AUTHENTIC BRAND ARTIFACTS',
    '{
      "description": "We prioritize demonstrable craftsmanship over unverified corporate logos. Every engagement yields rigorous, documented deliverables built for enterprise scale.",
      "artifacts": [
        {
          "title": "Visual Identity Systems",
          "category": "BRAND ARCHITECTURE",
          "description": "Scalable vector logotypes, adaptive symbol marks, responsive lockups, and geometric grid systems.",
          "specimen": "Aa",
          "tokens": ["Primary Mark", "Clearspace Matrix", "Dark/Light Modes"]
        },
        {
          "title": "Design Token Architectures",
          "category": "SYSTEMS & ENGINEERING",
          "description": "Production Figma variables, semantic color hierarchies, spatial typography ramps, and CSS tokens.",
          "specimen": "{}",
          "tokens": ["Semantic Scales", "CSS Variables", "Cross-Platform Sync"]
        },
        {
          "title": "Bespoke Typography Specimens",
          "category": "EDITORIAL CRAFT",
          "description": "Custom editorial type pairings, hierarchy matrices, micro-typography standards, and multilingual rules.",
          "specimen": "Ag",
          "tokens": ["Display Serifs", "Monospace Numerals", "Leading Geometry"]
        },
        {
          "title": "Structural Packaging Suites",
          "category": "PHYSICAL & TACTILE",
          "description": "Custom dielines, sustainable material palettes, blind letterpress finishes, and tactile finishes.",
          "specimen": "3D",
          "tokens": ["Dieline Precision", "Unboxing Logic", "Pantone Standards"]
        },
        {
          "title": "Executive Strategic Playbooks",
          "category": "STRATEGIC POSITIONING",
          "description": "Category-defining narrative frameworks, pre-IPO market positioning, and verbal brand playbooks.",
          "specimen": "Rx",
          "tokens": ["Verbal Identity", "Audience Matrix", "Market Narrative"]
        }
      ]
    }'::jsonb,
    TRUE,
    2
  )
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  content_payload = EXCLUDED.content_payload;

-- Seed Initial Content: FAQs
INSERT INTO public.website_faqs (slug, category, question, answer, is_published, display_order)
VALUES 
  (
    'what-is-ricoz',
    'general',
    'What is RICOZ?',
    'RICOZ is a curated creative services platform designed to help visionary businesses discover, evaluate, and connect directly with senior creative talent for project mandates.',
    TRUE,
    1
  ),
  (
    'talent-types',
    'general',
    'What type of creative talent can I find on RICOZ?',
    'RICOZ supports senior creative specialists across 19 critical disciplines, including Creative Directors, Brand Strategists, Brand Identity Designers, UI/UX Architects, Packaging Designers, Motion Designers, and Typography Specialists.',
    TRUE,
    2
  ),
  (
    'how-matching-works',
    'matching',
    'How does RICOZ help me find talent?',
    'You can explore relevant profiles, review their documented case studies, and use multi-dimensional matching based on industry background, aesthetic craft, and enterprise scale to build a focused shortlist.',
    TRUE,
    3
  ),
  (
    'start-project',
    'engagement',
    'How do I start a project?',
    'Start by sharing your project requirements through the RICOZ onboarding flow or scoping estimator. From there, you can review matching specialists and proceed through structured milestone sprints.',
    TRUE,
    4
  ),
  (
    'shortlisting-squads',
    'engagement',
    'Can I shortlist multiple creative professionals?',
    'Yes. The platform''s shortlist workflow allows you to organize multiple specialists, compare portfolios side-by-side, and assemble multidisciplinary creative pods before kickoff.',
    TRUE,
    5
  ),
  (
    'business-suitability',
    'suitability',
    'Is RICOZ suitable for businesses and startups?',
    'Yes. RICOZ is designed for high-growth venture-backed startups, scale-ups, and enterprise marketing teams requiring senior creative expertise for high-stakes rebrands, product launches, or digital design systems.',
    TRUE,
    6
  )
ON CONFLICT (slug) DO UPDATE SET
  question = EXCLUDED.question,
  answer = EXCLUDED.answer;

-- Seed Initial Content: Testimonials
INSERT INTO public.website_testimonials (client_name, company, role, quote, rating, is_featured, is_published, display_order)
VALUES 
  (
    'Marcus Vance',
    'Vantage Robotics (Series B)',
    'Chief Technology Officer',
    'RICOZ matched us with a Pentagram-caliber Creative Director within 48 hours. The brand architecture and bespoke typography they created became the foundation for our entire $45M international expansion.',
    5,
    TRUE,
    TRUE,
    1
  ),
  (
    'Claire DeWitt',
    'Aethelgard Private Equity',
    'Managing Director, Brand Portfolio',
    'Traditional branding agencies quoted us 9-month timelines with heavy overhead. Through RICOZ, we engaged a senior brand identity squad that delivered four portfolio rebrands in a single quarter.',
    5,
    TRUE,
    TRUE,
    2
  ),
  (
    'Julian Thorne',
    'Solaria BioSciences',
    'Head of Global Communications',
    'The transparency and depth of portfolio case studies on RICOZ is unparalleled. We avoided the usual junior staffing bait-and-switch and worked directly with a true design principal.',
    5,
    TRUE,
    TRUE,
    3
  )
ON CONFLICT DO NOTHING;
