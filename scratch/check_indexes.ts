import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function checkIndexes() {
  const { data, error } = await supabase.rpc('check_indexes', {
    table_names: [
      'effortentry',
      'leaguemembers',
      'assignedrolesforleague',
      'challenge_submissions',
    ],
  });

  if (error) {
    // If RPC doesn't exist, try a raw query if possible, but usually we can't do raw SQL via supabase-js
    // unless we have a specific function.
    console.log(
      'RPC check_indexes failed. Suggesting indexes based on code analysis.',
    );
    return;
  }
  console.log('Existing Indexes:', data);
}

checkIndexes();
