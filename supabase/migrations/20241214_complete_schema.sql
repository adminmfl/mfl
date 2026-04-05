-- =====================================================================================
-- Migration: Complete Database Schema for MyFitnessLeague V2
-- Description: Creates all core tables, enums, indexes, and triggers
-- Author: MFL Engineering Team
-- Created: 2025-12-14
-- Updated: 2026-01-03
-- =====================================================================================

-- Enable UUID extension for primary key generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================================
-- ENUMS & CUSTOM TYPES
-- =====================================================================================

CREATE TYPE effort_status AS ENUM ('pending', 'approved', 'rejected', 'rejected_resubmit', 'rejected_permanent');
CREATE TYPE platform_role AS ENUM ('admin', 'user');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_purpose AS ENUM ('league_creation', 'subscription', 'other', 'challenge_creation');
CREATE TYPE challenge_status AS ENUM ('draft', 'scheduled', 'active', 'submission_closed', 'published', 'closed', 'upcoming');
CREATE TYPE activity_measurement_type AS ENUM ('duration', 'distance', 'hole', 'steps', 'none');

-- =====================================================================================
-- CORE USER MANAGEMENT
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar NOT NULL UNIQUE CHECK (char_length(username) >= 3),
  email varchar NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  password_hash varchar NOT NULL,
  phone varchar,
  date_of_birth date,
  gender varchar,
  profile_picture_url text,
  platform_role platform_role DEFAULT 'user',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

COMMENT ON TABLE public.users IS 'Core user accounts with authentication and profile data';
COMMENT ON COLUMN public.users.platform_role IS 'Platform-level role: admin (super admin) or user (regular user)';
COMMENT ON COLUMN public.users.is_active IS 'Soft delete flag - false indicates deactivated account';
COMMENT ON COLUMN public.users.profile_picture_url IS 'URL to user profile picture stored in Supabase Storage';

-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.email_otps (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  otp text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_otps_expiry_future CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_email_otps_email_used ON public.email_otps(email, used);

COMMENT ON TABLE public.email_otps IS 'Temporary OTP storage for email verification during signup';

-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name text,
  pricing_type text CHECK (pricing_type IN ('fixed','dynamic')),
  fixed_price numeric CHECK (fixed_price IS NULL OR fixed_price >= 0),
  base_fee numeric CHECK (base_fee IS NULL OR base_fee >= 0),
  per_day_rate numeric CHECK (per_day_rate IS NULL OR per_day_rate >= 0),
  per_participant_rate numeric CHECK (per_participant_rate IS NULL OR per_participant_rate >= 0),
  gst_percentage numeric NOT NULL CHECK (gst_percentage >= 0 AND gst_percentage <= 100),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  config jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_pricing_active ON public.pricing(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_type ON public.pricing(pricing_type);
CREATE INDEX IF NOT EXISTS idx_pricing_tier_name ON public.pricing(tier_name);

COMMENT ON TABLE public.pricing IS 'Admin-configurable pricing: fixed or dynamic models';
COMMENT ON COLUMN public.pricing.pricing_type IS 'fixed: single price | dynamic: calculated based on days + participants';
COMMENT ON COLUMN public.pricing.fixed_price IS 'Fixed pricing amount for one-time fee';
COMMENT ON COLUMN public.pricing.base_fee IS 'Base fee added to dynamic calculations (optional)';
COMMENT ON COLUMN public.pricing.per_day_rate IS 'Price per day for dynamic pricing';
COMMENT ON COLUMN public.pricing.per_participant_rate IS 'Price per participant for dynamic pricing';
COMMENT ON COLUMN public.pricing.config IS 'JSON field for future extensibility (discounts, promotions, regional pricing)';

-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.challengepricing (
  pricing_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  per_day_rate numeric NOT NULL CHECK (per_day_rate >= 0),
  admin_markup numeric CHECK (admin_markup IS NULL OR admin_markup >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  modified_at timestamptz NOT NULL DEFAULT now(),
  tax numeric NOT NULL DEFAULT 18
);

CREATE INDEX IF NOT EXISTS idx_challengepricing_created_at ON public.challengepricing(created_at);

COMMENT ON TABLE public.challengepricing IS 'Challenge-specific pricing configuration (singleton pattern)';
COMMENT ON COLUMN public.challengepricing.per_day_rate IS 'Base price per day for challenges';
COMMENT ON COLUMN public.challengepricing.admin_markup IS 'Optional markup percentage applied by admin';
COMMENT ON COLUMN public.challengepricing.tax IS 'Tax percentage applied to challenge pricing';

-- =====================================================================================

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

COMMENT ON TABLE public.league_tiers IS 'Admin-configurable league tiers with pricing and limits - no hardcoded tiers';
COMMENT ON COLUMN public.league_tiers.name IS 'Unique tier identifier (admin-defined)';
COMMENT ON COLUMN public.league_tiers.max_days IS 'Maximum league duration allowed for this tier';
COMMENT ON COLUMN public.league_tiers.max_participants IS 'Maximum participants allowed for this tier';
COMMENT ON COLUMN public.league_tiers.is_active IS 'Only active tiers are shown to users';
COMMENT ON COLUMN public.league_tiers.display_order IS 'Order for UI display';
COMMENT ON COLUMN public.league_tiers.features IS 'JSON array of tier features/perks';

-- =====================================================================================
-- ROLE & PERMISSION SYSTEM
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.roles (
  role_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name varchar NOT NULL UNIQUE CHECK (char_length(role_name) > 0),
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(role_name);

COMMENT ON TABLE public.roles IS 'Role definitions for role-based access control (Host, Governor, Captain, Player)';

-- =====================================================================================
-- LEAGUE MANAGEMENT
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.leagues (
  league_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_name varchar NOT NULL UNIQUE CHECK (char_length(league_name) >= 3),
  description text,
  logo_url text,
  rules_summary varchar(250),
  rules_doc_url text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status varchar DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','ended','completed','cancelled','abandoned')),
  is_active boolean DEFAULT true,
  num_teams integer DEFAULT 4 CHECK (num_teams > 0),
  max_team_capacity integer DEFAULT 10 CHECK (max_team_capacity > 0),
  rest_days integer DEFAULT 1 CHECK (rest_days >= 0 AND rest_days <= 7),
  auto_rest_day_enabled boolean DEFAULT false,
  is_public boolean DEFAULT false,
  is_exclusive boolean DEFAULT true,
  invite_code varchar UNIQUE,
  normalize_points_by_team_size boolean DEFAULT false,
  tier_id uuid REFERENCES public.league_tiers(id) ON DELETE RESTRICT,
  tier_snapshot jsonb,
  duration_days integer,
  actual_participants integer,
  price_paid numeric,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending','completed','failed')),
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leagues_active ON public.leagues(is_active);
CREATE INDEX IF NOT EXISTS idx_leagues_dates ON public.leagues(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leagues_status ON public.leagues(status);
CREATE INDEX IF NOT EXISTS idx_leagues_invite_code ON public.leagues(invite_code);
CREATE INDEX IF NOT EXISTS idx_leagues_public ON public.leagues(is_public) WHERE is_public = true;

COMMENT ON TABLE public.leagues IS 'League instances with start/end dates and status';
COMMENT ON COLUMN public.leagues.is_active IS 'Soft delete flag - false indicates deactivated league';
COMMENT ON COLUMN public.leagues.status IS 'League lifecycle: scheduled → active → ended → completed; includes cancelled and abandoned';
COMMENT ON COLUMN public.leagues.tier_snapshot IS 'Immutable snapshot of tier config at league creation';
COMMENT ON COLUMN public.leagues.duration_days IS 'Auto-calculated league duration based on start/end dates';
COMMENT ON COLUMN public.leagues.actual_participants IS 'Current participant count';
COMMENT ON COLUMN public.leagues.price_paid IS 'Final price paid for this league';
COMMENT ON COLUMN public.leagues.auto_rest_day_enabled IS 'When true, missing submissions are auto-marked as rest days via cron';
COMMENT ON COLUMN public.leagues.normalize_points_by_team_size IS 'When true, points are normalized by team size to account for teams with different number of members';
COMMENT ON COLUMN public.leagues.rules_summary IS 'Short text summary of league rules (max 250 chars)';
COMMENT ON COLUMN public.leagues.rules_doc_url IS 'URL to uploaded rules document (PDF/Word)';

-- =====================================================================================

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

COMMENT ON TABLE public.activity_categories IS 'Master list of activity categories for filtering and organization';

-- Insert 'Other' category if it doesn't exist (Seed Data)
INSERT INTO public.activity_categories (category_name, display_name, description, display_order)
SELECT 'other', 'Other', 'Custom activities that don''t fit other categories', 999
WHERE NOT EXISTS (
  SELECT 1 FROM public.activity_categories WHERE category_name = 'other'
);

-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.activities (
  activity_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_name varchar NOT NULL UNIQUE,
  description text,
  category_id uuid REFERENCES public.activity_categories(category_id) ON DELETE SET NULL,
  measurement_type activity_measurement_type DEFAULT 'duration' NOT NULL,
  settings jsonb DEFAULT NULL,
  admin_info text DEFAULT NULL,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activities_name ON public.activities(activity_name);
CREATE INDEX IF NOT EXISTS idx_activities_category ON public.activities(category_id);

COMMENT ON TABLE public.activities IS 'Master list of available workout/activity types';
COMMENT ON COLUMN public.activities.measurement_type IS 'Measurement type required for activity (duration, distance, hole, steps)';
COMMENT ON COLUMN public.activities.admin_info IS 'Admin guidance shown to users before uploading for this activity';

-- =====================================================================================

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

COMMENT ON TABLE public.custom_activities IS 'Host-created custom activities, reusable across multiple leagues';
COMMENT ON COLUMN public.custom_activities.category_id IS 'Category this custom activity belongs to (from admin-defined activity_categories)';
COMMENT ON COLUMN public.custom_activities.measurement_type IS 'Type of measurement: duration, distance, hole, steps, or none (no RR calculation)';
COMMENT ON COLUMN public.custom_activities.requires_proof IS 'Whether proof upload is required for this activity';
COMMENT ON COLUMN public.custom_activities.requires_notes IS 'Whether notes/description is required for this activity';

-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.leagueactivities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.activities(activity_id) ON DELETE CASCADE,
  custom_activity_id uuid REFERENCES public.custom_activities(custom_activity_id) ON DELETE CASCADE,
  min_value numeric CHECK (min_value IS NULL OR min_value > 0),
  frequency integer DEFAULT NULL,
  frequency_type text DEFAULT 'weekly' CHECK (frequency_type IN ('weekly', 'monthly')),
  CONSTRAINT leagueactivities_frequency_range CHECK (
    frequency IS NULL
    OR (
      frequency_type = 'weekly'
      AND frequency >= 0 AND frequency <= 7
    )
    OR (
      frequency_type = 'monthly'
      AND frequency >= 0 AND frequency <= 28
    )
  ),
  age_group_overrides jsonb DEFAULT '{}'::jsonb,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  proof_requirement text DEFAULT 'mandatory',
  notes_requirement text DEFAULT 'optional',
  points_per_session numeric DEFAULT 1,
  outcome_config jsonb DEFAULT NULL,
  max_images integer DEFAULT 1,
  custom_field_label text DEFAULT NULL,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  CONSTRAINT check_activity_xor_custom CHECK (
    (activity_id IS NOT NULL AND custom_activity_id IS NULL) OR
    (activity_id IS NULL AND custom_activity_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_leagueactivities_league ON public.leagueactivities(league_id);
CREATE INDEX IF NOT EXISTS idx_leagueactivities_activity ON public.leagueactivities(activity_id);
CREATE INDEX IF NOT EXISTS idx_leagueactivities_custom ON public.leagueactivities(custom_activity_id);
CREATE INDEX IF NOT EXISTS idx_leagueactivities_age_overrides ON public.leagueactivities USING gin(age_group_overrides);

CREATE UNIQUE INDEX IF NOT EXISTS idx_league_activity_unique 
ON public.leagueactivities(league_id, activity_id) 
WHERE activity_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_league_custom_activity_unique 
ON public.leagueactivities(league_id, custom_activity_id) 
WHERE custom_activity_id IS NOT NULL;

COMMENT ON TABLE public.leagueactivities IS 'Defines which activities are allowed in each league';
COMMENT ON COLUMN public.leagueactivities.min_value IS 'Base minimum requirement (applies to all ages unless overridden by age_group_overrides)';
COMMENT ON COLUMN public.leagueactivities.frequency IS 'Max submissions allowed per period per user (weekly: 0-7, monthly: 0-28, or NULL for unlimited)';
COMMENT ON COLUMN public.leagueactivities.frequency_type IS 'Period type for frequency limit (weekly or monthly)';
COMMENT ON COLUMN public.leagueactivities.age_group_overrides IS 'JSONB structure for age-based overrides: {tier0: {ageRange: {min, max}, minValue}, tier1: {...}}';

-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.leagueinvites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  invited_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  CONSTRAINT unique_league_invite UNIQUE (league_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_leagueinvites_league ON public.leagueinvites(league_id);
CREATE INDEX IF NOT EXISTS idx_leagueinvites_user ON public.leagueinvites(user_id);

COMMENT ON TABLE public.leagueinvites IS 'Tracks user invitations to leagues';

-- =====================================================================================
-- TEAM MANAGEMENT
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.teams (
  team_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name varchar NOT NULL CHECK (char_length(team_name) >= 2),
  invite_code varchar UNIQUE,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_name ON public.teams(team_name);
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON public.teams(invite_code);

COMMENT ON TABLE public.teams IS 'Team entities that participate in leagues';

-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.teamleagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  logo_url text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_teamleagues_team ON public.teamleagues(team_id);
CREATE INDEX IF NOT EXISTS idx_teamleagues_league ON public.teamleagues(league_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_league_name ON public.teamleagues(team_id, league_id);

COMMENT ON TABLE public.teamleagues IS 'Junction table for team participation in leagues';

-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.leaguemembers (
  league_member_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(team_id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_league UNIQUE (user_id, league_id)
);

CREATE INDEX IF NOT EXISTS idx_leaguemembers_user ON public.leaguemembers(user_id);
CREATE INDEX IF NOT EXISTS idx_leaguemembers_league ON public.leaguemembers(league_id);
CREATE INDEX IF NOT EXISTS idx_leaguemembers_team ON public.leaguemembers(team_id);
CREATE INDEX IF NOT EXISTS idx_leaguemembers_unassigned ON public.leaguemembers(league_id) WHERE team_id IS NULL;

COMMENT ON TABLE public.leaguemembers IS 'User membership in leagues with optional team assignment';
COMMENT ON COLUMN public.leaguemembers.team_id IS 'NULL indicates user is in allocation bucket awaiting team assignment';

-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.assignedrolesforleague (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(role_id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  CONSTRAINT unique_league_user_role UNIQUE (league_id, user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_assignedrolesforleague_league ON public.assignedrolesforleague(league_id);
CREATE INDEX IF NOT EXISTS idx_assignedrolesforleague_user ON public.assignedrolesforleague(user_id);
CREATE INDEX IF NOT EXISTS idx_assignedrolesforleague_role ON public.assignedrolesforleague(role_id);

COMMENT ON TABLE public.assignedrolesforleague IS 'Multi-role assignments for users within specific leagues';

-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.teammembers (
  team_member_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(role_id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_team_user UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_teammembers_team ON public.teammembers(team_id);
CREATE INDEX IF NOT EXISTS idx_teammembers_user ON public.teammembers(user_id);

COMMENT ON TABLE public.teammembers IS 'Team membership with team-level role assignments';

-- =====================================================================================
-- WORKOUT SUBMISSIONS & VALIDATION
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.effortentry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_member_id uuid NOT NULL REFERENCES public.leaguemembers(league_member_id) ON DELETE CASCADE,
  date date NOT NULL,
  type varchar NOT NULL,
  workout_type varchar,
  duration integer CHECK (duration IS NULL OR duration > 0),
  distance numeric CHECK (distance IS NULL OR distance > 0),
  steps integer CHECK (steps IS NULL OR steps > 0),
  holes integer,
  rr_value numeric,
  status effort_status DEFAULT 'pending',
  proof_url varchar,
  notes text,
  reupload_of uuid REFERENCES public.effortentry(id) ON DELETE SET NULL,
  rejection_reason text,
  outcome text DEFAULT NULL,
  proof_url_2 varchar DEFAULT NULL,
  custom_field_value text DEFAULT NULL,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_effortentry_member ON public.effortentry(league_member_id);
CREATE INDEX IF NOT EXISTS idx_effortentry_date ON public.effortentry(date);
CREATE INDEX IF NOT EXISTS idx_effortentry_status ON public.effortentry(status);
CREATE INDEX IF NOT EXISTS idx_effortentry_member_date ON public.effortentry(league_member_id, date);
CREATE INDEX IF NOT EXISTS idx_effortentry_reupload_of ON public.effortentry(reupload_of);

COMMENT ON TABLE public.effortentry IS 'Workout submission entries with proof and validation status';
COMMENT ON COLUMN public.effortentry.status IS 'Validation state: pending → captain/governor review → approved/rejected';

-- =====================================================================================
-- PAYMENTS & TRANSACTIONS (moved before challenges due to FK dependency)
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.payments (
  payment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  league_id uuid REFERENCES public.leagues(league_id) ON DELETE SET NULL,
  purpose payment_purpose NOT NULL DEFAULT 'league_creation',
  razorpay_order_id varchar NOT NULL UNIQUE,
  razorpay_payment_id varchar UNIQUE,
  razorpay_signature varchar,
  status payment_status NOT NULL DEFAULT 'pending',
  base_amount numeric NOT NULL CHECK (base_amount >= 0),
  platform_fee numeric NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  gst_amount numeric NOT NULL DEFAULT 0 CHECK (gst_amount >= 0),
  total_amount numeric NOT NULL CHECK (total_amount > 0),
  currency varchar NOT NULL DEFAULT 'INR',
  description text,
  receipt varchar,
  notes jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_league ON public.payments(league_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_purpose ON public.payments(purpose);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON public.payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON public.payments(user_id, status);

COMMENT ON TABLE public.payments IS 'Payment transaction records for league creation and subscriptions';

-- =====================================================================================
-- CHALLENGES & SPECIAL EVENTS
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.specialchallenges (
  challenge_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  description text,
  challenge_type varchar DEFAULT 'individual' CHECK (challenge_type IN ('individual', 'team', 'sub_team')),
  is_custom boolean DEFAULT false,
  payment_id uuid,
  doc_url varchar,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_specialchallenges_type ON public.specialchallenges(challenge_type);

COMMENT ON TABLE public.specialchallenges IS 'Master challenge templates (reusable across leagues)';
COMMENT ON COLUMN public.specialchallenges.challenge_type IS 'Challenge scope: individual, team, or sub_team';

-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.leagueschallenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  challenge_id uuid REFERENCES public.specialchallenges(challenge_id) ON DELETE SET NULL,
  name varchar,
  description text,
  challenge_type varchar DEFAULT 'individual' CHECK (challenge_type IN ('individual', 'team', 'sub_team')),
  total_points numeric NOT NULL DEFAULT 0,
  is_custom boolean DEFAULT false,
  payment_id uuid REFERENCES public.payments(payment_id) ON DELETE SET NULL,
  doc_url varchar,
  start_date date,
  end_date date,
  status challenge_status DEFAULT 'active',
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  pricing_id uuid REFERENCES public.challengepricing(pricing_id) ON DELETE SET NULL,
  CONSTRAINT unique_league_challenge UNIQUE (league_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_leagueschallenges_league ON public.leagueschallenges(league_id);
CREATE INDEX IF NOT EXISTS idx_leagueschallenges_status ON public.leagueschallenges(status);

COMMENT ON TABLE public.leagueschallenges IS 'Association between leagues and challenges';

-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.challenge_subteams (
  subteam_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_challenge_id uuid NOT NULL REFERENCES public.leagueschallenges(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
  name varchar NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenge_subteams_challenge ON public.challenge_subteams(league_challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_subteams_team ON public.challenge_subteams(team_id);

COMMENT ON TABLE public.challenge_subteams IS 'Sub-teams for team-based challenges';

-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.challenge_subteam_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subteam_id uuid NOT NULL REFERENCES public.challenge_subteams(subteam_id) ON DELETE CASCADE,
  league_member_id uuid NOT NULL REFERENCES public.leaguemembers(league_member_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenge_subteam_members_subteam ON public.challenge_subteam_members(subteam_id);
CREATE INDEX IF NOT EXISTS idx_challenge_subteam_members_member ON public.challenge_subteam_members(league_member_id);

COMMENT ON TABLE public.challenge_subteam_members IS 'Members of challenge sub-teams';

-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_challenge_id uuid NOT NULL REFERENCES public.leagueschallenges(id) ON DELETE CASCADE,
  league_member_id uuid NOT NULL REFERENCES public.leaguemembers(league_member_id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(team_id) ON DELETE SET NULL,
  sub_team_id uuid REFERENCES public.challenge_subteams(subteam_id) ON DELETE SET NULL,
  proof_url varchar NOT NULL,
  status varchar NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
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

COMMENT ON TABLE public.challenge_submissions IS 'Challenge submission records with approval status and optional custom points';
COMMENT ON COLUMN public.challenge_submissions.awarded_points IS 'Optional custom points awarded (overrides challenge total_points if set)';

-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.specialchallengeindividualuserscore (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.specialchallenges(challenge_id) ON DELETE CASCADE,
  league_member_id uuid NOT NULL REFERENCES public.leaguemembers(league_member_id) ON DELETE CASCADE,
  league_id uuid REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  score numeric DEFAULT 0,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_challenge_member UNIQUE (challenge_id, league_member_id)
);

CREATE INDEX IF NOT EXISTS idx_specialchallenge_individual_challenge ON public.specialchallengeindividualuserscore(challenge_id);
CREATE INDEX IF NOT EXISTS idx_specialchallenge_individual_member ON public.specialchallengeindividualuserscore(league_member_id);
CREATE INDEX IF NOT EXISTS idx_specialchallenge_individual_score ON public.specialchallengeindividualuserscore(score DESC);

COMMENT ON TABLE public.specialchallengeindividualuserscore IS 'Individual player scores for special challenges';

-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.specialchallengeteamscore (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.specialchallenges(challenge_id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  score numeric DEFAULT 0,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_challenge_team UNIQUE (challenge_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_specialchallenge_team_challenge ON public.specialchallengeteamscore(challenge_id);
CREATE INDEX IF NOT EXISTS idx_specialchallenge_team_team ON public.specialchallengeteamscore(team_id);
CREATE INDEX IF NOT EXISTS idx_specialchallenge_team_score ON public.specialchallengeteamscore(score DESC);

COMMENT ON TABLE public.specialchallengeteamscore IS 'Team aggregate scores for special challenges';

-- =====================================================================================
-- TRIGGER FUNCTIONS
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

-- Auto-calculate duration_days on leagues
CREATE OR REPLACE FUNCTION calculate_duration_days()
RETURNS TRIGGER AS $$
BEGIN
  NEW.duration_days = (NEW.end_date - NEW.start_date) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update actual_participants count on member changes
CREATE OR REPLACE FUNCTION update_league_participant_count()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
BEGIN
  SELECT COUNT(*) INTO current_count FROM public.leaguemembers WHERE league_id = COALESCE(NEW.league_id, OLD.league_id);
  UPDATE public.leagues SET actual_participants = current_count WHERE league_id = COALESCE(NEW.league_id, OLD.league_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

CREATE TRIGGER users_modified_date BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER roles_modified_date BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER leagues_modified_date BEFORE UPDATE ON public.leagues
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER teams_modified_date BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER activities_modified_date BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER custom_activities_modified_date BEFORE UPDATE ON public.custom_activities
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER leaguemembers_modified_date BEFORE UPDATE ON public.leaguemembers
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER teammembers_modified_date BEFORE UPDATE ON public.teammembers
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER effortentry_modified_date BEFORE UPDATE ON public.effortentry
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER specialchallenges_modified_date BEFORE UPDATE ON public.specialchallenges
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER specialchallengeindividualuserscore_modified_date BEFORE UPDATE ON public.specialchallengeindividualuserscore
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER specialchallengeteamscore_modified_date BEFORE UPDATE ON public.specialchallengeteamscore
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER pricing_updated_at BEFORE UPDATE ON public.pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER leagueschallenges_updated_at BEFORE UPDATE ON public.leagueschallenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Calculate duration_days on leagues
DROP TRIGGER IF EXISTS trigger_calculate_duration_days ON public.leagues;
CREATE TRIGGER trigger_calculate_duration_days
  BEFORE INSERT OR UPDATE OF start_date, end_date ON public.leagues
  FOR EACH ROW EXECUTE FUNCTION calculate_duration_days();

-- Update participant count on leaguemembers insert/delete
DROP TRIGGER IF EXISTS trigger_update_participant_count_insert ON public.leaguemembers;
DROP TRIGGER IF EXISTS trigger_update_participant_count_delete ON public.leaguemembers;
CREATE TRIGGER trigger_update_participant_count_insert
  AFTER INSERT ON public.leaguemembers
  FOR EACH ROW EXECUTE FUNCTION update_league_participant_count();
CREATE TRIGGER trigger_update_participant_count_delete
  AFTER DELETE ON public.leaguemembers
  FOR EACH ROW EXECUTE FUNCTION update_league_participant_count();


-- =====================================================================================
-- RLS HELPER FUNCTIONS (needed by storage policies below)
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

-- =====================================================================================
-- LOGO STORAGE BUCKETS & POLICIES
-- =====================================================================================

-- Buckets for league and team logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('league-logos', 'league-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('team-logos', 'team-logos', true)
ON CONFLICT (id) DO NOTHING;

-- League logo policies
DROP POLICY IF EXISTS "league-logos_public_read" ON storage.objects;
CREATE POLICY "league-logos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'league-logos');

DROP POLICY IF EXISTS "league-logos_host_insert" ON storage.objects;
CREATE POLICY "league-logos_host_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'league-logos'
  AND public.is_host(auth.uid(), split_part(split_part(name, '/', 1), '.', 1)::uuid)
);

DROP POLICY IF EXISTS "league-logos_host_update" ON storage.objects;
CREATE POLICY "league-logos_host_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'league-logos'
  AND public.is_host(auth.uid(), split_part(split_part(name, '/', 1), '.', 1)::uuid)
);

DROP POLICY IF EXISTS "league-logos_host_delete" ON storage.objects;
CREATE POLICY "league-logos_host_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'league-logos'
  AND public.is_host(auth.uid(), split_part(split_part(name, '/', 1), '.', 1)::uuid)
);

-- Team logo policies
DROP POLICY IF EXISTS "team-logos_public_read" ON storage.objects;
CREATE POLICY "team-logos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-logos');

DROP POLICY IF EXISTS "team-logos_captain_or_host_insert" ON storage.objects;
CREATE POLICY "team-logos_captain_or_host_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'team-logos'
  AND (
    public.is_host(auth.uid(), split_part(name, '/', 1)::uuid)
    OR public.is_captain_of_team(auth.uid(), split_part(split_part(name, '/', 2), '.', 1)::uuid)
  )
);

DROP POLICY IF EXISTS "team-logos_captain_or_host_update" ON storage.objects;
CREATE POLICY "team-logos_captain_or_host_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'team-logos'
  AND (
    public.is_host(auth.uid(), split_part(name, '/', 1)::uuid)
    OR public.is_captain_of_team(auth.uid(), split_part(split_part(name, '/', 2), '.', 1)::uuid)
  )
);

DROP POLICY IF EXISTS "team-logos_captain_or_host_delete" ON storage.objects;
CREATE POLICY "team-logos_captain_or_host_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'team-logos'
  AND (
    public.is_host(auth.uid(), split_part(name, '/', 1)::uuid)
    OR public.is_captain_of_team(auth.uid(), split_part(split_part(name, '/', 2), '.', 1)::uuid)
  )
);

-- TeamLeagues update policy for logo changes
DROP POLICY IF EXISTS teamleagues_update_host_or_captain ON public.teamleagues;
CREATE POLICY teamleagues_update_host_or_captain ON public.teamleagues
  FOR UPDATE
  USING (
    public.is_host(auth.uid(), league_id)
    OR public.is_captain_of_team(auth.uid(), team_id)
  )
  WITH CHECK (
    public.is_host(auth.uid(), league_id)
    OR public.is_captain_of_team(auth.uid(), team_id)
  );

-- =====================================================================================
-- REST DAY DONATIONS (with two-stage approval: Captain → Governor/Host)
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.rest_day_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
    donor_member_id UUID NOT NULL REFERENCES public.leaguemembers(league_member_id) ON DELETE CASCADE,
    receiver_member_id UUID NOT NULL REFERENCES public.leaguemembers(league_member_id) ON DELETE CASCADE,
    days_transferred INTEGER NOT NULL CHECK (days_transferred > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'captain_approved', 'approved', 'rejected')),
    proof_url TEXT,
    notes TEXT,
    captain_approved_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    captain_approved_at TIMESTAMPTZ,
    final_approved_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    final_approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rest_day_donations_league ON public.rest_day_donations(league_id);
CREATE INDEX IF NOT EXISTS idx_rest_day_donations_donor ON public.rest_day_donations(donor_member_id);
CREATE INDEX IF NOT EXISTS idx_rest_day_donations_receiver ON public.rest_day_donations(receiver_member_id);
CREATE INDEX IF NOT EXISTS idx_rest_day_donations_status ON public.rest_day_donations(status);

COMMENT ON TABLE public.rest_day_donations IS 'Tracks rest day donations between league members with two-stage approval';
COMMENT ON COLUMN public.rest_day_donations.donor_member_id IS 'The member donating rest days';
COMMENT ON COLUMN public.rest_day_donations.receiver_member_id IS 'The member receiving rest days';
COMMENT ON COLUMN public.rest_day_donations.status IS 'Donation status: pending → captain_approved → approved | rejected';
COMMENT ON COLUMN public.rest_day_donations.proof_url IS 'URL to proof image/document for the donation request';
COMMENT ON COLUMN public.rest_day_donations.captain_approved_by IS 'User ID of captain who approved (stage 1)';
COMMENT ON COLUMN public.rest_day_donations.captain_approved_at IS 'Timestamp of captain approval';
COMMENT ON COLUMN public.rest_day_donations.final_approved_by IS 'User ID of governor/host who gave final approval (stage 2)';
COMMENT ON COLUMN public.rest_day_donations.final_approved_at IS 'Timestamp of final approval';

-- Updated_at trigger for rest_day_donations
CREATE OR REPLACE FUNCTION update_rest_day_donations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rest_day_donations_updated_at
    BEFORE UPDATE ON public.rest_day_donations
    FOR EACH ROW
    EXECUTE FUNCTION update_rest_day_donations_updated_at();

-- =====================================================================================
-- DONATION PROOFS STORAGE BUCKET
-- =====================================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('donation-proofs', 'donation-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Donation proofs policies
DROP POLICY IF EXISTS "donation-proofs_public_read" ON storage.objects;
CREATE POLICY "donation-proofs_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'donation-proofs');

DROP POLICY IF EXISTS "donation-proofs_authenticated_insert" ON storage.objects;
CREATE POLICY "donation-proofs_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'donation-proofs');

DROP POLICY IF EXISTS "donation-proofs_owner_delete" ON storage.objects;
CREATE POLICY "donation-proofs_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'donation-proofs'
    AND auth.uid()::text = (storage.foldername(name))[2]
);

-- =====================================================================================
-- LEAGUE RULES STORAGE BUCKET
-- =====================================================================================

-- Create league-rules bucket (10MB limit for PDF/Word documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('league-rules', 'league-rules', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Public read access for league rules
DROP POLICY IF EXISTS "league-rules_public_read" ON storage.objects;
CREATE POLICY "league-rules_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'league-rules');

-- Host can insert rules documents
DROP POLICY IF EXISTS "league-rules_host_insert" ON storage.objects;
CREATE POLICY "league-rules_host_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'league-rules'
  AND public.is_host(auth.uid(), split_part(split_part(name, '/', 1), '.', 1)::uuid)
);

-- Host can update rules documents
DROP POLICY IF EXISTS "league-rules_host_update" ON storage.objects;
CREATE POLICY "league-rules_host_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'league-rules'
  AND public.is_host(auth.uid(), split_part(split_part(name, '/', 1), '.', 1)::uuid)
);

-- Host can delete rules documents
DROP POLICY IF EXISTS "league-rules_host_delete" ON storage.objects;
CREATE POLICY "league-rules_host_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'league-rules'
  AND public.is_host(auth.uid(), split_part(split_part(name, '/', 1), '.', 1)::uuid)
);

-- =====================================================================================
-- PROFILE PICTURE STORAGE BUCKET
-- =====================================================================================

-- Create profile-pictures bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Profile picture storage policies
-- Public read access
DROP POLICY IF EXISTS "profile-pictures_public_read" ON storage.objects;
CREATE POLICY "profile-pictures_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

-- Users can upload to their own folder
DROP POLICY IF EXISTS "profile-pictures_user_insert" ON storage.objects;
CREATE POLICY "profile-pictures_user_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Users can update their own files
DROP POLICY IF EXISTS "profile-pictures_user_update" ON storage.objects;
CREATE POLICY "profile-pictures_user_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Users can delete their own files
DROP POLICY IF EXISTS "profile-pictures_user_delete" ON storage.objects;
CREATE POLICY "profile-pictures_user_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-pictures'
  AND auth.uid()::text = split_part(name, '/', 1)
);


-- =====================================================================================
-- TOURNAMENT FEATURE UPDATES (Merged)
-- =====================================================================================

-- 1. Remove unique constraint to allow multiple challenges of same type
ALTER TABLE public.leagueschallenges DROP CONSTRAINT IF EXISTS unique_league_challenge;

-- 2. Update challenge_type check constraints to include 'tournament'
ALTER TABLE public.specialchallenges DROP CONSTRAINT IF EXISTS specialchallenges_challenge_type_check;
ALTER TABLE public.leagueschallenges DROP CONSTRAINT IF EXISTS leagueschallenges_challenge_type_check;

ALTER TABLE public.specialchallenges ADD CONSTRAINT specialchallenges_challenge_type_check 
  CHECK (challenge_type IN ('individual', 'team', 'sub_team', 'tournament'));

ALTER TABLE public.leagueschallenges ADD CONSTRAINT leagueschallenges_challenge_type_check 
  CHECK (challenge_type IN ('individual', 'team', 'sub_team', 'tournament'));

-- 3. Create Tournament Matches Table (NO RLS as requested)
CREATE TABLE IF NOT EXISTS public.challenge_tournament_matches (
    match_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    league_challenge_id uuid NOT NULL REFERENCES public.leagueschallenges(id) ON DELETE CASCADE,
    
    -- Organization
    round_number integer DEFAULT 0,
    round_name text,                -- "Group Stage", "Semi-Final", "Final"
    group_id text,                  -- Optional: "A", "B"
    
    -- Teams
    team1_id uuid REFERENCES public.teams(team_id) ON DELETE SET NULL,
    team2_id uuid REFERENCES public.teams(team_id) ON DELETE SET NULL,
    
    -- Results
    score1 integer DEFAULT 0,
    score2 integer DEFAULT 0,
    winner_id uuid REFERENCES public.teams(team_id) ON DELETE SET NULL,
    
    -- Meta
    status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
    start_time timestamptz,
    location text,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_ct_matches_challenge ON public.challenge_tournament_matches(league_challenge_id);
CREATE INDEX IF NOT EXISTS idx_ct_matches_teams ON public.challenge_tournament_matches(team1_id, team2_id);
CREATE INDEX IF NOT EXISTS idx_ct_matches_round ON public.challenge_tournament_matches(league_challenge_id, round_number);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS challenge_tournament_matches_updated_at ON public.challenge_tournament_matches;
CREATE TRIGGER challenge_tournament_matches_updated_at BEFORE UPDATE ON public.challenge_tournament_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- NOTE: RLS IS EXPLICITLY DISABLED/NOT ENABLED FOR THIS TABLE


-- 5. Helper RPC to get matches with team names (SAFE JOIN)
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
    m.match_id,
    m.league_challenge_id,
    m.round_number,
    m.round_name,
    m.group_id,
    m.team1_id,
    m.team2_id,
    m.score1,
    m.score2,
    m.winner_id,
    m.status,
    m.start_time,
    m.location,
    m.created_at,
    m.updated_at,
    json_build_object('team_name', t1.team_name) as team1,
    json_build_object('team_name', t2.team_name) as team2
  FROM challenge_tournament_matches m
  LEFT JOIN teams t1 ON m.team1_id = t1.team_id
  LEFT JOIN teams t2 ON m.team2_id = t2.team_id
  WHERE m.league_challenge_id = p_challenge_id
  ORDER BY m.round_number ASC, m.start_time ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_tournament_matches(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tournament_matches(uuid) TO service_role;


-- =====================================================================================
-- END OF SCHEMA
-- =====================================================================================
