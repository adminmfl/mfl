'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Loader2,
  Dumbbell,
  Search,
  Users,
  Calendar,
  Clock,
  Footprints,
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WorkoutEntry {
  id: string;
  league_member_id: string;
  date: string;
  type: string;
  workout_type: string | null;
  duration: number | null;
  distance: number | null;
  steps: number | null;
  holes: number | null;
  rr_value: number | null;
  created_date: string;
  member: { user_id: string; username: string };
}

interface TeamOption {
  team_id: string;
  team_name: string;
}

interface TeamWorkoutsViewerProps {
  leagueId: string;
  userTeamId: string | null;
  teams: TeamOption[];
  showTeamWorkouts: boolean;
  showLeagueWorkouts: boolean;
}

export function TeamWorkoutsViewer({
  leagueId,
  userTeamId,
  teams,
  showTeamWorkouts,
  showLeagueWorkouts,
}: TeamWorkoutsViewerProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    userTeamId || '',
  );
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available teams based on visibility settings
  const availableTeams = useMemo(() => {
    if (showLeagueWorkouts) return teams;
    if (showTeamWorkouts && userTeamId)
      return teams.filter((t) => t.team_id === userTeamId);
    return [];
  }, [teams, showTeamWorkouts, showLeagueWorkouts, userTeamId]);

  // Unique members from workouts
  const members = useMemo(() => {
    const map = new Map<string, string>();
    workouts.forEach((w) => map.set(w.member.user_id, w.member.username));
    return Array.from(map.entries()).map(([id, name]) => ({
      user_id: id,
      username: name,
    }));
  }, [workouts]);

  // Filtered workouts
  const filteredWorkouts = useMemo(() => {
    if (selectedUserId === 'all') return workouts;
    return workouts.filter((w) => w.member.user_id === selectedUserId);
  }, [workouts, selectedUserId]);

  useEffect(() => {
    if (!selectedTeamId) return;

    const fetchWorkouts = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          team_id: selectedTeamId,
          limit: '5',
        });
        const res = await fetch(`/api/leagues/${leagueId}/workouts?${params}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load');
        }
        const json = await res.json();
        setWorkouts(json.data?.workouts || []);
        setSelectedUserId('all');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load workouts',
        );
        setWorkouts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkouts();
  }, [leagueId, selectedTeamId]);

  if (!showTeamWorkouts && !showLeagueWorkouts) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Dumbbell className="size-4 text-primary" />
          Team Workouts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex gap-2">
          {availableTeams.length > 1 && (
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <Users className="size-3 mr-1" />
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map((t) => (
                  <SelectItem
                    key={t.team_id}
                    value={t.team_id}
                    className="text-xs"
                  >
                    {t.team_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {members.length > 1 && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <Search className="size-3 mr-1" />
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Members
                </SelectItem>
                {members.map((m) => (
                  <SelectItem
                    key={m.user_id}
                    value={m.user_id}
                    className="text-xs"
                  >
                    {m.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive text-center py-4">{error}</p>
        ) : filteredWorkouts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Dumbbell className="size-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No workouts to display</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {filteredWorkouts.map((w) => (
                <div
                  key={w.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <span className="text-[10px] font-bold text-primary">
                      {w.member.username.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {w.member.username}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                      >
                        {w.workout_type || w.type}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {new Date(w.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      {w.duration != null && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {w.duration} min
                        </span>
                      )}
                      {w.distance != null && w.distance > 0 && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {w.distance} km
                        </span>
                      )}
                      {w.steps != null && w.steps > 0 && (
                        <span className="flex items-center gap-1">
                          <Footprints className="size-3" />
                          {w.steps.toLocaleString()}
                        </span>
                      )}
                      {w.rr_value != null && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 h-4"
                        >
                          {w.rr_value} pts
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
