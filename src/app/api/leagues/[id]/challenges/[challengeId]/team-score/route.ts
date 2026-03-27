import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; challengeId: string }> }
) {
    try {
        const { id: leagueId, challengeId } = await params;
        const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseServiceRole();
        const userId = session.user.id;

        // Verify host/governor role
        const { data: memberRoles, error: roleError } = await supabase
            .from('assignedrolesforleague')
            .select('role_id, roles(role_name)')
            .eq('user_id', userId)
            .eq('league_id', leagueId);

        const hasAdminRole = memberRoles?.some((r: any) => {
            const roleName = r.roles?.role_name;
            return roleName === 'host' || roleName === 'governor';
        });

        if (roleError || !hasAdminRole) {
            return NextResponse.json({ success: false, error: 'Only hosts/governors can assign team scores' }, { status: 403 });
        }

        const body = await req.json();
        const { teamId, score } = body;

        if (!teamId || typeof score !== 'number' || score < 0) {
            return NextResponse.json({ success: false, error: 'teamId and valid score are required' }, { status: 400 });
        }

        // Get the league challenge
        const { data: challenge, error: challengeError } = await supabase
            .from('leagueschallenges')
            .select('*')
            .eq('id', challengeId)
            .eq('league_id', leagueId)
            .single();

        if (challengeError || !challenge) {
            return NextResponse.json({ success: false, error: 'Challenge not found' }, { status: 404 });
        }

        let parentChallengeId = challenge.challenge_id;

        // If no parent challenge exists, create a placeholder (same as finalize route)
        if (!parentChallengeId) {
            const { data: newParent, error: createError } = await supabase
                .from('specialchallenges')
                .insert({
                    name: challenge.name || 'Team Challenge Placeholder',
                    description: 'Auto-generated parent for team score tracking',
                    challenge_type: 'team',
                    is_custom: true,
                    created_by: userId,
                })
                .select('challenge_id')
                .single();

            if (createError || !newParent) {
                return NextResponse.json({ success: false, error: 'Failed to initialize scoring system' }, { status: 500 });
            }

            parentChallengeId = newParent.challenge_id;

            const { error: linkError } = await supabase
                .from('leagueschallenges')
                .update({ challenge_id: parentChallengeId })
                .eq('id', challengeId);

            if (linkError) {
                return NextResponse.json({ success: false, error: 'Failed to link scoring system' }, { status: 500 });
            }
        }

        // Upsert the team score
        const { data: existing } = await supabase
            .from('specialchallengeteamscore')
            .select('id')
            .eq('challenge_id', parentChallengeId)
            .eq('team_id', teamId)
            .eq('league_id', leagueId)
            .maybeSingle();

        if (existing) {
            const { error: updateError } = await supabase
                .from('specialchallengeteamscore')
                .update({
                    score,
                    modified_by: userId,
                    modified_date: new Date().toISOString(),
                })
                .eq('id', existing.id);

            if (updateError) {
                return NextResponse.json({ success: false, error: 'Failed to update score' }, { status: 500 });
            }
        } else {
            const { error: insertError } = await supabase
                .from('specialchallengeteamscore')
                .insert({
                    challenge_id: parentChallengeId,
                    team_id: teamId,
                    league_id: leagueId,
                    score,
                    created_by: userId,
                });

            if (insertError) {
                return NextResponse.json({ success: false, error: 'Failed to save score' }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true, message: 'Team score assigned' });
    } catch (err) {
        console.error('Error in team-score POST:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
