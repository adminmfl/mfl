-- Migration: Enhance challenge_templates with rules + scoring_logic columns
-- Actual existing columns: id, title, description, challenge_type, duration_days,
-- total_points, scoring_rules, difficulty, tags, comm_templates, is_active, created_at

-- Add new columns (additive, backward-compatible)
ALTER TABLE challenge_templates
  ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scoring_logic JSONB DEFAULT '{}'::jsonb;

-- Update existing templates with structured rules and scoring logic
UPDATE challenge_templates SET
  rules = '[{"rule_text": "Log at least 10,000 steps daily", "is_mandatory": true}, {"rule_text": "Use a fitness tracker or phone pedometer", "is_mandatory": false}]'::jsonb,
  scoring_logic = '{"type": "cumulative", "points_per_completion": 1, "bonus_rules": [{"condition": "all_days_completed", "bonus_points": 3}]}'::jsonb
WHERE title = 'Step It Up';

UPDATE challenge_templates SET
  rules = '[{"rule_text": "Log an activity every single day of the challenge", "is_mandatory": true}, {"rule_text": "Any approved activity counts", "is_mandatory": true}]'::jsonb,
  scoring_logic = '{"type": "streak", "points_per_completion": 1, "bonus_rules": [{"condition": "perfect_streak", "bonus_points": 5}]}'::jsonb
WHERE title = 'Consistency King';

UPDATE challenge_templates SET
  rules = '[{"rule_text": "Complete your activity before 7 AM local time", "is_mandatory": true}, {"rule_text": "Proof must include timestamp", "is_mandatory": false}]'::jsonb,
  scoring_logic = '{"type": "daily", "points_per_completion": 2, "bonus_rules": []}'::jsonb
WHERE title = 'Early Bird';

UPDATE challenge_templates SET
  rules = '[{"rule_text": "100% team participation required for full points", "is_mandatory": true}, {"rule_text": "Team captain must verify each member logged", "is_mandatory": false}]'::jsonb,
  scoring_logic = '{"type": "team_participation", "points_per_completion": 1, "bonus_rules": [{"condition": "100_percent_team", "bonus_points": 5}]}'::jsonb
WHERE title = 'Team Spirit Week';

UPDATE challenge_templates SET
  rules = '[{"rule_text": "Log distance-based activities (running, walking, cycling)", "is_mandatory": true}, {"rule_text": "Minimum 2km per session to count", "is_mandatory": true}]'::jsonb,
  scoring_logic = '{"type": "cumulative_distance", "points_per_completion": 1, "bonus_rules": [{"condition": "top_3_distance", "bonus_points": 3}]}'::jsonb
WHERE title = 'Distance Dash';

UPDATE challenge_templates SET
  rules = '[{"rule_text": "Log activities on both Saturday and Sunday", "is_mandatory": true}]'::jsonb,
  scoring_logic = '{"type": "completion", "points_per_completion": 3, "bonus_rules": []}'::jsonb
WHERE title = 'Weekend Warrior';

UPDATE challenge_templates SET
  rules = '[{"rule_text": "Log at least 15 minutes of mindfulness, meditation, or yoga", "is_mandatory": true}]'::jsonb,
  scoring_logic = '{"type": "daily", "points_per_completion": 1, "bonus_rules": [{"condition": "all_days_completed", "bonus_points": 2}]}'::jsonb
WHERE title = 'Mindful Minutes';

UPDATE challenge_templates SET
  rules = '[{"rule_text": "Every activity submission must include photo proof", "is_mandatory": true}, {"rule_text": "Photo must clearly show the activity", "is_mandatory": true}]'::jsonb,
  scoring_logic = '{"type": "daily", "points_per_completion": 2, "bonus_rules": []}'::jsonb
WHERE title = 'Photo Proof';

UPDATE challenge_templates SET
  rules = '[{"rule_text": "Complete a 60-minute workout session", "is_mandatory": true}, {"rule_text": "Duration must be verified via tracker or proof", "is_mandatory": false}]'::jsonb,
  scoring_logic = '{"type": "daily", "points_per_completion": 2, "bonus_rules": [{"condition": "all_days_completed", "bonus_points": 3}]}'::jsonb
WHERE title = 'Power Hour';

UPDATE challenge_templates SET
  rules = '[{"rule_text": "Complete your activity on all 3 final days", "is_mandatory": true}, {"rule_text": "Share your league journey summary with the team", "is_mandatory": false}]'::jsonb,
  scoring_logic = '{"type": "completion", "points_per_completion": 3, "bonus_rules": [{"condition": "perfect_attendance", "bonus_points": 5}]}'::jsonb
WHERE title = 'League Finale';
