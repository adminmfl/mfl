'use client';

import * as React from 'react';
import { use } from 'react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, Plus, CheckCircle2, Clock3, XCircle, Shield, FileText, Trash2, Share2, Copy, Users, Pencil } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useRole } from '@/contexts/role-context';
import { cn } from '@/lib/utils';
import { SubTeamManager } from '@/components/challenges/sub-team-manager';
import { TournamentManagerDialog } from '@/components/challenges/tournament-manager-dialog';
import { TournamentFinalizeDialog } from '@/components/challenges/tournament-finalize-dialog';

// Types
type Challenge = {
    id: string;
    name: string;
    description: string | null;
    challenge_type: 'individual' | 'team' | 'sub_team' | 'tournament';
    total_points: number;
    status: 'draft' | 'scheduled' | 'active' | 'submission_closed' | 'published' | 'closed';
    start_date: string | null;
    end_date: string | null;
    doc_url: string | null;
    is_custom: boolean;
    is_unique_workout?: boolean;
    template_id: string | null;
    pricing_id?: string | null;
    stats: { pending: number; approved: number; rejected: number } | null;
};

type ChallengeSubmission = {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    proof_url: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
    awarded_points: number | null;
    created_at: string;
    team_id?: string | null;
};

type SubmissionRow = ChallengeSubmission & {
    league_member_id: string;
    leaguemembers?: {
        role: string | null;
        teams?: { team_name: string | null; team_id?: string } | null;
        users?: { username: string | null } | null;
    } | null;
};

// Helpers
const statusBadge = (s: Challenge['status']) => {
    switch (s) {
        case 'draft':
            return <Badge variant="secondary">Draft</Badge>;
        case 'scheduled':
            return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100/80 border-blue-200">Scheduled</Badge>;
        case 'active':
            return <Badge className="bg-green-100 text-green-800 hover:bg-green-100/80 border-green-200">Active</Badge>;
        case 'submission_closed':
            return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100/80 border-orange-200">Submissions Closed</Badge>;
        case 'published':
            return <Badge className="bg-green-100 text-green-800 hover:bg-green-100/80 border-green-200">Scores Published</Badge>;
        case 'closed':
            return <Badge variant="secondary">Challenge Closed</Badge>;
        default:
            return <Badge variant="outline">{s}</Badge>;
    }
};

function submissionStatusBadge(status: ChallengeSubmission['status']) {
    const map = {
        pending: { label: 'Pending', icon: Clock3, className: 'bg-yellow-100 text-yellow-800' },
        approved: { label: 'Approved', icon: CheckCircle2, className: 'bg-green-100 text-green-700' },
        rejected: { label: 'Rejected', icon: XCircle, className: 'bg-red-100 text-red-700' },
    } as const;
    const cfg = map[status];
    const Icon = cfg.icon;
    return (
        <Badge variant="outline" className={cn('gap-1 w-fit', cfg.className)}>
            <Icon className="size-3" />
            {cfg.label}
        </Badge>
    );
}

const getChallengeTypeDescription = (type: Challenge['challenge_type']) => {
    switch (type) {
        case 'team':
            return 'Selected members participate. You assign ONE score to the whole team.';
        case 'individual':
            return 'All members participate. You score each submission, system aggregates to team.';
        case 'sub_team':
            return 'Sub-groups participate. You assign ONE score per sub-team.';
        case 'tournament':
            return 'Bracket-style tournament with fixtures and standings.';
        default:
            return '';
    }
};

export default function ConfigureChallengesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: leagueId } = use(params);
    const { isHost, isGovernor } = useRole();
    const isAdmin = isHost || isGovernor;

    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [challenges, setChallenges] = React.useState<Challenge[]>([]);
    const [presets, setPresets] = React.useState<any[]>([]);
    const [pricing, setPricing] = React.useState<{ pricing_id?: string | null; per_day_rate?: number | null; tax?: number | null; admin_markup?: number | null } | null>(null);
    const [selectedPresetId, setSelectedPresetId] = React.useState<string>('');

    // Create challenge dialog state
    const [createOpen, setCreateOpen] = React.useState(false);
    const [createForm, setCreateForm] = React.useState({
        name: '',
        description: '',
        challengeType: 'individual' as Challenge['challenge_type'],
        totalPoints: '' as string | number,
        docUrl: '',
        startDate: '',
        endDate: '',
        isUniqueWorkout: false,
    });
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

    // Edit dialog state
    const [editOpen, setEditOpen] = React.useState(false);
    const [editChallenge, setEditChallenge] = React.useState<Challenge | null>(null);
    const [editLoading, setEditLoading] = React.useState(false);
    const [editForm, setEditForm] = React.useState({
        name: '',
        description: '',
        challengeType: 'individual' as Challenge['challenge_type'],
        totalPoints: '' as string | number,
        docUrl: '',
        startDate: '',
        endDate: '',
        isUniqueWorkout: false,
    });

    // Activate preset dialog state
    const [activateOpen, setActivateOpen] = React.useState(false);
    const [selectedPreset, setSelectedPreset] = React.useState<any | null>(null);
    const [activateForm, setActivateForm] = React.useState({
        totalPoints: '' as string | number,
        startDate: '',
        endDate: '',
        isUniqueWorkout: false,
    });

    // View Proof dialog state
    const [viewProofOpen, setViewProofOpen] = React.useState(false);
    const [viewProofUrl, setViewProofUrl] = React.useState<string | null>(null);

    // Review dialog state
    const [reviewOpen, setReviewOpen] = React.useState(false);
    const [reviewChallenge, setReviewChallenge] = React.useState<Challenge | null>(null);
    const [submissions, setSubmissions] = React.useState<SubmissionRow[]>([]);
    const [validatingId, setValidatingId] = React.useState<string | null>(null);
    const [reviewAwardedPoints, setReviewAwardedPoints] = React.useState<Record<string, number | ''>>({});
    const [reviewFilterTeamId, setReviewFilterTeamId] = React.useState<string>('');
    const [reviewFilterSubTeamId, setReviewFilterSubTeamId] = React.useState<string>('');
    const [teams, setTeams] = React.useState<Array<{ team_id: string; team_name: string }>>([]);
    const [teamMemberCounts, setTeamMemberCounts] = React.useState<Record<string, number>>({});
    const [subTeams, setSubTeams] = React.useState<Array<{ subteam_id: string; name: string }>>([]);

    // Team-level score for team challenges (ONE score per team)
    const [teamScores, setTeamScores] = React.useState<Record<string, number | ''>>({});

    // Finish creation dialog state
    const [finishOpen, setFinishOpen] = React.useState(false);
    const [finishChallenge, setFinishChallenge] = React.useState<Challenge | null>(null);
    const [finishStart, setFinishStart] = React.useState('');
    const [finishEnd, setFinishEnd] = React.useState('');
    const [finishing, setFinishing] = React.useState(false);

    // Delete dialog state
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [challengeToDelete, setChallengeToDelete] = React.useState<Challenge | null>(null);
    const [deleting, setDeleting] = React.useState(false);

    // Publish state
    const [publishingId, setPublishingId] = React.useState<string | null>(null);

    // Tournament Manager state
    const [tournamentManagerOpen, setTournamentManagerOpen] = React.useState(false);
    const [tournamentFinalizeOpen, setTournamentFinalizeOpen] = React.useState(false);
    const [manageChallenge, setManageChallenge] = React.useState<Challenge | null>(null);

    const finishDays = React.useMemo(() => {
        if (!finishStart || !finishEnd) return 0;
        const start = new Date(finishStart);
        const end = new Date(finishEnd);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
        const diff = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        return diff >= 0 ? diff + 1 : 0;
    }, [finishStart, finishEnd]);

    const finishAmount = React.useMemo(() => {
        if (!pricing?.per_day_rate || !finishDays) return 0;
        const base = finishDays * (pricing.per_day_rate || 0);
        const taxPercent = pricing.tax != null ? pricing.tax : 0;
        const taxMultiplier = taxPercent / 100;
        return base + taxMultiplier * base;
    }, [pricing, finishDays]);

    const fetchChallenges = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/leagues/${leagueId}/challenges`);
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Failed to load challenges');
            }
            setChallenges(json.data?.active || []);
            setPresets(json.data?.availablePresets || []);
            setPricing(json.data?.defaultPricing || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load challenges');
        } finally {
            setLoading(false);
        }
    }, [leagueId]);

    React.useEffect(() => {
        fetchChallenges();
    }, [fetchChallenges]);

    React.useEffect(() => {
        fetchTeams();
    }, [leagueId]);

    // Utility to load Razorpay script lazily
    const loadRazorpay = React.useCallback(async () => {
        if (typeof window === 'undefined') return null;
        if ((window as any).Razorpay) return (window as any).Razorpay;
        await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Razorpay'));
            document.body.appendChild(script);
        });
        return (window as any).Razorpay;
    }, []);

    const handleActivatePreset = () => {
        const preset = presets.find((p) => p.id === selectedPresetId);
        if (preset) {
            setSelectedPreset(preset);
            setActivateForm({ totalPoints: '', startDate: '', endDate: '', isUniqueWorkout: false });
            setActivateOpen(true);
        }
    };

    const handleSubmitActivation = async () => {
        if (!selectedPreset) return;
        try {
            const payload = {
                name: selectedPreset.name,
                description: selectedPreset.description || '',
                challengeType: selectedPreset.challenge_type,
                totalPoints: Number(activateForm.totalPoints) || 0,
                startDate: activateForm.startDate || null,
                endDate: activateForm.endDate || null,
                docUrl: selectedPreset.doc_url || null,
                templateId: selectedPreset.id,
                isCustom: false,
                isUniqueWorkout: activateForm.isUniqueWorkout,
                status: 'active',
            };

            const res = await fetch(`/api/leagues/${leagueId}/challenges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Failed to activate challenge');
            }

            toast.success('Challenge activated successfully');
            setActivateOpen(false);
            setSelectedPresetId('');
            setSelectedPreset(null);
            fetchChallenges();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to activate challenge');
        }
    };

    const handleCreateChallenge = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let docUrl = createForm.docUrl || null;

            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('league_id', leagueId);

                const uploadRes = await fetch('/api/upload/challenge-document', {
                    method: 'POST',
                    body: formData,
                });

                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) {
                    throw new Error(uploadData.error || 'Document upload failed');
                }

                docUrl = uploadData.data.url;
            }

            const payload = {
                name: createForm.name,
                description: createForm.description,
                challengeType: createForm.challengeType,
                totalPoints: Number(createForm.totalPoints) || 0,
                docUrl,
                startDate: createForm.startDate || null,
                endDate: createForm.endDate || null,
                isCustom: true,
                isUniqueWorkout: createForm.isUniqueWorkout,
            };

            const res = await fetch(`/api/leagues/${leagueId}/challenges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Failed to create challenge');
            }

            toast.success('Challenge created');
            setCreateOpen(false);
            setSelectedFile(null);
            setCreateForm({ name: '', description: '', challengeType: 'individual', totalPoints: '', docUrl: '', startDate: '', endDate: '', isUniqueWorkout: false });
            fetchChallenges();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create challenge');
        }
    };


    const handleEditClick = (challenge: Challenge) => {
        setEditChallenge(challenge);
        setEditForm({
            name: challenge.name,
            description: challenge.description || '',
            challengeType: challenge.challenge_type,
            totalPoints: challenge.total_points,
            docUrl: challenge.doc_url || '',
            startDate: challenge.start_date ? challenge.start_date.split('T')[0] : '',
            endDate: challenge.end_date ? challenge.end_date.split('T')[0] : '',
            isUniqueWorkout: !!challenge.is_unique_workout,
        });
        setSelectedFile(null);
        setEditOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editChallenge || editLoading) return;

        setEditLoading(true);
        try {
            let docUrl = editForm.docUrl || null;

            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('league_id', leagueId);

                const uploadRes = await fetch('/api/upload/challenge-document', {
                    method: 'POST',
                    body: formData,
                });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
                docUrl = uploadData.data.url;
            }

            const payload = {
                name: editForm.name,
                description: editForm.description,
                challengeType: editForm.challengeType,
                totalPoints: Number(editForm.totalPoints) || 0,
                docUrl,
                startDate: editForm.startDate || null,
                endDate: editForm.endDate || null,
                isUniqueWorkout: editForm.isUniqueWorkout,
            };

            const res = await fetch(`/api/leagues/${leagueId}/challenges/${editChallenge.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'Update failed');

            toast.success('Challenge updated');
            setEditOpen(false);
            setEditChallenge(null);
            setSelectedFile(null);
            fetchChallenges();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Update failed');
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteClick = (challenge: Challenge) => {
        setChallengeToDelete(challenge);
        setDeleteOpen(true);
    };

    const handleFinishClick = (challenge: Challenge) => {
        setFinishChallenge(challenge);
        setFinishStart(challenge.start_date || '');
        setFinishEnd(challenge.end_date || '');
        setFinishOpen(true);
    };

    const handleFinishSubmit = async () => {
        if (!finishChallenge) return;
        if (!finishStart || !finishEnd) {
            toast.error('Start date and end date are required');
            return;
        }
        if (!pricing?.per_day_rate) {
            toast.error('Pricing not available');
            return;
        }
        const base = (finishDays || 0) * (pricing.per_day_rate || 0);
        const taxPercent = pricing.tax != null ? pricing.tax : 0;
        const amount = base + (taxPercent / 100) * base;
        if (!amount || amount <= 0) {
            toast.error('Amount is invalid');
            return;
        }
        setFinishing(true);
        try {
            const orderRes = await fetch('/api/payments/challenge-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leagueId,
                    challengeId: finishChallenge.id,
                    startDate: finishStart,
                    endDate: finishEnd,
                }),
            });

            const orderJson = await orderRes.json();
            if (!orderRes.ok || orderJson.error) {
                throw new Error(orderJson.error || 'Failed to start payment');
            }

            const Razorpay = await loadRazorpay();
            if (!Razorpay) throw new Error('Razorpay unavailable');

            const options = {
                key: orderJson.keyId,
                amount: orderJson.amount,
                currency: orderJson.currency || 'INR',
                name: 'Challenge Activation',
                description: finishChallenge.name,
                order_id: orderJson.orderId,
                notes: { leagueId, challengeId: finishChallenge.id },
                handler: async (response: any) => {
                    try {
                        const verifyRes = await fetch('/api/payments/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                orderId: response.razorpay_order_id,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                            }),
                        });
                        const verifyJson = await verifyRes.json();
                        if (!verifyRes.ok || verifyJson.error) {
                            throw new Error(verifyJson.error || 'Payment verification failed');
                        }

                        const payload = { startDate: finishStart, endDate: finishEnd };
                        const patchRes = await fetch(`/api/leagues/${leagueId}/challenges/${finishChallenge.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload),
                        });
                        const patchJson = await patchRes.json();
                        if (!patchRes.ok || !patchJson.success) {
                            throw new Error(patchJson.error || 'Failed to update challenge after payment');
                        }

                        toast.success('Payment successful. Challenge activated.');
                        setFinishOpen(false);
                        setFinishChallenge(null);
                        fetchChallenges();
                    } catch (err: any) {
                        toast.error(err?.message || 'Payment succeeded but activation failed');
                    }
                },
                theme: { color: '#0F172A' },
            } as any;

            const rzp = new Razorpay(options);
            rzp.on('payment.failed', (resp: any) => {
                toast.error(resp?.error?.description || 'Payment failed');
            });
            rzp.open();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to finish setup');
        } finally {
            setFinishing(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!challengeToDelete) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/leagues/${leagueId}/challenges/${challengeToDelete.id}`, {
                method: 'DELETE',
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Failed to delete challenge');
            }
            toast.success(`Challenge "${challengeToDelete.name}" deleted successfully`);
            setDeleteOpen(false);
            setChallengeToDelete(null);
            fetchChallenges();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete challenge');
        } finally {
            setDeleting(false);
        }
    };


    const fetchSubmissions = async (challenge: Challenge) => {
        try {
            const params = new URLSearchParams();
            if (reviewFilterTeamId) params.append('teamId', reviewFilterTeamId);
            if (reviewFilterSubTeamId) params.append('subTeamId', reviewFilterSubTeamId);

            const url = `/api/leagues/${leagueId}/challenges/${challenge.id}/submissions?${params.toString()}`;
            const res = await fetch(url);
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Failed to load submissions');
            }
            setSubmissions(json.data || []);
            setReviewChallenge(challenge);
            setReviewOpen(true);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load submissions');
        }
    };

    const fetchTeams = async () => {
        try {
            const res = await fetch(`/api/leagues/${leagueId}/teams`);
            const json = await res.json();
            if (res.ok && json.success) {
                const teamsList = json.data?.teams || [];
                setTeams(teamsList);
                const counts: Record<string, number> = {};
                teamsList.forEach((team: any) => {
                    counts[team.team_id] = team.member_count || 0;
                });
                setTeamMemberCounts(counts);
            }
        } catch (err) {
            console.error('Failed to load teams:', err);
        }
    };

    const fetchSubTeams = async (challengeId: string, teamId: string) => {
        try {
            const res = await fetch(`/api/leagues/${leagueId}/challenges/${challengeId}/subteams?teamId=${teamId}`);
            const json = await res.json();
            if (res.ok && json.success) {
                setSubTeams(json.data || []);
            }
        } catch (err) {
            console.error('Failed to load sub-teams:', err);
        }
    };

    const handleOpenReview = async (challenge: Challenge) => {
        setReviewFilterTeamId('');
        setReviewFilterSubTeamId('');
        setSubTeams([]);
        setTeamScores({});
        if (challenge.challenge_type === 'team' || challenge.challenge_type === 'sub_team') {
            await fetchTeams();
        }
        await fetchSubmissions(challenge);
    };

    const handlePublish = async (challenge: Challenge) => {
        if (challenge.stats && challenge.stats.pending > 0) {
            toast.error('Review all pending submissions before publishing');
            return;
        }
        setPublishingId(challenge.id);
        try {
            const res = await fetch(`/api/leagues/${leagueId}/challenges/${challenge.id}/publish`, {
                method: 'POST',
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Failed to publish scores');
            }
            toast.success('Scores published');
            fetchChallenges();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to publish scores');
        } finally {
            setPublishingId(null);
        }
    };

    React.useEffect(() => {
        if (reviewChallenge && reviewOpen) {
            fetchSubmissions(reviewChallenge);
        }
    }, [reviewFilterTeamId, reviewFilterSubTeamId]);

    React.useEffect(() => {
        if (reviewChallenge?.challenge_type === 'sub_team' && reviewFilterTeamId && reviewChallenge.id) {
            setReviewFilterSubTeamId('');
            fetchSubTeams(reviewChallenge.id, reviewFilterTeamId);
        } else {
            setSubTeams([]);
        }
    }, [reviewFilterTeamId, reviewChallenge]);

    React.useEffect(() => {
        if (teams.length > 0 && !reviewFilterTeamId && reviewOpen) {
            setReviewFilterTeamId(teams[0].team_id);
        }
    }, [teams, reviewOpen]);

    const handleValidate = async (submissionId: string, status: 'approved' | 'rejected', awardedPoints?: number | null) => {
        setValidatingId(submissionId);
        try {
            const body: any = { status };
            if (awardedPoints !== undefined) body.awardedPoints = awardedPoints;
            const res = await fetch(`/api/challenge-submissions/${submissionId}/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Failed to update');
            }
            toast.success(`Submission ${status}`);
            setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? { ...s, status } : s)));
            fetchChallenges();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Update failed');
        } finally {
            setValidatingId(null);
        }
    };

    // Simplified team score assignment for Team challenges
    const handleAssignTeamScore = async (teamId: string, score: number) => {
        if (!reviewChallenge) return;
        try {
            const res = await fetch(`/api/leagues/${leagueId}/challenges/${reviewChallenge.id}/team-score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId, score }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Failed to assign team score');
            }
            toast.success('Team score assigned');
            fetchChallenges();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to assign team score');
        }
    };

    // Redirect non-admins
    if (!isAdmin) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                <Shield className="size-12 text-muted-foreground" />
                <h1 className="text-xl font-semibold">Access Denied</h1>
                <p className="text-muted-foreground text-center max-w-md">
                    This page is only accessible to Hosts and Governors. Please use the Challenges page to view and submit proofs.
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col gap-4 lg:gap-6">
            <div className="flex flex-col gap-3 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Configure Challenges</h1>
                    <p className="text-muted-foreground">
                        Create, review, and manage challenges for your league.
                    </p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 size-4" />
                    Create Challenge
                </Button>
            </div>

            <div className="px-4 lg:px-6 mt-6 space-y-4">
                {loading && <p className="text-muted-foreground">Loading challenges...</p>}
                {error && <p className="text-destructive">{error}</p>}

                {/* Available Presets */}
                {!loading && !error && presets.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Pre-configured Challenges</CardTitle>
                            <CardDescription>Select a challenge template to activate</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
                                <div className="flex-1 min-w-0 space-y-2">
                                    <Label htmlFor="preset-select" className="text-sm font-medium">Challenge</Label>
                                    <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
                                        <SelectTrigger id="preset-select">
                                            <SelectValue placeholder="Choose a challenge..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {presets.map((preset) => (
                                                <SelectItem key={preset.id} value={preset.id}>
                                                    {preset.name} ({preset.challenge_type?.replace('_', ' ')})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    className="w-full sm:w-auto shrink-0 whitespace-nowrap"
                                    onClick={handleActivatePreset}
                                    disabled={!selectedPresetId}
                                >
                                    Select Challenge
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!loading && !error && challenges.length === 0 && presets.length === 0 && (
                    <div className="text-center py-12 border rounded-lg bg-muted/30">
                        <FileText className="mx-auto mb-3 text-muted-foreground" />
                        <p className="text-muted-foreground">No challenges yet.</p>
                        <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                            <Plus className="mr-2 size-4" />
                            Create Challenge
                        </Button>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {challenges.map((challenge) => (
                        <Card
                            key={challenge.id}
                            className="flex flex-col rounded-xl border bg-card text-foreground hover:border-primary/30 transition dark:bg-gradient-to-b dark:from-[#0c1b33] dark:to-[#081425]"
                        >
                            <CardHeader className="pb-3 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-lg font-semibold leading-tight">
                                        {challenge.name}
                                    </CardTitle>
                                    {statusBadge(challenge.status)}
                                </div>
                                <CardDescription>
                                    {challenge.description || 'No description provided'}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex flex-col gap-4 text-sm">
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Badge variant="outline" className="capitalize">
                                        {challenge.challenge_type.replace('_', ' ')}
                                    </Badge>
                                    <span className="text-xs">{challenge.total_points} pts</span>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    {getChallengeTypeDescription(challenge.challenge_type)}
                                </p>

                                {(challenge.start_date || challenge.end_date) && (
                                    <div className="text-xs text-muted-foreground">
                                        {challenge.start_date && <>Start: {format(parseISO(challenge.start_date), 'MMM d')}</>}
                                        {challenge.start_date && challenge.end_date && ' • '}
                                        {challenge.end_date && <>End: {format(parseISO(challenge.end_date), 'MMM d')}</>}
                                    </div>
                                )}

                                {challenge.stats && (
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="rounded-md bg-muted px-2 py-1 text-center dark:bg-white/5">
                                            Pending<br />
                                            <span className="font-semibold">{challenge.stats.pending}</span>
                                        </div>
                                        <div className="rounded-md bg-muted px-2 py-1 text-center dark:bg-white/5">
                                            Approved<br />
                                            <span className="font-semibold text-green-600 dark:text-green-400">
                                                {challenge.stats.approved}
                                            </span>
                                        </div>
                                        <div className="rounded-md bg-muted px-2 py-1 text-center dark:bg-white/5">
                                            Rejected<br />
                                            <span className="font-semibold text-red-600 dark:text-red-400">
                                                {challenge.stats.rejected}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>

                            <div className="mt-auto px-6 pb-5 space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {challenge.status === 'draft' ? (
                                        <Button size="sm" onClick={() => handleFinishClick(challenge)}>
                                            Finish Creation
                                        </Button>
                                    ) : challenge.challenge_type === 'tournament' ? (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setManageChallenge(challenge);
                                                    setTournamentManagerOpen(true);
                                                }}
                                                className="gap-2"
                                            >
                                                <Shield className="size-3" />
                                                Manage Matches
                                            </Button>
                                            {['submission_closed', 'published'].includes(challenge.status) && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setManageChallenge(challenge);
                                                        setTournamentFinalizeOpen(true);
                                                    }}
                                                >
                                                    Edit Scores
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleOpenReview(challenge)}
                                            disabled={challenge.status !== 'submission_closed' && challenge.status !== 'published'}
                                            title={['submission_closed', 'published'].includes(challenge.status) ? '' : 'Reviews open after submissions close'}
                                        >
                                            Review
                                        </Button>
                                    )}

                                    {challenge.status === 'submission_closed' && challenge.challenge_type !== 'tournament' && (
                                        <Button
                                            size="sm"
                                            onClick={() => handlePublish(challenge)}
                                            disabled={publishingId === challenge.id || (challenge.stats?.pending ?? 0) > 0}
                                        >
                                            {publishingId === challenge.id ? 'Publishing...' : 'Publish Scores'}
                                        </Button>
                                    )}

                                    {challenge.status === 'published' && challenge.challenge_type === 'tournament' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setManageChallenge(challenge);
                                                setTournamentFinalizeOpen(true);
                                            }}
                                        >
                                            Edit Scores
                                        </Button>
                                    )}
                                </div>

                                {challenge.status === 'submission_closed' && (challenge.stats?.pending ?? 0) > 0 && (
                                    <p className="text-xs text-muted-foreground">Review pending submissions before publishing.</p>
                                )}

                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    {challenge.challenge_type === 'sub_team' && ['draft', 'scheduled', 'upcoming'].includes(challenge.status) && (
                                        <SubTeamManager leagueId={leagueId} challengeId={challenge.id} teams={teams} />
                                    )}

                                    {isHost && (
                                        <>
                                            <Button size="sm" variant="outline" onClick={() => handleEditClick(challenge)}>
                                                <Pencil className="size-3 mr-1" />
                                                Edit
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(challenge)}>
                                                <Trash2 className="size-3 mr-1" />
                                                Delete
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Create Challenge Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create Custom Challenge</DialogTitle>
                        <DialogDescription>Set up a new challenge for your league.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateChallenge} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={createForm.name}
                                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                rows={3}
                                value={createForm.description}
                                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                    value={createForm.challengeType}
                                    onValueChange={(val) => setCreateForm((p) => ({ ...p, challengeType: val as Challenge['challenge_type'] }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="individual">Individual (Team-Aggregated)</SelectItem>
                                        <SelectItem value="team">Team (One Score)</SelectItem>
                                        <SelectItem value="sub_team">Sub-Team</SelectItem>
                                        <SelectItem value="tournament">Tournament (Fixtures)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    {getChallengeTypeDescription(createForm.challengeType)}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Total Points</Label>
                                <Input
                                    type="number"
                                    value={createForm.totalPoints}
                                    min={0}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, totalPoints: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={createForm.startDate}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, startDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={createForm.endDate}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, endDate: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="doc-upload">Rules Document (Optional)</Label>
                            <Input
                                id="doc-upload"
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            />
                        </div>
                        {createForm.challengeType === 'individual' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is-unique-workout"
                                checked={createForm.isUniqueWorkout}
                                onChange={(e) => setCreateForm((p) => ({ ...p, isUniqueWorkout: e.target.checked }))}
                                className="size-4 rounded border-gray-300"
                            />
                            <Label htmlFor="is-unique-workout" className="text-sm font-normal cursor-pointer">
                                Unique Workout Day challenge
                                <span className="block text-xs text-muted-foreground">
                                    Players pick a workout with an activity they've never done before. Auto-approved.
                                </span>
                            </Label>
                        </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Activate Pre-configured Challenge Dialog */}
            <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Activate Challenge</DialogTitle>
                        <DialogDescription>Configure points and dates</DialogDescription>
                    </DialogHeader>
                    {selectedPreset && (
                        <div className="space-y-4">
                            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                                <h3 className="font-semibold">{selectedPreset.name}</h3>
                                {selectedPreset.description && (
                                    <p className="text-sm text-muted-foreground">{selectedPreset.description}</p>
                                )}
                                <Badge variant="outline">{selectedPreset.challenge_type?.replace('_', ' ')}</Badge>
                            </div>
                            <div className="space-y-2">
                                <Label>Total Points</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={activateForm.totalPoints}
                                    onChange={(e) => setActivateForm((p) => ({ ...p, totalPoints: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <Input
                                        type="date"
                                        value={activateForm.startDate}
                                        onChange={(e) => setActivateForm((p) => ({ ...p, startDate: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Input
                                        type="date"
                                        value={activateForm.endDate}
                                        onChange={(e) => setActivateForm((p) => ({ ...p, endDate: e.target.value }))}
                                    />
                                </div>
                            </div>
                            {selectedPreset?.challenge_type === 'individual' && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="activate-unique-workout"
                                    checked={activateForm.isUniqueWorkout}
                                    onChange={(e) => setActivateForm((p) => ({ ...p, isUniqueWorkout: e.target.checked }))}
                                    className="size-4 rounded border-gray-300"
                                />
                                <Label htmlFor="activate-unique-workout" className="text-sm font-normal cursor-pointer">
                                    Unique Workout Day challenge
                                    <span className="block text-xs text-muted-foreground">
                                        Players pick a workout with an activity they&apos;ve never done before. Auto-approved.
                                    </span>
                                </Label>
                            </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActivateOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmitActivation}>Activate</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Review Dialog */}
            <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Review: {reviewChallenge?.name}</DialogTitle>
                        <DialogDescription>
                            {reviewChallenge?.challenge_type === 'team'
                                ? 'Assign ONE score per team. All team submissions are shown for verification.'
                                : reviewChallenge?.challenge_type === 'sub_team'
                                    ? 'Assign ONE score per sub-team.'
                                    : 'Review and score each submission. Scores auto-aggregate to team.'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Team Selector */}
                    {reviewChallenge && (reviewChallenge.challenge_type === 'team' || reviewChallenge.challenge_type === 'sub_team') && teams.length > 0 && (
                        <div className="space-y-3 pb-3 border-b">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <Label>Select Team</Label>
                                    <Select value={reviewFilterTeamId} onValueChange={setReviewFilterTeamId}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teams.map((team) => (
                                                <SelectItem key={team.team_id} value={team.team_id}>
                                                    {team.team_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {reviewChallenge.challenge_type === 'sub_team' && reviewFilterTeamId && (
                                    <div>
                                        <Label>Select Sub-Team</Label>
                                        <Select value={reviewFilterSubTeamId} onValueChange={setReviewFilterSubTeamId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={subTeams.length === 0 ? 'No sub-teams' : 'Select...'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {subTeams.map((st) => (
                                                    <SelectItem key={st.subteam_id} value={st.subteam_id}>
                                                        {st.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {/* Team Score Input for Team Challenges */}
                            {reviewChallenge.challenge_type === 'team' && reviewFilterTeamId && (
                                <div className="rounded-lg border bg-primary/5 p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Users className="size-5 text-primary" />
                                        <span className="font-medium">Team Score</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Assign one total score for this team (max: {reviewChallenge.total_points} pts)
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            type="number"
                                            min={0}
                                            max={reviewChallenge.total_points}
                                            placeholder="Enter score"
                                            value={teamScores[reviewFilterTeamId] ?? ''}
                                            onChange={(e) => setTeamScores((p) => ({ ...p, [reviewFilterTeamId]: e.target.value === '' ? '' : Number(e.target.value) }))}
                                            className="w-32"
                                        />
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                const score = teamScores[reviewFilterTeamId];
                                                if (typeof score === 'number' && score >= 0) {
                                                    handleAssignTeamScore(reviewFilterTeamId, score);
                                                }
                                            }}
                                            disabled={typeof teamScores[reviewFilterTeamId] !== 'number'}
                                        >
                                            Assign Score
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Submissions List */}
                    <div className="space-y-3">
                        {submissions.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No submissions yet.</p>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground mb-2">
                                    {reviewChallenge?.challenge_type === 'team'
                                        ? 'Team member submissions (for verification):'
                                        : 'Submissions:'}
                                </p>
                                {submissions.map((s) => {
                                    const username = s.leaguemembers?.users?.username || 'Member';
                                    const teamName = s.leaguemembers?.teams?.team_name;

                                    return (
                                        <div key={s.id} className="border rounded-lg p-3 space-y-2">
                                            <div className="flex items-center gap-2 justify-between">
                                                <div>
                                                    <p className="font-medium">{username}</p>
                                                    <p className="text-xs text-muted-foreground">{teamName || 'Unassigned'}</p>
                                                </div>
                                                {submissionStatusBadge(s.status)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Submitted: {format(parseISO(s.created_at), 'MMM d, yyyy h:mma')}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="link"
                                                    className="h-auto p-0 text-primary underline"
                                                    onClick={() => {
                                                        setViewProofUrl(s.proof_url);
                                                        setViewProofOpen(true);
                                                    }}
                                                >
                                                    View Proof
                                                </Button>

                                                {/* For Individual challenges: score per submission */}
                                                {reviewChallenge?.challenge_type === 'individual' && (
                                                    <div className="flex gap-2 ml-auto items-center">
                                                        {(s.status === 'pending' || s.status === 'approved') && (
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                max={reviewChallenge.total_points}
                                                                placeholder="Points"
                                                                value={reviewAwardedPoints[s.id] ?? s.awarded_points ?? ''}
                                                                onChange={(e) => setReviewAwardedPoints((p) => ({ ...p, [s.id]: e.target.value === '' ? '' : Number(e.target.value) }))}
                                                                className="w-24"
                                                            />
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={validatingId === s.id}
                                                            onClick={() => handleValidate(s.id, 'rejected', null)}
                                                        >
                                                            Reject
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            disabled={validatingId === s.id}
                                                            onClick={() => handleValidate(s.id, 'approved', reviewAwardedPoints[s.id] === '' ? undefined : (reviewAwardedPoints[s.id] as number))}
                                                        >
                                                            {s.status === 'approved' ? 'Update' : 'Approve'}
                                                        </Button>
                                                    </div>
                                                )}

                                                {/* For Team challenges: just approve/reject (scoring at team level) */}
                                                {reviewChallenge?.challenge_type === 'team' && (
                                                    <div className="flex gap-2 ml-auto">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={validatingId === s.id}
                                                            onClick={() => handleValidate(s.id, 'rejected', null)}
                                                        >
                                                            Reject
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            disabled={validatingId === s.id}
                                                            onClick={() => handleValidate(s.id, 'approved', null)}
                                                        >
                                                            Approve
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* View Proof Dialog */}
            <Dialog open={viewProofOpen} onOpenChange={setViewProofOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Submission Proof</DialogTitle>
                    </DialogHeader>
                    {viewProofUrl && (
                        <div className="flex items-center justify-center">
                            <img src={viewProofUrl} alt="Proof" className="max-h-[70vh] object-contain rounded-lg" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Finish Creation Dialog */}
            <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Finish Challenge Creation</DialogTitle>
                        <DialogDescription>Set dates to activate this challenge.</DialogDescription>
                    </DialogHeader>
                    {finishChallenge?.challenge_type === 'sub_team' && (
                        <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-2 mb-4">
                            <p className="font-medium">Need sub-teams?</p>
                            <p className="text-muted-foreground">Create sub-teams before activating.</p>
                            <SubTeamManager leagueId={leagueId} challengeId={finishChallenge.id} teams={teams} />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input type="date" value={finishStart} onChange={(e) => setFinishStart(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input type="date" value={finishEnd} onChange={(e) => setFinishEnd(e.target.value)} />
                        </div>
                    </div>
                    {finishDays > 0 && pricing?.per_day_rate && (
                        <div className="rounded-lg border p-3 text-sm space-y-1">
                            <p>Duration: {finishDays} days</p>
                            <p>Rate: ₹{pricing.per_day_rate}/day</p>
                            <p className="font-semibold">Total: ₹{finishAmount.toFixed(2)}</p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFinishOpen(false)}>Cancel</Button>
                        <Button onClick={handleFinishSubmit} disabled={finishing}>
                            {finishing ? 'Processing...' : 'Pay & Activate'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Challenge?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{challengeToDelete?.name}" and all its submissions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting} className="bg-destructive text-destructive-foreground">
                            {deleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Challenge Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Challenge</DialogTitle>
                        <DialogDescription>Update challenge details.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                value={editForm.name}
                                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-desc">Description</Label>
                            <Textarea
                                id="edit-desc"
                                rows={3}
                                value={editForm.description}
                                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                    value={editForm.challengeType}
                                    onValueChange={(val) => setEditForm((p) => ({ ...p, challengeType: val as Challenge['challenge_type'] }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="individual">Individual</SelectItem>
                                        <SelectItem value="team">Team</SelectItem>
                                        <SelectItem value="sub_team">Sub-Team</SelectItem>
                                        <SelectItem value="tournament">Tournament</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Total Points</Label>
                                <Input
                                    type="number"
                                    value={editForm.totalPoints}
                                    min={0}
                                    onChange={(e) => setEditForm((p) => ({ ...p, totalPoints: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={editForm.startDate}
                                    onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={editForm.endDate}
                                    onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-doc">Rules Document <span className="text-xs text-muted-foreground">(optional — existing doc is kept unless replaced)</span></Label>
                            {editForm.docUrl && !selectedFile && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-md border px-3 py-2 bg-muted/30">
                                    <FileText className="size-3.5 shrink-0" />
                                    <span className="truncate">Current document attached</span>
                                    <a href={editForm.docUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline shrink-0">View</a>
                                </div>
                            )}
                            <Input
                                id="edit-doc"
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            />
                        </div>
                        {editForm.challengeType === 'individual' && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="edit-unique-workout"
                                    checked={editForm.isUniqueWorkout}
                                    onChange={(e) => setEditForm((p) => ({ ...p, isUniqueWorkout: e.target.checked }))}
                                    className="size-4 rounded border-gray-300"
                                />
                                <Label htmlFor="edit-unique-workout" className="text-sm font-normal cursor-pointer">
                                    Unique Workout Challenge (players link a workout entry instead of uploading proof)
                                </Label>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading}>Cancel</Button>
                            <Button type="submit" disabled={editLoading}>
                                {editLoading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Tournament Manager Dialog */}
            <TournamentManagerDialog
                open={tournamentManagerOpen}
                onOpenChange={setTournamentManagerOpen}
                challengeId={manageChallenge?.id || null}
                leagueId={leagueId}
                challengeName={manageChallenge?.name || ''}
            />

            {/* Tournament Finalize Dialog */}
            <TournamentFinalizeDialog
                open={tournamentFinalizeOpen}
                onOpenChange={setTournamentFinalizeOpen}
                challengeId={manageChallenge?.id || null}
                leagueId={leagueId}
                challengeName={manageChallenge?.name || ''}
                onPublish={async () => {
                    if (manageChallenge) {
                        // Only publish if not already published
                        if (manageChallenge.status !== 'published' && manageChallenge.status !== 'closed') {
                            await handlePublish(manageChallenge);
                        }
                        setTournamentFinalizeOpen(false);
                        // Refresh challenges to show updated scores
                        fetchChallenges();
                    }
                }}
            />
        </div>
    );
}
