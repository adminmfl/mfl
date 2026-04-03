/**
 * Dev Seed Script - Realistic Indian Fitness League Data
 *
 * Run: npx tsx supabase/seed-dev.ts
 *
 * Uses .env.dev credentials to populate a fresh dev Supabase DB with:
 * - 1 Admin user
 * - 1 Active league ("Bangalore Corporate Fitness League - Season 3")
 * - 4 Teams with Indian corporate-style names
 * - 22 Users (1 host, 1 governor, 4 captains, 16 players) - all Indian names
 * - Role assignments, team memberships, league memberships
 * - Activities, pricing
 * - Sample effort entries
 * - Sample messages for testing the chat feature
 *
 * All users login with password: Test@1234
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// --- Load .env.dev ---
const envPath = path.resolve(__dirname, '../.env.dev');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim();
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.dev');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// bcrypt hash of "Test@1234" (10 rounds)
const PASSWORD_HASH = '$2b$10$gGqS.Yks0JGpcNSD/nQQUuZVL1fB74zU3r8IAVf1ywYgdT.nnBoC6';

// --- Fixed UUIDs for deterministic references ---
const IDS = {
  // Roles
  hostRole: '00000000-0000-0000-0000-000000000001',
  governorRole: '00000000-0000-0000-0000-000000000002',
  captainRole: '00000000-0000-0000-0000-000000000003',
  playerRole: '00000000-0000-0000-0000-000000000004',

  // Admin
  admin: '10000000-0000-0000-0000-000000000001',

  // League
  league1: '20000000-0000-0000-0000-000000000001',

  // Teams
  teamAlpha: '30000000-0000-0000-0000-000000000001',
  teamBeta: '30000000-0000-0000-0000-000000000002',
  teamGamma: '30000000-0000-0000-0000-000000000003',
  teamDelta: '30000000-0000-0000-0000-000000000004',

  // Host & Governor
  host: '40000000-0000-0000-0000-000000000001',
  governor: '40000000-0000-0000-0000-000000000002',

  // Captains (1 per team)
  captainAlpha: '50000000-0000-0000-0000-000000000001',
  captainBeta: '50000000-0000-0000-0000-000000000002',
  captainGamma: '50000000-0000-0000-0000-000000000003',
  captainDelta: '50000000-0000-0000-0000-000000000004',

  // Players (4 per team)
  playerA1: '60000000-0000-0000-0000-000000000001',
  playerA2: '60000000-0000-0000-0000-000000000002',
  playerA3: '60000000-0000-0000-0000-000000000003',
  playerA4: '60000000-0000-0000-0000-000000000004',
  playerB1: '60000000-0000-0000-0000-000000000005',
  playerB2: '60000000-0000-0000-0000-000000000006',
  playerB3: '60000000-0000-0000-0000-000000000007',
  playerB4: '60000000-0000-0000-0000-000000000008',
  playerC1: '60000000-0000-0000-0000-000000000009',
  playerC2: '60000000-0000-0000-0000-000000000010',
  playerC3: '60000000-0000-0000-0000-000000000011',
  playerC4: '60000000-0000-0000-0000-000000000012',
  playerD1: '60000000-0000-0000-0000-000000000013',
  playerD2: '60000000-0000-0000-0000-000000000014',
  playerD3: '60000000-0000-0000-0000-000000000015',
  playerD4: '60000000-0000-0000-0000-000000000016',

  // Activities
  actRunning: '70000000-0000-0000-0000-000000000001',
  actCycling: '70000000-0000-0000-0000-000000000002',
  actSwimming: '70000000-0000-0000-0000-000000000003',
  actGym: '70000000-0000-0000-0000-000000000004',
  actYoga: '70000000-0000-0000-0000-000000000005',
  actWalking: '70000000-0000-0000-0000-000000000006',
  actSports: '70000000-0000-0000-0000-000000000007',
  actOther: '70000000-0000-0000-0000-000000000008',

  // Pricing
  pricing1: '80000000-0000-0000-0000-000000000001',
};

async function seed() {
  console.log('Starting dev seed...');
  console.log(`Target: ${SUPABASE_URL}`);

  // =============================================
  // 1. ROLES
  // =============================================
  console.log('Seeding roles...');
  await supabase.from('roles').upsert([
    { role_id: IDS.hostRole, role_name: 'host' },
    { role_id: IDS.governorRole, role_name: 'governor' },
    { role_id: IDS.captainRole, role_name: 'captain' },
    { role_id: IDS.playerRole, role_name: 'player' },
  ], { onConflict: 'role_name' });

  // =============================================
  // 2. ACTIVITIES
  // =============================================
  console.log('Seeding activities...');
  await supabase.from('activities').upsert([
    { activity_id: IDS.actRunning, activity_name: 'Running', description: 'Outdoor or treadmill running' },
    { activity_id: IDS.actCycling, activity_name: 'Cycling', description: 'Road cycling or stationary bike' },
    { activity_id: IDS.actSwimming, activity_name: 'Swimming', description: 'Pool or open water swimming' },
    { activity_id: IDS.actGym, activity_name: 'Gym', description: 'Weight training and gym exercises' },
    { activity_id: IDS.actYoga, activity_name: 'Yoga', description: 'Yoga and stretching' },
    { activity_id: IDS.actWalking, activity_name: 'Walking', description: 'Walking or hiking' },
    { activity_id: IDS.actSports, activity_name: 'Sports', description: 'Team sports like cricket, badminton, etc.' },
    { activity_id: IDS.actOther, activity_name: 'Other', description: 'Other physical activities' },
  ], { onConflict: 'activity_name' });

  // =============================================
  // 3. PRICING
  // =============================================
  console.log('Seeding pricing...');
  await supabase.from('pricing').upsert([
    { id: IDS.pricing1, base_price: 499, platform_fee: 99, gst_percentage: 18, is_active: true },
  ]);

  // =============================================
  // 4. USERS (Indian names, realistic emails)
  // =============================================
  console.log('Seeding users...');
  const users = [
    // Admin
    { user_id: IDS.admin, username: 'Admin MFL', email: 'admin@myfitnessleague.com', password_hash: PASSWORD_HASH, platform_role: 'admin', phone: '9876500000', gender: 'male', date_of_birth: '1985-06-15' },
    // Host
    { user_id: IDS.host, username: 'Rajesh Sharma', email: 'rajesh.sharma@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500001', gender: 'male', date_of_birth: '1982-03-21' },
    // Governor
    { user_id: IDS.governor, username: 'Priya Nair', email: 'priya.nair@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500002', gender: 'female', date_of_birth: '1988-11-05' },
    // Captains
    { user_id: IDS.captainAlpha, username: 'Vikram Patel', email: 'vikram.patel@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500010', gender: 'male', date_of_birth: '1990-01-15' },
    { user_id: IDS.captainBeta, username: 'Ananya Reddy', email: 'ananya.reddy@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500011', gender: 'female', date_of_birth: '1992-07-22' },
    { user_id: IDS.captainGamma, username: 'Arjun Menon', email: 'arjun.menon@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500012', gender: 'male', date_of_birth: '1989-04-18' },
    { user_id: IDS.captainDelta, username: 'Sneha Iyer', email: 'sneha.iyer@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500013', gender: 'female', date_of_birth: '1991-09-30' },
    // Team Alpha Players
    { user_id: IDS.playerA1, username: 'Amit Desai', email: 'amit.desai@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500101', gender: 'male', date_of_birth: '1993-02-14' },
    { user_id: IDS.playerA2, username: 'Kavitha Rao', email: 'kavitha.rao@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500102', gender: 'female', date_of_birth: '1994-06-08' },
    { user_id: IDS.playerA3, username: 'Rohit Kulkarni', email: 'rohit.kulkarni@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500103', gender: 'male', date_of_birth: '1991-12-25' },
    { user_id: IDS.playerA4, username: 'Divya Joshi', email: 'divya.joshi@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500104', gender: 'female', date_of_birth: '1995-08-19' },
    // Team Beta Players
    { user_id: IDS.playerB1, username: 'Suresh Kumar', email: 'suresh.kumar@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500201', gender: 'male', date_of_birth: '1990-05-11' },
    { user_id: IDS.playerB2, username: 'Meena Krishnan', email: 'meena.krishnan@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500202', gender: 'female', date_of_birth: '1993-10-03' },
    { user_id: IDS.playerB3, username: 'Karthik Srinivasan', email: 'karthik.s@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500203', gender: 'male', date_of_birth: '1992-01-27' },
    { user_id: IDS.playerB4, username: 'Pooja Hegde', email: 'pooja.hegde@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500204', gender: 'female', date_of_birth: '1994-03-16' },
    // Team Gamma Players
    { user_id: IDS.playerC1, username: 'Nikhil Gupta', email: 'nikhil.gupta@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500301', gender: 'male', date_of_birth: '1991-07-09' },
    { user_id: IDS.playerC2, username: 'Ritu Singh', email: 'ritu.singh@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500302', gender: 'female', date_of_birth: '1993-11-22' },
    { user_id: IDS.playerC3, username: 'Aakash Verma', email: 'aakash.verma@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500303', gender: 'male', date_of_birth: '1990-09-14' },
    { user_id: IDS.playerC4, username: 'Tanvi Bhatt', email: 'tanvi.bhatt@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500304', gender: 'female', date_of_birth: '1995-04-06' },
    // Team Delta Players
    { user_id: IDS.playerD1, username: 'Siddharth Jain', email: 'siddharth.jain@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500401', gender: 'male', date_of_birth: '1992-08-17' },
    { user_id: IDS.playerD2, username: 'Nandini Pillai', email: 'nandini.pillai@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500402', gender: 'female', date_of_birth: '1994-01-29' },
    { user_id: IDS.playerD3, username: 'Harsh Agarwal', email: 'harsh.agarwal@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500403', gender: 'male', date_of_birth: '1991-06-12' },
    { user_id: IDS.playerD4, username: 'Swati Mishra', email: 'swati.mishra@test.com', password_hash: PASSWORD_HASH, platform_role: 'user', phone: '9876500404', gender: 'female', date_of_birth: '1993-12-08' },
  ];

  const { error: usersErr } = await supabase.from('users').upsert(users, { onConflict: 'email' });
  if (usersErr) { console.error('Users error:', usersErr); return; }

  // =============================================
  // 5. LEAGUE
  // =============================================
  console.log('Seeding league...');
  await supabase.from('leagues').upsert([{
    league_id: IDS.league1,
    league_name: 'Bangalore Corporate Fitness League - Season 3',
    description: 'Inter-company fitness league for Bangalore tech companies. 4 weeks of challenges, team activities, and friendly competition. Stay fit, have fun!',
    start_date: '2026-03-01',
    end_date: '2026-03-31',
    status: 'active',
    is_active: true,
    num_teams: 4,
    max_team_capacity: 5,
    rest_days: 1,
    is_public: false,
    is_exclusive: false,
    invite_code: 'BLRCORP3',
    created_by: IDS.host,
  }], { onConflict: 'league_name' });

  // =============================================
  // 6. LEAGUE ACTIVITIES
  // =============================================
  console.log('Seeding league activities...');
  const leagueActivities = [
    IDS.actRunning, IDS.actCycling, IDS.actGym, IDS.actYoga, IDS.actWalking, IDS.actSports,
  ].map(actId => ({
    league_id: IDS.league1,
    activity_id: actId,
    created_by: IDS.host,
  }));
  await supabase.from('leagueactivities').upsert(leagueActivities, { onConflict: 'league_id,activity_id' });

  // =============================================
  // 7. TEAMS
  // =============================================
  console.log('Seeding teams...');
  await supabase.from('teams').upsert([
    { team_id: IDS.teamAlpha, team_name: 'Cubbon Chargers', invite_code: 'CUBCHARGE', created_by: IDS.host },
    { team_id: IDS.teamBeta, team_name: 'Indiranagar Strikers', invite_code: 'INDISTRIK', created_by: IDS.host },
    { team_id: IDS.teamGamma, team_name: 'Koramangala Kings', invite_code: 'KORAKINGS', created_by: IDS.host },
    { team_id: IDS.teamDelta, team_name: 'Whitefield Warriors', invite_code: 'WFWARRIOR', created_by: IDS.host },
  ], { onConflict: 'team_id' });

  // =============================================
  // 8. TEAM-LEAGUE ASSOCIATIONS
  // =============================================
  console.log('Seeding team-league links...');
  const teamLeagues = [IDS.teamAlpha, IDS.teamBeta, IDS.teamGamma, IDS.teamDelta].map(tid => ({
    team_id: tid,
    league_id: IDS.league1,
    created_by: IDS.host,
  }));
  await supabase.from('teamleagues').upsert(teamLeagues, { onConflict: 'team_id,league_id' });

  // =============================================
  // 9. LEAGUE MEMBERS (everyone in the league)
  // =============================================
  console.log('Seeding league members...');

  // Helper: team assignment mapping
  const teamMap: Record<string, string> = {
    [IDS.captainAlpha]: IDS.teamAlpha, [IDS.playerA1]: IDS.teamAlpha, [IDS.playerA2]: IDS.teamAlpha, [IDS.playerA3]: IDS.teamAlpha, [IDS.playerA4]: IDS.teamAlpha,
    [IDS.captainBeta]: IDS.teamBeta, [IDS.playerB1]: IDS.teamBeta, [IDS.playerB2]: IDS.teamBeta, [IDS.playerB3]: IDS.teamBeta, [IDS.playerB4]: IDS.teamBeta,
    [IDS.captainGamma]: IDS.teamGamma, [IDS.playerC1]: IDS.teamGamma, [IDS.playerC2]: IDS.teamGamma, [IDS.playerC3]: IDS.teamGamma, [IDS.playerC4]: IDS.teamGamma,
    [IDS.captainDelta]: IDS.teamDelta, [IDS.playerD1]: IDS.teamDelta, [IDS.playerD2]: IDS.teamDelta, [IDS.playerD3]: IDS.teamDelta, [IDS.playerD4]: IDS.teamDelta,
  };

  // All league members: host, governor (no team), + all captains & players (with teams)
  const allMemberIds = [IDS.host, IDS.governor, ...Object.keys(teamMap)];
  const leagueMembers = allMemberIds.map(uid => ({
    user_id: uid,
    league_id: IDS.league1,
    team_id: teamMap[uid] || null,
    created_by: IDS.host,
  }));
  await supabase.from('leaguemembers').upsert(leagueMembers, { onConflict: 'user_id,league_id' });

  // =============================================
  // 10. ASSIGNED ROLES FOR LEAGUE
  // =============================================
  console.log('Seeding role assignments...');
  const roleAssignments = [
    // Host gets host + player roles
    { league_id: IDS.league1, user_id: IDS.host, role_id: IDS.hostRole, created_by: IDS.host },
    // Governor gets governor role
    { league_id: IDS.league1, user_id: IDS.governor, role_id: IDS.governorRole, created_by: IDS.host },
    // Captains get captain + player roles
    ...[IDS.captainAlpha, IDS.captainBeta, IDS.captainGamma, IDS.captainDelta].flatMap(cid => [
      { league_id: IDS.league1, user_id: cid, role_id: IDS.captainRole, created_by: IDS.host },
      { league_id: IDS.league1, user_id: cid, role_id: IDS.playerRole, created_by: IDS.host },
    ]),
    // Players get player role
    ...[
      IDS.playerA1, IDS.playerA2, IDS.playerA3, IDS.playerA4,
      IDS.playerB1, IDS.playerB2, IDS.playerB3, IDS.playerB4,
      IDS.playerC1, IDS.playerC2, IDS.playerC3, IDS.playerC4,
      IDS.playerD1, IDS.playerD2, IDS.playerD3, IDS.playerD4,
    ].map(pid => ({
      league_id: IDS.league1, user_id: pid, role_id: IDS.playerRole, created_by: IDS.host,
    })),
  ];
  await supabase.from('assignedrolesforleague').upsert(roleAssignments, { onConflict: 'league_id,user_id,role_id' });

  // =============================================
  // 11. TEAM MEMBERS (with team-level roles)
  // =============================================
  console.log('Seeding team members...');
  const captainTeams = [
    { uid: IDS.captainAlpha, tid: IDS.teamAlpha },
    { uid: IDS.captainBeta, tid: IDS.teamBeta },
    { uid: IDS.captainGamma, tid: IDS.teamGamma },
    { uid: IDS.captainDelta, tid: IDS.teamDelta },
  ];
  const playerTeams = [
    { uid: IDS.playerA1, tid: IDS.teamAlpha }, { uid: IDS.playerA2, tid: IDS.teamAlpha },
    { uid: IDS.playerA3, tid: IDS.teamAlpha }, { uid: IDS.playerA4, tid: IDS.teamAlpha },
    { uid: IDS.playerB1, tid: IDS.teamBeta }, { uid: IDS.playerB2, tid: IDS.teamBeta },
    { uid: IDS.playerB3, tid: IDS.teamBeta }, { uid: IDS.playerB4, tid: IDS.teamBeta },
    { uid: IDS.playerC1, tid: IDS.teamGamma }, { uid: IDS.playerC2, tid: IDS.teamGamma },
    { uid: IDS.playerC3, tid: IDS.teamGamma }, { uid: IDS.playerC4, tid: IDS.teamGamma },
    { uid: IDS.playerD1, tid: IDS.teamDelta }, { uid: IDS.playerD2, tid: IDS.teamDelta },
    { uid: IDS.playerD3, tid: IDS.teamDelta }, { uid: IDS.playerD4, tid: IDS.teamDelta },
  ];
  const teamMembers = [
    ...captainTeams.map(ct => ({ team_id: ct.tid, user_id: ct.uid, role_id: IDS.captainRole, created_by: IDS.host })),
    ...playerTeams.map(pt => ({ team_id: pt.tid, user_id: pt.uid, role_id: IDS.playerRole, created_by: IDS.host })),
  ];
  await supabase.from('teammembers').upsert(teamMembers, { onConflict: 'team_id,user_id' });

  // =============================================
  // 12. SAMPLE MESSAGES (for testing chat)
  // =============================================
  console.log('Seeding sample messages...');

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
  const minsAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000).toISOString();

  const messages = [
    // --- Host broadcast to ALL teams ---
    { league_id: IDS.league1, team_id: null, sender_id: IDS.host, content: 'Welcome to Season 3 of the Bangalore Corporate Fitness League! This is going to be an exciting month. Rules have been shared in the league section. Let\'s make this our best season yet!', message_type: 'announcement', visibility: 'all', is_important: true, created_at: hoursAgo(72) },
    { league_id: IDS.league1, team_id: null, sender_id: IDS.host, content: 'Quick reminder - rest day is Sunday. You can choose any one additional rest day per week. Log your activities daily!', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(48) },
    { league_id: IDS.league1, team_id: null, sender_id: IDS.host, content: 'New challenge launched - "10K Steps Challenge" starts tomorrow! Check the challenges tab for full rules.', message_type: 'announcement', visibility: 'all', is_important: true, deep_link: '/leagues/' + IDS.league1 + '/challenges', created_at: hoursAgo(24) },

    // --- Host to captains only ---
    { league_id: IDS.league1, team_id: null, sender_id: IDS.host, content: 'Captains - please ensure your team members are logging activities with proper screenshots. We\'ve seen some submissions without proof.', message_type: 'chat', visibility: 'captains_only', is_important: false, created_at: hoursAgo(36) },
    { league_id: IDS.league1, team_id: null, sender_id: IDS.host, content: 'Captains meeting on Friday 7 PM IST. We\'ll discuss the midpoint standings and any concerns. Please confirm attendance.', message_type: 'announcement', visibility: 'captains_only', is_important: true, created_at: hoursAgo(12) },

    // --- Governor broadcast ---
    { league_id: IDS.league1, team_id: null, sender_id: IDS.governor, content: 'Validation for Week 1 is complete. All approved submissions are now reflected in the leaderboard. Great start everyone!', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(20) },

    // --- Team Alpha (Cubbon Chargers) chat ---
    { league_id: IDS.league1, team_id: IDS.teamAlpha, sender_id: IDS.captainAlpha, content: 'Chargers! Let\'s set the tone this week. Target is at least 5 activities per person. We\'re currently 2nd on the leaderboard.', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(18) },
    { league_id: IDS.league1, team_id: IDS.teamAlpha, sender_id: IDS.playerA1, content: 'Done with my morning run - 5K in 28 mins! Cubbon Park was amazing today.', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(16) },
    { league_id: IDS.league1, team_id: IDS.teamAlpha, sender_id: IDS.playerA2, content: 'Great pace Amit! I did yoga this morning. Will go for a walk in the evening.', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(15) },
    { league_id: IDS.league1, team_id: IDS.teamAlpha, sender_id: IDS.playerA3, content: 'Gym done. Leg day was brutal but worth it. 💪', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(10) },
    { league_id: IDS.league1, team_id: IDS.teamAlpha, sender_id: IDS.captainAlpha, content: 'Excellent work team! Divya, how are you tracking this week?', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(8) },
    { league_id: IDS.league1, team_id: IDS.teamAlpha, sender_id: IDS.playerA4, content: 'Hey captain! I was down with a cold but back now. Will do cycling tomorrow and double up on the weekend.', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(6) },
    // Player message + captain-only reply
    { league_id: IDS.league1, team_id: IDS.teamAlpha, sender_id: IDS.playerA3, content: 'Captain, I might need to take an extra rest day this week due to a knee issue. Is that okay?', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(5) },
    { league_id: IDS.league1, team_id: IDS.teamAlpha, sender_id: IDS.captainAlpha, content: 'Rohit, take care of yourself. Rest up and we\'ll manage. Health comes first. (Note to host: Rohit may need rest day exemption this week)', message_type: 'chat', visibility: 'captains_only', is_important: false, created_at: hoursAgo(4) },

    // --- Team Beta (Indiranagar Strikers) chat ---
    { league_id: IDS.league1, team_id: IDS.teamBeta, sender_id: IDS.captainBeta, content: 'Strikers, we\'re in 1st place right now! Let\'s not get complacent. Keep logging every activity!', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(14) },
    { league_id: IDS.league1, team_id: IDS.teamBeta, sender_id: IDS.playerB1, content: 'Ran 7K this morning along the Indiranagar 100ft road. The weather was perfect!', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(12) },
    { league_id: IDS.league1, team_id: IDS.teamBeta, sender_id: IDS.playerB2, content: 'I completed a Zumba session. Does that count under Sports or Other?', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(11) },
    { league_id: IDS.league1, team_id: IDS.teamBeta, sender_id: IDS.captainBeta, content: 'Meena, log it under Other and add a note. I\'ll make sure it gets approved.', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(10) },
    { league_id: IDS.league1, team_id: IDS.teamBeta, sender_id: IDS.playerB3, content: 'Badminton for 1.5 hours today at the club. Karthik signing off for the day!', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(7) },
    { league_id: IDS.league1, team_id: IDS.teamBeta, sender_id: IDS.playerB4, content: 'Evening walk done with my dog. 4K steps. Will hit the gym tomorrow morning.', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(3) },

    // --- Team Gamma (Koramangala Kings) chat ---
    { league_id: IDS.league1, team_id: IDS.teamGamma, sender_id: IDS.captainGamma, content: 'Kings, we slipped to 3rd. Need everyone to step up this week. Let\'s get back on top!', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(13) },
    { league_id: IDS.league1, team_id: IDS.teamGamma, sender_id: IDS.playerC1, content: 'Cycled from Koramangala to Electronic City and back. 22 km!', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(9) },
    { league_id: IDS.league1, team_id: IDS.teamGamma, sender_id: IDS.playerC2, content: 'That\'s insane Nikhil! I did a 45-min yoga session at home. Small but consistent.', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(8) },
    { league_id: IDS.league1, team_id: IDS.teamGamma, sender_id: IDS.playerC3, content: 'Cricket with office folks in the evening. 2 hours of solid cardio!', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(5) },
    { league_id: IDS.league1, team_id: IDS.teamGamma, sender_id: IDS.playerC4, content: 'Swimming at the HSR pool. 30 laps today! Feeling great.', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(2) },

    // --- Team Delta (Whitefield Warriors) chat ---
    { league_id: IDS.league1, team_id: IDS.teamDelta, sender_id: IDS.captainDelta, content: 'Warriors, consistency is key. Even on busy days, a 20-min walk counts. Don\'t skip logging!', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(15) },
    { league_id: IDS.league1, team_id: IDS.teamDelta, sender_id: IDS.playerD1, content: 'Morning gym session done. Chest and shoulders today.', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(11) },
    { league_id: IDS.league1, team_id: IDS.teamDelta, sender_id: IDS.playerD2, content: 'Walked around ITPL lake during lunch break. 3K steps!', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(9) },
    { league_id: IDS.league1, team_id: IDS.teamDelta, sender_id: IDS.playerD3, content: 'Anyone up for a weekend cycling group ride? Whitefield to Nandi Hills?', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(6) },
    { league_id: IDS.league1, team_id: IDS.teamDelta, sender_id: IDS.playerD4, content: 'I\'m in for the ride, Harsh! What time are we starting?', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(5) },
    { league_id: IDS.league1, team_id: IDS.teamDelta, sender_id: IDS.captainDelta, content: 'Count me in too! Let\'s leave at 5:30 AM from Phoenix Mall. Will be epic!', message_type: 'chat', visibility: 'all', is_important: false, created_at: hoursAgo(4) },
    { league_id: IDS.league1, team_id: IDS.teamDelta, sender_id: IDS.playerD1, content: 'I\'ll join! Early morning rides are the best in Bangalore weather.', message_type: 'chat', visibility: 'all', is_important: false, created_at: minsAgo(90) },

    // --- Recent host message ---
    { league_id: IDS.league1, team_id: null, sender_id: IDS.host, content: 'Week 1 leaderboard: 1st Indiranagar Strikers (142pts), 2nd Cubbon Chargers (138pts), 3rd Koramangala Kings (131pts), 4th Whitefield Warriors (127pts). It\'s tight! Every activity counts.', message_type: 'announcement', visibility: 'all', is_important: true, created_at: minsAgo(30) },
  ];

  const { error: msgErr } = await supabase.from('messages').insert(messages);
  if (msgErr) { console.error('Messages error:', msgErr); }

  // =============================================
  // 13. SAMPLE EFFORT ENTRIES (a few per team)
  // =============================================
  console.log('Seeding sample effort entries...');

  // First get league_member_ids
  const { data: lmData } = await supabase
    .from('leaguemembers')
    .select('league_member_id, user_id')
    .eq('league_id', IDS.league1);

  if (lmData) {
    const lmMap = Object.fromEntries(lmData.map(lm => [lm.user_id, lm.league_member_id]));

    const effortEntries = [
      // Team Alpha
      { league_member_id: lmMap[IDS.playerA1], date: '2026-03-04', type: 'Running', duration: 28, distance: 5.0, status: 'approved', created_by: IDS.playerA1 },
      { league_member_id: lmMap[IDS.playerA2], date: '2026-03-04', type: 'Yoga', duration: 45, status: 'approved', created_by: IDS.playerA2 },
      { league_member_id: lmMap[IDS.playerA3], date: '2026-03-04', type: 'Gym', duration: 60, status: 'approved', created_by: IDS.playerA3 },
      { league_member_id: lmMap[IDS.captainAlpha], date: '2026-03-04', type: 'Running', duration: 35, distance: 6.0, status: 'approved', created_by: IDS.captainAlpha },
      { league_member_id: lmMap[IDS.playerA1], date: '2026-03-05', type: 'Cycling', duration: 40, distance: 15.0, status: 'pending', created_by: IDS.playerA1 },
      // Team Beta
      { league_member_id: lmMap[IDS.playerB1], date: '2026-03-04', type: 'Running', duration: 38, distance: 7.0, status: 'approved', created_by: IDS.playerB1 },
      { league_member_id: lmMap[IDS.playerB3], date: '2026-03-04', type: 'Sports', duration: 90, status: 'approved', notes: 'Badminton at club', created_by: IDS.playerB3 },
      { league_member_id: lmMap[IDS.captainBeta], date: '2026-03-05', type: 'Running', duration: 30, distance: 5.5, status: 'approved', created_by: IDS.captainBeta },
      // Team Gamma
      { league_member_id: lmMap[IDS.playerC1], date: '2026-03-04', type: 'Cycling', duration: 65, distance: 22.0, status: 'approved', created_by: IDS.playerC1 },
      { league_member_id: lmMap[IDS.playerC3], date: '2026-03-04', type: 'Sports', duration: 120, status: 'approved', notes: 'Office cricket', created_by: IDS.playerC3 },
      // Team Delta
      { league_member_id: lmMap[IDS.playerD1], date: '2026-03-04', type: 'Gym', duration: 50, status: 'approved', created_by: IDS.playerD1 },
      { league_member_id: lmMap[IDS.playerD2], date: '2026-03-04', type: 'Walking', duration: 30, steps: 3200, status: 'approved', created_by: IDS.playerD2 },
    ];

    await supabase.from('effortentry').insert(effortEntries);
  }

  // =============================================
  // DONE
  // =============================================
  console.log('\n✅ Dev seed complete!');
  console.log('\n📋 Test Logins (all password: Test@1234):');
  console.log('┌─────────────────────────────────┬──────────────────────────┬──────────────────────────┐');
  console.log('│ Role                            │ Name                     │ Email                    │');
  console.log('├─────────────────────────────────┼──────────────────────────┼──────────────────────────┤');
  console.log('│ Admin                           │ Admin MFL                │ admin@myfitnessleague.com│');
  console.log('│ Host                            │ Rajesh Sharma            │ rajesh.sharma@test.com   │');
  console.log('│ Governor                        │ Priya Nair               │ priya.nair@test.com      │');
  console.log('│ Captain (Cubbon Chargers)       │ Vikram Patel             │ vikram.patel@test.com    │');
  console.log('│ Captain (Indiranagar Strikers)  │ Ananya Reddy             │ ananya.reddy@test.com    │');
  console.log('│ Captain (Koramangala Kings)     │ Arjun Menon              │ arjun.menon@test.com     │');
  console.log('│ Captain (Whitefield Warriors)   │ Sneha Iyer               │ sneha.iyer@test.com      │');
  console.log('│ Player (Cubbon Chargers)        │ Amit Desai               │ amit.desai@test.com      │');
  console.log('│ Player (Indiranagar Strikers)   │ Suresh Kumar             │ suresh.kumar@test.com    │');
  console.log('│ Player (Koramangala Kings)      │ Nikhil Gupta             │ nikhil.gupta@test.com    │');
  console.log('│ Player (Whitefield Warriors)    │ Siddharth Jain           │ siddharth.jain@test.com  │');
  console.log('└─────────────────────────────────┴──────────────────────────┴──────────────────────────┘');
  console.log('\n🏆 League: Bangalore Corporate Fitness League - Season 3 (invite code: BLRCORP3)');
  console.log('🏅 Teams: Cubbon Chargers, Indiranagar Strikers, Koramangala Kings, Whitefield Warriors');
}

seed().catch(console.error);
