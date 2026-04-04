-- AI Coach Messages table
-- Stores AI-generated motivational messages for players, teams, and captains

CREATE TABLE IF NOT EXISTS ai_coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(league_id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(team_id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(user_id) ON DELETE CASCADE,
  message_type varchar(30) NOT NULL CHECK (message_type IN ('individual', 'team', 'captain', 'bonding', 'challenge')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_coach_league ON ai_coach_messages(league_id, created_at DESC);
CREATE INDEX idx_ai_coach_user ON ai_coach_messages(user_id, created_at DESC);
CREATE INDEX idx_ai_coach_team ON ai_coach_messages(team_id, created_at DESC);
CREATE INDEX idx_ai_coach_type ON ai_coach_messages(message_type);

-- RLS
ALTER TABLE ai_coach_messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own messages (individual or team-wide for their team)
CREATE POLICY "Users can read own ai coach messages"
  ON ai_coach_messages FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      user_id IS NULL
      AND team_id IN (
        SELECT t.team_id FROM teams t
        JOIN leaguemembers lm ON lm.team_id = t.team_id
        WHERE lm.user_id = auth.uid()
      )
    )
  );

-- Users can update is_read/is_dismissed on their messages
CREATE POLICY "Users can update own ai coach messages"
  ON ai_coach_messages FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      user_id IS NULL
      AND team_id IN (
        SELECT t.team_id FROM teams t
        JOIN leaguemembers lm ON lm.team_id = t.team_id
        WHERE lm.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (
      user_id IS NULL
      AND team_id IN (
        SELECT t.team_id FROM teams t
        JOIN leaguemembers lm ON lm.team_id = t.team_id
        WHERE lm.user_id = auth.uid()
      )
    )
  );

-- Service role can insert (cron job)
CREATE POLICY "Service role can insert ai coach messages"
  ON ai_coach_messages FOR INSERT
  WITH CHECK (true);

-- AI Coach chat history for Q&A feature
CREATE TABLE IF NOT EXISTS ai_coach_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(league_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role varchar(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_chat_user_league ON ai_coach_chats(user_id, league_id, created_at DESC);

ALTER TABLE ai_coach_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own chats"
  ON ai_coach_chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats"
  ON ai_coach_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id OR true);

CREATE POLICY "Service role full access chats"
  ON ai_coach_chats FOR ALL
  USING (true);
