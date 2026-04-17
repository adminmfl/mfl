import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { TournamentMatch } from '@/lib/supabase/types';
import { toast } from '@/lib/toast';

export function useTournamentMatches(challengeId: string) {
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = getSupabase();

    const fetchMatches = useCallback(async () => {
        if (!challengeId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .rpc('get_tournament_matches', { p_challenge_id: challengeId });

            if (error) {
                console.error('Supabase fetch error:', JSON.stringify(error, null, 2));
                throw error;
            }
            console.log('Fetched tournament matches:', data);
            setMatches(data as unknown as TournamentMatch[]);
        } catch (err) {
            console.error('Error fetching matches:', err);
            setError('Failed to load matches');
        } finally {
            setLoading(false);
        }
    }, [challengeId, supabase]);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);

    const createMatch = async (matchData: Partial<TournamentMatch>) => {
        console.log('Creating match with data:', matchData);
        try {
            const { data, error } = await supabase
                .from('challenge_tournament_matches')
                .insert([{ ...matchData, league_challenge_id: challengeId }])
                .select()
                .single();

            if (error) {
                console.error('Supabase create error:', error);
                throw error;
            }
            console.log('Match created successfully:', data);

            // Refresh to get full data
            fetchMatches();
            toast.success('Match created');
            return data;
        } catch (err) {
            console.error('Error creating match:', err);
            toast.error('Failed to create match');
            throw err;
        }
    };

    const updateMatch = async (matchId: string, updates: Partial<TournamentMatch>) => {
        console.log('Updating match', matchId, 'with:', updates);
        try {
            const { data, error } = await supabase
                .from('challenge_tournament_matches')
                .update(updates)
                .eq('match_id', matchId)
                .select()
                .single();

            if (error) {
                console.error('Supabase update error:', error);
                throw error;
            }

            console.log('Match updated successfully:', data);

            // Refresh the full list to get joined data (team names) via RPC
            fetchMatches();
            toast.success('Match updated');
            return data;
        } catch (err) {
            console.error('Error updating match:', err);
            toast.error('Failed to update match');
            throw err;
        }
    };

    const deleteMatch = async (matchId: string) => {
        try {
            const { error } = await supabase
                .from('challenge_tournament_matches')
                .delete()
                .eq('match_id', matchId);

            if (error) throw error;
            setMatches((prev) => prev.filter((m) => m.match_id !== matchId));
            toast.success('Match deleted');
        } catch (err) {
            console.error('Error deleting match:', err);
            toast.error('Failed to delete match');
            throw err;
        }
    };

    return {
        matches,
        loading,
        error,
        refresh: fetchMatches,
        createMatch,
        updateMatch,
        deleteMatch,
    };
}
