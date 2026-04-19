import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth/get-auth-user'

// Server-side Supabase client with service role to satisfy RLS while using NextAuth for auth
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Supabase service configuration is missing')
  }
  return createClient(url, serviceKey)
}

type LeagueRow = {
  league_id: string
  leagues: {
    league_name?: string | null
  } | null
}

type ApiLeague = {
  league_id: string
  name: string
  description: string | null
  cover_image: string | null
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = authUser.id

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('leaguemembers')
      .select('league_id, leagues(league_name)')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching leagues for user', error)
      return NextResponse.json({ error: 'Failed to load leagues' }, { status: 500 })
    }

    const leagues: ApiLeague[] = (data as LeagueRow[] | null)?.map((row) => {
      const league = row.leagues || {}
      return {
        league_id: String(row.league_id),
        name: league?.league_name || 'League',
        description: null,
        cover_image: null,
      }
    }) || []

    return NextResponse.json({ leagues })
  } catch (err) {
    console.error('Unhandled error in /api/dashboard/leagues', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
