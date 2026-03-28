-- ============================================================================
-- V2.5 AI League Manager — Database Tables
-- Run against Supabase SQL Editor
-- ============================================================================

-- 1. Host Digest Items
CREATE TABLE IF NOT EXISTS ai_host_digest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(league_id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 5,
  metadata JSONB DEFAULT '{}',
  action_type TEXT,
  action_payload JSONB,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_host_digest_league_date ON ai_host_digest(league_id, date);

-- 2. AI Message Drafts
CREATE TABLE IF NOT EXISTS ai_message_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(league_id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES users(user_id),
  type TEXT NOT NULL CHECK (type IN ('nudge', 'team_nudge', 'announcement', 'intervention', 'challenge_hype', 'challenge_results')),
  target_scope TEXT NOT NULL CHECK (target_scope IN ('league', 'team', 'individual')),
  target_id UUID,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'edited', 'sent', 'dismissed')),
  context_data JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_drafts_league ON ai_message_drafts(league_id, status);

-- 3. AI Interventions
CREATE TABLE IF NOT EXISTS ai_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(league_id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  member_user_id UUID NOT NULL REFERENCES users(user_id),
  team_id UUID REFERENCES teams(team_id),
  trigger_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_action TEXT,
  player_context JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acted', 'dismissed', 'resolved')),
  draft_id UUID REFERENCES ai_message_drafts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_interventions_league ON ai_interventions(league_id, date);
CREATE INDEX IF NOT EXISTS idx_ai_interventions_member ON ai_interventions(member_user_id);

-- 4. Challenge Templates
CREATE TABLE IF NOT EXISTS challenge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  default_duration INT NOT NULL DEFAULT 7,
  comm_schedule JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Challenge Communication Schedule
CREATE TABLE IF NOT EXISTS challenge_comm_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(league_id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES leagueschallenges(id) ON DELETE CASCADE,
  template_id UUID REFERENCES challenge_templates(id),
  scheduled_date DATE NOT NULL,
  draft_type TEXT NOT NULL,
  prompt_hint TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'skipped')),
  draft_id UUID REFERENCES ai_message_drafts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenge_comm_league ON challenge_comm_schedule(league_id, scheduled_date);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE ai_host_digest ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_message_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_comm_schedule ENABLE ROW LEVEL SECURITY;

-- Host digest: league hosts/governors can read
CREATE POLICY "ai_host_digest_read" ON ai_host_digest FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leaguemembers lm
      WHERE lm.league_id = ai_host_digest.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('host', 'governor')
    )
    OR EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = ai_host_digest.league_id
        AND l.created_by = auth.uid()
    )
  );

-- Drafts: host who owns the draft
CREATE POLICY "ai_drafts_read" ON ai_message_drafts FOR SELECT
  USING (host_user_id = auth.uid());

CREATE POLICY "ai_drafts_update" ON ai_message_drafts FOR UPDATE
  USING (host_user_id = auth.uid());

-- Interventions: league hosts/governors
CREATE POLICY "ai_interventions_read" ON ai_interventions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leaguemembers lm
      WHERE lm.league_id = ai_interventions.league_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('host', 'governor')
    )
    OR EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = ai_interventions.league_id
        AND l.created_by = auth.uid()
    )
  );

-- Challenge templates: readable by all authenticated users
CREATE POLICY "challenge_templates_read" ON challenge_templates FOR SELECT
  USING (is_active = true);

-- Challenge comm schedule: league hosts/governors
CREATE POLICY "challenge_comm_read" ON challenge_comm_schedule FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = challenge_comm_schedule.league_id
        AND l.created_by = auth.uid()
    )
  );

-- Service role bypass for all tables (API routes use service role)
-- No additional policy needed — service role bypasses RLS

-- ============================================================================
-- Seed Challenge Templates
-- ============================================================================

INSERT INTO challenge_templates (name, description, category, default_duration, comm_schedule) VALUES
('Step It Up', 'Daily step count challenge — who can walk the most?', 'steps', 7,
  '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Kick off the step challenge with energy"}, {"day_offset": 3, "type": "announcement", "prompt_hint": "Mid-week check-in, share current standings"}, {"day_offset": 6, "type": "challenge_results", "prompt_hint": "Final day results and celebration"}]'),

('Consistency King', 'Log every single day for a week — no rest days allowed', 'consistency', 7,
  '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Announce the consistency challenge"}, {"day_offset": 4, "type": "announcement", "prompt_hint": "Who is still going strong? Encourage the rest"}, {"day_offset": 6, "type": "challenge_results", "prompt_hint": "Celebrate those who logged every day"}]'),

('Early Bird', 'Log your activity before 8 AM every day', 'time_based', 5,
  '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Early morning challenge starts now!"}, {"day_offset": 4, "type": "challenge_results", "prompt_hint": "Who was the earliest bird?"}]'),

('Team Spirit Week', 'Every team member must log at least once — team-wide participation', 'team', 7,
  '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Team spirit week! Get every member involved"}, {"day_offset": 3, "type": "team_nudge", "prompt_hint": "Check which teams have 100% participation"}, {"day_offset": 6, "type": "challenge_results", "prompt_hint": "Announce the most spirited team"}]'),

('Distance Dash', 'Cumulative distance challenge — run, walk, or cycle', 'distance', 7,
  '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Distance dash begins! Every km counts"}, {"day_offset": 3, "type": "announcement", "prompt_hint": "Halfway mark — share distance leaderboard"}, {"day_offset": 6, "type": "challenge_results", "prompt_hint": "Final distances and winner announcement"}]'),

('Weekend Warrior', 'Saturday and Sunday activity challenge', 'weekend', 2,
  '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Weekend warrior challenge — make the most of your weekend!"}, {"day_offset": 1, "type": "challenge_results", "prompt_hint": "Weekend results and highlights"}]'),

('Mindful Minutes', 'Meditation or yoga challenge — focus on recovery', 'wellness', 7,
  '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Mindful minutes challenge for mental wellness"}, {"day_offset": 6, "type": "challenge_results", "prompt_hint": "Celebrate mindfulness achievements"}]'),

('Photo Proof', 'Submit a photo with every activity — accountability challenge', 'proof', 5,
  '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Photo proof challenge — show us your effort!"}, {"day_offset": 4, "type": "challenge_results", "prompt_hint": "Best photos and most consistent submitters"}]'),

('Power Hour', 'Log at least 60 minutes of activity each day', 'duration', 5,
  '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "Power hour challenge — 60 minutes a day!"}, {"day_offset": 2, "type": "announcement", "prompt_hint": "Who is keeping up the power hours?"}, {"day_offset": 4, "type": "challenge_results", "prompt_hint": "Power hour champions announced"}]'),

('League Finale', 'End-of-league final push — last 3 days maximum effort', 'finale', 3,
  '[{"day_offset": 0, "type": "challenge_hype", "prompt_hint": "FINAL PUSH! Last 3 days of the league"}, {"day_offset": 1, "type": "announcement", "prompt_hint": "2 days left — current standings"}, {"day_offset": 2, "type": "challenge_results", "prompt_hint": "League finale results — celebrate everyone!"}]')

ON CONFLICT DO NOTHING;
