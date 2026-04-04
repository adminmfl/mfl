/**
 * Dev/QA Seed Script — Users + Roles + Activities + Pricing only
 *
 * Run: npx tsx supabase/seed-dev.ts [dev|qa|staging]
 *
 * Seeds:
 * - 1 Admin
 * - 1 Host
 * - 1 Governor
 * - 12 Players (4 per team × 3 teams, first player in each team becomes captain in-app)
 * - 4 Roles
 * - 5 Activities
 * - 1 Pricing tier
 *
 * All users login with password: Admin@123
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// --- Load env file (default: .env.dev, pass 'qa' or 'staging' as arg) ---
const envTarget = process.argv[2] || 'dev';
const envPath = path.resolve(__dirname, `../.env.${envTarget}`);
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim();
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(`Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.${envTarget}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// bcrypt hashes
const ADMIN_HASH = '$2b$10$OPMFwacKl2/uHKQ.nq.ze.JeJ.kaHpO4Wq0OkhRC1xyLpbpFYNMLW'; // Admin@123
const USER_HASH = '$2b$10$yTYq2N.kGmTPXnmWkK.JYOdeZI198305Bxw/7kB1m9v/PbQKwYynm';  // Test@1234

// --- Fixed UUIDs ---
const IDS = {
  // Roles
  hostRole: '00000000-0000-0000-0000-000000000001',
  governorRole: '00000000-0000-0000-0000-000000000002',
  captainRole: '00000000-0000-0000-0000-000000000003',
  playerRole: '00000000-0000-0000-0000-000000000004',

  // Users
  admin: '10000000-0000-0000-0000-000000000001',
  host: '40000000-0000-0000-0000-000000000001',
  governor: '40000000-0000-0000-0000-000000000002',

  // Activities
  actRunning: '70000000-0000-0000-0000-000000000001',
  actYoga: '70000000-0000-0000-0000-000000000002',
  actGym: '70000000-0000-0000-0000-000000000003',
  actCycling: '70000000-0000-0000-0000-000000000004',
  actWalking: '70000000-0000-0000-0000-000000000005',

};

async function seed() {
  console.log(`\nSeeding ${envTarget.toUpperCase()} (${SUPABASE_URL})...\n`);

  // =============================================
  // 1. ROLES
  // =============================================
  console.log('  Roles...');
  const { error: rolesErr } = await supabase.from('roles').upsert([
    { role_id: IDS.hostRole, role_name: 'host' },
    { role_id: IDS.governorRole, role_name: 'governor' },
    { role_id: IDS.captainRole, role_name: 'captain' },
    { role_id: IDS.playerRole, role_name: 'player' },
  ], { onConflict: 'role_name' });
  if (rolesErr) { console.error('  Roles error:', rolesErr); return; }

  // =============================================
  // 2. ACTIVITIES (5 activities for client's league)
  // =============================================
  console.log('  Activities...');
  const { error: actErr } = await supabase.from('activities').upsert([
    { activity_id: IDS.actRunning, activity_name: 'Running', description: 'Outdoor or treadmill running' },
    { activity_id: IDS.actYoga, activity_name: 'Yoga', description: 'Yoga and stretching' },
    { activity_id: IDS.actGym, activity_name: 'Gym', description: 'Weight training and gym exercises' },
    { activity_id: IDS.actCycling, activity_name: 'Cycling', description: 'Road cycling or stationary bike' },
    { activity_id: IDS.actWalking, activity_name: 'Walking', description: 'Walking or hiking' },
  ], { onConflict: 'activity_name' });
  if (actErr) { console.error('  Activities error:', actErr); return; }

  // =============================================
  // 3. PRICING + LEAGUE TIERS (matching prod)
  // =============================================
  console.log('  Pricing...');
  const pricingRows = [
    { id: '1be6a20a-2347-4367-a7fa-c62069e63b01', tier_name: 'basic', pricing_type: 'fixed', fixed_price: 0, base_fee: 0, per_day_rate: 0, per_participant_rate: 0, gst_percentage: 18, is_active: true, config: {} },
    { id: '6500b883-0d2f-40ff-8984-a522cb042bd4', tier_name: 'pro', pricing_type: 'fixed', fixed_price: 2999, base_fee: 0, per_day_rate: 0, per_participant_rate: 0, gst_percentage: 18, is_active: true, config: {} },
    { id: '95433565-c04b-4e5d-9097-71f93b78875f', tier_name: 'elite', pricing_type: 'fixed', fixed_price: 3999, base_fee: 0, per_day_rate: 0, per_participant_rate: 0, gst_percentage: 18, is_active: true, config: {} },
    { id: '9f522956-fa16-4caf-b54d-7905e9ef4290', tier_name: 'enterprise', pricing_type: 'dynamic', fixed_price: null, base_fee: 2000, per_day_rate: 3, per_participant_rate: 100, gst_percentage: 18, is_active: true, config: {} },
  ];
  const { error: pricingErr } = await supabase.from('pricing').upsert(pricingRows, { onConflict: 'id' });
  if (pricingErr) { console.error('  Pricing error:', pricingErr); return; }

  console.log('  League tiers...');
  const tierRows = [
    { id: '20e50ed2-0ec9-44e5-8aa8-175ec53e0b66', name: 'basic', display_name: 'Basic', description: 'Perfect for small teams and short events', max_days: 10, max_participants: 10, pricing_id: '1be6a20a-2347-4367-a7fa-c62069e63b01', is_active: true, display_order: 1, features: [] },
    { id: '9311625a-2686-46c8-b0d4-e9adde4fcfa0', name: 'pro', display_name: 'Pro', description: 'For competitive friend groups & regular users', max_days: 40, max_participants: 70, pricing_id: '6500b883-0d2f-40ff-8984-a522cb042bd4', is_active: true, display_order: 2, features: [] },
    { id: '888d0224-a77e-41d8-b87f-b8548750373c', name: 'elite', display_name: 'Elite', description: 'For serious leagues & communities', max_days: 90, max_participants: 100, pricing_id: '95433565-c04b-4e5d-9097-71f93b78875f', is_active: true, display_order: 3, features: [] },
    { id: '04f8def5-8961-45b2-b98b-30ae09429616', name: 'enterprise', display_name: 'Enterprise', description: 'Unlimited scale for large organizations', max_days: 365, max_participants: 1000, pricing_id: '9f522956-fa16-4caf-b54d-7905e9ef4290', is_active: true, display_order: 4, features: [] },
  ];
  const { error: tiersErr } = await supabase.from('league_tiers').upsert(tierRows, { onConflict: 'id' });
  if (tiersErr) { console.error('  League tiers error:', tiersErr); return; }

  // =============================================
  // 4. USERS — 15 total
  // =============================================
  console.log('  Users...');
  const users = [
    // Admin
    { user_id: IDS.admin, username: 'Admin MFL', email: 'admin@myfitnessleague.com', password_hash: ADMIN_HASH, platform_role: 'admin', phone: '9876500000', gender: 'male', date_of_birth: '1985-06-15' },
    // Host
    { user_id: IDS.host, username: 'Rajesh Sharma', email: 'rajesh.sharma@test.com', password_hash: USER_HASH, platform_role: 'user', phone: '9876500001', gender: 'male', date_of_birth: '1982-03-21' },
    // Governor
    { user_id: IDS.governor, username: 'Priya Nair', email: 'priya.nair@test.com', password_hash: USER_HASH, platform_role: 'user', phone: '9876500002', gender: 'female', date_of_birth: '1988-11-05' },

    // Team 1 — 4 players (first one can be made captain in-app)
    { user_id: '60000000-0000-0000-0000-000000000001', username: 'Vikram Patel', email: 'vikram.patel@test.com', password_hash: USER_HASH, platform_role: 'user', phone: '9876500101', gender: 'male', date_of_birth: '1990-01-15' },
    { user_id: '60000000-0000-0000-0000-000000000002', username: 'Amit Desai', email: 'amit.desai@test.com', password_hash: USER_HASH, platform_role: 'user', phone: '9876500102', gender: 'male', date_of_birth: '1993-02-14' },
    { user_id: '60000000-0000-0000-0000-000000000003', username: 'Kavitha Rao', email: 'kavitha.rao@test.com', password_hash: USER_HASH, platform_role: 'user', phone: '9876500103', gender: 'female', date_of_birth: '1994-06-08' },
    { user_id: '60000000-0000-0000-0000-000000000004', username: 'Rohit Kulkarni', email: 'rohit.kulkarni@test.com', password_hash: USER_HASH, platform_role: 'user', phone: '9876500104', gender: 'male', date_of_birth: '1991-12-25' },

    // Team 2 — 4 players
    { user_id: '60000000-0000-0000-0000-000000000005', username: 'Ananya Reddy', email: 'ananya.reddy@test.com', password_hash: USER_HASH, platform_role: 'user', phone: '9876500201', gender: 'female', date_of_birth: '1992-07-22' },
    { user_id: '60000000-0000-0000-0000-000000000006', username: 'Suresh Kumar', email: 'suresh.kumar@test.com', password_hash: USER_HASH, platform_role: 'user', phone: '9876500202', gender: 'male', date_of_birth: '1990-05-11' },
    { user_id: '60000000-0000-0000-0000-000000000007', username: 'Meena Krishnan', email: 'meena.krishnan@test.com', password_hash: USER_HASH, platform_role: 'user', phone: '9876500203', gender: 'female', date_of_birth: '1993-10-03' },
    { user_id: '60000000-0000-0000-0000-000000000008', username: 'Karthik Srinivasan', email: 'karthik.s@test.com', password_hash: USER_HASH, platform_role: 'user', phone: '9876500204', gender: 'male', date_of_birth: '1992-01-27' },

    // Team 3 — 4 players
    { user_id: '60000000-0000-0000-0000-000000000009', username: 'Arjun Menon', email: 'arjun.menon@test.com', password_hash: USER_HASH, platform_role: 'user', phone: '9876500301', gender: 'male', date_of_birth: '1989-04-18' },
    { user_id: '60000000-0000-0000-0000-000000000010', username: 'Nikhil Gupta', email: 'nikhil.gupta@test.com', password_hash: USER_HASH, platform_role: 'user', phone: '9876500302', gender: 'male', date_of_birth: '1991-07-09' },
    { user_id: '60000000-0000-0000-0000-000000000011', username: 'Ritu Singh', email: 'ritu.singh@test.com', password_hash: USER_HASH, platform_role: 'user', phone: '9876500303', gender: 'female', date_of_birth: '1993-11-22' },
    { user_id: '60000000-0000-0000-0000-000000000012', username: 'Tanvi Bhatt', email: 'tanvi.bhatt@test.com', password_hash: USER_HASH, platform_role: 'user', phone: '9876500304', gender: 'female', date_of_birth: '1995-04-06' },
  ];

  const { error: usersErr } = await supabase.from('users').upsert(users, { onConflict: 'email' });
  if (usersErr) { console.error('  Users error:', usersErr); return; }

  // =============================================
  // DONE
  // =============================================
  console.log('\nDone!\n');
  console.log('All passwords: Admin@123');
  console.log('');
  console.log('Role       Name                  Email');
  console.log('─────────  ────────────────────  ──────────────────────────────');
  console.log('Admin      Admin MFL             admin@myfitnessleague.com');
  console.log('Host       Rajesh Sharma         rajesh.sharma@test.com');
  console.log('Governor   Priya Nair            priya.nair@test.com');
  console.log('');
  console.log('Team 1     Vikram Patel          vikram.patel@test.com');
  console.log('           Amit Desai            amit.desai@test.com');
  console.log('           Kavitha Rao           kavitha.rao@test.com');
  console.log('           Rohit Kulkarni        rohit.kulkarni@test.com');
  console.log('');
  console.log('Team 2     Ananya Reddy          ananya.reddy@test.com');
  console.log('           Suresh Kumar          suresh.kumar@test.com');
  console.log('           Meena Krishnan        meena.krishnan@test.com');
  console.log('           Karthik Srinivasan    karthik.s@test.com');
  console.log('');
  console.log('Team 3     Arjun Menon           arjun.menon@test.com');
  console.log('           Nikhil Gupta          nikhil.gupta@test.com');
  console.log('           Ritu Singh            ritu.singh@test.com');
  console.log('           Tanvi Bhatt           tanvi.bhatt@test.com');
  console.log('');
  console.log('Activities: Running, Yoga, Gym, Cycling, Walking');
  console.log('');
  console.log('Next: Login as Host, create league (3 teams × 4), assign players, configure activities.');
}

seed().catch(console.error);
