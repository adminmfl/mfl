const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://umxfgpwvsgorkwytgbcc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVteGZncHd2c2dvcmt3eXRnYmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTcwMTk2MywiZXhwIjoyMDgxMjc3OTYzfQ.nC6Sr8MtbZdRT7uZGHhaavID30N6iCrOxL5nV4dIZu8'
);

async function run() {
  console.log('=== Running V2.5 Meeting Migrations ===\n');

  // 1. Insert expanded canned messages
  const newMessages = [
    { role_target: 'host', title: 'Keep It Going!', content: "Amazing energy this week! Keep pushing — every day counts toward your goal. The finish line is closer than you think!", is_system: true },
    { role_target: 'host', title: 'You Are Making a Difference', content: "Your consistent effort is inspiring others in the league. Every activity you log ripples through the team. Keep showing up!", is_system: true },
    { role_target: 'host', title: 'Midweek Motivation', content: "We are halfway through the week! Don't let up now. A strong finish this week sets the tone for next week.", is_system: true },
    { role_target: 'host', title: 'Final Push', content: "We are in the final stretch! Give it everything you have. This is where champions are made.", is_system: true },
    { role_target: 'captain', title: 'Team Rally', content: "Team, let's make today count! We are close to hitting our target. Log your activity and let's finish strong together!", is_system: true },
    { role_target: 'captain', title: 'Celebrate Small Wins', content: "Shout out to everyone who logged today — that's discipline right there! Let's keep this streak alive.", is_system: true },
    { role_target: 'host', title: 'We Miss You!', content: "Hey! We noticed you have been away for a few days. No pressure — even a short walk counts. We'd love to see you back!", is_system: true },
    { role_target: 'host', title: 'Quick Check-In', content: "Just checking in — everything okay? Remember, consistency beats intensity. Even 10 minutes of activity today keeps your streak alive.", is_system: true },
    { role_target: 'host', title: 'Team Needs You', content: "Your team is counting on your participation! Log any activity today — it all adds up for the team score.", is_system: true },
    { role_target: 'captain', title: 'Missed You Today', content: "Hey, we missed your activity log today! Don't worry — jump back in tomorrow. We're stronger with you!", is_system: true },
    { role_target: 'host', title: 'Challenge Kickoff', content: "A new challenge is LIVE! Check your challenges tab for details. This is your chance to earn bonus points and stand out!", is_system: true },
    { role_target: 'host', title: 'Challenge Midway Check', content: "We are halfway through the challenge! Check the leaderboard to see where you stand. Still time to catch up!", is_system: true },
    { role_target: 'host', title: 'Challenge Results', content: "The challenge is complete! Congratulations to all participants. Check the leaderboard for final standings and winners!", is_system: true },
    { role_target: 'host', title: 'Challenge Reminder', content: "Don't forget — the challenge ends soon! Make sure you submit your entries before the deadline.", is_system: true },
    { role_target: 'captain', title: 'Team Challenge Update', content: "Team update on the challenge: let's coordinate our efforts. Every submission counts toward our team score!", is_system: true },
    { role_target: 'host', title: 'Week 1 Complete!', content: "Congratulations! You have completed your first week. The hardest part is starting — and you did it!", is_system: true },
    { role_target: 'host', title: 'Halfway There!', content: "You are officially halfway through the league! Look how far you have come. Keep the momentum going!", is_system: true },
    { role_target: 'host', title: 'Final Week!', content: "This is the FINAL WEEK! Give it your absolute best. Finish strong and make every day count!", is_system: true },
    { role_target: 'host', title: 'Perfect Week!', content: "What a week! 100% participation from the league. This is what teamwork and commitment look like!", is_system: true },
    { role_target: 'host', title: 'Weekly Wrap-Up', content: "Here's your weekly summary: Check the leaderboard for standings, review your team's progress, and set goals for next week!", is_system: true },
    { role_target: 'host', title: 'Monday Kickoff', content: "New week, fresh start! Set your goals for this week and let's make it count. Log your first activity today!", is_system: true },
    { role_target: 'governor', title: 'Weekly Validation Summary', content: "Weekly validation update: Please review any pending submissions. Timely validation keeps the league running smoothly.", is_system: true },
    { role_target: 'host', title: 'Rest Day Reminder', content: "Remember: rest days are part of the plan! Use them wisely — recovery is just as important as activity.", is_system: true },
    { role_target: 'host', title: 'Rest Days Running Low', content: "Heads up: some members are running low on rest days. Encourage your teams to plan their remaining rest days carefully.", is_system: true },
  ];

  const { data: existing } = await supabase.from('canned_messages').select('title');
  const existingTitles = new Set((existing || []).map(e => e.title));
  const toInsert = newMessages.filter(m => !existingTitles.has(m.title));

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from('canned_messages').insert(toInsert);
    if (insertErr) console.log('Insert canned messages error:', insertErr.message);
    else console.log(`Inserted ${toInsert.length} new canned messages`);
  } else {
    console.log('All canned messages already exist');
  }

  const { count } = await supabase.from('canned_messages').select('*', { count: 'exact', head: true });
  console.log(`Total canned messages: ${count}`);

  // Note: DDL changes (ALTER TABLE for rules/scoring_logic/category columns)
  // need to be run via Supabase Dashboard SQL Editor
  console.log('\n=== NOTE: Run these DDL statements in Supabase SQL Editor ===');
  console.log('1. ALTER TABLE challenge_templates ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT \'[]\'::jsonb, ADD COLUMN IF NOT EXISTS scoring_logic JSONB DEFAULT \'{}\'::jsonb;');
  console.log('2. ALTER TABLE canned_messages ADD COLUMN IF NOT EXISTS category TEXT DEFAULT \'general\';');
  console.log('3. ALTER TABLE leagueactivities DROP CONSTRAINT IF EXISTS leagueactivities_frequency_type_check; ALTER TABLE leagueactivities ADD CONSTRAINT leagueactivities_frequency_type_check CHECK (frequency_type IN (\'daily\', \'weekly\', \'monthly\'));');
}

run().catch(console.error);
