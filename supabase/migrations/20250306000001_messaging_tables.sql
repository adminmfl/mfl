-- =====================================================================================
-- Migration: Team Messaging Engine
-- Description: Creates messaging tables for in-app team group chat
-- Author: MFL Engineering Team
-- Created: 2025-03-06
-- =====================================================================================
-- New tables: messages, message_read_receipts, canned_messages
-- These are ADDITIVE ONLY - no existing tables are modified.
-- =====================================================================================

-- =====================================================================================
-- ENUMS
-- =====================================================================================

CREATE TYPE message_type AS ENUM ('chat', 'announcement', 'system');
CREATE TYPE message_visibility AS ENUM ('all', 'captains_only');

-- =====================================================================================
-- MESSAGES TABLE
-- =====================================================================================

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

-- Primary query: fetch messages for a team in a league, newest first
CREATE INDEX idx_messages_league_team_created ON public.messages(league_id, team_id, created_at DESC);
-- Broadcasts (team_id IS NULL)
CREATE INDEX idx_messages_broadcasts ON public.messages(league_id, created_at DESC) WHERE team_id IS NULL;
-- Visibility filter
CREATE INDEX idx_messages_visibility ON public.messages(visibility);
-- Sender lookup
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

COMMENT ON TABLE public.messages IS 'Team group chat messages within leagues';
COMMENT ON COLUMN public.messages.team_id IS 'NULL = broadcast to all teams in league';
COMMENT ON COLUMN public.messages.visibility IS 'all = everyone sees it, captains_only = only captains/host/governor';
COMMENT ON COLUMN public.messages.is_important IS 'Flagged as important/announcement - can be pinned';
COMMENT ON COLUMN public.messages.deep_link IS 'In-app link e.g. /leagues/{id}/challenges/{cid}';

-- =====================================================================================
-- MESSAGE READ RECEIPTS
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(message_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_message_user_read UNIQUE (message_id, user_id)
);

CREATE INDEX idx_read_receipts_user ON public.message_read_receipts(user_id);
CREATE INDEX idx_read_receipts_message ON public.message_read_receipts(message_id);

COMMENT ON TABLE public.message_read_receipts IS 'Tracks which users have read which messages';

-- =====================================================================================
-- CANNED MESSAGES (Pre-built templates)
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.canned_messages (
  canned_message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  role_target varchar NOT NULL CHECK (role_target IN ('host', 'governor', 'captain')),
  title varchar NOT NULL,
  content text NOT NULL,
  is_system boolean DEFAULT false,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_canned_messages_league ON public.canned_messages(league_id);
CREATE INDEX idx_canned_messages_role ON public.canned_messages(role_target);
CREATE INDEX idx_canned_messages_system ON public.canned_messages(is_system) WHERE is_system = true;

COMMENT ON TABLE public.canned_messages IS 'Pre-built message templates for hosts, governors, captains';
COMMENT ON COLUMN public.canned_messages.league_id IS 'NULL = global/platform-level template';
COMMENT ON COLUMN public.canned_messages.is_system IS 'TRUE = MFL-provided default, FALSE = user-customized';

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

CREATE TRIGGER canned_messages_updated_at BEFORE UPDATE ON public.canned_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================================================
-- RLS
-- =====================================================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canned_messages ENABLE ROW LEVEL SECURITY;

-- MESSAGES POLICIES --

-- League members can read messages in their team (visibility = 'all')
CREATE POLICY messages_select_team_all ON public.messages
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND visibility = 'all'
    AND is_member_of_league(auth.uid(), league_id)
    AND (
      team_id IS NULL  -- broadcasts visible to all
      OR team_id = get_user_team_in_league(auth.uid(), league_id)
    )
  );

-- Captains/Host/Governor can read captains_only messages
CREATE POLICY messages_select_captains_only ON public.messages
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND visibility = 'captains_only'
    AND (
      is_host(auth.uid(), league_id)
      OR is_governor(auth.uid(), league_id)
      OR is_captain_of_team(auth.uid(), COALESCE(team_id, get_user_team_in_league(auth.uid(), league_id)))
    )
  );

-- Host/Governor can read ALL messages in their league (for moderation)
CREATE POLICY messages_select_admin ON public.messages
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (is_host(auth.uid(), league_id) OR is_governor(auth.uid(), league_id))
  );

-- League members can send messages to their own team
CREATE POLICY messages_insert_member ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND is_member_of_league(auth.uid(), league_id)
    AND (
      -- Players/Captains can only send to their own team
      team_id = get_user_team_in_league(auth.uid(), league_id)
      -- Host/Governor can send to any team or broadcast (team_id NULL)
      OR is_host(auth.uid(), league_id)
      OR is_governor(auth.uid(), league_id)
    )
  );

-- Only sender can edit their message
CREATE POLICY messages_update_sender ON public.messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

-- Host can delete any message in their league (soft delete)
CREATE POLICY messages_update_host ON public.messages
  FOR UPDATE
  USING (is_host(auth.uid(), league_id));

-- READ RECEIPTS POLICIES --

-- Users can view read receipts for messages they can see
CREATE POLICY read_receipts_select ON public.message_read_receipts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.message_id = message_read_receipts.message_id
        AND is_member_of_league(auth.uid(), m.league_id)
    )
  );

-- Users can mark messages as read (for themselves only)
CREATE POLICY read_receipts_insert ON public.message_read_receipts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- CANNED MESSAGES POLICIES --

-- League members can view canned messages (system + their league)
CREATE POLICY canned_messages_select ON public.canned_messages
  FOR SELECT
  USING (
    is_system = true
    OR (league_id IS NOT NULL AND is_member_of_league(auth.uid(), league_id))
  );

-- Host/Governor can create custom canned messages for their league
CREATE POLICY canned_messages_insert ON public.canned_messages
  FOR INSERT
  WITH CHECK (
    league_id IS NOT NULL
    AND (is_host(auth.uid(), league_id) OR is_governor(auth.uid(), league_id))
  );

-- Host/Governor can update canned messages in their league
CREATE POLICY canned_messages_update ON public.canned_messages
  FOR UPDATE
  USING (
    is_system = false
    AND league_id IS NOT NULL
    AND (is_host(auth.uid(), league_id) OR is_governor(auth.uid(), league_id))
  );

-- Host can delete custom canned messages
CREATE POLICY canned_messages_delete ON public.canned_messages
  FOR DELETE
  USING (
    is_system = false
    AND league_id IS NOT NULL
    AND is_host(auth.uid(), league_id)
  );

-- =====================================================================================
-- GRANTS
-- =====================================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT ON public.message_read_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.canned_messages TO authenticated;

-- =====================================================================================
-- REALTIME - Enable for live chat via Supabase WebSockets
-- =====================================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- =====================================================================================
-- SEED: Default system canned messages
-- =====================================================================================

INSERT INTO public.canned_messages (role_target, title, content, is_system) VALUES
  -- Host messages
  ('host', 'Welcome to the League', 'Welcome everyone to the league! Let''s make this an amazing fitness journey together. Stay active, stay motivated!', true),
  ('host', 'New Challenge Launched', 'A new challenge has been launched! Check the challenges section for details and rules. Let''s go!', true),
  ('host', 'Daily Reminder', 'Reminder: Please submit your activities before end of day. Every effort counts towards your team score!', true),
  ('host', 'Rest Day Policy', 'Quick update on rest day policy - please check the league rules for the latest rest day allowances.', true),
  ('host', 'Standings Update', 'League standings have been updated! Check the leaderboard to see where your team stands. Keep pushing!', true),
  ('host', 'Rules Update', 'Important rules update - please review the updated league rules carefully. Reach out if you have questions.', true),
  ('host', 'Week Summary', 'Great week everyone! Here''s a quick summary of how all teams performed. Keep the momentum going!', true),
  ('host', 'Final Week Push', 'We''re in the final stretch! Give it everything you''ve got this last week. Every point matters!', true),

  -- Captain messages
  ('captain', 'Great Job Team', 'Great job today, team! Your effort is showing on the leaderboard. Keep it up!', true),
  ('captain', 'Push Harder', 'Let''s push harder this week! We can climb the standings if we all stay consistent.', true),
  ('captain', 'Log Activities', 'Team, don''t forget to log your activities today. Even a short walk counts!', true),
  ('captain', 'Welcome New Member', 'Welcome to the team! We''re glad to have you. Feel free to ask any questions.', true),
  ('captain', 'Strategy Discussion', 'Team strategy discussion - let''s plan our approach for the upcoming challenge.', true),
  ('captain', 'Motivation Boost', 'Remember why we started! Stay focused, stay disciplined. We''ve got this!', true),

  -- Governor messages
  ('governor', 'Validation Complete', 'Validation round complete. All submissions have been reviewed. Check your status.', true),
  ('governor', 'Pending Submissions', 'There are pending submissions awaiting review. Captains, please review your team''s entries.', true),
  ('governor', 'Score Update', 'Scores have been updated after the latest review. Check the leaderboard for current standings.', true),
  ('governor', 'Dispute Resolved', 'A score dispute has been reviewed and resolved. Please check the updated scores.', true);

-- =====================================================================================
-- END OF MIGRATION
-- =====================================================================================
