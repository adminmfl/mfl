-- =====================================================================================
-- DEV FULL RESET: Wipe EVERYTHING then re-run migrations
-- Run this in Supabase SQL Editor for the dev project
-- =====================================================================================

SET session_replication_role = 'replica';

-- Messaging tables
DROP TABLE IF EXISTS public.message_read_receipts CASCADE;
DROP TABLE IF EXISTS public.canned_messages CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;

-- Challenge tournament
DROP TABLE IF EXISTS public.challenge_tournament_matches CASCADE;

-- Rest day donations
DROP TABLE IF EXISTS public.rest_day_donations CASCADE;

-- Payments
DROP TABLE IF EXISTS public.payments CASCADE;

-- Challenge scores
DROP TABLE IF EXISTS public.specialchallengeteamscore CASCADE;
DROP TABLE IF EXISTS public.specialchallengeindividualuserscore CASCADE;

-- Challenge submissions & subteams
DROP TABLE IF EXISTS public.challenge_submissions CASCADE;
DROP TABLE IF EXISTS public.challenge_subteam_members CASCADE;
DROP TABLE IF EXISTS public.challenge_subteams CASCADE;

-- Challenges
DROP TABLE IF EXISTS public.leagueschallenges CASCADE;
DROP TABLE IF EXISTS public.specialchallenges CASCADE;

-- Workout submissions
DROP TABLE IF EXISTS public.effortentry CASCADE;

-- Team membership & roles
DROP TABLE IF EXISTS public.teammembers CASCADE;
DROP TABLE IF EXISTS public.assignedrolesforleague CASCADE;
DROP TABLE IF EXISTS public.leaguemembers CASCADE;
DROP TABLE IF EXISTS public.teamleagues CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

-- League configuration
DROP TABLE IF EXISTS public.leagueinvites CASCADE;
DROP TABLE IF EXISTS public.leagueactivities CASCADE;
DROP TABLE IF EXISTS public.custom_activities CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.activity_categories CASCADE;
DROP TABLE IF EXISTS public.leagues CASCADE;

-- Tiers & pricing
DROP TABLE IF EXISTS public.league_tiers CASCADE;
DROP TABLE IF EXISTS public.challengepricing CASCADE;
DROP TABLE IF EXISTS public.pricing CASCADE;

-- Core tables
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.email_otps CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Functions
DROP FUNCTION IF EXISTS update_modified_date() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS calculate_duration_days() CASCADE;
DROP FUNCTION IF EXISTS update_league_participant_count() CASCADE;
DROP FUNCTION IF EXISTS update_rest_day_donations_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.get_tournament_matches(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_roles_in_league(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS is_host(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS is_governor(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS is_captain(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS is_captain_of_team(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS is_player(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_team_in_league(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS is_member_of_league(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_league_member_id(uuid, uuid) CASCADE;

-- Types
DROP TYPE IF EXISTS effort_status CASCADE;
DROP TYPE IF EXISTS platform_role CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS payment_purpose CASCADE;
DROP TYPE IF EXISTS challenge_status CASCADE;
DROP TYPE IF EXISTS activity_measurement_type CASCADE;
DROP TYPE IF EXISTS message_type CASCADE;
DROP TYPE IF EXISTS message_visibility CASCADE;

SET session_replication_role = 'origin';
