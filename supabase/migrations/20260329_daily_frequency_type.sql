-- Migration: Add 'daily' frequency_type to leagueactivities
-- Supports multiple submissions per day (e.g., 2x/day, 3x/day)
-- Daily frequency means: frequency = max entries per day for that activity

-- Drop existing CHECK constraint on frequency_type and recreate with 'daily'
ALTER TABLE leagueactivities
  DROP CONSTRAINT IF EXISTS leagueactivities_frequency_type_check;

ALTER TABLE leagueactivities
  ADD CONSTRAINT leagueactivities_frequency_type_check
  CHECK (frequency_type IN ('daily', 'weekly', 'monthly'));

-- Update frequency range constraint to support daily (max 10 per day)
ALTER TABLE leagueactivities
  DROP CONSTRAINT IF EXISTS leagueactivities_frequency_range;

ALTER TABLE leagueactivities
  ADD CONSTRAINT leagueactivities_frequency_range
  CHECK (
    frequency IS NULL
    OR (frequency >= 1 AND frequency <= 28)
  );
