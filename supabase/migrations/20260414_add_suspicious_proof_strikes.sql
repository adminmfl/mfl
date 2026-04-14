-- Suspicious-proof strike controls: strike count, last strike timestamp, and league thresholds

ALTER TABLE public.leaguemembers
  ADD COLUMN IF NOT EXISTS suspicious_proof_strikes integer DEFAULT 0 NOT NULL;

ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS suspicious_proof_warning_threshold integer DEFAULT 2 NOT NULL;

ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS suspicious_proof_rejection_threshold integer DEFAULT 3 NOT NULL;

ALTER TABLE public.leaguemembers
  ADD COLUMN IF NOT EXISTS suspicious_proof_last_strike_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leagues_suspicious_proof_warning_threshold_check'
      AND conrelid = 'public.leagues'::regclass
  ) THEN
    ALTER TABLE public.leagues
      ADD CONSTRAINT leagues_suspicious_proof_warning_threshold_check
      CHECK (suspicious_proof_warning_threshold >= 1);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leagues_suspicious_proof_rejection_threshold_check'
      AND conrelid = 'public.leagues'::regclass
  ) THEN
    ALTER TABLE public.leagues
      ADD CONSTRAINT leagues_suspicious_proof_rejection_threshold_check
      CHECK (
        suspicious_proof_rejection_threshold >= suspicious_proof_warning_threshold
      );
  END IF;
END $$;

COMMENT ON COLUMN public.leaguemembers.suspicious_proof_strikes IS 'Number of suspicious-proof strikes for this member in this league';
COMMENT ON COLUMN public.leaguemembers.suspicious_proof_last_strike_at IS 'Timestamp when the most recent suspicious-proof strike was issued';
COMMENT ON COLUMN public.leagues.suspicious_proof_warning_threshold IS 'Strike count at or above which warning UX should be shown';
COMMENT ON COLUMN public.leagues.suspicious_proof_rejection_threshold IS 'Strike count at or above which suspicious rejection escalates to permanent rejection';
