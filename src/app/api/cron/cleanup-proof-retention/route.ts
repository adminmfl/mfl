/**
 * GET /api/cron/cleanup-proof-retention
 *
 * Deletes workout proof files for leagues that ended more than 90 days ago,
 * then nulls `proof_url` so archived data no longer points to deleted assets.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

const PROOF_BUCKET = process.env.NEXT_PUBLIC_PROOF_BUCKET || 'proofs';
const RETENTION_DAYS = 90;
const BATCH_SIZE = 500;

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function extractProofPath(urlOrPath: string): string | null {
  if (!urlOrPath) return null;

  // Already a storage path
  if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
    return urlOrPath;
  }

  const marker = `/storage/v1/object/public/${PROOF_BUCKET}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx === -1) return null;

  return decodeURIComponent(urlOrPath.slice(idx + marker.length));
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffYmd = toYmd(cutoffDate);

    const { data: expiredLeagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('league_id')
      .lt('end_date', cutoffYmd);

    if (leaguesError) {
      return NextResponse.json(
        {
          error: 'Failed to fetch expired leagues',
          details: leaguesError.message,
        },
        { status: 500 },
      );
    }

    const leagueIds = (expiredLeagues || [])
      .map((l: any) => l.league_id)
      .filter(Boolean);
    if (leagueIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No leagues past proof retention window',
        leaguesScanned: 0,
        deletedFiles: 0,
        updatedEntries: 0,
      });
    }

    const { data: members, error: membersError } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .in('league_id', leagueIds);

    if (membersError) {
      return NextResponse.json(
        {
          error: 'Failed to fetch league members',
          details: membersError.message,
        },
        { status: 500 },
      );
    }

    const memberIds = (members || [])
      .map((m: any) => m.league_member_id)
      .filter(Boolean);
    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No members found for expired leagues',
        leaguesScanned: leagueIds.length,
        deletedFiles: 0,
        updatedEntries: 0,
      });
    }

    const { data: entries, error: entriesError } = await supabase
      .from('effortentry')
      .select('id, proof_url, proof_url_2')
      .in('league_member_id', memberIds)
      .or('proof_url.not.is.null,proof_url_2.not.is.null')
      .limit(BATCH_SIZE);

    if (entriesError) {
      return NextResponse.json(
        {
          error: 'Failed to fetch proof entries',
          details: entriesError.message,
        },
        { status: 500 },
      );
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No retained proof files to clean',
        leaguesScanned: leagueIds.length,
        deletedFiles: 0,
        updatedEntries: 0,
      });
    }

    const entryIdsToClear: string[] = [];
    const pathsToDelete: string[] = [];

    for (const entry of entries as Array<{
      id: string;
      proof_url: string | null;
      proof_url_2?: string | null;
    }>) {
      if (!entry.id) continue;

      const entryPaths = [entry.proof_url, entry.proof_url_2]
        .filter((url): url is string => Boolean(url))
        .map((url) => extractProofPath(url))
        .filter((path): path is string => Boolean(path));

      if (entryPaths.length === 0) continue;
      entryIdsToClear.push(entry.id);
      pathsToDelete.push(...entryPaths);
    }

    const uniquePaths = Array.from(new Set(pathsToDelete));
    if (uniquePaths.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from(PROOF_BUCKET)
        .remove(uniquePaths);

      if (deleteError) {
        return NextResponse.json(
          {
            error: 'Failed to delete proof files',
            details: deleteError.message,
          },
          { status: 500 },
        );
      }
    }

    let updatedEntries = 0;
    if (entryIdsToClear.length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from('effortentry')
        .update({
          proof_url: null,
          proof_url_2: null,
          modified_date: new Date().toISOString(),
        })
        .in('id', entryIdsToClear)
        .select('id');

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to clear proof URLs', details: updateError.message },
          { status: 500 },
        );
      }

      updatedEntries = updated?.length || 0;
    }

    return NextResponse.json({
      success: true,
      message: 'Proof retention cleanup completed',
      leaguesScanned: leagueIds.length,
      deletedFiles: uniquePaths.length,
      updatedEntries,
      batchLimit: BATCH_SIZE,
      hasMore: entries.length === BATCH_SIZE,
    });
  } catch (error) {
    console.error('Error in proof retention cleanup cron:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
