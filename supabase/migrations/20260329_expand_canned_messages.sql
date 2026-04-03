-- Migration: Add category column + expand pre-cast message library

-- Add category column
ALTER TABLE canned_messages
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Backfill existing messages with categories
UPDATE canned_messages SET category = 'onboarding' WHERE title ILIKE '%welcome%' OR title ILIKE '%onboard%';
UPDATE canned_messages SET category = 'challenge' WHERE title ILIKE '%challenge%';
UPDATE canned_messages SET category = 'reminder' WHERE title ILIKE '%remind%' OR title ILIKE '%log%' OR title ILIKE '%pending%';
UPDATE canned_messages SET category = 'motivation' WHERE title ILIKE '%great%' OR title ILIKE '%push%' OR title ILIKE '%job%';
UPDATE canned_messages SET category = 'update' WHERE title ILIKE '%update%' OR title ILIKE '%score%' OR title ILIKE '%complete%';
UPDATE canned_messages SET category = 'policy' WHERE title ILIKE '%rest%' OR title ILIKE '%policy%' OR title ILIKE '%rule%';

-- Insert new system canned messages for expanded library
-- MOTIVATION category
INSERT INTO canned_messages (canned_message_id, role_target, title, content, is_system, category)
VALUES
  (gen_random_uuid(), 'host', 'Keep It Going!', 'Amazing energy this week! Keep pushing — every day counts toward your goal. The finish line is closer than you think!', true, 'motivation'),
  (gen_random_uuid(), 'host', 'You Are Making a Difference', 'Your consistent effort is inspiring others in the league. Every activity you log ripples through the team. Keep showing up!', true, 'motivation'),
  (gen_random_uuid(), 'host', 'Midweek Motivation', 'We are halfway through the week! Don''t let up now. A strong finish this week sets the tone for next week.', true, 'motivation'),
  (gen_random_uuid(), 'host', 'Final Push', 'We are in the final stretch! Give it everything you have. This is where champions are made.', true, 'motivation'),
  (gen_random_uuid(), 'captain', 'Team Rally', 'Team, let''s make today count! We are close to hitting our target. Log your activity and let''s finish strong together!', true, 'motivation'),
  (gen_random_uuid(), 'captain', 'Celebrate Small Wins', 'Shout out to everyone who logged today — that''s discipline right there! Let''s keep this streak alive.', true, 'motivation')
ON CONFLICT DO NOTHING;

-- INACTIVITY category
INSERT INTO canned_messages (canned_message_id, role_target, title, content, is_system, category)
VALUES
  (gen_random_uuid(), 'host', 'We Miss You!', 'Hey! We noticed you have been away for a few days. No pressure — even a short walk counts. We''d love to see you back!', true, 'inactivity'),
  (gen_random_uuid(), 'host', 'Quick Check-In', 'Just checking in — everything okay? Remember, consistency beats intensity. Even 10 minutes of activity today keeps your streak alive.', true, 'inactivity'),
  (gen_random_uuid(), 'host', 'Team Needs You', 'Your team is counting on your participation! Log any activity today — it all adds up for the team score.', true, 'inactivity'),
  (gen_random_uuid(), 'captain', 'Missed You Today', 'Hey, we missed your activity log today! Don''t worry — jump back in tomorrow. We''re stronger with you!', true, 'inactivity')
ON CONFLICT DO NOTHING;

-- CHALLENGE category
INSERT INTO canned_messages (canned_message_id, role_target, title, content, is_system, category)
VALUES
  (gen_random_uuid(), 'host', 'Challenge Kickoff', 'A new challenge is LIVE! Check your challenges tab for details. This is your chance to earn bonus points and stand out!', true, 'challenge'),
  (gen_random_uuid(), 'host', 'Challenge Midway Check', 'We are halfway through the challenge! Check the leaderboard to see where you stand. Still time to catch up!', true, 'challenge'),
  (gen_random_uuid(), 'host', 'Challenge Results', 'The challenge is complete! Congratulations to all participants. Check the leaderboard for final standings and winners!', true, 'challenge'),
  (gen_random_uuid(), 'host', 'Challenge Reminder', 'Don''t forget — the challenge ends soon! Make sure you submit your entries before the deadline.', true, 'challenge'),
  (gen_random_uuid(), 'captain', 'Team Challenge Update', 'Team update on the challenge: let''s coordinate our efforts. Every submission counts toward our team score!', true, 'challenge')
ON CONFLICT DO NOTHING;

-- MILESTONE category
INSERT INTO canned_messages (canned_message_id, role_target, title, content, is_system, category)
VALUES
  (gen_random_uuid(), 'host', 'Week 1 Complete!', 'Congratulations! You have completed your first week. The hardest part is starting — and you did it!', true, 'milestone'),
  (gen_random_uuid(), 'host', 'Halfway There!', 'You are officially halfway through the league! Look how far you have come. Keep the momentum going!', true, 'milestone'),
  (gen_random_uuid(), 'host', 'Final Week!', 'This is the FINAL WEEK! Give it your absolute best. Finish strong and make every day count!', true, 'milestone'),
  (gen_random_uuid(), 'host', 'Perfect Week!', 'What a week! 100% participation from the league. This is what teamwork and commitment look like!', true, 'milestone')
ON CONFLICT DO NOTHING;

-- WEEKLY SUMMARY category
INSERT INTO canned_messages (canned_message_id, role_target, title, content, is_system, category)
VALUES
  (gen_random_uuid(), 'host', 'Weekly Wrap-Up', 'Here''s your weekly summary: Check the leaderboard for standings, review your team''s progress, and set goals for next week!', true, 'summary'),
  (gen_random_uuid(), 'host', 'Monday Kickoff', 'New week, fresh start! Set your goals for this week and let''s make it count. Log your first activity today!', true, 'summary'),
  (gen_random_uuid(), 'governor', 'Weekly Validation Summary', 'Weekly validation update: Please review any pending submissions. Timely validation keeps the league running smoothly.', true, 'summary')
ON CONFLICT DO NOTHING;

-- REST DAY category
INSERT INTO canned_messages (canned_message_id, role_target, title, content, is_system, category)
VALUES
  (gen_random_uuid(), 'host', 'Rest Day Reminder', 'Remember: rest days are part of the plan! Use them wisely — recovery is just as important as activity. You have a limited number, so plan ahead.', true, 'policy'),
  (gen_random_uuid(), 'host', 'Rest Days Running Low', 'Heads up: some members are running low on rest days. Encourage your teams to plan their remaining rest days carefully.', true, 'policy')
ON CONFLICT DO NOTHING;
