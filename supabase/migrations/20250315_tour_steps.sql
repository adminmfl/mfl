-- =====================================================================================
-- Migration: Onboarding Tour Steps (Admin-configurable, app-wide)
-- Description: Stores tour steps managed by super admin
-- =====================================================================================

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

CREATE INDEX idx_tour_steps_order ON public.tour_steps(sort_order);

COMMENT ON TABLE public.tour_steps IS 'App-wide onboarding tour steps managed by super admin';
COMMENT ON COLUMN public.tour_steps.icon_name IS 'Lucide icon name (e.g., Dumbbell, Trophy, Target)';

CREATE TRIGGER tour_steps_updated_at BEFORE UPDATE ON public.tour_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.tour_steps ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active tour steps
CREATE POLICY tour_steps_select ON public.tour_steps
  FOR SELECT
  USING (true);

-- Only platform admins can manage (enforced at API level, service role bypasses RLS)
GRANT SELECT ON public.tour_steps TO authenticated;

-- Seed with default steps
INSERT INTO public.tour_steps (title, description, icon_name, icon_color, sort_order) VALUES
  ('Submit Your Activity', 'Log your daily workouts — running, yoga, cycling, gym, and more. Upload a screenshot as proof and the app calculates your effort score (Run Rate) automatically. Consistency is key — submit every day to maximize your team''s score!', 'Dumbbell', 'text-green-500', 0),
  ('Points & Scoring', 'Every approved workout earns you points based on your Run Rate. The harder you push, the more points you earn (up to 2x). Your points add up to your team''s total on the leaderboard. Team rankings are updated daily!', 'Trophy', 'text-amber-500', 1),
  ('Run Rate (RR)', 'Run Rate measures your workout intensity on a 0-2 scale. An RR of 1.0 means you met the minimum effort — anything above is bonus! RR is calculated from duration, distance, or steps depending on the activity. Age-adjusted thresholds ensure fairness for all.', 'TrendingUp', 'text-blue-500', 2),
  ('Challenges', 'Compete in special challenges for bonus points! Individual challenges test your personal limits, while team challenges bring everyone together. Watch for new challenge announcements from your host — they can be game-changers on the leaderboard.', 'Target', 'text-purple-500', 3),
  ('Activities', 'Choose from 15+ activity types across cardio, strength, flexibility, and wellness. Each activity has its own measurement — duration, distance, steps, or holes. Your host may also create custom activities specific to your league. Pick what you love and get moving!', 'Activity', 'text-red-500', 4);
