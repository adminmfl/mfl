import { getDashboardSummary } from '../../src/lib/services/dashboard';
import { getBestInsightsServer } from '../../src/lib/services/ai-insights';
import { getLeagueById, getUserRolesInLeague } from '../../src/lib/services/leagues';

async function run() {
  const leagueId = 'd3bc815b-1032-45d6-a7c1-cb6f56deb8dd';
  const userId = '0110f245-44bc-4335-9509-755717fe878a'; 
  const origin = 'http://localhost:3000';

  console.log('Fetching League...');
  console.time('League Info & Roles');
  await Promise.all([
    getLeagueById(leagueId),
    getUserRolesInLeague(userId, leagueId)
  ]);
  console.timeEnd('League Info & Roles');

  console.log('Starting dashboard and AI fetching...');
  
  console.time('AI Insights');
  const aiPromise = getBestInsightsServer(
    leagueId,
    userId,
    "my_activity",
    ["welcome_text", "coach_insight", "stat_label_rr", "stat_label_missed"],
    origin,
  ).then(() => console.timeEnd('AI Insights'));

  console.time('Dashboard Summary');
  const dashPromise = getDashboardSummary({ leagueId, userId, weekOffset: 0 }).then(() => console.timeEnd('Dashboard Summary'));

  await Promise.all([aiPromise, dashPromise]);
  console.log('Done!');
}

run().catch(console.error);
