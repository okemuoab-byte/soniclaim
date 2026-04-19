-- ─────────────────────────────────────────────────────────────────────────────
-- SONICLAIM — Initial Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- Extends Supabase auth.users with role + platform data
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id                UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role              TEXT        NOT NULL CHECK (role IN ('creator', 'brand', 'admin')),
  display_name      TEXT,
  avatar_url        TEXT,
  stripe_account_id TEXT,       -- Stripe Connect account ID (creators only)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'creator'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- SOUNDS
-- The core asset — a registered viral audio clip
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.sounds (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id                  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title                       TEXT        NOT NULL,
  description                 TEXT,
  file_url                    TEXT        NOT NULL,   -- Supabase Storage URL
  file_hash                   TEXT        NOT NULL,   -- SHA-256 fingerprint
  duration_seconds            FLOAT,
  audd_track_id               TEXT,                  -- AudD registration ID
  created_by_date             DATE,                  -- when creator says they made it
  registered_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_available_for_licensing  BOOLEAN     NOT NULL DEFAULT TRUE,
  base_licence_price_gbp      INTEGER,               -- internal anchor, in pence
  monitoring_active           BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sounds_creator_id_idx ON public.sounds(creator_id);
CREATE INDEX sounds_audd_track_id_idx ON public.sounds(audd_track_id) WHERE audd_track_id IS NOT NULL;

CREATE TRIGGER sounds_updated_at
  BEFORE UPDATE ON public.sounds
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- CERTIFICATES
-- Ownership certificate PDF generated at registration
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.certificates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sound_id        UUID        NOT NULL REFERENCES public.sounds(id) ON DELETE CASCADE,
  creator_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  certificate_url TEXT,                -- PDF stored in Supabase Storage
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX certificates_sound_id_idx    ON public.certificates(sound_id);
CREATE INDEX certificates_creator_id_idx  ON public.certificates(creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- USAGES
-- Every detected use of a sound, from AudD monitoring
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.usages (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sound_id                  UUID        NOT NULL REFERENCES public.sounds(id) ON DELETE CASCADE,

  -- Platform data
  platform                  TEXT        NOT NULL CHECK (platform IN ('youtube', 'tiktok', 'instagram')),
  external_url              TEXT        NOT NULL,
  channel_name              TEXT,
  channel_id                TEXT,
  channel_bio               TEXT,
  channel_follower_count    INTEGER,
  account_type              TEXT        CHECK (account_type IN ('personal', 'creator', 'business')),
  is_sponsored              BOOLEAN     NOT NULL DEFAULT FALSE,
  post_caption              TEXT,

  -- AI Classification
  classification            TEXT        CHECK (classification IN ('ORGANIC', 'COMMERCIAL', 'AMBIGUOUS')),
  classification_confidence FLOAT       CHECK (classification_confidence BETWEEN 0.0 AND 1.0),
  classification_reason     TEXT,
  trigger_outreach          BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Outreach status lifecycle
  outreach_status           TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (outreach_status IN (
                              'pending',      -- awaiting classification
                              'organic',      -- classified organic, no action
                              'draft',        -- outreach drafted, awaiting admin review
                              'approved',     -- admin approved, ready to send
                              'sent',         -- outreach email sent to brand
                              'followed_up',  -- follow-up sent after no response
                              'responded',    -- brand has replied
                              'licensed',     -- deal closed
                              'escalated',    -- no response after follow-up, manual handling
                              'dismissed'     -- admin decided not to pursue
                            )),

  detected_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX usages_sound_id_idx         ON public.usages(sound_id);
CREATE INDEX usages_outreach_status_idx  ON public.usages(outreach_status);
CREATE INDEX usages_classification_idx   ON public.usages(classification) WHERE classification IS NOT NULL;

CREATE TRIGGER usages_updated_at
  BEFORE UPDATE ON public.usages
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- OUTREACH_DRAFTS
-- AI-drafted emails awaiting admin review before send
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.outreach_drafts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usage_id    UUID        NOT NULL REFERENCES public.usages(id) ON DELETE CASCADE,
  drafted_by  TEXT        NOT NULL DEFAULT 'ai',  -- 'ai' or admin user id
  subject     TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  reviewed    BOOLEAN     NOT NULL DEFAULT FALSE,
  approved_by UUID        REFERENCES public.profiles(id),
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX outreach_drafts_usage_id_idx  ON public.outreach_drafts(usage_id);
CREATE INDEX outreach_drafts_reviewed_idx  ON public.outreach_drafts(reviewed) WHERE reviewed = FALSE;

CREATE TRIGGER outreach_drafts_updated_at
  BEFORE UPDATE ON public.outreach_drafts
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- LICENCES
-- Completed or in-progress licensing deals
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.licences (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sound_id              UUID        NOT NULL REFERENCES public.sounds(id) ON DELETE RESTRICT,
  brand_id              UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  usage_id              UUID        REFERENCES public.usages(id),  -- null if proactive
  licence_type          TEXT        NOT NULL CHECK (licence_type IN ('content', 'commercial', 'exclusive')),
  price_gbp             INTEGER     NOT NULL,  -- in pence
  stripe_payment_intent TEXT,
  contract_url          TEXT,                  -- signed PDF in Supabase Storage
  status                TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  valid_from            TIMESTAMPTZ,
  valid_until           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX licences_sound_id_idx   ON public.licences(sound_id);
CREATE INDEX licences_brand_id_idx   ON public.licences(brand_id);
CREATE INDEX licences_status_idx     ON public.licences(status);

CREATE TRIGGER licences_updated_at
  BEFORE UPDATE ON public.licences
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE BUCKETS
-- Create the three required buckets
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('sounds',       'sounds',       true,  52428800,  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp4', 'audio/x-m4a']),
  ('certificates', 'certificates', true,  10485760,  ARRAY['application/pdf']),
  ('contracts',    'contracts',    false, 10485760,  ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN HELPER (security definer — bypasses RLS to avoid recursion)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Sounds
ALTER TABLE public.sounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view their own sounds"
  ON public.sounds FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "Creators can insert their own sounds"
  ON public.sounds FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update their own sounds"
  ON public.sounds FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "Brands can view sounds available for licensing"
  ON public.sounds FOR SELECT
  USING (is_available_for_licensing = TRUE);

CREATE POLICY "Admins can view all sounds"
  ON public.sounds FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Certificates
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view their own certificates"
  ON public.certificates FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "Admins can view all certificates"
  ON public.certificates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Usages
ALTER TABLE public.usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view usages of their sounds"
  ON public.usages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.sounds WHERE id = sound_id AND creator_id = auth.uid())
  );

CREATE POLICY "Admins can manage all usages"
  ON public.usages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Outreach drafts (admin only)
ALTER TABLE public.outreach_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage outreach drafts"
  ON public.outreach_drafts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Licences
ALTER TABLE public.licences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands can view their own licences"
  ON public.licences FOR SELECT
  USING (brand_id = auth.uid());

CREATE POLICY "Creators can view licences for their sounds"
  ON public.licences FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.sounds WHERE id = sound_id AND creator_id = auth.uid())
  );

CREATE POLICY "Admins can manage all licences"
  ON public.licences FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- sounds bucket: creators upload their own, service role reads all
CREATE POLICY "Creators can upload sounds"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'sounds' AND auth.uid() IS NOT NULL);

CREATE POLICY "Creators can read their own sounds"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sounds' AND auth.uid() IS NOT NULL);

-- certificates bucket: server can upload, creators can read
CREATE POLICY "Authenticated users can upload certificates"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'certificates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Creators can read their own certificates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certificates' AND auth.uid() IS NOT NULL);

-- contracts bucket: brands and creators can read their own contracts
CREATE POLICY "Authenticated users can read contracts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contracts' AND auth.uid() IS NOT NULL);
