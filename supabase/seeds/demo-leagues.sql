-- =============================================================================
-- Seed: Demo Leagues for MFL
-- Description: Creates 3 demo leagues with teams, players, and role assignments
-- Idempotent: Safe to run multiple times (checks by league_name before insert)
-- =============================================================================
-- League 1: "Keus Corporate Fitness League"     — 100 players, 8 teams, 90 days
-- League 2: "Prestige Lakeside Habitat Fitness League" — 88 players, 8 teams, 90 days
-- League 3: "MFL Internal Test League"           — 16 players, 4 teams, 60 days
-- =============================================================================
-- LOGIN: All demo players can log in with password: MflDemo2026!
-- Bcrypt hash (10 rounds): $2b$10$.BmcErv3dYrc4.Tp13UNOuVEp.Pv3uATEZVfe7INn0yoUkDnrCWlW
-- =============================================================================
-- NOTE: rest_days column is per-week (constraint 0-7).
--       PFL used 18 rest days over 90 days ≈ 2/week.
-- =============================================================================

-- =========================================================================
-- LEAGUE 1: Keus Corporate Fitness League
-- =========================================================================
DO $$
DECLARE
  v_host_id       uuid;
  v_league_id     uuid;
  v_player_role   uuid;
  v_captain_role  uuid;
  v_host_role     uuid;
  v_team_ids      uuid[] := ARRAY[]::uuid[];
  v_team_id       uuid;
  v_user_id       uuid;
  v_lm_id         uuid;
  v_act_id        uuid;
  v_la_id         uuid;
  v_challenge_id  uuid;
  v_demo_hash     text := '$2b$10$.BmcErv3dYrc4.Tp13UNOuVEp.Pv3uATEZVfe7INn0yoUkDnrCWlW';
  v_team_names    text[] := ARRAY[
    'Mumbai Mavericks', 'Delhi Dynamos', 'Bangalore Bulls', 'Chennai Chargers',
    'Hyderabad Hawks', 'Kolkata Knights', 'Pune Pacers', 'Ahmedabad Aces'
  ];
  v_player_names  text[] := ARRAY[
    -- Indian male names (40)
    'Arjun Sharma', 'Vikram Patel', 'Rahul Mehta', 'Aditya Reddy', 'Karan Singh',
    'Rohan Gupta', 'Amit Kumar', 'Sanjay Nair', 'Prashant Joshi', 'Nikhil Rao',
    'Deepak Verma', 'Suresh Iyer', 'Manoj Pillai', 'Rajesh Menon', 'Anand Kulkarni',
    'Vivek Deshmukh', 'Gaurav Saxena', 'Harsh Agarwal', 'Tarun Bhat', 'Siddharth Hegde',
    'Pranav Mishra', 'Varun Chauhan', 'Ajay Tiwari', 'Ravi Shukla', 'Mohit Pandey',
    'Abhishek Dubey', 'Kunal Jain', 'Dhruv Bansal', 'Ishaan Thakur', 'Akash Malhotra',
    'Manish Kapoor', 'Vishal Sethi', 'Sachin Luthra', 'Tushar Bose', 'Kartik Choudhary',
    'Naveen Rathi', 'Vinay Srinivasan', 'Piyush Goyal', 'Ashwin Naidu', 'Dev Khanna',
    -- Indian female names (30)
    'Priya Sharma', 'Ananya Patel', 'Sneha Reddy', 'Kavitha Nair', 'Divya Iyer',
    'Meera Kulkarni', 'Pooja Gupta', 'Rashmi Joshi', 'Nandini Rao', 'Swathi Menon',
    'Lakshmi Pillai', 'Aishwarya Deshmukh', 'Shalini Saxena', 'Ritu Agarwal', 'Pallavi Bhat',
    'Neha Mishra', 'Tanvi Chauhan', 'Shruti Tiwari', 'Bhavana Shukla', 'Aparna Pandey',
    'Vidya Dubey', 'Jyoti Jain', 'Rekha Bansal', 'Sunita Thakur', 'Aarti Malhotra',
    'Charulata Kapoor', 'Smita Sethi', 'Geeta Luthra', 'Padma Bose', 'Deepa Choudhary',
    -- US names (15)
    'James Mitchell', 'Sarah Johnson', 'Michael Thompson', 'Emily Davis', 'Robert Wilson',
    'Jessica Brown', 'David Anderson', 'Jennifer Martinez', 'Christopher Taylor', 'Amanda Garcia',
    'Daniel Robinson', 'Stephanie Clark', 'Matthew Lewis', 'Nicole Walker', 'Andrew Hall',
    -- UAE / international names (15)
    'Omar Al-Rashid', 'Fatima Hassan', 'Ahmed Al-Mansoori', 'Layla Khalid', 'Mohammed Bin Zayed',
    'Sara Al-Maktoum', 'Khalid Ibrahim', 'Noura Ahmed', 'Yousef Al-Qasimi', 'Mariam Tariq',
    'Hassan Al-Falasi', 'Aisha Rashed', 'Ali Al-Shamsi', 'Huda Nasser', 'Rashed Al-Ketbi'
  ];
  v_name          text;
  v_email         text;
  v_idx           int;
  v_team_idx      int;
BEGIN
  -- Skip if league already exists
  IF EXISTS (SELECT 1 FROM public.leagues WHERE league_name = 'Keus Corporate Fitness League') THEN
    RAISE NOTICE 'League "Keus Corporate Fitness League" already exists — skipping.';
    RETURN;
  END IF;

  -- Look up host user
  SELECT user_id INTO v_host_id FROM public.users WHERE email = 'mfl.verify@gmail.com';
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Host user mfl.verify@gmail.com not found. Please create this user first.';
  END IF;

  -- Look up roles
  SELECT role_id INTO v_player_role  FROM public.roles WHERE role_name = 'player';
  SELECT role_id INTO v_captain_role FROM public.roles WHERE role_name = 'captain';
  SELECT role_id INTO v_host_role    FROM public.roles WHERE role_name = 'host';

  -- Create league (PFL format: 90 days, 2 rest days/week ≈ 18 total)
  INSERT INTO public.leagues (
    league_name, description, start_date, end_date, status, is_active,
    num_teams, max_team_capacity, rest_days, is_public, is_exclusive,
    invite_code, created_by
  ) VALUES (
    'Keus Corporate Fitness League',
    'Corporate fitness league for Keus employees — IPL/NBA style team competition over 90 days. PFL format with approved workouts and weekly challenges.',
    CURRENT_DATE + 1,
    CURRENT_DATE + 90,
    'scheduled',
    true,
    8,
    13,
    2,
    false,
    true,
    upper(substr(md5(random()::text), 1, 8)),
    v_host_id
  ) RETURNING league_id INTO v_league_id;

  -- Assign host role
  INSERT INTO public.assignedrolesforleague (league_id, user_id, role_id, created_by)
  VALUES (v_league_id, v_host_id, v_host_role, v_host_id);

  -- Create 8 teams and link to league
  FOR i IN 1..8 LOOP
    INSERT INTO public.teams (team_name, invite_code, created_by)
    VALUES (
      v_team_names[i],
      upper(substr(md5(random()::text), 1, 8)),
      v_host_id
    ) RETURNING team_id INTO v_team_id;

    v_team_ids := v_team_ids || v_team_id;

    INSERT INTO public.teamleagues (team_id, league_id, created_by)
    VALUES (v_team_id, v_league_id, v_host_id);
  END LOOP;

  -- Create 100 player accounts with loginable passwords
  FOR v_idx IN 1..100 LOOP
    v_name  := v_player_names[v_idx];
    v_email := lower(replace(v_name, ' ', '.')) || '.demo@mfl.test';

    SELECT user_id INTO v_user_id FROM public.users WHERE email = v_email;
    IF v_user_id IS NULL THEN
      INSERT INTO public.users (username, email, password_hash, is_active, platform_role)
      VALUES (
        lower(replace(v_name, ' ', '_')) || '_corp',
        v_email,
        v_demo_hash,
        true,
        'user'
      ) RETURNING user_id INTO v_user_id;
    END IF;

    v_team_idx := ((v_idx - 1) % 8) + 1;
    v_team_id  := v_team_ids[v_team_idx];

    INSERT INTO public.leaguemembers (user_id, league_id, team_id, created_by)
    VALUES (v_user_id, v_league_id, v_team_id, v_host_id)
    ON CONFLICT (user_id, league_id) DO NOTHING
    RETURNING league_member_id INTO v_lm_id;

    IF v_idx <= 8 THEN
      INSERT INTO public.teammembers (team_id, user_id, role_id, created_by)
      VALUES (v_team_id, v_user_id, v_captain_role, v_host_id)
      ON CONFLICT (team_id, user_id) DO NOTHING;

      INSERT INTO public.assignedrolesforleague (league_id, user_id, role_id, created_by)
      VALUES (v_league_id, v_user_id, v_captain_role, v_host_id)
      ON CONFLICT (league_id, user_id, role_id) DO NOTHING;
    ELSE
      INSERT INTO public.teammembers (team_id, user_id, role_id, created_by)
      VALUES (v_team_id, v_user_id, v_player_role, v_host_id)
      ON CONFLICT (team_id, user_id) DO NOTHING;
    END IF;

    INSERT INTO public.assignedrolesforleague (league_id, user_id, role_id, created_by)
    VALUES (v_league_id, v_user_id, v_player_role, v_host_id)
    ON CONFLICT (league_id, user_id, role_id) DO NOTHING;
  END LOOP;

  -- ─── PFL Activities ───
  -- Ensure activities exist
  INSERT INTO public.activities (activity_name, description) VALUES
    ('Running', 'Brisk walk, jog, or run — 4 km or 45 mins'),
    ('Gym', 'Weightlifting / gym workout — 45 mins'),
    ('Yoga', 'Yoga, Pilates, or Zumba — 45 mins'),
    ('Walking', 'Brisk walking — 4 km or 45 mins'),
    ('Cycling', 'Cycling workout — 45 mins'),
    ('Swimming', 'Swimming workout — 45 mins'),
    ('Dance', 'Dance-based fitness (Zumba, etc.) — 45 mins'),
    ('Sports', 'Field sports: Badminton, Pickleball, Tennis, Cricket, Basketball — 45 mins'),
    ('Steps', 'Daily step count — 10,000 steps target'),
    ('Golf', '9-hole golf round')
  ON CONFLICT (activity_name) DO NOTHING;

  -- Link activities to league with PFL custom fields
  -- Running: distance + duration
  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Running';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Distance (km)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  -- Gym: duration
  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Gym';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Duration (mins)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  -- Yoga: duration
  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Yoga';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Duration (mins)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  -- Walking: distance + duration
  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Walking';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Distance (km)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  -- Cycling: duration
  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Cycling';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Duration (mins)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  -- Swimming: duration
  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Swimming';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Duration (mins)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  -- Dance: duration
  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Dance';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Duration (mins)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  -- Sports: sport type + duration
  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Sports';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Sport', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  -- Steps: step count
  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Steps';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Step Count', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  -- Golf: holes played
  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Golf';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Holes Played', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  -- ─── PFL-Style Challenges (spread across 90 days) ───
  -- Week 1-2: Kickoff Step Challenge
  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Kickoff Step Challenge — Most steps in the first 2 weeks wins bonus points!', CURRENT_DATE + 1, CURRENT_DATE + 14, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by)
  VALUES (v_league_id, v_challenge_id, v_host_id);

  -- Week 3: Fitness Bingo
  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Fitness Bingo — Complete 5 different activity types in one week!', CURRENT_DATE + 15, CURRENT_DATE + 21, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by)
  VALUES (v_league_id, v_challenge_id, v_host_id);

  -- Week 4-5: Consistency King
  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Consistency King — Log activity every single day for 14 days straight!', CURRENT_DATE + 22, CURRENT_DATE + 35, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by)
  VALUES (v_league_id, v_challenge_id, v_host_id);

  -- Week 6: Team Spirit Week
  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Team Spirit Week — Every team member must log at least 5 activities this week!', CURRENT_DATE + 36, CURRENT_DATE + 42, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by)
  VALUES (v_league_id, v_challenge_id, v_host_id);

  -- Week 7-8: Endurance Marathon
  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Endurance Marathon — Accumulate the most total workout minutes across 2 weeks!', CURRENT_DATE + 43, CURRENT_DATE + 56, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by)
  VALUES (v_league_id, v_challenge_id, v_host_id);

  -- Week 9: Try Something New
  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Try Something New — Log an activity type you have never tried before this league!', CURRENT_DATE + 57, CURRENT_DATE + 63, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by)
  VALUES (v_league_id, v_challenge_id, v_host_id);

  -- Week 10-11: Sprint to Finish
  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Sprint to Finish — Team with highest % participation in final 2 weeks wins!', CURRENT_DATE + 64, CURRENT_DATE + 77, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by)
  VALUES (v_league_id, v_challenge_id, v_host_id);

  -- Week 12-13: Grand Finale Challenge
  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Grand Finale Challenge — Max effort! Every point counts toward the championship!', CURRENT_DATE + 78, CURRENT_DATE + 90, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by)
  VALUES (v_league_id, v_challenge_id, v_host_id);

  RAISE NOTICE 'Created "Keus Corporate Fitness League" with 100 players, 10 PFL activities, 8 challenges.';
END $$;


-- =========================================================================
-- LEAGUE 2: Prestige Lakeside Habitat Fitness League
-- =========================================================================
DO $$
DECLARE
  v_host_id       uuid;
  v_league_id     uuid;
  v_player_role   uuid;
  v_captain_role  uuid;
  v_host_role     uuid;
  v_team_ids      uuid[] := ARRAY[]::uuid[];
  v_team_id       uuid;
  v_user_id       uuid;
  v_lm_id         uuid;
  v_act_id        uuid;
  v_challenge_id  uuid;
  v_demo_hash     text := '$2b$10$.BmcErv3dYrc4.Tp13UNOuVEp.Pv3uATEZVfe7INn0yoUkDnrCWlW';
  v_team_names    text[] := ARRAY[
    'Clubhouse Crushers', 'Poolside Panthers', 'Garden Gladiators', 'Tower Titans',
    'Terrace Tigers', 'Jogging Jaguars', 'Gym Guardians', 'Park Predators'
  ];
  v_player_names  text[] := ARRAY[
    -- Bangalore residential community feel — Indian names (88)
    'Aarav Krishnamurthy', 'Vivaan Srinivas', 'Aditya Raghavan', 'Vihaan Subramanian', 'Arjun Venkatesh',
    'Sai Prasad', 'Reyansh Gowda', 'Ayaan Murthy', 'Krishna Hegde', 'Ishaan Bhaskar',
    'Shaurya Nagaraj', 'Atharv Deshpande', 'Advait Kamath', 'Dhruv Shankar', 'Kabir Padmanabhan',
    'Ritvik Sundaram', 'Aarush Ranganath', 'Veer Shenoy', 'Agastya Iyengar', 'Arnav Chandrasekhar',
    'Lakshmi Raghunath', 'Ananya Venkataraman', 'Saanvi Rajagopalan', 'Aanya Gopalakrishnan', 'Aadhya Seshadri',
    'Myra Parthasarathy', 'Diya Narasimhan', 'Pari Thyagarajan', 'Sara Balakrishnan', 'Anvi Sundaramurthy',
    'Riya Vasudevan', 'Navya Ramachandran', 'Anika Viswanathan', 'Kiara Rangarajan', 'Nisha Narayanan',
    'Tara Keshavan', 'Ira Gopinath', 'Ahana Sridharan', 'Mira Madhavan', 'Samaira Jayaraman',
    'Rajesh Chandran', 'Suresh Mohan', 'Ganesh Ramakrishnan', 'Mahesh Swaminathan', 'Ramesh Natarajan',
    'Naresh Varadhan', 'Dinesh Anantharaman', 'Girish Vaidyanathan', 'Harish Ranganathan', 'Satish Sundaresan',
    'Prakash Srinivasan', 'Venkatesh Aiyer', 'Jagadish Chari', 'Ashok Ramaswamy', 'Subramaniam Iyer',
    'Gopalakrishnan Nair', 'Padmanabhan Menon', 'Narasimhan Pillai', 'Ravishankar Rao', 'Seshadri Sharma',
    'Meenakshi Sundar', 'Lalitha Raghavan', 'Vasantha Padmanabhan', 'Kamala Viswanath', 'Sarojini Acharya',
    'Revathi Sundaram', 'Jayanthi Nagaraj', 'Shobha Ranganath', 'Usha Shenoy', 'Padma Iyengar',
    'Sumathi Hegde', 'Geetha Kamath', 'Radha Bhaskar', 'Vijaya Murthy', 'Alamelu Prasad',
    'Nitin Bhandari', 'Sunil Tantri', 'Arun Shivaraj', 'Prasanna Aithal', 'Mohan Bhat',
    'Deepak Tantri', 'Shreyas Acharya', 'Pradeep Udupa', 'Raghavendra Karanth', 'Srinath Shetty',
    'Mamatha Acharya', 'Suma Tantri', 'Padmini Udupa'
  ];
  v_name          text;
  v_email         text;
  v_idx           int;
  v_team_idx      int;
BEGIN
  -- Skip if league already exists
  IF EXISTS (SELECT 1 FROM public.leagues WHERE league_name = 'Prestige Lakeside Habitat Fitness League') THEN
    RAISE NOTICE 'League "Prestige Lakeside Habitat Fitness League" already exists — skipping.';
    RETURN;
  END IF;

  -- Look up host user
  SELECT user_id INTO v_host_id FROM public.users WHERE email = 'mfl.verify@gmail.com';
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Host user mfl.verify@gmail.com not found. Please create this user first.';
  END IF;

  -- Look up roles
  SELECT role_id INTO v_player_role  FROM public.roles WHERE role_name = 'player';
  SELECT role_id INTO v_captain_role FROM public.roles WHERE role_name = 'captain';
  SELECT role_id INTO v_host_role    FROM public.roles WHERE role_name = 'host';

  -- Create league (PFL format: 90 days, 2 rest/week)
  INSERT INTO public.leagues (
    league_name, description, start_date, end_date, status, is_active,
    num_teams, max_team_capacity, rest_days, is_public, is_exclusive,
    invite_code, created_by
  ) VALUES (
    'Prestige Lakeside Habitat Fitness League',
    'Residential community fitness league for Prestige Lakeside Habitat, Bangalore — neighborhood team competition over 90 days. Venues: Clubhouse, Pool, Gym, Jogging Track, Gardens.',
    CURRENT_DATE + 1,
    CURRENT_DATE + 90,
    'scheduled',
    true,
    8,
    11,
    2,
    false,
    true,
    upper(substr(md5(random()::text), 1, 8)),
    v_host_id
  ) RETURNING league_id INTO v_league_id;

  -- Assign host role
  INSERT INTO public.assignedrolesforleague (league_id, user_id, role_id, created_by)
  VALUES (v_league_id, v_host_id, v_host_role, v_host_id);

  -- Create 8 teams
  FOR i IN 1..8 LOOP
    INSERT INTO public.teams (team_name, invite_code, created_by)
    VALUES (
      v_team_names[i],
      upper(substr(md5(random()::text), 1, 8)),
      v_host_id
    ) RETURNING team_id INTO v_team_id;

    v_team_ids := v_team_ids || v_team_id;

    INSERT INTO public.teamleagues (team_id, league_id, created_by)
    VALUES (v_team_id, v_league_id, v_host_id);
  END LOOP;

  -- Create 88 players with loginable passwords
  FOR v_idx IN 1..88 LOOP
    v_name  := v_player_names[v_idx];
    v_email := lower(replace(v_name, ' ', '.')) || '.resi@mfl.test';

    SELECT user_id INTO v_user_id FROM public.users WHERE email = v_email;
    IF v_user_id IS NULL THEN
      INSERT INTO public.users (username, email, password_hash, is_active, platform_role)
      VALUES (
        lower(replace(v_name, ' ', '_')) || '_resi',
        v_email,
        v_demo_hash,
        true,
        'user'
      ) RETURNING user_id INTO v_user_id;
    END IF;

    v_team_idx := ((v_idx - 1) % 8) + 1;
    v_team_id  := v_team_ids[v_team_idx];

    INSERT INTO public.leaguemembers (user_id, league_id, team_id, created_by)
    VALUES (v_user_id, v_league_id, v_team_id, v_host_id)
    ON CONFLICT (user_id, league_id) DO NOTHING
    RETURNING league_member_id INTO v_lm_id;

    IF v_idx <= 8 THEN
      INSERT INTO public.teammembers (team_id, user_id, role_id, created_by)
      VALUES (v_team_id, v_user_id, v_captain_role, v_host_id)
      ON CONFLICT (team_id, user_id) DO NOTHING;

      INSERT INTO public.assignedrolesforleague (league_id, user_id, role_id, created_by)
      VALUES (v_league_id, v_user_id, v_captain_role, v_host_id)
      ON CONFLICT (league_id, user_id, role_id) DO NOTHING;
    ELSE
      INSERT INTO public.teammembers (team_id, user_id, role_id, created_by)
      VALUES (v_team_id, v_user_id, v_player_role, v_host_id)
      ON CONFLICT (team_id, user_id) DO NOTHING;
    END IF;

    INSERT INTO public.assignedrolesforleague (league_id, user_id, role_id, created_by)
    VALUES (v_league_id, v_user_id, v_player_role, v_host_id)
    ON CONFLICT (league_id, user_id, role_id) DO NOTHING;
  END LOOP;

  -- ─── PFL Activities (same 10, with residential venue flavor in descriptions) ───
  INSERT INTO public.activities (activity_name, description) VALUES
    ('Running', 'Brisk walk, jog, or run — 4 km or 45 mins'),
    ('Gym', 'Weightlifting / gym workout — 45 mins'),
    ('Yoga', 'Yoga, Pilates, or Zumba — 45 mins'),
    ('Walking', 'Brisk walking — 4 km or 45 mins'),
    ('Cycling', 'Cycling workout — 45 mins'),
    ('Swimming', 'Swimming workout — 45 mins'),
    ('Dance', 'Dance-based fitness (Zumba, etc.) — 45 mins'),
    ('Sports', 'Field sports: Badminton, Pickleball, Tennis, Cricket, Basketball — 45 mins'),
    ('Steps', 'Daily step count — 10,000 steps target'),
    ('Golf', '9-hole golf round')
  ON CONFLICT (activity_name) DO NOTHING;

  -- Link same PFL activities with custom fields
  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Running';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Distance (km)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Gym';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Duration (mins)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Yoga';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Duration (mins)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Walking';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Distance (km)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Cycling';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Duration (mins)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Swimming';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Duration (mins)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Dance';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Duration (mins)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Sports';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Sport', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Steps';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Step Count', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Golf';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Holes Played', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  -- ─── Residential-flavored Challenges ───
  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Welcome Week — Log your first activity and earn bonus points for early participation!', CURRENT_DATE + 1, CURRENT_DATE + 7, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by) VALUES (v_league_id, v_challenge_id, v_host_id);

  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Clubhouse Challenge — Use the clubhouse gym or pool at least 3 times this week!', CURRENT_DATE + 8, CURRENT_DATE + 14, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by) VALUES (v_league_id, v_challenge_id, v_host_id);

  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Morning Warriors — Log a workout before 7 AM for 5 days this fortnight!', CURRENT_DATE + 15, CURRENT_DATE + 28, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by) VALUES (v_league_id, v_challenge_id, v_host_id);

  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Neighbourhood Walk — Walk the jogging track and gardens, target 15,000 steps in a day!', CURRENT_DATE + 29, CURRENT_DATE + 35, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by) VALUES (v_league_id, v_challenge_id, v_host_id);

  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Family Fitness Fortnight — Get a family member to join your workout. Tag proof!', CURRENT_DATE + 36, CURRENT_DATE + 49, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by) VALUES (v_league_id, v_challenge_id, v_host_id);

  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Sports Weekend — Play a field sport at the community courts this weekend!', CURRENT_DATE + 50, CURRENT_DATE + 56, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by) VALUES (v_league_id, v_challenge_id, v_host_id);

  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Zero Rest Week — No rest days this week! Full team participation required!', CURRENT_DATE + 57, CURRENT_DATE + 63, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by) VALUES (v_league_id, v_challenge_id, v_host_id);

  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Grand Finale — Final push! Maximum effort for the championship trophy!', CURRENT_DATE + 78, CURRENT_DATE + 90, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by) VALUES (v_league_id, v_challenge_id, v_host_id);

  RAISE NOTICE 'Created "Prestige Lakeside Habitat Fitness League" with 88 players, 10 PFL activities, 8 challenges.';
END $$;


-- =========================================================================
-- LEAGUE 3: MFL Internal Test League
-- =========================================================================
DO $$
DECLARE
  v_host_id       uuid;
  v_league_id     uuid;
  v_player_role   uuid;
  v_captain_role  uuid;
  v_host_role     uuid;
  v_team_ids      uuid[] := ARRAY[]::uuid[];
  v_team_id       uuid;
  v_user_id       uuid;
  v_lm_id         uuid;
  v_act_id        uuid;
  v_challenge_id  uuid;
  v_demo_hash     text := '$2b$10$.BmcErv3dYrc4.Tp13UNOuVEp.Pv3uATEZVfe7INn0yoUkDnrCWlW';
  v_team_names    text[] := ARRAY[
    'Alpha Testers', 'Beta Bugs', 'Gamma Rays', 'Delta Force'
  ];
  v_name          text;
  v_email         text;
  v_idx           int;
  v_team_idx      int;
BEGIN
  -- Skip if league already exists
  IF EXISTS (SELECT 1 FROM public.leagues WHERE league_name = 'MFL Internal Test League') THEN
    RAISE NOTICE 'League "MFL Internal Test League" already exists — skipping.';
    RETURN;
  END IF;

  -- Look up host user
  SELECT user_id INTO v_host_id FROM public.users WHERE email = 'mfl.verify@gmail.com';
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Host user mfl.verify@gmail.com not found. Please create this user first.';
  END IF;

  -- Look up roles
  SELECT role_id INTO v_player_role  FROM public.roles WHERE role_name = 'player';
  SELECT role_id INTO v_captain_role FROM public.roles WHERE role_name = 'captain';
  SELECT role_id INTO v_host_role    FROM public.roles WHERE role_name = 'host';

  -- Create league (internal test: 60 days, 2 rest/week)
  INSERT INTO public.leagues (
    league_name, description, start_date, end_date, status, is_active,
    num_teams, max_team_capacity, rest_days, is_public, is_exclusive,
    invite_code, created_by
  ) VALUES (
    'MFL Internal Test League',
    'Internal test league for the MFL engineering team — 16 test users across 4 teams, 60-day duration. Use for testing activities, challenges, and new features.',
    CURRENT_DATE + 1,
    CURRENT_DATE + 60,
    'scheduled',
    true,
    4,
    5,
    2,
    false,
    true,
    upper(substr(md5(random()::text), 1, 8)),
    v_host_id
  ) RETURNING league_id INTO v_league_id;

  -- Assign host role
  INSERT INTO public.assignedrolesforleague (league_id, user_id, role_id, created_by)
  VALUES (v_league_id, v_host_id, v_host_role, v_host_id);

  -- Create 4 teams
  FOR i IN 1..4 LOOP
    INSERT INTO public.teams (team_name, invite_code, created_by)
    VALUES (
      v_team_names[i],
      upper(substr(md5(random()::text), 1, 8)),
      v_host_id
    ) RETURNING team_id INTO v_team_id;

    v_team_ids := v_team_ids || v_team_id;

    INSERT INTO public.teamleagues (team_id, league_id, created_by)
    VALUES (v_team_id, v_league_id, v_host_id);
  END LOOP;

  -- Create 16 test players with loginable passwords
  FOR v_idx IN 1..16 LOOP
    v_name  := 'Test User ' || v_idx;
    v_email := 'testuser' || v_idx || '@mfl.test';

    SELECT user_id INTO v_user_id FROM public.users WHERE email = v_email;
    IF v_user_id IS NULL THEN
      INSERT INTO public.users (username, email, password_hash, is_active, platform_role)
      VALUES (
        'test_user_' || v_idx,
        v_email,
        v_demo_hash,
        true,
        'user'
      ) RETURNING user_id INTO v_user_id;
    END IF;

    v_team_idx := ((v_idx - 1) % 4) + 1;
    v_team_id  := v_team_ids[v_team_idx];

    INSERT INTO public.leaguemembers (user_id, league_id, team_id, created_by)
    VALUES (v_user_id, v_league_id, v_team_id, v_host_id)
    ON CONFLICT (user_id, league_id) DO NOTHING
    RETURNING league_member_id INTO v_lm_id;

    IF v_idx <= 4 THEN
      INSERT INTO public.teammembers (team_id, user_id, role_id, created_by)
      VALUES (v_team_id, v_user_id, v_captain_role, v_host_id)
      ON CONFLICT (team_id, user_id) DO NOTHING;

      INSERT INTO public.assignedrolesforleague (league_id, user_id, role_id, created_by)
      VALUES (v_league_id, v_user_id, v_captain_role, v_host_id)
      ON CONFLICT (league_id, user_id, role_id) DO NOTHING;
    ELSE
      INSERT INTO public.teammembers (team_id, user_id, role_id, created_by)
      VALUES (v_team_id, v_user_id, v_player_role, v_host_id)
      ON CONFLICT (team_id, user_id) DO NOTHING;
    END IF;

    INSERT INTO public.assignedrolesforleague (league_id, user_id, role_id, created_by)
    VALUES (v_league_id, v_user_id, v_player_role, v_host_id)
    ON CONFLICT (league_id, user_id, role_id) DO NOTHING;
  END LOOP;

  -- ─── Activities (5 core for internal testing) ───
  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Running';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Distance (km)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Gym';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Duration (mins)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Yoga';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Duration (mins)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Walking';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Distance (km)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  SELECT activity_id INTO v_act_id FROM public.activities WHERE activity_name = 'Cycling';
  INSERT INTO public.leagueactivities (league_id, activity_id, frequency_type, frequency, proof_requirement, points_per_session, custom_field_label, created_by)
  VALUES (v_league_id, v_act_id, 'daily', 1, 'mandatory', 1, 'Duration (mins)', v_host_id)
  ON CONFLICT (league_id, activity_id) DO NOTHING;

  -- ─── Test Challenges ───
  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'QA Smoke Test Challenge — Verify all activity types submit correctly!', CURRENT_DATE + 1, CURRENT_DATE + 7, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by) VALUES (v_league_id, v_challenge_id, v_host_id);

  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Leaderboard Stress Test — All 16 players submit daily for a week!', CURRENT_DATE + 8, CURRENT_DATE + 14, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by) VALUES (v_league_id, v_challenge_id, v_host_id);

  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'Custom Fields Test — Submit activities with all custom field variations!', CURRENT_DATE + 15, CURRENT_DATE + 21, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by) VALUES (v_league_id, v_challenge_id, v_host_id);

  INSERT INTO public.specialchallenges (league_id, name, start_date, end_date, created_by)
  VALUES (v_league_id, 'End-to-End Regression — Full flow test before production deployment!', CURRENT_DATE + 50, CURRENT_DATE + 60, v_host_id)
  RETURNING challenge_id INTO v_challenge_id;
  INSERT INTO public.leagueschallenges (league_id, challenge_id, created_by) VALUES (v_league_id, v_challenge_id, v_host_id);

  RAISE NOTICE 'Created "MFL Internal Test League" with 16 players, 5 activities, 4 challenges.';
END $$;
