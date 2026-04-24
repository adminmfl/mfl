-- Migration: Vice Captain role + Player Workout Visibility settings
-- Date: 2026-04-24

-- 1. Add vice_captain role (if not exists)
INSERT INTO public.roles (role_name)
SELECT 'vice_captain'
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles WHERE role_name = 'vice_captain'
);

-- 2. Add league-level workout visibility settings
ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS player_team_workout_visibility boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS player_league_workout_visibility boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.leagues.player_team_workout_visibility IS 'When true, players can see their teammates last 5 approved submissions';
COMMENT ON COLUMN public.leagues.player_league_workout_visibility IS 'When true, players can search and view other teams member workouts';
