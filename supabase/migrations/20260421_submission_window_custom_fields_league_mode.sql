-- Client features migration: submission window, 2nd custom field, challenges-only league, host-add-players

-- F1: Submission window per activity (how many days back a player can submit)
ALTER TABLE public.leagueactivities
  ADD COLUMN IF NOT EXISTS submission_window_days integer DEFAULT NULL;

COMMENT ON COLUMN public.leagueactivities.submission_window_days IS 'Number of past days allowed for submission. NULL = default (today/yesterday only). E.g. 7 = can submit for any day within last 7 days.';

-- F7: Second custom field per activity
ALTER TABLE public.leagueactivities
  ADD COLUMN IF NOT EXISTS custom_field_label_2 text DEFAULT NULL;
ALTER TABLE public.leagueactivities
  ADD COLUMN IF NOT EXISTS custom_field_placeholder text DEFAULT NULL;
ALTER TABLE public.leagueactivities
  ADD COLUMN IF NOT EXISTS custom_field_placeholder_2 text DEFAULT NULL;

ALTER TABLE public.effortentry
  ADD COLUMN IF NOT EXISTS custom_field_value_2 text DEFAULT NULL;

COMMENT ON COLUMN public.leagueactivities.custom_field_label_2 IS 'Label for the second custom field on submission form';
COMMENT ON COLUMN public.leagueactivities.custom_field_placeholder IS 'Placeholder/default text for first custom field';
COMMENT ON COLUMN public.leagueactivities.custom_field_placeholder_2 IS 'Placeholder/default text for second custom field';
COMMENT ON COLUMN public.effortentry.custom_field_value_2 IS 'Value submitted for the second custom field';

-- F8: Challenges-only league mode
ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS league_mode text DEFAULT 'standard' NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leagues_league_mode_check'
      AND conrelid = 'public.leagues'::regclass
  ) THEN
    ALTER TABLE public.leagues
      ADD CONSTRAINT leagues_league_mode_check
      CHECK (league_mode IN ('standard', 'challenges_only'));
  END IF;
END $$;

COMMENT ON COLUMN public.leagues.league_mode IS 'standard = activities + challenges, challenges_only = no activity submissions required';
