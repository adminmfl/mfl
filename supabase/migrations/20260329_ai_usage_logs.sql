-- AI Usage Logs — track token consumption and cost per LLM call
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature TEXT NOT NULL,           -- ai-manager, ai-coach, league-creator, league-plan, ai-motivate
  league_id UUID REFERENCES leagues(league_id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by league or feature
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_league ON ai_usage_logs(league_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature ON ai_usage_logs(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON ai_usage_logs(created_at);

-- RLS: only service role inserts (server-side logging)
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
