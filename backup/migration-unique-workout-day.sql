-- Migration: Unique Workout Day Challenge
-- Run this in Supabase SQL Editor

-- 1. Flag on leagueschallenges to mark a challenge as "unique workout day" type
ALTER TABLE leagueschallenges
ADD COLUMN IF NOT EXISTS is_unique_workout boolean NOT NULL DEFAULT false;

-- 2. Reference to the effortentry the player is claiming as their unique workout
ALTER TABLE challenge_submissions
ADD COLUMN IF NOT EXISTS workout_entry_id uuid DEFAULT NULL;

-- 3. Date of the workout being claimed (for display/audit)
ALTER TABLE challenge_submissions
ADD COLUMN IF NOT EXISTS submission_date date DEFAULT NULL;
