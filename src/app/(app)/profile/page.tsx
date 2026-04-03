'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import {
  User,
  Mail,
  Phone,
  Save,
  Loader2,
  Camera,
  Shield,
  Trophy,
  Activity,
  Target,
  Crown,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Settings,
  Dumbbell,
  Flame,
  Award,
  KeyRound,
  Palette,
} from 'lucide-react';
import { toast } from 'sonner';

import { useLeague } from '@/contexts/league-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DumbbellLoading } from '@/components/ui/dumbbell-loading';
import { ThemeDrawer } from '@/components/theme-drawer';

// ============================================================================
// Types
// ============================================================================

interface StatCard {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  description: string;
  icon: React.ElementType;
}

// ============================================================================
// Profile Page
// ============================================================================

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { userLeagues, isLoading: leaguesLoading } = useLeague();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = React.useState(false);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const user = session?.user;
  const platformRole = (user as any)?.platform_role || 'user';

  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = React.useState(false);
  const [themeDrawerOpen, setThemeDrawerOpen] = React.useState(false);

  // Update form and profile picture when session loads
  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: (user as any).phone || '',
      });
      setProfilePictureUrl((user as any).profile_picture_url || null);
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      toast.success('Profile updated successfully');
      window.location.reload();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPG, PNG, GIF, or WebP');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const uploadRes = await fetch('/api/upload/profile-picture', {
        method: 'POST',
        body: uploadFormData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Failed to upload photo');
      }

      // Update profile with new photo URL
      const updatePayload = {
        name: formData.name,
        phone: formData.phone,
        profile_picture_url: uploadData.data.url,
      };

      console.log('Updating profile with:', updatePayload);

      const updateRes = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      const updateData = await updateRes.json();

      console.log('Update response:', updateData);

      if (!updateRes.ok) {
        throw new Error(updateData.error || 'Failed to update profile');
      }

      setProfilePictureUrl(uploadData.data.url);
      toast.success('Profile picture updated successfully');
      window.location.reload();
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePhotoDelete = async () => {
    if (!profilePictureUrl) return;

    setUploadingPhoto(true);
    try {
      // Update profile to remove photo URL
      const updateRes = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          profile_picture_url: null,
        }),
      });

      const updateData = await updateRes.json();

      if (!updateRes.ok) {
        throw new Error(updateData.error || 'Failed to remove profile picture');
      }

      setProfilePictureUrl(null);
      toast.success('Profile picture removed successfully');
      window.location.reload();
    } catch (error: any) {
      console.error('Error removing photo:', error);
      toast.error(error.message || 'Failed to remove profile picture');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      toast.success('Password updated successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Calculate stats from leagues
  const leagueStats = React.useMemo(() => {
    const activeLeagues = userLeagues.filter((l) => l.status === 'active').length;
    const hostingCount = userLeagues.filter((l) => l.is_host).length;
    const governorCount = userLeagues.filter((l) => (l.roles || []).includes('governor')).length;
    const captainCount = userLeagues.filter((l) => (l.roles || []).includes('captain')).length;

    return {
      totalLeagues: userLeagues.length,
      activeLeagues,
      hostingCount,
      leadershipRoles: governorCount + captainCount,
    };
  }, [userLeagues]);

  // Activities logged: one activity per day across all approved submissions in all leagues
  const [activitiesLogged, setActivitiesLogged] = React.useState<number>(0);
  const [activitiesLoading, setActivitiesLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    let mounted = true;

    async function fetchActivities() {
      if (!userLeagues || userLeagues.length === 0) {
        if (mounted) setActivitiesLogged(0);
        return;
      }

      setActivitiesLoading(true);

      try {
        const promises = userLeagues.map((l) =>
          fetch(`/api/leagues/${l.league_id}/my-submissions?status=approved`).then((r) => r.json())
            .catch((e) => ({ success: false, data: { submissions: [] } }))
        );

        const results = await Promise.all(promises);

        const dateSet = new Set<string>();
        for (const res of results) {
          if (res && res.success && Array.isArray(res.data?.submissions)) {
            for (const s of res.data.submissions) {
              if (s && s.date) {
                dateSet.add(s.date);
              }
            }
          }
        }

        if (mounted) setActivitiesLogged(dateSet.size);
      } catch (err) {
        console.error('Error fetching activities for profile:', err);
        if (mounted) setActivitiesLogged(0);
      } finally {
        if (mounted) setActivitiesLoading(false);
      }
    }

    fetchActivities();

    return () => {
      mounted = false;
    };
  }, [userLeagues]);

  // Challenge points (approved special challenge submissions)
  const [challengePoints, setChallengePoints] = React.useState<number>(0);
  const [challengeLoading, setChallengeLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    let mounted = true;

    async function fetchChallengePoints() {
      if (!userLeagues || userLeagues.length === 0) {
        if (mounted) setChallengePoints(0);
        return;
      }

      setChallengeLoading(true);

      try {
        let totalChallenge = 0;

        const promises = userLeagues.map((l) =>
          fetch(`/api/leagues/${l.league_id}/challenges`).then((r) => r.json()).catch(() => ({ success: false }))
        );

        const results = await Promise.all(promises);

        for (const res of results) {
          if (!res || !res.success || !Array.isArray(res.data?.active)) continue;
          for (const ch of res.data.active) {
            const mySub = ch.my_submission;
            if (mySub && (mySub.status === 'approved' || mySub.status === 'accepted')) {
              const pts =
                mySub.awarded_points !== null && mySub.awarded_points !== undefined
                  ? Number(mySub.awarded_points)
                  : Number(ch.total_points || 0);
              if (!Number.isNaN(pts) && pts > 0) totalChallenge += pts;
            }
          }
        }

        if (mounted) setChallengePoints(totalChallenge);
      } catch (err) {
        console.error('Error fetching challenge points for profile:', err);
        if (mounted) setChallengePoints(0);
      } finally {
        if (mounted) setChallengeLoading(false);
      }
    }

    fetchChallengePoints();

    return () => {
      mounted = false;
    };
  }, [userLeagues]);

  const totalPoints = activitiesLogged + challengePoints;

  // Streaks: per-league longest consecutive active days and current ongoing streaks
  const [currentStreak, setCurrentStreak] = React.useState<number>(0);
  const [bestStreak, setBestStreak] = React.useState<number>(0);
  const [streaksLoading, setStreaksLoading] = React.useState<boolean>(false);

  // Helper: add days to YYYY-MM-DD
  function addDaysYYYYMMDD(dateString: string, days: number) {
    const [y, m, d] = dateString.split('-').map((p) => Number(p));
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  function todayYYYYMMDDLocal() {
    const dt = new Date();
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  React.useEffect(() => {
    let mounted = true;

    async function computeStreaks() {
      if (!userLeagues || userLeagues.length === 0) {
        if (mounted) {
          setCurrentStreak(0);
          setBestStreak(0);
        }
        return;
      }

      setStreaksLoading(true);

      try {
        const promises = userLeagues.map((l) =>
          fetch(`/api/leagues/${l.league_id}/my-submissions?status=approved`).then((r) => r.json()).catch(() => ({ success: false, data: { submissions: [] } }))
        );

        const results = await Promise.all(promises);

        let overallBest = 0;
        let overallCurrent = 0;

        for (const res of results) {
          if (!res || !res.success || !Array.isArray(res.data?.submissions)) continue;
          const subs = res.data.submissions as any[];
          const dates = Array.from(new Set(subs.map((s) => s.date).filter(Boolean))).sort();
          if (dates.length === 0) continue;

          const dateSet = new Set(dates);

          // Longest consecutive run for this league
          let longest = 0;
          for (const d of dates) {
            const prev = addDaysYYYYMMDD(d, -1);
            if (!dateSet.has(prev)) {
              // start of sequence
              let len = 1;
              let next = addDaysYYYYMMDD(d, 1);
              while (dateSet.has(next)) {
                len++;
                next = addDaysYYYYMMDD(next, 1);
              }
              if (len > longest) longest = len;
            }
          }

          // Current ongoing streak: only count if the sequence reaches today
          const today = todayYYYYMMDDLocal();
          let curLen = 0;
          if (dateSet.has(today)) {
            let cursor = today;
            while (dateSet.has(cursor)) {
              curLen++;
              cursor = addDaysYYYYMMDD(cursor, -1);
            }
          } else {
            curLen = 0;
          }

          if (longest > overallBest) overallBest = longest;
          if (curLen > overallCurrent) overallCurrent = curLen;
        }

        if (mounted) {
          setBestStreak(overallBest);
          setCurrentStreak(overallCurrent);
        }
      } catch (err) {
        console.error('Error computing streaks for profile:', err);
        if (mounted) {
          setBestStreak(0);
          setCurrentStreak(0);
        }
      } finally {
        if (mounted) setStreaksLoading(false);
      }
    }

    computeStreaks();

    return () => {
      mounted = false;
    };
  }, [userLeagues]);

  // Activity stats (mock data - will be real once activity tracking is implemented)
  const activityStats: StatCard[] = [
    {
      title: 'Activities Logged',
      value: activitiesLoading ? '...' : activitiesLogged,
      change: 0,
      changeLabel: 'Start logging!',
      description: 'Total workouts submitted',
      icon: Dumbbell,
    },
    {
      title: 'Total Points',
      value: activitiesLoading || challengeLoading ? '...' : totalPoints,
      change: 0,
      changeLabel: 'Earn points',
      description: 'Points earned across leagues',
      icon: Award,
    },
    {
      title: 'Current Streak',
      value: streaksLoading ? '...' : `${currentStreak} days`,
      change: 0,
      changeLabel: 'Build your streak',
      description: 'Consecutive active days',
      icon: Flame,
    },
    {
      title: 'Best Streak',
      value: streaksLoading ? '...' : `${bestStreak} days`,
      change: 0,
      changeLabel: 'Set a record',
      description: 'Your longest streak ever',
      icon: Trophy,
    },
  ];

  // League involvement stats
  const leagueStatCards: StatCard[] = [
    {
      title: 'Total Leagues',
      value: leagueStats.totalLeagues,
      change: leagueStats.totalLeagues > 0 ? 12.5 : 0,
      changeLabel: leagueStats.totalLeagues > 0 ? 'Growing strong' : 'Join a league',
      description: 'Leagues you are part of',
      icon: Trophy,
    },
    {
      title: 'Active Leagues',
      value: leagueStats.activeLeagues,
      change: leagueStats.activeLeagues > 0 ? 8.2 : 0,
      changeLabel: leagueStats.activeLeagues > 0 ? 'In progress' : 'No active leagues',
      description: 'Currently running leagues',
      icon: Target,
    },
    {
      title: 'Hosting',
      value: leagueStats.hostingCount,
      change: leagueStats.hostingCount > 0 ? 5.0 : -2.5,
      changeLabel: leagueStats.hostingCount > 0 ? 'League creator' : 'Create your first',
      description: 'Leagues you created',
      icon: Crown,
    },
    {
      title: 'Leadership Roles',
      value: leagueStats.leadershipRoles,
      change: leagueStats.leadershipRoles > 0 ? 15.3 : 0,
      changeLabel: 'Governor & Captain',
      description: 'Management positions',
      icon: Shield,
    },
  ];

  // Loading state
  if (status === 'loading') {
    return <ProfileSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Settings className="size-6 text-primary" />
            Profile Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings and view your stats
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="size-5 text-primary" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-start gap-6 p-4 rounded-lg bg-muted/30 border">
              <Avatar className="size-24 border-4 border-background shadow-lg">
                <AvatarImage src={profilePictureUrl || user?.image || undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold truncate">
                  {user?.name || 'User'}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {user?.email}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge
                    variant={platformRole === 'admin' ? 'default' : 'secondary'}
                    className="gap-1"
                  >
                    <Shield className="size-3" />
                    {platformRole === 'admin' ? 'Administrator' : 'Member'}
                  </Badge>
                  {leagueStats.hostingCount > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Crown className="size-3" />
                      Host
                    </Badge>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 size-4" />
                        {profilePictureUrl ? 'Change Photo' : 'Upload Photo'}
                      </>
                    )}
                  </Button>
                  {profilePictureUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePhotoDelete}
                      disabled={uploadingPhoto}
                      className="text-destructive border-destructive/50 hover:bg-destructive/10"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Form */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  Username
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter your username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 99999 99999"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  Email is linked to your account and cannot be changed.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 size-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Security Section */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              Security
            </CardTitle>
            <CardDescription>
              Manage your password and security settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button onClick={handlePasswordChange} disabled={changingPassword}>
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>



      {/* Account Info */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="size-4" />
                  Member Since
                </p>
                <p className="font-medium mt-1">
                  {new Date().toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Clock className="size-4" />
                  Last Active
                </p>
                <p className="font-medium mt-1">Today</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Shield className="size-4" />
                  Account Status
                </p>
                <Badge variant="outline" className="mt-1 bg-green-500/10 text-green-600">
                  Active
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Trophy className="size-4" />
                  Leagues Joined
                </p>
                <p className="font-medium mt-1">{leagueStats.totalLeagues}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Theme Customization */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="size-5 text-primary" />
              Theme Customization
            </CardTitle>
            <CardDescription>
              Personalize your appearance with custom colors, depth, and fonts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setThemeDrawerOpen(true)}
              className="w-full sm:w-auto gap-2"
            >
              <Palette className="size-4" />
              Customize Theme
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Theme Drawer */}
      <ThemeDrawer open={themeDrawerOpen} onOpenChange={setThemeDrawerOpen} />
    </div>
  );
}

// ============================================================================
// Skeleton Component
// ============================================================================

function ProfileSkeleton() {
  return <DumbbellLoading label="Loading profile..." />;
}
