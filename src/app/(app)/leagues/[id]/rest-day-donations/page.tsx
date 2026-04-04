'use client';

/**
 * Rest Day Donations Page
 * 
 * Allows members to request rest day donations.
 * Governor/Host can approve/reject requests.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    IconGift,
    IconCheck,
    IconX,
    IconLoader2,
    IconArrowLeft,
    IconClock,
    IconEye,
} from '@tabler/icons-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLeague } from '@/contexts/league-context';

interface Donation {
    id: string;
    days_transferred: number;
    status: 'pending' | 'captain_approved' | 'approved' | 'rejected';
    notes: string | null;
    proof_url: string | null;
    created_at: string;
    donor: {
        member_id: string;
        team_id: string | null;
        user_id: string;
        username: string;
    };
    receiver: {
        member_id: string;
        user_id: string;
        username: string;
    };
    captain_approved_by: string | null;
    captain_approved_at: string | null;
    final_approved_by: string | null;
    final_approved_at: string | null;
}

interface LeagueMember {
    league_member_id: string;
    user_id: string;
    username: string;
    team_id: string | null;
    team_name: string | null;
}

export default function RestDayDonationsPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const leagueId = params.id as string;

    const { activeLeague } = useLeague();
    const showRestDays = ((activeLeague as any)?.rest_days ?? 1) > 0;

    const [donations, setDonations] = useState<Donation[]>([]);
    const [members, setMembers] = useState<LeagueMember[]>([]);
    const [userRole, setUserRole] = useState<string>('');
    const [userMemberId, setUserMemberId] = useState<string>('');
    const [userTeamId, setUserTeamId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [receiverMemberId, setReceiverMemberId] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [daysToTransfer, setDaysToTransfer] = useState('1');
    const [notes, setNotes] = useState('');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [proofDialogOpen, setProofDialogOpen] = useState(false);
    const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

    const normalizedTeamName = (teamName: string | null) =>
        teamName && teamName.trim().length > 0 ? teamName : 'Unassigned';

    const teamOptions = React.useMemo(() => {
        const names = new Set<string>();
        members.forEach((member) => names.add(normalizedTeamName(member.team_name)));
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [members]);

    const filteredMembers = React.useMemo(() => {
        if (!selectedTeam) return [];
        if (selectedTeam === 'all') return members;
        return members.filter((member) => normalizedTeamName(member.team_name) === selectedTeam);
    }, [members, selectedTeam]);

    // Fetch donations and members
    const fetchData = useCallback(async () => {
        try {
            // Fetch donations (also returns members list)
            const donationsRes = await fetch(`/api/leagues/${leagueId}/rest-day-donations`);
            if (donationsRes.ok) {
                const donationsData = await donationsRes.json();
                setDonations(donationsData.data || []);
                setUserRole(donationsData.userRole || '');
                setUserMemberId(donationsData.userMemberId || '');
                setUserTeamId(donationsData.userTeamId || null);
                setMembers(donationsData.members || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    }, [leagueId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Submit donation request
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!receiverMemberId || !daysToTransfer) {
            toast.error('Please select a receiver and enter days to transfer');
            return;
        }

        if (!proofFile) {
            toast.error('Please upload a proof image');
            return;
        }

        setIsSubmitting(true);

        try {
            // Step 1: Upload the proof file
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', proofFile);
            formData.append('league_id', leagueId);

            const uploadRes = await fetch('/api/upload/donation-proof', {
                method: 'POST',
                body: formData,
            });

            if (!uploadRes.ok) {
                const uploadError = await uploadRes.json();
                throw new Error(uploadError.error || 'Failed to upload proof');
            }

            const uploadData = await uploadRes.json();
            const proofUrl = uploadData.data.url;
            setIsUploading(false);

            // Step 2: Submit the donation request with the proof URL
            const res = await fetch(`/api/leagues/${leagueId}/rest-day-donations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiver_member_id: receiverMemberId,
                    days_transferred: parseInt(daysToTransfer),
                    notes: notes || undefined,
                    proof_url: proofUrl,
                }),
            });

            if (res.ok) {
                toast.success('Donation request submitted!');
                setReceiverMemberId('');
                setDaysToTransfer('1');
                setNotes('');
                setProofFile(null);
                // Reset file input
                const fileInput = document.getElementById('proofFile') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
                fetchData();
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to submit request');
            }
        } catch (error) {
            console.error('Error submitting donation:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to submit request');
        } finally {
            setIsSubmitting(false);
            setIsUploading(false);
        }
    };

    // Approve/Reject donation (two-stage flow)
    const handleUpdateStatus = async (donationId: string, action: 'approve' | 'reject') => {
        try {
            const res = await fetch(`/api/leagues/${leagueId}/rest-day-donations/${donationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || `Donation ${action}d!`);
                fetchData();
            } else {
                toast.error(data.error || 'Failed to update donation');
            }
        } catch (error) {
            console.error('Error updating donation:', error);
            toast.error('Failed to update donation');
        }
    };

    const isCaptain = userRole === 'captain';
    const isGovernorOrHost = ['governor', 'host'].includes(userRole);

    // Captain sees pending donations from their own team only
    // Governor/Host sees all pending donations and captain_approved donations
    const pendingDonations = donations.filter(d => {
        if (d.status !== 'pending') return false;
        // Captains only see donations from their own team members
        if (isCaptain && !isGovernorOrHost) {
            return d.donor.team_id === userTeamId;
        }
        // Governor/Host see all pending donations
        return true;
    });
    const captainApprovedDonations = donations.filter(d => d.status === 'captain_approved');
    const myDonations = donations.filter(
        d => d.donor.member_id === userMemberId || d.receiver.member_id === userMemberId
    );

    if (!showRestDays) {
        return (
            <div className="container max-w-4xl mx-auto py-6 text-center space-y-4">
                <h1 className="text-2xl font-bold">Rest Day Donations</h1>
                <p className="text-muted-foreground">Rest days are not enabled for this league.</p>
                <Link href={`/leagues/${leagueId}`}>
                    <Button variant="outline">Back to League</Button>
                </Link>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container max-w-4xl mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/leagues/${leagueId}`}>
                    <Button variant="ghost" size="icon">
                        <IconArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <IconGift className="h-6 w-6" />
                        Rest Day Donations
                    </h1>
                    <p className="text-muted-foreground">
                        Transfer rest days to help your teammates
                    </p>
                </div>
            </div>

            <Tabs defaultValue={(isGovernorOrHost || isCaptain) ? 'approval' : 'request'} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="request">Make a Donation</TabsTrigger>
                    <TabsTrigger value="my-donations">My Donations</TabsTrigger>
                    {(isGovernorOrHost || isCaptain) && (
                        <TabsTrigger value="approval" className="relative">
                            Approval Queue
                            {(isCaptain ? pendingDonations.length : (pendingDonations.length + captainApprovedDonations.length)) > 0 && (
                                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                                    {isCaptain ? pendingDonations.length : (pendingDonations.length + captainApprovedDonations.length)}
                                </Badge>
                            )}
                        </TabsTrigger>
                    )}
                </TabsList>


                {/* Request Donation Tab */}
                <TabsContent value="request">
                    <Card>
                        <CardHeader>
                            <CardTitle>Make a rest day donation</CardTitle>
                            <CardDescription>
                                Donate to any league member. Requires captain approval first, then governor/host approval.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="team">Team</Label>
                                        <Select
                                            value={selectedTeam}
                                            onValueChange={(value) => {
                                                setSelectedTeam(value);
                                                setReceiverMemberId('');
                                            }}
                                        >
                                            <SelectTrigger id="team">
                                                <SelectValue placeholder="Select team" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All teams</SelectItem>
                                                {teamOptions.map((team) => (
                                                    <SelectItem key={team} value={team}>
                                                        {team}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="receiver">Receiver</Label>
                                        <Select value={receiverMemberId} onValueChange={setReceiverMemberId} disabled={!selectedTeam}>
                                            <SelectTrigger id="receiver">
                                                <SelectValue placeholder={!selectedTeam ? 'Select team first' : 'Select a league member'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {filteredMembers
                                                    .filter(m => m.league_member_id !== userMemberId)
                                                    .map(m => (
                                                        <SelectItem key={m.league_member_id} value={m.league_member_id}>
                                                            {m.username}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="days">Days to Transfer</Label>
                                        <Input
                                            id="days"
                                            type="number"
                                            min="1"
                                            value={daysToTransfer}
                                            onChange={(e) => setDaysToTransfer(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes (optional)</Label>
                                    <Textarea
                                        id="notes"
                                        placeholder="Reason for donation..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={2}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="proofFile">Proof Image *</Label>
                                    <Input
                                        id="proofFile"
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">Upload an image or PDF as proof for the donation request.</p>
                                    {proofFile && (
                                        <p className="text-xs text-green-600">Selected: {proofFile.name}</p>
                                    )}
                                </div>

                                <Button type="submit" disabled={isSubmitting || isUploading}>
                                    {isSubmitting ? (
                                        <>
                                            <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                                            {isUploading ? 'Uploading...' : 'Submitting...'}
                                        </>

                                    ) : (
                                        <>
                                            <IconGift className="h-4 w-4 mr-2" />
                                            Submit Request
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* My Donations Tab */}
                <TabsContent value="my-donations">
                    <Card>
                        <CardHeader>
                            <CardTitle>My Donation History</CardTitle>
                            <CardDescription>
                                Donations you've sent or received
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {myDonations.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">
                                    No donations yet
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Type</TableHead>
                                            <TableHead>With</TableHead>
                                            <TableHead>Days</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {myDonations.map(d => (
                                            <TableRow key={d.id}>
                                                <TableCell>
                                                    {d.donor.member_id === userMemberId ? (
                                                        <Badge variant="outline">Sent</Badge>
                                                    ) : (
                                                        <Badge variant="secondary">Received</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {d.donor.member_id === userMemberId
                                                        ? d.receiver.username
                                                        : d.donor.username}
                                                </TableCell>
                                                <TableCell>{d.days_transferred}</TableCell>
                                                <TableCell>
                                                    <StatusBadge status={d.status} />
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(d.created_at).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Approval Queue Tab (Captain, Governor, or Host) */}
                {(isGovernorOrHost || isCaptain) && (

                    <TabsContent value="approval">
                        <Card>
                            <CardHeader>
                                <CardTitle>Pending Approvals</CardTitle>
                                <CardDescription>
                                    Review and approve or reject donation requests
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {pendingDonations.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">
                                        No pending requests
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingDonations.map(d => (
                                            <Card key={d.id}>
                                                <CardContent className="p-4">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-semibold truncate">{d.donor.username}</span>
                                                                    <span className="text-muted-foreground">→</span>
                                                                    <span className="font-semibold truncate">{d.receiver.username}</span>
                                                                </div>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {d.days_transferred} {d.days_transferred === 1 ? 'day' : 'days'}
                                                                </p>
                                                            </div>
                                                            <Badge variant="outline" className="text-yellow-500 border-yellow-500/20 shrink-0">
                                                                <IconClock className="h-3 w-3 mr-1" />
                                                                Pending
                                                            </Badge>
                                                        </div>
                                                        
                                                        {d.notes && (
                                                            <div className="text-sm bg-muted/50 p-3 rounded-md">
                                                                <span className="font-medium text-foreground">Notes:</span>{' '}
                                                                <span className="text-muted-foreground">{d.notes}</span>
                                                            </div>
                                                        )}
                                                        
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {d.proof_url && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setSelectedProofUrl(d.proof_url);
                                                                        setProofDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <IconEye className="h-4 w-4 mr-1" />
                                                                    View Proof
                                                                </Button>
                                                            )}
                                                            <div className="flex-1 min-w-0" />
                                                            <div className="flex gap-2 shrink-0">
                                                                <Button
                                                                    size="sm"
                                                                    variant="default"
                                                                    onClick={() => handleUpdateStatus(d.id, 'approve')}
                                                                >
                                                                    <IconCheck className="h-4 w-4 mr-1" />
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => handleUpdateStatus(d.id, 'reject')}
                                                                >
                                                                    <IconX className="h-4 w-4 mr-1" />
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}

                                {/* Captain-Approved donations awaiting Governor/Host final approval */}
                                {captainApprovedDonations.length > 0 && (
                                    <div className="mt-8 space-y-4">
                                        <div>
                                            <h3 className="text-lg font-semibold mb-2">
                                                {isGovernorOrHost ? 'Awaiting Final Approval' : 'Approved by You'}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {isGovernorOrHost 
                                                    ? 'These donations were approved by the Captain. Governor/Host final approval required.'
                                                    : 'These donations have been approved by you and are awaiting final approval from Governor/Host.'
                                                }
                                            </p>
                                        </div>
                                        <div className="space-y-4">
                                            {captainApprovedDonations.map(d => (
                                                <Card key={d.id}>
                                                    <CardContent className="p-4">
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between gap-4">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-semibold truncate">{d.donor.username}</span>
                                                                        <span className="text-muted-foreground">→</span>
                                                                        <span className="font-semibold truncate">{d.receiver.username}</span>
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {d.days_transferred} {d.days_transferred === 1 ? 'day' : 'days'}
                                                                    </p>
                                                                    {d.captain_approved_at && (
                                                                        <p className="text-xs text-muted-foreground mt-1">
                                                                            Captain approved: {new Date(d.captain_approved_at).toLocaleDateString()}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 shrink-0">
                                                                    <IconClock className="h-3 w-3 mr-1" />
                                                                    {isGovernorOrHost ? 'Captain Approved' : 'Awaiting Governor'}
                                                                </Badge>
                                                            </div>
                                                            
                                                            {d.notes && (
                                                                <div className="text-sm bg-muted/50 p-3 rounded-md">
                                                                    <span className="font-medium text-foreground">Notes:</span>{' '}
                                                                    <span className="text-muted-foreground">{d.notes}</span>
                                                                </div>
                                                            )}
                                                            
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {d.proof_url && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            setSelectedProofUrl(d.proof_url);
                                                                            setProofDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <IconEye className="h-4 w-4 mr-1" />
                                                                        View Proof
                                                                    </Button>
                                                                )}
                                                                <div className="flex-1 min-w-0" />
                                                                {isGovernorOrHost && (
                                                                    <div className="flex gap-2 shrink-0">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="default"
                                                                            onClick={() => handleUpdateStatus(d.id, 'approve')}
                                                                        >
                                                                            <IconCheck className="h-4 w-4 mr-1" />
                                                                            Final Approve
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="destructive"
                                                                            onClick={() => handleUpdateStatus(d.id, 'reject')}
                                                                        >
                                                                            <IconX className="h-4 w-4 mr-1" />
                                                                            Reject
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>

            {/* Proof View Dialog */}
            <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Donation Proof</DialogTitle>
                    </DialogHeader>
                    {selectedProofUrl && (
                        <div className="mt-4">
                            <img 
                                src={selectedProofUrl} 
                                alt="Donation proof" 
                                className="w-full h-auto rounded-lg border"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'approved':
            return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Approved</Badge>;
        case 'captain_approved':
            return (
                <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    <IconClock className="h-3 w-3 mr-1" />
                    Captain Approved
                </Badge>
            );
        case 'rejected':
            return <Badge variant="destructive">Rejected</Badge>;
        default:
            return (
                <Badge variant="outline" className="text-yellow-500 border-yellow-500/20">
                    <IconClock className="h-3 w-3 mr-1" />
                    Pending
                </Badge>
            );
    }
}

