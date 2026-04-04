BEGIN;

-- =====================================================================================
-- 0. EXTENSIONS
-- =====================================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================================
-- 1. ENUM CREATION & MODIFICATION
-- =====================================================================================

-- 1a. New enum: challenge_status
DO $$ BEGIN
  CREATE TYPE challenge_status AS ENUM (
    'draft','scheduled','active','submission_closed','published','closed','upcoming'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1b. New enum: activity_measurement_type
DO $$ BEGIN
  CREATE TYPE activity_measurement_type AS ENUM (
    'duration','distance','hole','steps','none'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1c. New enum: message_type
DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('chat','announcement','system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1d. New enum: message_visibility
DO $$ BEGIN
  CREATE TYPE message_visibility AS ENUM ('all','captains_only');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1e. Add new values to effort_status
DO $$ BEGIN
  ALTER TYPE effort_status ADD VALUE IF NOT EXISTS 'rejected_resubmit';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE effort_status ADD VALUE IF NOT EXISTS 'rejected_permanent';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1f. Add 'challenge_creation' to payment_purpose
DO $$ BEGIN
  ALTER TYPE payment_purpose ADD VALUE IF NOT EXISTS 'challenge_creation';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================================
-- 2. TRIGGER FUNCTIONS (create/replace — safe to re-run)
-- =====================================================================================

CREATE OR REPLACE FUNCTION update_modified_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modified_date = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_duration_days()
RETURNS TRIGGER AS $$
BEGIN
  NEW.duration_days = (NEW.end_date - NEW.start_date) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_league_participant_count()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.leaguemembers
  WHERE league_id = COALESCE(NEW.league_id, OLD.league_id);
  UPDATE public.leagues
  SET actual_participants = current_count
  WHERE league_id = COALESCE(NEW.league_id, OLD.league_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_rest_day_donations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- 3. NEW TABLES
-- =====================================================================================

-- 3a. challengepricing
CREATE TABLE IF NOT EXISTS public.challengepricing (
  pricing_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  per_day_rate numeric NOT NULL CHECK (per_day_rate >= 0),
  admin_markup numeric CHECK (admin_markup IS NULL OR admin_markup >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  modified_at timestamptz NOT NULL DEFAULT now(),
  tax numeric NOT NULL DEFAULT 18
);
CREATE INDEX IF NOT EXISTS idx_challengepricing_created_at ON public.challengepricing(created_at);

-- 3b. league_tiers
CREATE TABLE IF NOT EXISTS public.league_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_name text,
  description text,
  max_days integer,
  max_participants integer,
  pricing_id uuid REFERENCES public.pricing(id) ON DELETE RESTRICT,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  features jsonb,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_league_tiers_active ON public.league_tiers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_league_tiers_display_order ON public.league_tiers(display_order);
CREATE INDEX IF NOT EXISTS idx_league_tiers_pricing ON public.league_tiers(pricing_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_league_tiers_name_lower ON public.league_tiers(LOWER(name));

-- 3c. activity_categories
CREATE TABLE IF NOT EXISTS public.activity_categories (
  category_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_categories_name ON public.activity_categories(category_name);
CREATE INDEX IF NOT EXISTS idx_activity_categories_order ON public.activity_categories(display_order);

-- 3d. custom_activities
CREATE TABLE IF NOT EXISTS public.custom_activities (
  custom_activity_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_name varchar NOT NULL,
  description text,
  category_id uuid REFERENCES public.activity_categories(category_id) ON DELETE SET NULL,
  measurement_type activity_measurement_type DEFAULT 'duration' NOT NULL,
  requires_proof boolean DEFAULT true,
  requires_notes boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_custom_activity_per_user UNIQUE (created_by, activity_name)
);
CREATE INDEX IF NOT EXISTS idx_custom_activities_creator ON public.custom_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_activities_active ON public.custom_activities(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_custom_activities_name ON public.custom_activities(activity_name);
CREATE INDEX IF NOT EXISTS idx_custom_activities_category ON public.custom_activities(category_id);

-- 3e. challenge_subteams
CREATE TABLE IF NOT EXISTS public.challenge_subteams (
  subteam_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_challenge_id uuid NOT NULL REFERENCES public.leagueschallenges(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
  name varchar NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_challenge_subteams_challenge ON public.challenge_subteams(league_challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_subteams_team ON public.challenge_subteams(team_id);

-- 3f. challenge_subteam_members
CREATE TABLE IF NOT EXISTS public.challenge_subteam_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subteam_id uuid NOT NULL REFERENCES public.challenge_subteams(subteam_id) ON DELETE CASCADE,
  league_member_id uuid NOT NULL REFERENCES public.leaguemembers(league_member_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_challenge_subteam_members_subteam ON public.challenge_subteam_members(subteam_id);
CREATE INDEX IF NOT EXISTS idx_challenge_subteam_members_member ON public.challenge_subteam_members(league_member_id);

-- 3g. challenge_submissions
CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_challenge_id uuid NOT NULL REFERENCES public.leagueschallenges(id) ON DELETE CASCADE,
  league_member_id uuid NOT NULL REFERENCES public.leaguemembers(league_member_id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(team_id) ON DELETE SET NULL,
  sub_team_id uuid REFERENCES public.challenge_subteams(subteam_id) ON DELETE SET NULL,
  proof_url varchar NOT NULL,
  status varchar NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  awarded_points numeric,
  reviewed_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_challenge ON public.challenge_submissions(league_challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_member ON public.challenge_submissions(league_member_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_status ON public.challenge_submissions(status);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_team ON public.challenge_submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_subteam ON public.challenge_submissions(sub_team_id);

-- 3h. messages
CREATE TABLE IF NOT EXISTS public.messages (
  message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(team_id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type message_type DEFAULT 'chat',
  visibility message_visibility DEFAULT 'all',
  is_important boolean DEFAULT false,
  parent_message_id uuid REFERENCES public.messages(message_id) ON DELETE SET NULL,
  deep_link text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  edited_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT messages_content_not_empty CHECK (char_length(content) > 0)
);
CREATE INDEX IF NOT EXISTS idx_messages_league_team_created ON public.messages(league_id, team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_broadcasts ON public.messages(league_id, created_at DESC) WHERE team_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_visibility ON public.messages(visibility);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- 3i. message_read_receipts
CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(message_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_message_user_read UNIQUE (message_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_read_receipts_user ON public.message_read_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON public.message_read_receipts(message_id);

-- 3j. canned_messages
CREATE TABLE IF NOT EXISTS public.canned_messages (
  canned_message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  role_target varchar NOT NULL CHECK (role_target IN ('host','governor','captain')),
  title varchar NOT NULL,
  content text NOT NULL,
  is_system boolean DEFAULT false,
  category text DEFAULT 'general',
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_canned_messages_league ON public.canned_messages(league_id);
CREATE INDEX IF NOT EXISTS idx_canned_messages_role ON public.canned_messages(role_target);
CREATE INDEX IF NOT EXISTS idx_canned_messages_system ON public.canned_messages(is_system) WHERE is_system = true;

-- 3k. message_reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  reaction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(message_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  emoji varchar(10) NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_reaction_per_user UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_reactions_message ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON public.message_reactions(user_id);

-- 3l. tour_steps
CREATE TABLE IF NOT EXISTS public.tour_steps (
  step_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar NOT NULL,
  description text NOT NULL,
  icon_name varchar DEFAULT 'Activity',
  icon_color varchar DEFAULT 'text-blue-500',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tour_steps_order ON public.tour_steps(sort_order);

-- 3m. ai_coach_messages
CREATE TABLE IF NOT EXISTS public.ai_coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(team_id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(user_id) ON DELETE CASCADE,
  message_type varchar(30) NOT NULL CHECK (message_type IN ('individual','team','captain','bonding','challenge')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_coach_league ON public.ai_coach_messages(league_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_coach_user ON public.ai_coach_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_coach_team ON public.ai_coach_messages(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_coach_type ON public.ai_coach_messages(message_type);

-- 3n. ai_coach_chats
CREATE TABLE IF NOT EXISTS public.ai_coach_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  role varchar(10) NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_chat_user_league ON public.ai_coach_chats(user_id, league_id, created_at DESC);

-- 3o. ai_host_digest
CREATE TABLE IF NOT EXISTS public.ai_host_digest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  priority int NOT NULL DEFAULT 5,
  metadata jsonb DEFAULT '{}',
  action_type text,
  action_payload jsonb,
  status text NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_host_digest_league_date ON public.ai_host_digest(league_id, date);

-- 3p. ai_message_drafts
CREATE TABLE IF NOT EXISTS public.ai_message_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  host_user_id uuid NOT NULL REFERENCES public.users(user_id),
  type text NOT NULL CHECK (type IN ('nudge','team_nudge','announcement','intervention','challenge_hype','challenge_results')),
  target_scope text NOT NULL CHECK (target_scope IN ('league','team','individual')),
  target_id uuid,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','edited','sent','dismissed')),
  context_data jsonb DEFAULT '{}',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_league ON public.ai_message_drafts(league_id, status);

-- 3q. ai_interventions
CREATE TABLE IF NOT EXISTS public.ai_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  member_user_id uuid NOT NULL REFERENCES public.users(user_id),
  team_id uuid REFERENCES public.teams(team_id),
  trigger_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  title text NOT NULL,
  description text NOT NULL,
  suggested_action text,
  player_context jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','acted','dismissed','resolved')),
  draft_id uuid REFERENCES public.ai_message_drafts(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_interventions_league ON public.ai_interventions(league_id, date);
CREATE INDEX IF NOT EXISTS idx_ai_interventions_member ON public.ai_interventions(member_user_id);

-- 3r. challenge_templates
CREATE TABLE IF NOT EXISTS public.challenge_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  default_duration int NOT NULL DEFAULT 7,
  comm_schedule jsonb DEFAULT '[]',
  rules jsonb DEFAULT '[]'::jsonb,
  scoring_logic jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3s. challenge_comm_schedule
CREATE TABLE IF NOT EXISTS public.challenge_comm_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.leagueschallenges(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.challenge_templates(id),
  scheduled_date date NOT NULL,
  draft_type text NOT NULL,
  prompt_hint text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generated','skipped')),
  draft_id uuid REFERENCES public.ai_message_drafts(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_challenge_comm_league ON public.challenge_comm_schedule(league_id, scheduled_date);

-- 3t. ai_usage_logs
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature text NOT NULL,
  league_id uuid REFERENCES public.leagues(league_id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  model text NOT NULL,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(10,6) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_league ON public.ai_usage_logs(league_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature ON public.ai_usage_logs(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON public.ai_usage_logs(created_at);

-- 3u. rest_day_donations
CREATE TABLE IF NOT EXISTS public.rest_day_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  donor_member_id uuid NOT NULL REFERENCES public.leaguemembers(league_member_id) ON DELETE CASCADE,
  receiver_member_id uuid NOT NULL REFERENCES public.leaguemembers(league_member_id) ON DELETE CASCADE,
  days_transferred integer NOT NULL CHECK (days_transferred > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','captain_approved','approved','rejected')),
  proof_url text,
  notes text,
  captain_approved_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  captain_approved_at timestamptz,
  final_approved_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  final_approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rest_day_donations_league ON public.rest_day_donations(league_id);
CREATE INDEX IF NOT EXISTS idx_rest_day_donations_donor ON public.rest_day_donations(donor_member_id);
CREATE INDEX IF NOT EXISTS idx_rest_day_donations_receiver ON public.rest_day_donations(receiver_member_id);
CREATE INDEX IF NOT EXISTS idx_rest_day_donations_status ON public.rest_day_donations(status);

-- 3v. challenge_tournament_matches
CREATE TABLE IF NOT EXISTS public.challenge_tournament_matches (
  match_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_challenge_id uuid NOT NULL REFERENCES public.leagueschallenges(id) ON DELETE CASCADE,
  round_number integer DEFAULT 0,
  round_name text,
  group_id text,
  team1_id uuid REFERENCES public.teams(team_id) ON DELETE SET NULL,
  team2_id uuid REFERENCES public.teams(team_id) ON DELETE SET NULL,
  score1 integer DEFAULT 0,
  score2 integer DEFAULT 0,
  winner_id uuid REFERENCES public.teams(team_id) ON DELETE SET NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','completed','cancelled')),
  start_time timestamptz,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ct_matches_challenge ON public.challenge_tournament_matches(league_challenge_id);
CREATE INDEX IF NOT EXISTS idx_ct_matches_teams ON public.challenge_tournament_matches(team1_id, team2_id);
CREATE INDEX IF NOT EXISTS idx_ct_matches_round ON public.challenge_tournament_matches(league_challenge_id, round_number);

-- =====================================================================================
-- 4. ADD COLUMNS TO EXISTING TABLES
-- =====================================================================================

-- 4a. users: profile_picture_url
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_picture_url text;

-- 4b. pricing: new columns for dynamic pricing model
ALTER TABLE public.pricing ADD COLUMN IF NOT EXISTS tier_name text;
ALTER TABLE public.pricing ADD COLUMN IF NOT EXISTS pricing_type text;
ALTER TABLE public.pricing ADD COLUMN IF NOT EXISTS fixed_price numeric;
ALTER TABLE public.pricing ADD COLUMN IF NOT EXISTS base_fee numeric;
ALTER TABLE public.pricing ADD COLUMN IF NOT EXISTS per_day_rate numeric;
ALTER TABLE public.pricing ADD COLUMN IF NOT EXISTS per_participant_rate numeric;
ALTER TABLE public.pricing ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}';
-- Note: v2.0 has base_price, platform_fee columns; v2.5 complete_schema replaces them
-- with the above. We keep old columns intact to avoid data loss.

-- Add check constraints safely (ignore if they already exist)
DO $$ BEGIN
  ALTER TABLE public.pricing ADD CONSTRAINT pricing_fixed_price_check CHECK (fixed_price IS NULL OR fixed_price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.pricing ADD CONSTRAINT pricing_base_fee_check CHECK (base_fee IS NULL OR base_fee >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.pricing ADD CONSTRAINT pricing_per_day_rate_check CHECK (per_day_rate IS NULL OR per_day_rate >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.pricing ADD CONSTRAINT pricing_per_participant_rate_check CHECK (per_participant_rate IS NULL OR per_participant_rate >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.pricing ADD CONSTRAINT pricing_pricing_type_check CHECK (pricing_type IN ('fixed','dynamic'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_pricing_type ON public.pricing(pricing_type);
CREATE INDEX IF NOT EXISTS idx_pricing_tier_name ON public.pricing(tier_name);

-- 4c. leagues: many new columns
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS rules_summary varchar(250);
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS rules_doc_url text;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS max_team_capacity integer DEFAULT 10;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS auto_rest_day_enabled boolean DEFAULT false;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS normalize_points_by_team_size boolean DEFAULT false;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS tier_id uuid;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS tier_snapshot jsonb;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS duration_days integer;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS actual_participants integer;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS price_paid numeric;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS rr_config jsonb DEFAULT '{"formula":"standard"}'::jsonb;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS branding jsonb DEFAULT NULL;

-- Add FK for tier_id (safe: ignore if exists)
DO $$ BEGIN
  ALTER TABLE public.leagues
    ADD CONSTRAINT leagues_tier_id_fkey
    FOREIGN KEY (tier_id) REFERENCES public.league_tiers(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add check constraints for new columns
DO $$ BEGIN
  ALTER TABLE public.leagues ADD CONSTRAINT leagues_max_team_capacity_positive CHECK (max_team_capacity > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.leagues ADD CONSTRAINT leagues_payment_status_check CHECK (payment_status IN ('pending','completed','failed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update status CHECK constraint to include new statuses
-- v2.0 has: 'draft','launched','active','completed'
-- v2.5 needs: 'scheduled','active','ended','completed','cancelled','abandoned'
-- We need to drop the old and add the new (supports both old and new values for safety)
ALTER TABLE public.leagues DROP CONSTRAINT IF EXISTS leagues_status_check;
DO $$ BEGIN
  ALTER TABLE public.leagues ADD CONSTRAINT leagues_status_check
    CHECK (status IN ('draft','launched','scheduled','active','ended','completed','cancelled','abandoned'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4d. activities: new columns
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS category_id uuid;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS measurement_type activity_measurement_type DEFAULT 'duration';
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT NULL;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS admin_info text DEFAULT NULL;

-- Add FK for category_id
DO $$ BEGIN
  ALTER TABLE public.activities
    ADD CONSTRAINT activities_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.activity_categories(category_id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_activities_category ON public.activities(category_id);

-- 4e. leagueactivities: many new columns
ALTER TABLE public.leagueactivities ADD COLUMN IF NOT EXISTS custom_activity_id uuid;
ALTER TABLE public.leagueactivities ADD COLUMN IF NOT EXISTS min_value numeric;
ALTER TABLE public.leagueactivities ADD COLUMN IF NOT EXISTS frequency integer DEFAULT NULL;
ALTER TABLE public.leagueactivities ADD COLUMN IF NOT EXISTS frequency_type text DEFAULT 'weekly';
ALTER TABLE public.leagueactivities ADD COLUMN IF NOT EXISTS age_group_overrides jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.leagueactivities ADD COLUMN IF NOT EXISTS modified_by uuid;
ALTER TABLE public.leagueactivities ADD COLUMN IF NOT EXISTS modified_date timestamptz DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.leagueactivities ADD COLUMN IF NOT EXISTS proof_requirement text DEFAULT 'mandatory';
ALTER TABLE public.leagueactivities ADD COLUMN IF NOT EXISTS notes_requirement text DEFAULT 'optional';
ALTER TABLE public.leagueactivities ADD COLUMN IF NOT EXISTS points_per_session numeric DEFAULT 1;
ALTER TABLE public.leagueactivities ADD COLUMN IF NOT EXISTS outcome_config jsonb DEFAULT NULL;
ALTER TABLE public.leagueactivities ADD COLUMN IF NOT EXISTS max_images integer DEFAULT 1;
ALTER TABLE public.leagueactivities ADD COLUMN IF NOT EXISTS custom_field_label text DEFAULT NULL;

-- Make activity_id nullable (v2.0 has it NOT NULL, v2.5 allows NULL when custom_activity_id is set)
-- This is safe: it loosens the constraint, doesn't lose data
ALTER TABLE public.leagueactivities ALTER COLUMN activity_id DROP NOT NULL;

-- Add FK for custom_activity_id
DO $$ BEGIN
  ALTER TABLE public.leagueactivities
    ADD CONSTRAINT leagueactivities_custom_activity_id_fkey
    FOREIGN KEY (custom_activity_id) REFERENCES public.custom_activities(custom_activity_id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add FK for modified_by
DO $$ BEGIN
  ALTER TABLE public.leagueactivities
    ADD CONSTRAINT leagueactivities_modified_by_fkey
    FOREIGN KEY (modified_by) REFERENCES public.users(user_id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add XOR check constraint (activity_id OR custom_activity_id, not both)
DO $$ BEGIN
  ALTER TABLE public.leagueactivities ADD CONSTRAINT check_activity_xor_custom CHECK (
    (activity_id IS NOT NULL AND custom_activity_id IS NULL) OR
    (activity_id IS NULL AND custom_activity_id IS NOT NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Frequency constraints (v2.5 with daily support)
ALTER TABLE public.leagueactivities DROP CONSTRAINT IF EXISTS leagueactivities_frequency_type_check;
DO $$ BEGIN
  ALTER TABLE public.leagueactivities ADD CONSTRAINT leagueactivities_frequency_type_check
    CHECK (frequency_type IN ('daily','weekly','monthly'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.leagueactivities DROP CONSTRAINT IF EXISTS leagueactivities_frequency_range;
DO $$ BEGIN
  ALTER TABLE public.leagueactivities ADD CONSTRAINT leagueactivities_frequency_range
    CHECK (frequency IS NULL OR (frequency >= 1 AND frequency <= 28));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add min_value check
DO $$ BEGIN
  ALTER TABLE public.leagueactivities ADD CONSTRAINT leagueactivities_min_value_check CHECK (min_value IS NULL OR min_value > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_leagueactivities_activity ON public.leagueactivities(activity_id);
CREATE INDEX IF NOT EXISTS idx_leagueactivities_custom ON public.leagueactivities(custom_activity_id);
CREATE INDEX IF NOT EXISTS idx_leagueactivities_age_overrides ON public.leagueactivities USING gin(age_group_overrides);

-- Unique partial indexes for league+activity and league+custom_activity
CREATE UNIQUE INDEX IF NOT EXISTS idx_league_activity_unique
  ON public.leagueactivities(league_id, activity_id)
  WHERE activity_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_league_custom_activity_unique
  ON public.leagueactivities(league_id, custom_activity_id)
  WHERE custom_activity_id IS NOT NULL;

-- Remove old unique constraint (v2.0 had UNIQUE(league_id, activity_id) as table constraint)
ALTER TABLE public.leagueactivities DROP CONSTRAINT IF EXISTS unique_league_activity;

-- 4f. teamleagues: logo_url
ALTER TABLE public.teamleagues ADD COLUMN IF NOT EXISTS logo_url text;
-- Replace old unique constraint with unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_league_name ON public.teamleagues(team_id, league_id);

-- 4g. effortentry: new columns
ALTER TABLE public.effortentry ADD COLUMN IF NOT EXISTS reupload_of uuid;
ALTER TABLE public.effortentry ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.effortentry ADD COLUMN IF NOT EXISTS outcome text DEFAULT NULL;
ALTER TABLE public.effortentry ADD COLUMN IF NOT EXISTS proof_url_2 varchar DEFAULT NULL;
ALTER TABLE public.effortentry ADD COLUMN IF NOT EXISTS custom_field_value text DEFAULT NULL;

-- Add FK for reupload_of
DO $$ BEGIN
  ALTER TABLE public.effortentry
    ADD CONSTRAINT effortentry_reupload_of_fkey
    FOREIGN KEY (reupload_of) REFERENCES public.effortentry(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_effortentry_reupload_of ON public.effortentry(reupload_of);

-- 4h. specialchallenges: new columns (v2.5 changes)
-- v2.0 had league_id, start_date, end_date on specialchallenges; v2.5 moves dates to leagueschallenges
ALTER TABLE public.specialchallenges ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.specialchallenges ADD COLUMN IF NOT EXISTS challenge_type varchar DEFAULT 'individual';
ALTER TABLE public.specialchallenges ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false;
ALTER TABLE public.specialchallenges ADD COLUMN IF NOT EXISTS payment_id uuid;

-- Update challenge_type check to include 'tournament'
ALTER TABLE public.specialchallenges DROP CONSTRAINT IF EXISTS specialchallenges_challenge_type_check;
DO $$ BEGIN
  ALTER TABLE public.specialchallenges ADD CONSTRAINT specialchallenges_challenge_type_check
    CHECK (challenge_type IN ('individual','team','sub_team','tournament'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_specialchallenges_type ON public.specialchallenges(challenge_type);

-- 4i. leagueschallenges: many new columns
ALTER TABLE public.leagueschallenges ADD COLUMN IF NOT EXISTS name varchar;
ALTER TABLE public.leagueschallenges ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.leagueschallenges ADD COLUMN IF NOT EXISTS challenge_type varchar DEFAULT 'individual';
ALTER TABLE public.leagueschallenges ADD COLUMN IF NOT EXISTS total_points numeric NOT NULL DEFAULT 0;
ALTER TABLE public.leagueschallenges ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false;
ALTER TABLE public.leagueschallenges ADD COLUMN IF NOT EXISTS payment_id uuid;
ALTER TABLE public.leagueschallenges ADD COLUMN IF NOT EXISTS doc_url varchar;
ALTER TABLE public.leagueschallenges ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.leagueschallenges ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.leagueschallenges ADD COLUMN IF NOT EXISTS status challenge_status DEFAULT 'active';
ALTER TABLE public.leagueschallenges ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.leagueschallenges ADD COLUMN IF NOT EXISTS pricing_id uuid;

-- Make challenge_id nullable (v2.5 allows standalone league challenges)
ALTER TABLE public.leagueschallenges ALTER COLUMN challenge_id DROP NOT NULL;

-- Add FK for payment_id and pricing_id
DO $$ BEGIN
  ALTER TABLE public.leagueschallenges
    ADD CONSTRAINT leagueschallenges_payment_id_fkey
    FOREIGN KEY (payment_id) REFERENCES public.payments(payment_id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.leagueschallenges
    ADD CONSTRAINT leagueschallenges_pricing_id_fkey
    FOREIGN KEY (pricing_id) REFERENCES public.challengepricing(pricing_id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update challenge_type check to include 'tournament'
ALTER TABLE public.leagueschallenges DROP CONSTRAINT IF EXISTS leagueschallenges_challenge_type_check;
DO $$ BEGIN
  ALTER TABLE public.leagueschallenges ADD CONSTRAINT leagueschallenges_challenge_type_check
    CHECK (challenge_type IN ('individual','team','sub_team','tournament'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Remove old unique constraint (v2.5 allows multiple challenges of same type)
ALTER TABLE public.leagueschallenges DROP CONSTRAINT IF EXISTS unique_league_challenge;

CREATE INDEX IF NOT EXISTS idx_leagueschallenges_status ON public.leagueschallenges(status);

-- 4j. canned_messages: category column (may already exist if table was just created)
ALTER TABLE public.canned_messages ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';

-- 4k. challenge_templates: rules + scoring_logic (may already exist if table was just created)
ALTER TABLE public.challenge_templates ADD COLUMN IF NOT EXISTS rules jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.challenge_templates ADD COLUMN IF NOT EXISTS scoring_logic jsonb DEFAULT '{}'::jsonb;

-- =====================================================================================
-- 5. TRIGGERS (use DROP IF EXISTS + CREATE for safety)
-- =====================================================================================

DROP TRIGGER IF EXISTS custom_activities_modified_date ON public.custom_activities;
CREATE TRIGGER custom_activities_modified_date BEFORE UPDATE ON public.custom_activities
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

DROP TRIGGER IF EXISTS canned_messages_updated_at ON public.canned_messages;
CREATE TRIGGER canned_messages_updated_at BEFORE UPDATE ON public.canned_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tour_steps_updated_at ON public.tour_steps;
CREATE TRIGGER tour_steps_updated_at BEFORE UPDATE ON public.tour_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS leagueschallenges_updated_at ON public.leagueschallenges;
CREATE TRIGGER leagueschallenges_updated_at BEFORE UPDATE ON public.leagueschallenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_calculate_duration_days ON public.leagues;
CREATE TRIGGER trigger_calculate_duration_days
  BEFORE INSERT OR UPDATE OF start_date, end_date ON public.leagues
  FOR EACH ROW EXECUTE FUNCTION calculate_duration_days();

DROP TRIGGER IF EXISTS trigger_update_participant_count_insert ON public.leaguemembers;
DROP TRIGGER IF EXISTS trigger_update_participant_count_delete ON public.leaguemembers;
CREATE TRIGGER trigger_update_participant_count_insert
  AFTER INSERT ON public.leaguemembers
  FOR EACH ROW EXECUTE FUNCTION update_league_participant_count();
CREATE TRIGGER trigger_update_participant_count_delete
  AFTER DELETE ON public.leaguemembers
  FOR EACH ROW EXECUTE FUNCTION update_league_participant_count();

DROP TRIGGER IF EXISTS rest_day_donations_updated_at ON public.rest_day_donations;
CREATE TRIGGER rest_day_donations_updated_at
  BEFORE UPDATE ON public.rest_day_donations
  FOR EACH ROW EXECUTE FUNCTION update_rest_day_donations_updated_at();

DROP TRIGGER IF EXISTS challenge_tournament_matches_updated_at ON public.challenge_tournament_matches;
CREATE TRIGGER challenge_tournament_matches_updated_at BEFORE UPDATE ON public.challenge_tournament_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================================================
-- 6. RLS HELPER FUNCTIONS (CREATE OR REPLACE — safe)
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.get_user_roles_in_league(p_user_id uuid, p_league_id uuid)
RETURNS TEXT[] AS $$
  SELECT COALESCE(ARRAY_AGG(r.role_name), ARRAY[]::TEXT[])
  FROM public.assignedrolesforleague arl
  INNER JOIN public.roles r ON arl.role_id = r.role_id
  WHERE arl.user_id = p_user_id AND arl.league_id = p_league_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_host(p_user_id uuid, p_league_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assignedrolesforleague arl
    INNER JOIN public.roles r ON arl.role_id = r.role_id
    WHERE arl.user_id = p_user_id AND arl.league_id = p_league_id AND r.role_name = 'Host'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_governor(p_user_id uuid, p_league_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assignedrolesforleague arl
    INNER JOIN public.roles r ON arl.role_id = r.role_id
    WHERE arl.user_id = p_user_id AND arl.league_id = p_league_id AND r.role_name = 'Governor'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_captain_of_team(p_user_id uuid, p_team_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teammembers tm
    INNER JOIN public.roles r ON tm.role_id = r.role_id
    WHERE tm.user_id = p_user_id AND tm.team_id = p_team_id AND r.role_name = 'Captain'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_team_in_league(p_user_id uuid, p_league_id uuid)
RETURNS uuid AS $$
  SELECT lm.team_id FROM public.leaguemembers lm
  WHERE lm.user_id = p_user_id AND lm.league_id = p_league_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_member_of_league(p_user_id uuid, p_league_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leaguemembers lm
    WHERE lm.user_id = p_user_id AND lm.league_id = p_league_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_league_member_id(p_user_id uuid, p_league_id uuid)
RETURNS uuid AS $$
  SELECT lm.league_member_id FROM public.leaguemembers lm
  WHERE lm.user_id = p_user_id AND lm.league_id = p_league_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Tournament matches RPC
CREATE OR REPLACE FUNCTION public.get_tournament_matches(p_challenge_id uuid)
RETURNS TABLE (
  match_id uuid,
  league_challenge_id uuid,
  round_number integer,
  round_name text,
  group_id text,
  team1_id uuid,
  team2_id uuid,
  score1 integer,
  score2 integer,
  winner_id uuid,
  status text,
  start_time timestamptz,
  location text,
  created_at timestamptz,
  updated_at timestamptz,
  team1 json,
  team2 json
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT
    m.match_id, m.league_challenge_id, m.round_number, m.round_name, m.group_id,
    m.team1_id, m.team2_id, m.score1, m.score2, m.winner_id,
    m.status, m.start_time, m.location, m.created_at, m.updated_at,
    json_build_object('team_name', t1.team_name) as team1,
    json_build_object('team_name', t2.team_name) as team2
  FROM challenge_tournament_matches m
  LEFT JOIN teams t1 ON m.team1_id = t1.team_id
  LEFT JOIN teams t2 ON m.team2_id = t2.team_id
  WHERE m.league_challenge_id = p_challenge_id
  ORDER BY m.round_number ASC, m.start_time ASC;
$$;

-- =====================================================================================
-- 7. ENABLE RLS ON ALL NEW TABLES
-- =====================================================================================

ALTER TABLE public.league_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_subteams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_subteam_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challengepricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_coach_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_host_digest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_message_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_comm_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rest_day_donations ENABLE ROW LEVEL SECURITY;
-- NOTE: challenge_tournament_matches deliberately has NO RLS

-- =====================================================================================
-- 8. RLS POLICIES (DROP IF EXISTS + CREATE for all new tables)
-- =====================================================================================

-- ---- league_tiers ----
DROP POLICY IF EXISTS league_tiers_select_active ON public.league_tiers;
CREATE POLICY league_tiers_select_active ON public.league_tiers
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS league_tiers_select_admin ON public.league_tiers;
CREATE POLICY league_tiers_select_admin ON public.league_tiers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.platform_role = 'admin')
  );

DROP POLICY IF EXISTS league_tiers_insert_admin ON public.league_tiers;
CREATE POLICY league_tiers_insert_admin ON public.league_tiers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.platform_role = 'admin')
  );

DROP POLICY IF EXISTS league_tiers_update_admin ON public.league_tiers;
CREATE POLICY league_tiers_update_admin ON public.league_tiers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.platform_role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.platform_role = 'admin')
  );

DROP POLICY IF EXISTS league_tiers_delete_admin ON public.league_tiers;
CREATE POLICY league_tiers_delete_admin ON public.league_tiers
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.platform_role = 'admin')
  );

-- ---- activity_categories ----
DROP POLICY IF EXISTS activity_categories_select_all ON public.activity_categories;
CREATE POLICY activity_categories_select_all ON public.activity_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS activity_categories_insert_admin ON public.activity_categories;
CREATE POLICY activity_categories_insert_admin ON public.activity_categories
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.platform_role = 'admin')
  );

DROP POLICY IF EXISTS activity_categories_update_admin ON public.activity_categories;
CREATE POLICY activity_categories_update_admin ON public.activity_categories
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.platform_role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.platform_role = 'admin')
  );

DROP POLICY IF EXISTS activity_categories_delete_admin ON public.activity_categories;
CREATE POLICY activity_categories_delete_admin ON public.activity_categories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.platform_role = 'admin')
  );

-- ---- challengepricing ----
DROP POLICY IF EXISTS challengepricing_select_all ON public.challengepricing;
CREATE POLICY challengepricing_select_all ON public.challengepricing
  FOR SELECT USING (true);

DROP POLICY IF EXISTS challengepricing_insert_admin ON public.challengepricing;
CREATE POLICY challengepricing_insert_admin ON public.challengepricing
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND platform_role = 'admin')
  );

DROP POLICY IF EXISTS challengepricing_update_admin ON public.challengepricing;
CREATE POLICY challengepricing_update_admin ON public.challengepricing
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND platform_role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND platform_role = 'admin')
  );

DROP POLICY IF EXISTS challengepricing_delete_admin ON public.challengepricing;
CREATE POLICY challengepricing_delete_admin ON public.challengepricing
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND platform_role = 'admin')
  );

-- ---- challenge_subteams ----
DROP POLICY IF EXISTS challenge_subteams_select_member ON public.challenge_subteams;
CREATE POLICY challenge_subteams_select_member ON public.challenge_subteams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leagueschallenges lc
      WHERE lc.id = challenge_subteams.league_challenge_id
      AND public.is_member_of_league(auth.uid(), lc.league_id)
    )
  );

DROP POLICY IF EXISTS challenge_subteams_insert_host ON public.challenge_subteams;
CREATE POLICY challenge_subteams_insert_host ON public.challenge_subteams
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leagueschallenges lc
      WHERE lc.id = challenge_subteams.league_challenge_id
      AND public.is_host(auth.uid(), lc.league_id)
    )
  );

-- ---- challenge_subteam_members ----
DROP POLICY IF EXISTS challenge_subteam_members_select_member ON public.challenge_subteam_members;
CREATE POLICY challenge_subteam_members_select_member ON public.challenge_subteam_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.challenge_subteams cs
      INNER JOIN public.leagueschallenges lc ON cs.league_challenge_id = lc.id
      WHERE cs.subteam_id = challenge_subteam_members.subteam_id
      AND public.is_member_of_league(auth.uid(), lc.league_id)
    )
  );

DROP POLICY IF EXISTS challenge_subteam_members_insert_host ON public.challenge_subteam_members;
CREATE POLICY challenge_subteam_members_insert_host ON public.challenge_subteam_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.challenge_subteams cs
      INNER JOIN public.leagueschallenges lc ON cs.league_challenge_id = lc.id
      WHERE cs.subteam_id = challenge_subteam_members.subteam_id
      AND public.is_host(auth.uid(), lc.league_id)
    )
  );

-- ---- challenge_submissions ----
DROP POLICY IF EXISTS challenge_submissions_select_own ON public.challenge_submissions;
CREATE POLICY challenge_submissions_select_own ON public.challenge_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leaguemembers lm
      WHERE lm.league_member_id = challenge_submissions.league_member_id
      AND lm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS challenge_submissions_select_league ON public.challenge_submissions;
CREATE POLICY challenge_submissions_select_league ON public.challenge_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leagueschallenges lc
      WHERE lc.id = challenge_submissions.league_challenge_id
      AND public.is_member_of_league(auth.uid(), lc.league_id)
    )
  );

DROP POLICY IF EXISTS challenge_submissions_insert_user ON public.challenge_submissions;
CREATE POLICY challenge_submissions_insert_user ON public.challenge_submissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leaguemembers lm
      WHERE lm.league_member_id = challenge_submissions.league_member_id
      AND lm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS challenge_submissions_update_reviewer ON public.challenge_submissions;
CREATE POLICY challenge_submissions_update_reviewer ON public.challenge_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.leagueschallenges lc
      WHERE lc.id = challenge_submissions.league_challenge_id
      AND (
        public.is_host(auth.uid(), lc.league_id)
        OR public.is_governor(auth.uid(), lc.league_id)
      )
    )
  );

-- ---- messages ----
DROP POLICY IF EXISTS messages_select_team_all ON public.messages;
CREATE POLICY messages_select_team_all ON public.messages
  FOR SELECT USING (
    deleted_at IS NULL
    AND visibility = 'all'
    AND is_member_of_league(auth.uid(), league_id)
    AND (
      team_id IS NULL
      OR team_id = get_user_team_in_league(auth.uid(), league_id)
    )
  );

DROP POLICY IF EXISTS messages_select_captains_only ON public.messages;
CREATE POLICY messages_select_captains_only ON public.messages
  FOR SELECT USING (
    deleted_at IS NULL
    AND visibility = 'captains_only'
    AND (
      is_host(auth.uid(), league_id)
      OR is_governor(auth.uid(), league_id)
      OR is_captain_of_team(auth.uid(), COALESCE(team_id, get_user_team_in_league(auth.uid(), league_id)))
    )
  );

DROP POLICY IF EXISTS messages_select_admin ON public.messages;
CREATE POLICY messages_select_admin ON public.messages
  FOR SELECT USING (
    deleted_at IS NULL
    AND (is_host(auth.uid(), league_id) OR is_governor(auth.uid(), league_id))
  );

DROP POLICY IF EXISTS messages_insert_member ON public.messages;
CREATE POLICY messages_insert_member ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND is_member_of_league(auth.uid(), league_id)
    AND (
      team_id = get_user_team_in_league(auth.uid(), league_id)
      OR is_host(auth.uid(), league_id)
      OR is_governor(auth.uid(), league_id)
    )
  );

DROP POLICY IF EXISTS messages_update_sender ON public.messages;
CREATE POLICY messages_update_sender ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS messages_update_host ON public.messages;
CREATE POLICY messages_update_host ON public.messages
  FOR UPDATE USING (is_host(auth.uid(), league_id));

-- ---- message_read_receipts ----
DROP POLICY IF EXISTS read_receipts_select ON public.message_read_receipts;
CREATE POLICY read_receipts_select ON public.message_read_receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.message_id = message_read_receipts.message_id
      AND is_member_of_league(auth.uid(), m.league_id)
    )
  );

DROP POLICY IF EXISTS read_receipts_insert ON public.message_read_receipts;
CREATE POLICY read_receipts_insert ON public.message_read_receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ---- message_reactions ----
DROP POLICY IF EXISTS reactions_select ON public.message_reactions;
CREATE POLICY reactions_select ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.message_id = message_reactions.message_id
      AND is_member_of_league(auth.uid(), m.league_id)
    )
  );

DROP POLICY IF EXISTS reactions_insert ON public.message_reactions;
CREATE POLICY reactions_insert ON public.message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS reactions_delete ON public.message_reactions;
CREATE POLICY reactions_delete ON public.message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ---- canned_messages ----
DROP POLICY IF EXISTS canned_messages_select ON public.canned_messages;
CREATE POLICY canned_messages_select ON public.canned_messages
  FOR SELECT USING (
    is_system = true
    OR (league_id IS NOT NULL AND is_member_of_league(auth.uid(), league_id))
  );

DROP POLICY IF EXISTS canned_messages_insert ON public.canned_messages;
CREATE POLICY canned_messages_insert ON public.canned_messages
  FOR INSERT WITH CHECK (
    league_id IS NOT NULL
    AND (is_host(auth.uid(), league_id) OR is_governor(auth.uid(), league_id))
  );

DROP POLICY IF EXISTS canned_messages_update ON public.canned_messages;
CREATE POLICY canned_messages_update ON public.canned_messages
  FOR UPDATE USING (
    is_system = false
    AND league_id IS NOT NULL
    AND (is_host(auth.uid(), league_id) OR is_governor(auth.uid(), league_id))
  );

DROP POLICY IF EXISTS canned_messages_delete ON public.canned_messages;
CREATE POLICY canned_messages_delete ON public.canned_messages
  FOR DELETE USING (
    is_system = false
    AND league_id IS NOT NULL
    AND is_host(auth.uid(), league_id)
  );

-- ---- tour_steps ----
DROP POLICY IF EXISTS tour_steps_select ON public.tour_steps;
CREATE POLICY tour_steps_select ON public.tour_steps
  FOR SELECT USING (true);

-- ---- ai_coach_messages ----
DROP POLICY IF EXISTS "Users can read own ai coach messages" ON public.ai_coach_messages;
CREATE POLICY "Users can read own ai coach messages" ON public.ai_coach_messages
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      user_id IS NULL
      AND team_id IN (
        SELECT t.team_id FROM teams t
        JOIN leaguemembers lm ON lm.team_id = t.team_id
        WHERE lm.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own ai coach messages" ON public.ai_coach_messages;
CREATE POLICY "Users can update own ai coach messages" ON public.ai_coach_messages
  FOR UPDATE USING (
    auth.uid() = user_id
    OR (
      user_id IS NULL
      AND team_id IN (
        SELECT t.team_id FROM teams t
        JOIN leaguemembers lm ON lm.team_id = t.team_id
        WHERE lm.user_id = auth.uid()
      )
    )
  ) WITH CHECK (
    auth.uid() = user_id
    OR (
      user_id IS NULL
      AND team_id IN (
        SELECT t.team_id FROM teams t
        JOIN leaguemembers lm ON lm.team_id = t.team_id
        WHERE lm.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Service role can insert ai coach messages" ON public.ai_coach_messages;
CREATE POLICY "Service role can insert ai coach messages" ON public.ai_coach_messages
  FOR INSERT WITH CHECK (true);

-- ---- ai_coach_chats ----
DROP POLICY IF EXISTS "Users can read own chats" ON public.ai_coach_chats;
CREATE POLICY "Users can read own chats" ON public.ai_coach_chats
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chats" ON public.ai_coach_chats;
CREATE POLICY "Users can insert own chats" ON public.ai_coach_chats
  FOR INSERT WITH CHECK (auth.uid() = user_id OR true);

DROP POLICY IF EXISTS "Service role full access chats" ON public.ai_coach_chats;
CREATE POLICY "Service role full access chats" ON public.ai_coach_chats
  FOR ALL USING (true);

-- ---- ai_host_digest ----
DROP POLICY IF EXISTS "ai_host_digest_read" ON public.ai_host_digest;
CREATE POLICY "ai_host_digest_read" ON public.ai_host_digest
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leaguemembers lm
      WHERE lm.league_id = ai_host_digest.league_id
        AND lm.user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM assignedrolesforleague arf
          JOIN roles r ON r.role_id = arf.role_id
          WHERE arf.user_id = lm.user_id
            AND arf.league_id = lm.league_id
            AND r.role_name IN ('host','governor')
        )
    )
    OR EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.league_id = ai_host_digest.league_id
        AND l.created_by = auth.uid()
    )
  );

-- ---- ai_message_drafts ----
DROP POLICY IF EXISTS "ai_drafts_read" ON public.ai_message_drafts;
CREATE POLICY "ai_drafts_read" ON public.ai_message_drafts
  FOR SELECT USING (host_user_id = auth.uid());

DROP POLICY IF EXISTS "ai_drafts_update" ON public.ai_message_drafts;
CREATE POLICY "ai_drafts_update" ON public.ai_message_drafts
  FOR UPDATE USING (host_user_id = auth.uid());

-- ---- ai_interventions ----
DROP POLICY IF EXISTS "ai_interventions_read" ON public.ai_interventions;
CREATE POLICY "ai_interventions_read" ON public.ai_interventions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leaguemembers lm
      WHERE lm.league_id = ai_interventions.league_id
        AND lm.user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM assignedrolesforleague arf
          JOIN roles r ON r.role_id = arf.role_id
          WHERE arf.user_id = lm.user_id
            AND arf.league_id = lm.league_id
            AND r.role_name IN ('host','governor')
        )
    )
    OR EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.league_id = ai_interventions.league_id
        AND l.created_by = auth.uid()
    )
  );

-- ---- challenge_templates ----
DROP POLICY IF EXISTS "challenge_templates_read" ON public.challenge_templates;
CREATE POLICY "challenge_templates_read" ON public.challenge_templates
  FOR SELECT USING (is_active = true);

-- ---- challenge_comm_schedule ----
DROP POLICY IF EXISTS "challenge_comm_read" ON public.challenge_comm_schedule;
CREATE POLICY "challenge_comm_read" ON public.challenge_comm_schedule
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.league_id = challenge_comm_schedule.league_id
        AND l.created_by = auth.uid()
    )
  );

-- ---- custom_activities ----
DROP POLICY IF EXISTS custom_activities_select_own ON public.custom_activities;
CREATE POLICY custom_activities_select_own ON public.custom_activities
  FOR SELECT USING (
    created_by = auth.uid()
    OR custom_activity_id IN (
      SELECT la.custom_activity_id FROM public.leagueactivities la
      WHERE la.custom_activity_id IS NOT NULL
        AND public.is_member_of_league(auth.uid(), la.league_id)
    )
  );

DROP POLICY IF EXISTS custom_activities_insert_own ON public.custom_activities;
CREATE POLICY custom_activities_insert_own ON public.custom_activities
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS custom_activities_update_own ON public.custom_activities;
CREATE POLICY custom_activities_update_own ON public.custom_activities
  FOR UPDATE USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS custom_activities_delete_own ON public.custom_activities;
CREATE POLICY custom_activities_delete_own ON public.custom_activities
  FOR DELETE USING (created_by = auth.uid());

-- ---- rest_day_donations ----
DROP POLICY IF EXISTS rest_day_donations_select_member ON public.rest_day_donations;
CREATE POLICY rest_day_donations_select_member ON public.rest_day_donations
  FOR SELECT USING (
    public.is_member_of_league(auth.uid(), league_id)
  );

DROP POLICY IF EXISTS rest_day_donations_insert_member ON public.rest_day_donations;
CREATE POLICY rest_day_donations_insert_member ON public.rest_day_donations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leaguemembers lm
      WHERE lm.league_member_id = rest_day_donations.donor_member_id
        AND lm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS rest_day_donations_update_reviewer ON public.rest_day_donations;
CREATE POLICY rest_day_donations_update_reviewer ON public.rest_day_donations
  FOR UPDATE USING (
    public.is_host(auth.uid(), league_id)
    OR public.is_governor(auth.uid(), league_id)
    OR public.is_captain_of_team(auth.uid(), (
      SELECT lm.team_id FROM public.leaguemembers lm
      WHERE lm.league_member_id = rest_day_donations.donor_member_id
    ))
  );

-- ---- ai_usage_logs ----
DROP POLICY IF EXISTS ai_usage_logs_select_admin ON public.ai_usage_logs;
CREATE POLICY ai_usage_logs_select_admin ON public.ai_usage_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.user_id = auth.uid() AND users.platform_role = 'admin')
  );

DROP POLICY IF EXISTS ai_usage_logs_insert_service ON public.ai_usage_logs;
CREATE POLICY ai_usage_logs_insert_service ON public.ai_usage_logs
  FOR INSERT WITH CHECK (true);

-- =====================================================================================
-- 9. GRANTS
-- =====================================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Select on all tables for authenticated
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- DML grants on specific tables
GRANT INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.leagues TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.leaguemembers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.leagueactivities TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.effortentry TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.challenge_submissions TO authenticated;
GRANT INSERT, UPDATE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challengepricing TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT ON public.message_read_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.canned_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT SELECT ON public.tour_steps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rest_day_donations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_subteams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_subteam_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.challenge_submissions TO authenticated;
GRANT SELECT, INSERT ON public.ai_coach_chats TO authenticated;
GRANT SELECT, INSERT ON public.ai_coach_messages TO authenticated;
GRANT SELECT ON public.ai_host_digest TO authenticated;
GRANT SELECT, UPDATE ON public.ai_message_drafts TO authenticated;
GRANT SELECT ON public.ai_interventions TO authenticated;
GRANT SELECT ON public.challenge_templates TO authenticated;
GRANT SELECT ON public.challenge_comm_schedule TO authenticated;
GRANT SELECT ON public.ai_usage_logs TO authenticated;
GRANT SELECT ON public.league_tiers TO authenticated;
GRANT SELECT ON public.league_tiers TO anon;
GRANT SELECT ON public.activity_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_tournament_matches TO authenticated;

-- Sequence grants
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Function grants
GRANT EXECUTE ON FUNCTION public.get_user_roles_in_league(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_host(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_governor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_captain_of_team(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_team_in_league(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_league(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_league_member_id(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tournament_matches(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tournament_matches(uuid) TO service_role;

-- =====================================================================================
-- 10. REALTIME PUBLICATION
-- =====================================================================================

-- Safely add tables to realtime (ignore errors if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.messages REPLICA IDENTITY FULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================================
-- 11. STORAGE BUCKETS
-- =====================================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('league-logos', 'league-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('team-logos', 'team-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('donation-proofs', 'donation-proofs', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('league-rules', 'league-rules', true, 10485760)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (league-logos)
DROP POLICY IF EXISTS "league-logos_public_read" ON storage.objects;
CREATE POLICY "league-logos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'league-logos');

DROP POLICY IF EXISTS "league-logos_host_insert" ON storage.objects;
CREATE POLICY "league-logos_host_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'league-logos'
    AND public.is_host(auth.uid(), split_part(split_part(name, '/', 1), '.', 1)::uuid)
  );

DROP POLICY IF EXISTS "league-logos_host_update" ON storage.objects;
CREATE POLICY "league-logos_host_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'league-logos'
    AND public.is_host(auth.uid(), split_part(split_part(name, '/', 1), '.', 1)::uuid)
  );

DROP POLICY IF EXISTS "league-logos_host_delete" ON storage.objects;
CREATE POLICY "league-logos_host_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'league-logos'
    AND public.is_host(auth.uid(), split_part(split_part(name, '/', 1), '.', 1)::uuid)
  );

-- Storage policies (team-logos)
DROP POLICY IF EXISTS "team-logos_public_read" ON storage.objects;
CREATE POLICY "team-logos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'team-logos');

DROP POLICY IF EXISTS "team-logos_captain_or_host_insert" ON storage.objects;
CREATE POLICY "team-logos_captain_or_host_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'team-logos'
    AND (
      public.is_host(auth.uid(), split_part(name, '/', 1)::uuid)
      OR public.is_captain_of_team(auth.uid(), split_part(split_part(name, '/', 2), '.', 1)::uuid)
    )
  );

DROP POLICY IF EXISTS "team-logos_captain_or_host_update" ON storage.objects;
CREATE POLICY "team-logos_captain_or_host_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'team-logos'
    AND (
      public.is_host(auth.uid(), split_part(name, '/', 1)::uuid)
      OR public.is_captain_of_team(auth.uid(), split_part(split_part(name, '/', 2), '.', 1)::uuid)
    )
  );

DROP POLICY IF EXISTS "team-logos_captain_or_host_delete" ON storage.objects;
CREATE POLICY "team-logos_captain_or_host_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'team-logos'
    AND (
      public.is_host(auth.uid(), split_part(name, '/', 1)::uuid)
      OR public.is_captain_of_team(auth.uid(), split_part(split_part(name, '/', 2), '.', 1)::uuid)
    )
  );

-- Storage policies (donation-proofs)
DROP POLICY IF EXISTS "donation-proofs_public_read" ON storage.objects;
CREATE POLICY "donation-proofs_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'donation-proofs');

DROP POLICY IF EXISTS "donation-proofs_authenticated_insert" ON storage.objects;
CREATE POLICY "donation-proofs_authenticated_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'donation-proofs');

DROP POLICY IF EXISTS "donation-proofs_owner_delete" ON storage.objects;
CREATE POLICY "donation-proofs_owner_delete" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'donation-proofs'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- Storage policies (league-rules)
DROP POLICY IF EXISTS "league-rules_public_read" ON storage.objects;
CREATE POLICY "league-rules_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'league-rules');

DROP POLICY IF EXISTS "league-rules_host_insert" ON storage.objects;
CREATE POLICY "league-rules_host_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'league-rules'
    AND public.is_host(auth.uid(), split_part(split_part(name, '/', 1), '.', 1)::uuid)
  );

DROP POLICY IF EXISTS "league-rules_host_update" ON storage.objects;
CREATE POLICY "league-rules_host_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'league-rules'
    AND public.is_host(auth.uid(), split_part(split_part(name, '/', 1), '.', 1)::uuid)
  );

DROP POLICY IF EXISTS "league-rules_host_delete" ON storage.objects;
CREATE POLICY "league-rules_host_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'league-rules'
    AND public.is_host(auth.uid(), split_part(split_part(name, '/', 1), '.', 1)::uuid)
  );

-- Storage policies (profile-pictures)
DROP POLICY IF EXISTS "profile-pictures_public_read" ON storage.objects;
CREATE POLICY "profile-pictures_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-pictures');

DROP POLICY IF EXISTS "profile-pictures_user_insert" ON storage.objects;
CREATE POLICY "profile-pictures_user_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

DROP POLICY IF EXISTS "profile-pictures_user_update" ON storage.objects;
CREATE POLICY "profile-pictures_user_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-pictures'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

DROP POLICY IF EXISTS "profile-pictures_user_delete" ON storage.objects;
CREATE POLICY "profile-pictures_user_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-pictures'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

-- TeamLeagues update policy for logo changes
DROP POLICY IF EXISTS teamleagues_update_host_or_captain ON public.teamleagues;
CREATE POLICY teamleagues_update_host_or_captain ON public.teamleagues
  FOR UPDATE USING (
    public.is_host(auth.uid(), league_id)
    OR public.is_captain_of_team(auth.uid(), team_id)
  ) WITH CHECK (
    public.is_host(auth.uid(), league_id)
    OR public.is_captain_of_team(auth.uid(), team_id)
  );

-- =====================================================================================
-- 12. SEED DATA
-- =====================================================================================

-- 12a. Activity categories
INSERT INTO public.activity_categories (category_name, display_name, description, display_order)
SELECT 'other', 'Other', 'Custom activities that don''t fit other categories', 999
WHERE NOT EXISTS (
  SELECT 1 FROM public.activity_categories WHERE category_name = 'other'
);

-- 12b. Canned messages (original set from messaging migration)
INSERT INTO public.canned_messages (role_target, title, content, is_system) VALUES
  ('host', 'Welcome to the League', 'Welcome everyone to the league! Let''s make this an amazing fitness journey together. Stay active, stay motivated!', true),
  ('host', 'New Challenge Launched', 'A new challenge has been launched! Check the challenges section for details and rules. Let''s go!', true),
  ('host', 'Daily Reminder', 'Reminder: Please submit your activities before end of day. Every effort counts towards your team score!', true),
  ('host', 'Rest Day Policy', 'Quick update on rest day policy - please check the league rules for the latest rest day allowances.', true),
  ('host', 'Standings Update', 'League standings have been updated! Check the leaderboard to see where your team stands. Keep pushing!', true),
  ('host', 'Rules Update', 'Important rules update - please review the updated league rules carefully. Reach out if you have questions.', true),
  ('host', 'Week Summary', 'Great week everyone! Here''s a quick summary of how all teams performed. Keep the momentum going!', true),
  ('host', 'Final Week Push', 'We''re in the final stretch! Give it everything you''ve got this last week. Every point matters!', true),
  ('captain', 'Great Job Team', 'Great job today, team! Your effort is showing on the leaderboard. Keep it up!', true),
  ('captain', 'Push Harder', 'Let''s push harder this week! We can climb the standings if we all stay consistent.', true),
  ('captain', 'Log Activities', 'Team, don''t forget to log your activities today. Even a short walk counts!', true),
  ('captain', 'Welcome New Member', 'Welcome to the team! We''re glad to have you. Feel free to ask any questions.', true),
  ('captain', 'Strategy Discussion', 'Team strategy discussion - let''s plan our approach for the upcoming challenge.', true),
  ('captain', 'Motivation Boost', 'Remember why we started! Stay focused, stay disciplined. We''ve got this!', true),
  ('governor', 'Validation Complete', 'Validation round complete. All submissions have been reviewed. Check your status.', true),
  ('governor', 'Pending Submissions', 'There are pending submissions awaiting review. Captains, please review your team''s entries.', true),
  ('governor', 'Score Update', 'Scores have been updated after the latest review. Check the leaderboard for current standings.', true),
  ('governor', 'Dispute Resolved', 'A score dispute has been reviewed and resolved. Please check the updated scores.', true)
ON CONFLICT DO NOTHING;

-- 12c. Expanded canned messages (motivation, inactivity, challenge, milestone, summary, rest day)
INSERT INTO public.canned_messages (role_target, title, content, is_system, category) VALUES
  ('host', 'Keep It Going!', 'Amazing energy this week! Keep pushing — every day counts toward your goal. The finish line is closer than you think!', true, 'motivation'),
  ('host', 'You Are Making a Difference', 'Your consistent effort is inspiring others in the league. Every activity you log ripples through the team. Keep showing up!', true, 'motivation'),
  ('host', 'Midweek Motivation', 'We are halfway through the week! Don''t let up now. A strong finish this week sets the tone for next week.', true, 'motivation'),
  ('host', 'Final Push', 'We are in the final stretch! Give it everything you have. This is where champions are made.', true, 'motivation'),
  ('captain', 'Team Rally', 'Team, let''s make today count! We are close to hitting our target. Log your activity and let''s finish strong together!', true, 'motivation'),
  ('captain', 'Celebrate Small Wins', 'Shout out to everyone who logged today — that''s discipline right there! Let''s keep this streak alive.', true, 'motivation'),
  ('host', 'We Miss You!', 'Hey! We noticed you have been away for a few days. No pressure — even a short walk counts. We''d love to see you back!', true, 'inactivity'),
  ('host', 'Quick Check-In', 'Just checking in — everything okay? Remember, consistency beats intensity. Even 10 minutes of activity today keeps your streak alive.', true, 'inactivity'),
  ('host', 'Team Needs You', 'Your team is counting on your participation! Log any activity today — it all adds up for the team score.', true, 'inactivity'),
  ('captain', 'Missed You Today', 'Hey, we missed your activity log today! Don''t worry — jump back in tomorrow. We''re stronger with you!', true, 'inactivity'),
  ('host', 'Challenge Kickoff', 'A new challenge is LIVE! Check your challenges tab for details. This is your chance to earn bonus points and stand out!', true, 'challenge'),
  ('host', 'Challenge Midway Check', 'We are halfway through the challenge! Check the leaderboard to see where you stand. Still time to catch up!', true, 'challenge'),
  ('host', 'Challenge Results', 'The challenge is complete! Congratulations to all participants. Check the leaderboard for final standings and winners!', true, 'challenge'),
  ('host', 'Challenge Reminder', 'Don''t forget — the challenge ends soon! Make sure you submit your entries before the deadline.', true, 'challenge'),
  ('captain', 'Team Challenge Update', 'Team update on the challenge: let''s coordinate our efforts. Every submission counts toward our team score!', true, 'challenge'),
  ('host', 'Week 1 Complete!', 'Congratulations! You have completed your first week. The hardest part is starting — and you did it!', true, 'milestone'),
  ('host', 'Halfway There!', 'You are officially halfway through the league! Look how far you have come. Keep the momentum going!', true, 'milestone'),
  ('host', 'Final Week!', 'This is the FINAL WEEK! Give it your absolute best. Finish strong and make every day count!', true, 'milestone'),
  ('host', 'Perfect Week!', 'What a week! 100% participation from the league. This is what teamwork and commitment look like!', true, 'milestone'),
  ('host', 'Weekly Wrap-Up', 'Here''s your weekly summary: Check the leaderboard for standings, review your team''s progress, and set goals for next week!', true, 'summary'),
  ('host', 'Monday Kickoff', 'New week, fresh start! Set your goals for this week and let''s make it count. Log your first activity today!', true, 'summary'),
  ('governor', 'Weekly Validation Summary', 'Weekly validation update: Please review any pending submissions. Timely validation keeps the league running smoothly.', true, 'summary'),
  ('host', 'Rest Day Reminder', 'Remember: rest days are part of the plan! Use them wisely — recovery is just as important as activity. You have a limited number, so plan ahead.', true, 'policy'),
  ('host', 'Rest Days Running Low', 'Heads up: some members are running low on rest days. Encourage your teams to plan their remaining rest days carefully.', true, 'policy')
ON CONFLICT DO NOTHING;

-- 12d. Tour steps
INSERT INTO public.tour_steps (title, description, icon_name, icon_color, sort_order) VALUES
  ('Submit Your Activity', 'Log your daily workouts — running, yoga, cycling, gym, and more. Upload a screenshot as proof and the app calculates your effort score (Run Rate) automatically. Consistency is key — submit every day to maximize your team''s score!', 'Dumbbell', 'text-green-500', 0),
  ('Points & Scoring', 'Every approved workout earns you points based on your Run Rate. The harder you push, the more points you earn (up to 2x). Your points add up to your team''s total on the leaderboard. Team rankings are updated daily!', 'Trophy', 'text-amber-500', 1),
  ('Run Rate (RR)', 'Run Rate measures your workout intensity on a 0-2 scale. An RR of 1.0 means you met the minimum effort — anything above is bonus! RR is calculated from duration, distance, or steps depending on the activity. Age-adjusted thresholds ensure fairness for all.', 'TrendingUp', 'text-blue-500', 2),
  ('Challenges', 'Compete in special challenges for bonus points! Individual challenges test your personal limits, while team challenges bring everyone together. Watch for new challenge announcements from your host — they can be game-changers on the leaderboard.', 'Target', 'text-purple-500', 3),
  ('Activities', 'Choose from 15+ activity types across cardio, strength, flexibility, and wellness. Each activity has its own measurement — duration, distance, steps, or holes. Your host may also create custom activities specific to your league. Pick what you love and get moving!', 'Activity', 'text-red-500', 4)
ON CONFLICT DO NOTHING;

-- 12e. Challenge templates
INSERT INTO public.challenge_templates (name, description, category, default_duration, comm_schedule, rules, scoring_logic) VALUES
  ('Step It Up', 'Daily step count challenge — who can walk the most?', 'steps', 7,
    '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Kick off the step challenge with energy"}, {"day_offset": 3, "type": "announcement", "prompt_hint": "Mid-week check-in, share current standings"}, {"day_offset": 6, "type": "challenge_results", "prompt_hint": "Final day results and celebration"}]',
    '[{"rule_text": "Log at least 10,000 steps daily", "is_mandatory": true}, {"rule_text": "Use a fitness tracker or phone pedometer", "is_mandatory": false}]',
    '{"type": "cumulative", "points_per_completion": 1, "bonus_rules": [{"condition": "all_days_completed", "bonus_points": 3}]}'),
  ('Consistency King', 'Log every single day for a week — no rest days allowed', 'consistency', 7,
    '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Announce the consistency challenge"}, {"day_offset": 4, "type": "announcement", "prompt_hint": "Who is still going strong? Encourage the rest"}, {"day_offset": 6, "type": "challenge_results", "prompt_hint": "Celebrate those who logged every day"}]',
    '[{"rule_text": "Log an activity every single day of the challenge", "is_mandatory": true}, {"rule_text": "Any approved activity counts", "is_mandatory": true}]',
    '{"type": "streak", "points_per_completion": 1, "bonus_rules": [{"condition": "perfect_streak", "bonus_points": 5}]}'),
  ('Early Bird', 'Log your activity before 8 AM every day', 'time_based', 5,
    '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Early morning challenge starts now!"}, {"day_offset": 4, "type": "challenge_results", "prompt_hint": "Who was the earliest bird?"}]',
    '[{"rule_text": "Complete your activity before 7 AM local time", "is_mandatory": true}, {"rule_text": "Proof must include timestamp", "is_mandatory": false}]',
    '{"type": "daily", "points_per_completion": 2, "bonus_rules": []}'),
  ('Team Spirit Week', 'Every team member must log at least once — team-wide participation', 'team', 7,
    '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Team spirit week! Get every member involved"}, {"day_offset": 3, "type": "team_nudge", "prompt_hint": "Check which teams have 100% participation"}, {"day_offset": 6, "type": "challenge_results", "prompt_hint": "Announce the most spirited team"}]',
    '[{"rule_text": "100% team participation required for full points", "is_mandatory": true}, {"rule_text": "Team captain must verify each member logged", "is_mandatory": false}]',
    '{"type": "team_participation", "points_per_completion": 1, "bonus_rules": [{"condition": "100_percent_team", "bonus_points": 5}]}'),
  ('Distance Dash', 'Cumulative distance challenge — run, walk, or cycle', 'distance', 7,
    '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Distance dash begins! Every km counts"}, {"day_offset": 3, "type": "announcement", "prompt_hint": "Halfway mark — share distance leaderboard"}, {"day_offset": 6, "type": "challenge_results", "prompt_hint": "Final distances and winner announcement"}]',
    '[{"rule_text": "Log distance-based activities (running, walking, cycling)", "is_mandatory": true}, {"rule_text": "Minimum 2km per session to count", "is_mandatory": true}]',
    '{"type": "cumulative_distance", "points_per_completion": 1, "bonus_rules": [{"condition": "top_3_distance", "bonus_points": 3}]}'),
  ('Weekend Warrior', 'Saturday and Sunday activity challenge', 'weekend', 2,
    '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Weekend warrior challenge — make the most of your weekend!"}, {"day_offset": 1, "type": "challenge_results", "prompt_hint": "Weekend results and highlights"}]',
    '[{"rule_text": "Log activities on both Saturday and Sunday", "is_mandatory": true}]',
    '{"type": "completion", "points_per_completion": 3, "bonus_rules": []}'),
  ('Mindful Minutes', 'Meditation or yoga challenge — focus on recovery', 'wellness', 7,
    '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Mindful minutes challenge for mental wellness"}, {"day_offset": 6, "type": "challenge_results", "prompt_hint": "Celebrate mindfulness achievements"}]',
    '[{"rule_text": "Log at least 15 minutes of mindfulness, meditation, or yoga", "is_mandatory": true}]',
    '{"type": "daily", "points_per_completion": 1, "bonus_rules": [{"condition": "all_days_completed", "bonus_points": 2}]}'),
  ('Photo Proof', 'Submit a photo with every activity — accountability challenge', 'proof', 5,
    '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Photo proof challenge — show us your effort!"}, {"day_offset": 4, "type": "challenge_results", "prompt_hint": "Best photos and most consistent submitters"}]',
    '[{"rule_text": "Every activity submission must include photo proof", "is_mandatory": true}, {"rule_text": "Photo must clearly show the activity", "is_mandatory": true}]',
    '{"type": "daily", "points_per_completion": 2, "bonus_rules": []}'),
  ('Power Hour', 'Log at least 60 minutes of activity each day', 'duration', 5,
    '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Power hour challenge — 60 minutes a day!"}, {"day_offset": 2, "type": "announcement", "prompt_hint": "Who is keeping up the power hours?"}, {"day_offset": 4, "type": "challenge_results", "prompt_hint": "Power hour champions announced"}]',
    '[{"rule_text": "Complete a 60-minute workout session", "is_mandatory": true}, {"rule_text": "Duration must be verified via tracker or proof", "is_mandatory": false}]',
    '{"type": "daily", "points_per_completion": 2, "bonus_rules": [{"condition": "all_days_completed", "bonus_points": 3}]}'),
  ('League Finale', 'End-of-league final push — last 3 days maximum effort', 'finale', 3,
    '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "FINAL PUSH! Last 3 days of the league"}, {"day_offset": 1, "type": "announcement", "prompt_hint": "2 days left — current standings"}, {"day_offset": 2, "type": "challenge_results", "prompt_hint": "League finale results — celebrate everyone!"}]',
    '[{"rule_text": "Complete your activity on all 3 final days", "is_mandatory": true}, {"rule_text": "Share your league journey summary with the team", "is_mandatory": false}]',
    '{"type": "completion", "points_per_completion": 3, "bonus_rules": [{"condition": "perfect_attendance", "bonus_points": 5}]}')
ON CONFLICT DO NOTHING;

-- =====================================================================================
-- 13. BACKFILL: Canned message categories for pre-existing rows
-- =====================================================================================

UPDATE public.canned_messages SET category = 'onboarding' WHERE category = 'general' AND (title ILIKE '%welcome%' OR title ILIKE '%onboard%');
UPDATE public.canned_messages SET category = 'challenge' WHERE category = 'general' AND (title ILIKE '%challenge%');
UPDATE public.canned_messages SET category = 'reminder' WHERE category = 'general' AND (title ILIKE '%remind%' OR title ILIKE '%log%' OR title ILIKE '%pending%');
UPDATE public.canned_messages SET category = 'motivation' WHERE category = 'general' AND (title ILIKE '%great%' OR title ILIKE '%push%' OR title ILIKE '%job%');
UPDATE public.canned_messages SET category = 'update' WHERE category = 'general' AND (title ILIKE '%update%' OR title ILIKE '%score%' OR title ILIKE '%complete%');
UPDATE public.canned_messages SET category = 'policy' WHERE category = 'general' AND (title ILIKE '%rest%' OR title ILIKE '%policy%' OR title ILIKE '%rule%');

-- =====================================================================================
-- 14. BACKFILL: Calculate duration_days for existing leagues
-- =====================================================================================

UPDATE public.leagues
SET duration_days = (end_date - start_date) + 1
WHERE duration_days IS NULL;

-- =====================================================================================
-- DONE
-- =====================================================================================

COMMIT;