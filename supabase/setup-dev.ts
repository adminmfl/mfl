/**
 * Dev DB Setup Script
 *
 * Run: npx tsx supabase/setup-dev.ts
 *
 * Executes all migrations against the dev Supabase DB via the service role client,
 * then runs the seed. This sets up a fresh dev DB from scratch.
 *
 * NOTE: This uses supabase.rpc to run raw SQL. If the DB already has tables,
 * the "IF NOT EXISTS" clauses will skip them safely.
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

const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');

async function runSQL(label: string, sql: string) {
  console.log(`Running: ${label}...`);
  const { error } = await supabase.rpc('exec_sql', { sql_text: sql });
  if (error) {
    // If exec_sql function doesn't exist, we need to create it first
    if (error.message.includes('exec_sql')) {
      console.log('  → exec_sql not found, creating it...');
      return false;
    }
    console.error(`  ✗ Error in ${label}:`, error.message);
    return false;
  }
  console.log(`  ✓ ${label} complete`);
  return true;
}

async function setup() {
  console.log('========================================');
  console.log('MFL Dev Database Setup');
  console.log(`Target: ${SUPABASE_URL}`);
  console.log('========================================\n');

  // Step 0: Create exec_sql helper function via REST
  console.log('Step 0: Creating exec_sql helper function...');
  const createFnSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_text text)
    RETURNS void AS $$
    BEGIN
      EXECUTE sql_text;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  // Use the Supabase REST API to run this directly
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql_text: 'SELECT 1' }),
  });

  if (!response.ok) {
    // Function doesn't exist, create it via SQL editor / raw query
    console.log('  exec_sql does not exist yet. Creating via direct SQL...');

    // Use the Supabase SQL endpoint (pg-meta)
    const sqlResp = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: createFnSQL }),
    });

    if (!sqlResp.ok) {
      console.error('\n⚠️  Cannot create exec_sql function via API.');
      console.error('Please run the migrations manually:');
      console.error('');
      console.error('1. Go to your dev Supabase dashboard → SQL Editor');
      console.error('2. Copy & paste the contents of each migration file and run them in order:');

      const migrationFiles = fs.readdirSync(MIGRATIONS_DIR).sort();
      migrationFiles.forEach((f, i) => {
        console.error(`   ${i + 1}. supabase/migrations/${f}`);
      });

      console.error('');
      console.error('3. Then run: npx tsx supabase/seed-dev.ts');
      console.error('');
      console.error('This is a one-time setup. After the tables exist, the seed script works directly.');
      return;
    }
    console.log('  ✓ exec_sql created');
  } else {
    console.log('  ✓ exec_sql already exists');
  }

  // Step 1: Run migrations in order
  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR).sort();
  console.log(`\nFound ${migrationFiles.length} migration files:\n`);

  for (const file of migrationFiles) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    const success = await runSQL(file, sql);
    if (!success) {
      console.error(`\n⚠️  Migration ${file} failed. Stopping.`);
      console.error('You can run this migration manually in the Supabase SQL Editor.');
      return;
    }
  }

  console.log('\n✅ All migrations applied successfully!');
  console.log('\nNow run the seed: npx tsx supabase/seed-dev.ts');
}

setup().catch(console.error);
