/**
 * Submit Activity Page
 * Allows players to submit workout entries with proof image upload.
 */
'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns';
import Tesseract from 'tesseract.js';
import Confetti from 'react-confetti';
import {
  Dumbbell,
  Upload,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Image as ImageIcon,
  X,
  AlertCircle,
  PartyPopper,
  RotateCcw,
  Eye,
  Moon,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { toast } from '@/lib/toast';

import { useLeague } from '@/contexts/league-context';
import { useRole } from '@/contexts/role-context';
import {
  useLeagueActivities,
  LeagueActivity,
} from '@/hooks/use-league-activities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn, isLeagueEnded as isLeagueEndedByDate } from '@/lib/utils';

// ============================================================================
// Rest Day Stats Interface
// ============================================================================

interface RestDayStats {
  totalAllowed: number;
  used: number;
  pending: number;
  remaining: number;
  isAtLimit: boolean;
  exemptionsPending: number;
}

// ============================================================================
// Activity Type Interface
// ============================================================================

interface ActivityType {
  value: string;
  label: string;
  description?: string | null;
}

// ============================================================================
// Submit Activity Page
// ============================================================================

export default function SubmitActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: leagueId } = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeLeague, isLoading: leagueLoading } = useLeague();
  const { canSubmitWorkouts } = useRole();

  // RR / Rest Day display config
  const pageRRFormula = (activeLeague as any)?.rr_config?.formula || 'standard';
  const showRR = pageRRFormula !== 'points_only';
  const showRestDays = ((activeLeague as any)?.rest_days ?? 1) > 0;
  const pointsUnit = showRR ? 'RR' : 'pts';

  // Fetch user profile for age calculation
  const [userAge, setUserAge] = React.useState<number | null>(null);
  const [suspiciousProofStrikes, setSuspiciousProofStrikes] =
    React.useState<number>(0);
  const [suspiciousProofWarningThreshold, setSuspiciousProofWarningThreshold] =
    React.useState<number>(2);
  const [
    suspiciousProofRejectionThreshold,
    setSuspiciousProofRejectionThreshold,
  ] = React.useState<number>(3);

  React.useEffect(() => {
    async function fetchUserAge() {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.date_of_birth) {
            const birthDate = new Date(data.date_of_birth);
            const age = Math.floor(
              (Date.now() - birthDate.getTime()) /
                (365.25 * 24 * 60 * 60 * 1000),
            );
            setUserAge(age);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user age:', error);
      }
    }
    fetchUserAge();
  }, []);

  React.useEffect(() => {
    const fetchStrikeCount = async () => {
      if (!leagueId) return;

      try {
        const response = await fetch(`/api/leagues/${leagueId}/my-submissions`);
        const json = await response.json();
        if (response.ok && json.success) {
          setSuspiciousProofStrikes(
            Number(json.data.suspiciousProofStrikes ?? 0),
          );
          setSuspiciousProofWarningThreshold(
            Number(json.data.suspiciousProofWarningThreshold ?? 2),
          );
          setSuspiciousProofRejectionThreshold(
            Number(json.data.suspiciousProofRejectionThreshold ?? 3),
          );
        }
      } catch (error) {
        console.error('Failed to fetch suspicious proof strikes:', error);
      }
    };

    fetchStrikeCount();
  }, [leagueId]);

  // Check if this is a resubmission
  const resubmitId = searchParams.get('resubmit');
  const isResubmission = !!resubmitId;

  // Fetch league activities
  const {
    data: activitiesData,
    isLoading: activitiesLoading,
    error: activitiesError,
    errorCode: activitiesErrorCode,
  } = useLeagueActivities(leagueId);

  // Transform fetched activities to the format needed by the UI
  const activityTypes: ActivityType[] = React.useMemo(() => {
    if (!activitiesData?.activities) return [];
    return activitiesData.activities.map((activity) => ({
      value: activity.value,
      label: activity.activity_name,
      description: activity.description,
    }));
  }, [activitiesData?.activities]);

  // Check if all activities use monthly frequency
  const isMonthlyFrequency = React.useMemo(() => {
    const acts = activitiesData?.activities;
    if (!acts || acts.length === 0) return false;
    return acts.every((a: any) => a.frequency_type === 'monthly');
  }, [activitiesData?.activities]);

  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [submittedData, setSubmittedData] = React.useState<any>(null);
  const [activityDate, setActivityDate] = React.useState<Date>(
    startOfDay(new Date()),
  );
  const [formData, setFormData] = React.useState({
    activity_type: '',
    duration: '',
    distance: '',
    steps: '',
    holes: '',
    notes: '',
    outcome: '',
  });

  // Submission type tab state
  const [submissionType, setSubmissionType] = React.useState<
    'workout' | 'rest'
  >('workout');

  React.useEffect(() => {
    if (resubmitId) return;
    const typeParam = searchParams.get('type');
    if (typeParam === 'rest') {
      setSubmissionType('rest');
    } else if (typeParam === 'workout') {
      setSubmissionType('workout');
    }
  }, [searchParams, resubmitId]);

  // Whether the active league has ended based on end date or completed status
  const isLeagueEnded = React.useMemo(() => {
    if (!activeLeague) return false;
    return (
      activeLeague.status === 'completed' ||
      isLeagueEndedByDate(activeLeague.end_date)
    );
  }, [activeLeague]);

  const today = React.useMemo(() => startOfDay(new Date()), []);
  const yesterday = React.useMemo(() => subDays(today, 1), [today]);
  const activityDateKey = React.useMemo(
    () => format(activityDate, 'yyyy-MM-dd'),
    [activityDate],
  );
  const isTodaySelected = React.useMemo(
    () => activityDateKey === format(today, 'yyyy-MM-dd'),
    [activityDateKey, today],
  );
  const isYesterdaySelected = React.useMemo(
    () => activityDateKey === format(yesterday, 'yyyy-MM-dd'),
    [activityDateKey, yesterday],
  );

  // League start date (local)
  const leagueStartLocal = React.useMemo(() => {
    if (!activeLeague?.start_date) return null;
    try {
      const startString = String(activeLeague.start_date).slice(0, 10);
      const dt = startOfDay(parseISO(startString));
      return isNaN(dt.getTime()) ? null : dt;
    } catch {
      return null;
    }
  }, [activeLeague]);

  // Determine max allowed activity date (League End Date or Today, whichever is earlier)
  const maxActivityDate = React.useMemo(() => {
    const fallback = today;
    if (!activeLeague?.end_date) return fallback;

    try {
      const endString = String(activeLeague.end_date).slice(0, 10);
      const endDate = startOfDay(parseISO(endString));

      // If today is BEFORE the end date, use today (can't submit future workouts)
      // If today is AFTER the end date, use end date (can't submit for days after league ended)
      if (isBefore(today, endDate)) return today;
      return endDate;
    } catch (e) {
      return fallback;
    }
  }, [activeLeague, today]);

  // Clamp minimum to yesterday, but if the league ended before that, allow only up to the end date.
  // Exception: If league hasn't started, allow back to 3 days before start (Trial Window).
  // For monthly frequency: allow any date from league start onwards.
  const minActivityDate = React.useMemo(() => {
    // Trial Mode check:
    if (leagueStartLocal && isBefore(today, leagueStartLocal)) {
      const trialStart = subDays(leagueStartLocal, 3);
      return trialStart;
    }

    // Monthly frequency: allow any date from league start
    if (isMonthlyFrequency && leagueStartLocal) {
      return leagueStartLocal;
    }

    if (!maxActivityDate) return yesterday;
    if (isBefore(maxActivityDate, yesterday)) return maxActivityDate;
    return yesterday;
  }, [maxActivityDate, yesterday, leagueStartLocal, today, isMonthlyFrequency]);

  // Effect to clamp activityDate into the allowed window (yesterday through maxActivityDate)
  // NOTE: activityDate is intentionally NOT in the dependency array to prevent infinite loops.
  // This effect runs only when the allowed window boundaries change.
  React.useEffect(() => {
    if (!maxActivityDate || !minActivityDate || isLeagueEnded) return;

    const current = startOfDay(activityDate);

    if (isAfter(current, maxActivityDate)) {
      setActivityDate(maxActivityDate);
      toast.info(
        `Date adjusted to latest allowed (${format(maxActivityDate, 'yyyy-MM-dd')})`,
      );
    } else if (isBefore(current, minActivityDate)) {
      setActivityDate(minActivityDate);
      toast.info(
        `Date adjusted to earliest allowed (${format(minActivityDate, 'yyyy-MM-dd')})`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxActivityDate, minActivityDate, isLeagueEnded]);

  // Check for trial mode (before league start)
  const isTrialMode = React.useMemo(() => {
    if (!leagueStartLocal) return false;
    return isBefore(activityDate, leagueStartLocal);
  }, [activityDate, leagueStartLocal]);

  // Trial Mode Banner
  const TrialBanner = () =>
    isTrialMode ? (
      <div className="mb-4">
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <Info className="size-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-300">
            Trial Submission Mode
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-400">
            This submission is before the league start date. It will be saved to
            your history but <strong>will not count</strong> towards the
            official league leaderboard.
          </AlertDescription>
        </Alert>
      </div>
    ) : null;

  // Rest day stats
  const [restDayStats, setRestDayStats] = React.useState<RestDayStats | null>(
    null,
  );
  const [restDayLoading, setRestDayLoading] = React.useState(false);
  const [restDayReason, setRestDayReason] = React.useState('');
  const [isExemptionRequest, setIsExemptionRequest] = React.useState(false);

  // Fetch rest day stats
  const fetchRestDayStats = React.useCallback(async () => {
    if (!leagueId) return;
    setRestDayLoading(true);
    try {
      const response = await fetch(`/api/leagues/${leagueId}/rest-days`);
      const result = await response.json();
      if (response.ok && result.success) {
        setRestDayStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch rest day stats:', error);
    } finally {
      setRestDayLoading(false);
    }
  }, [leagueId]);

  // Fetch rest day stats on mount and when switching to rest tab
  React.useEffect(() => {
    if (submissionType === 'rest') {
      fetchRestDayStats();
    }
  }, [submissionType, fetchRestDayStats]);

  // Pre-fill form data when resubmitting
  React.useEffect(() => {
    if (resubmitId) {
      const dateParam = searchParams.get('date');
      const typeParam = searchParams.get('type');
      const workoutTypeParam = searchParams.get('workout_type');
      const durationParam = searchParams.get('duration');
      const distanceParam = searchParams.get('distance');
      const stepsParam = searchParams.get('steps');
      const holesParam = searchParams.get('holes');
      const notesParam = searchParams.get('notes');

      // Set submission type
      if (typeParam === 'rest') {
        setSubmissionType('rest');
      } else {
        setSubmissionType('workout');
      }

      // Set date
      if (dateParam) {
        try {
          setActivityDate(startOfDay(parseISO(dateParam)));
        } catch (e) {
          console.error('Invalid date parameter:', e);
        }
      }

      // Set form data
      setFormData({
        activity_type: workoutTypeParam || '',
        duration: durationParam || '',
        distance: distanceParam || '',
        steps: stepsParam || '',
        holes: holesParam || '',
        notes: notesParam || '',
        outcome: '',
      });

      toast.info('Resubmitting rejected activity. Update as needed.');
    }
  }, [resubmitId, searchParams]);

  // Image upload state - store file(s) in memory until submission
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [selectedFile2, setSelectedFile2] = React.useState<File | null>(null);
  const [imagePreview2, setImagePreview2] = React.useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef2 = React.useRef<HTMLInputElement>(null);

  // Custom field state
  const [customFieldValue, setCustomFieldValue] = React.useState('');
  const [customFieldValue2, setCustomFieldValue2] = React.useState('');

  // OCR state
  const [ocrProcessing, setOcrProcessing] = React.useState(false);
  const [ocrDialogOpen, setOcrDialogOpen] = React.useState(false);
  const [ocrResult, setOcrResult] = React.useState<{
    raw: string;
    minutes: number;
  } | null>(null);

  // Confirm submission dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
  const [confirmSubmitType, setConfirmSubmitType] = React.useState<
    'workout' | 'rest'
  >('workout');

  // Confetti state for success dialog
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [windowSize, setWindowSize] = React.useState({ width: 0, height: 0 });

  // Window size for confetti
  React.useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  // Trigger confetti on success after 500ms
  React.useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => {
        setShowConfetti(true);
        // Stop confetti after 5 seconds
        setTimeout(() => setShowConfetti(false), 5000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [submitted]);

  const selectedActivity = React.useMemo<LeagueActivity | null>(() => {
    if (!activitiesData?.activities || !formData.activity_type) return null;
    return (
      activitiesData.activities.find(
        (a: any) => a.value === formData.activity_type,
      ) || null
    );
  }, [activitiesData?.activities, formData.activity_type]);

  const getMinimumRequirement = React.useCallback(
    (measurementType: string) => {
      if (!selectedActivity) return null;

      // Get the league activity configuration with minimums
      const leagueActivity = activitiesData?.activities?.find(
        (a) => a.activity_id === selectedActivity.activity_id,
      );

      console.log('=== getMinimumRequirement Debug ===');
      console.log('Measurement Type:', measurementType);
      console.log('Activity ID:', selectedActivity.activity_id);
      console.log('Activity Name:', selectedActivity.activity_name);
      console.log('League Activity:', leagueActivity);
      console.log('Base min_value:', leagueActivity?.min_value);
      console.log('Age Overrides:', leagueActivity?.age_group_overrides);
      console.log('User Age:', userAge);

      let minValue = leagueActivity?.min_value;

      // Check for age-specific overrides
      if (userAge !== null && leagueActivity?.age_group_overrides) {
        const overrides = leagueActivity.age_group_overrides;
        console.log('Checking age overrides...');

        // Find the matching age tier
        for (const tierKey of Object.keys(overrides)) {
          const tier = overrides[tierKey];
          console.log(`Checking ${tierKey}:`, tier);
          if (tier.ageRange && tier.minValue !== undefined) {
            const { min, max } = tier.ageRange;
            console.log(`Age range: ${min}-${max}, User age: ${userAge}`);
            if (userAge >= min && userAge <= max) {
              console.log('✓ MATCH! Using override:', tier.minValue);
              minValue = tier.minValue;
              break;
            }
          }
        }
      }

      // Use configured minimum if available, otherwise use system defaults
      const defaults: Record<string, number> = {
        duration: 45,
        distance: 4,
        steps: 10000,
        hole: 9,
      };

      const minimum =
        minValue !== null && minValue !== undefined
          ? minValue
          : defaults[measurementType];

      console.log('Final minimum value:', minimum);
      console.log('===================================');

      if (!minimum) return null;

      const units: Record<string, string> = {
        duration: 'min',
        distance: 'km',
        steps: 'steps',
        hole: 'holes',
      };

      return `Minimum requirement: ${minimum} ${units[measurementType] || ''}`;
    },
    [selectedActivity, activitiesData, userAge],
  );

  // Helper to get configured minimum for a measurement type
  const getConfiguredMinimum = React.useCallback(
    (measurementType: string): number => {
      if (!selectedActivity) return 0;

      const leagueActivity = activitiesData?.activities?.find(
        (a) => a.activity_id === selectedActivity.activity_id,
      );

      let minValue = leagueActivity?.min_value;

      // Check for age-specific overrides
      if (userAge !== null && leagueActivity?.age_group_overrides) {
        const overrides = leagueActivity.age_group_overrides;

        for (const tierKey of Object.keys(overrides)) {
          const tier = overrides[tierKey];
          if (tier.ageRange && tier.minValue !== undefined) {
            const { min, max } = tier.ageRange;
            if (userAge >= min && userAge <= max) {
              minValue = tier.minValue;
              break;
            }
          }
        }
      }

      // Use configured minimum or system defaults
      const defaults: Record<string, number> = {
        duration: 45,
        distance: 4,
        steps: 10000,
        hole: 9,
      };

      return minValue !== null && minValue !== undefined
        ? minValue
        : defaults[measurementType];
    },
    [selectedActivity, activitiesData, userAge],
  );

  // Estimated RR calculation using configured minimums
  const estimatedRR = React.useMemo(() => {
    if (!selectedActivity) return 0;

    // Get measurement type for the selected activity
    const measurementType = selectedActivity.measurement_type || 'duration';

    // For 'none' measurement type, always show RR 1.0
    if (measurementType === 'none') {
      return 1.0;
    }

    let maxRR = 0;
    const secondaryType = selectedActivity.settings?.secondary_measurement_type;

    // Duration
    if (formData.duration) {
      const val = parseInt(formData.duration);
      const minDuration = getConfiguredMinimum('duration');
      if (!isNaN(val) && val > 0) {
        if (val >= minDuration) {
          maxRR = Math.max(maxRR, Math.min(val / minDuration, 2.0));
        } else {
          maxRR = Math.max(maxRR, 0); // Below minimum
        }
      }
    }

    // Distance
    if (formData.distance) {
      const val = parseFloat(formData.distance);
      const minDistance = getConfiguredMinimum('distance');
      if (!isNaN(val) && val > 0) {
        if (val >= minDistance) {
          maxRR = Math.max(maxRR, Math.min(val / minDistance, 2.0));
        } else {
          maxRR = Math.max(maxRR, 0); // Below minimum
        }
      }
    }

    // Steps
    if (formData.steps) {
      const val = parseInt(formData.steps);
      const minSteps = getConfiguredMinimum('steps');
      const maxSteps = minSteps * 2; // Max is min * 2
      if (!isNaN(val) && val > 0) {
        if (val >= minSteps) {
          const capped = Math.min(val, maxSteps);
          maxRR = Math.max(
            maxRR,
            Math.min(1 + (capped - minSteps) / (maxSteps - minSteps), 2.0),
          );
        } else {
          maxRR = Math.max(maxRR, 0); // Below minimum
        }
      }
    }

    // Holes
    if (formData.holes) {
      const val = parseInt(formData.holes);
      const minHoles = getConfiguredMinimum('hole');
      if (!isNaN(val) && val > 0) {
        if (val >= minHoles) {
          maxRR = Math.max(maxRR, Math.min(val / minHoles, 2.0));
        } else {
          maxRR = Math.max(maxRR, 0); // Below minimum
        }
      }
    }

    return maxRR;
  }, [selectedActivity, formData, getConfiguredMinimum]);

  // Parse workout time from OCR text
  const parseWorkoutTime = (
    text: string,
  ): { raw: string; minutes: number } | null => {
    const timePattern = /(\d{1,2}):(\d{2}):(\d{2})/;
    const match = text.match(timePattern);

    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);
      const totalMinutes = hours * 60 + minutes + Math.round(seconds / 60);

      return {
        raw: `${match[1]}:${match[2]}:${match[3]}`,
        minutes: totalMinutes,
      };
    }

    return null;
  };

  // Handle file selection - store in memory, don't upload yet
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: JPG, PNG, GIF, WebP');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }

    // Store file in memory
    setSelectedFile(file);

    // Create image preview from memory
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    toast.success('Image selected. It will be uploaded when you submit.');

    // Try OCR processing on the local file
    setOcrProcessing(true);
    try {
      const ocrResult = await Tesseract.recognize(file, 'eng', {
        logger: (m) => console.log(m),
      });

      const workoutTime = parseWorkoutTime(ocrResult.data.text);

      if (workoutTime) {
        setOcrResult(workoutTime);
        setFormData((prev) => ({
          ...prev,
          duration: workoutTime.minutes.toString(),
        }));
        setOcrDialogOpen(true);
      }
    } catch (ocrError) {
      console.warn('OCR processing failed:', ocrError);
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Second image handlers
  const handleFileUpload2 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: JPG, PNG, GIF, WebP');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }
    setSelectedFile2(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview2(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    toast.success('Second image selected.');
  };

  const removeImage2 = () => {
    setSelectedFile2(null);
    setImagePreview2(null);
    if (fileInputRef2.current) {
      fileInputRef2.current.value = '';
    }
  };

  // ============================================================================
  // Overwrite Confirmation State
  // ============================================================================
  const [existingEntry, setExistingEntry] = React.useState<any>(null);
  const [allDayEntries, setAllDayEntries] = React.useState<any[]>([]);
  const [overwriteDialogOpen, setOverwriteDialogOpen] = React.useState(false);
  const [viewProofUrl, setViewProofUrl] = React.useState<string | null>(null);

  // Check for existing entries when date or selected activity changes
  React.useEffect(() => {
    const checkExisting = async () => {
      if (!leagueId || !activityDate) return;

      const dateStr = format(activityDate, 'yyyy-MM-dd');
      if (resubmitId) return;

      try {
        const res = await fetch(
          `/api/leagues/${leagueId}/my-submissions?startDate=${dateStr}&endDate=${dateStr}`,
        );
        const json = await res.json();

        if (res.ok && json.success && json.data.submissions.length > 0) {
          const submissions = json.data.submissions;
          setAllDayEntries(submissions);

          // Always scope by activity type when checking for overwrite.
          // For daily/weekly: only one entry per day exists anyway, so this is safe.
          // For monthly: multiple activities per day, only flag same activity.
          if (formData.activity_type) {
            const sameActivity = submissions.find(
              (s: any) => s.workout_type === formData.activity_type,
            );
            setExistingEntry(sameActivity || null);
          } else {
            // Activity not yet selected — don't flag any existing entry
            setExistingEntry(null);
          }
        } else {
          setAllDayEntries([]);
          setExistingEntry(null);
        }
      } catch (err) {
        console.error('Failed to check existing entry:', err);
      }
    };

    checkExisting();
  }, [leagueId, activityDate, resubmitId, formData.activity_type]);

  // For daily multi-frequency activities, determine if more entries are allowed
  const isDailyMultiFrequency = React.useMemo(() => {
    if (!selectedActivity) return false;
    return (
      selectedActivity.frequency_type === 'daily' &&
      (selectedActivity.frequency || 1) > 1
    );
  }, [selectedActivity]);

  const dailyEntryCount = React.useMemo(() => {
    if (!isDailyMultiFrequency || !selectedActivity) return 0;
    return allDayEntries.filter(
      (e: any) =>
        e.workout_type === selectedActivity.value && e.status !== 'rejected',
    ).length;
  }, [isDailyMultiFrequency, selectedActivity, allDayEntries]);

  const dailyFrequencyLimit = React.useMemo(() => {
    if (!isDailyMultiFrequency || !selectedActivity) return 1;
    return selectedActivity.frequency || 1;
  }, [isDailyMultiFrequency, selectedActivity]);

  const canSubmitDailyMulti =
    isDailyMultiFrequency && dailyEntryCount < dailyFrequencyLimit;

  // Submit the activity (step 1: validation and check)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmSubmitType('workout');
    setConfirmDialogOpen(true);
  };

  const handleSubmissionFlow = async (overwrite: boolean) => {
    // START CHECK: Allow submissions 3 days before league start (Trial Period)
    if (leagueStartLocal) {
      const trialStartDate = subDays(leagueStartLocal, 3);
      const today = startOfDay(new Date());

      // If we are BEFORE the trial window (earlier than 3 days before start)
      if (isBefore(today, trialStartDate)) {
        toast.error(
          `Submissions open on ${format(trialStartDate, 'MMM d, yyyy')} (3 days before league start).`,
        );
        return;
      }
    }

    if (!formData.activity_type) {
      toast.error('Please select an activity type');
      return;
    }

    // Determine which metric is being used
    const primaryMetric = selectedActivity?.measurement_type || 'duration';
    const secondaryMetric =
      selectedActivity?.settings?.secondary_measurement_type;

    // Skip metric validation for 'none' measurement type (custom activities)
    if (primaryMetric !== 'none') {
      // Check which fields have values
      const hasPrimary = !!formData[primaryMetric as keyof typeof formData];
      const hasSecondary = secondaryMetric
        ? !!formData[secondaryMetric as keyof typeof formData]
        : false;

      // Validation: Exactly one must be provided
      if (secondaryMetric) {
        if (!hasPrimary && !hasSecondary) {
          toast.error(
            `Please enter either ${primaryMetric} or ${secondaryMetric}`,
          );
          return;
        }
        if (hasPrimary && hasSecondary) {
          toast.error(
            `Please enter ONLY ${primaryMetric} OR ${secondaryMetric}, not both`,
          );
          return;
        }
      } else {
        // Single metric case
        if (!hasPrimary) {
          toast.error(`Please enter ${primaryMetric}`);
          return;
        }
      }
    }

    // Validate max values to prevent unreasonable entries
    const maxLimits: Record<string, { max: number; label: string }> = {
      duration: {
        max: 1440,
        label: 'Duration cannot exceed 1440 minutes (24 hours)',
      },
      distance: { max: 1000, label: 'Distance cannot exceed 1000 km' },
      steps: { max: 500000, label: 'Steps cannot exceed 500,000' },
      holes: { max: 36, label: 'Holes cannot exceed 36' },
    };
    for (const [field, config] of Object.entries(maxLimits)) {
      const rawValue = formData[field as keyof typeof formData];
      if (rawValue) {
        const numValue = parseFloat(rawValue);
        if (!Number.isFinite(numValue) || numValue < 0) {
          toast.error(
            `${field.charAt(0).toUpperCase() + field.slice(1)} must be a valid positive number`,
          );
          return;
        }
        if (numValue > config.max) {
          toast.error(config.label);
          return;
        }
      }
    }

    // Skip RR Validation for 'none' measurement type or non-standard formulas
    const rrFormula = (activeLeague as any)?.rr_config?.formula || 'standard';
    if (primaryMetric !== 'none' && rrFormula === 'standard') {
      // Existing RR Validation Logic
      try {
        const previewPayload: Record<string, any> = {
          league_id: leagueId,
          type: 'workout',
          workout_type: formData.activity_type,
        };

        // Only include the fields that have values (and clear 0s/empty)
        if (formData.duration)
          previewPayload.duration = parseInt(formData.duration);
        if (formData.distance)
          previewPayload.distance = parseFloat(formData.distance);
        if (formData.steps) previewPayload.steps = parseInt(formData.steps);
        if (formData.holes) previewPayload.holes = parseInt(formData.holes);

        const previewRes = await fetch('/api/entries/preview-rr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(previewPayload),
        });
        const previewJson = await previewRes.json();
        if (!previewRes.ok) {
          throw new Error(previewJson.error || 'Failed to validate RR');
        }
        const canSubmit = Boolean(previewJson?.data?.canSubmit);
        if (!canSubmit) {
          toast.error(
            'Workout RR must be at least 1.0 to submit. Please increase your effort.',
          );
          return;
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to validate RR',
        );
        return;
      }
    }

    // Proof validation: respect per-activity proof_requirement
    const proofReq = selectedActivity?.proof_requirement ?? 'mandatory';
    if (
      proofReq === 'mandatory' &&
      !selectedFile &&
      !overwrite &&
      !resubmitId
    ) {
      toast.error('Proof screenshot is required');
      return;
    }

    // Notes validation: respect per-activity notes_requirement
    const notesReq = selectedActivity?.notes_requirement ?? 'optional';
    if (notesReq === 'mandatory' && !formData.notes.trim()) {
      toast.error('Notes are required for this activity');
      return;
    }

    // Outcome validation: required when activity has outcome_config
    if (
      selectedActivity?.outcome_config &&
      selectedActivity.outcome_config.length > 0 &&
      !formData.outcome
    ) {
      toast.error('Please select an outcome');
      return;
    }

    // Custom field validation: required when activity has custom_field_label
    if (selectedActivity?.custom_field_label && !customFieldValue.trim()) {
      toast.error(`"${selectedActivity.custom_field_label}" is required`);
      return;
    }

    // Custom field 2 validation: required when activity has custom_field_label_2
    if (selectedActivity?.custom_field_label_2 && !customFieldValue2.trim()) {
      toast.error(`"${selectedActivity.custom_field_label_2}" is required`);
      return;
    }

    // Check for overwrite need — skip for daily multi-frequency activities that still have capacity
    if (!overwrite && existingEntry && !resubmitId && !canSubmitDailyMulti) {
      setOverwriteDialogOpen(true);
      return;
    }

    setLoading(true);

    try {
      // Step 1: Upload image to bucket if one is selected
      let proofUrl: string | null = null;
      if (selectedFile) {
        setUploadingImage(true);

        // Compress image client-side if it's too large (> 3MB) to avoid Vercel's body size limit
        let fileToUpload: File | Blob = selectedFile;
        if (
          selectedFile.size > 3 * 1024 * 1024 &&
          selectedFile.type.startsWith('image/')
        ) {
          try {
            const bitmap = await createImageBitmap(selectedFile);
            const canvas = document.createElement('canvas');
            // Scale down if very large
            const maxDim = 1920;
            let { width, height } = bitmap;
            if (width > maxDim || height > maxDim) {
              const scale = maxDim / Math.max(width, height);
              width = Math.round(width * scale);
              height = Math.round(height * scale);
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(bitmap, 0, 0, width, height);
            const blob = await new Promise<Blob>((resolve) =>
              canvas.toBlob(
                (b) => resolve(b || selectedFile),
                'image/jpeg',
                0.8,
              ),
            );
            fileToUpload = blob;
          } catch {
            // If compression fails, try with original file
          }
        }

        const uploadFormData = new FormData();
        uploadFormData.append('file', fileToUpload, selectedFile.name);
        uploadFormData.append('league_id', leagueId);

        const uploadResponse = await fetch('/api/upload/proof', {
          method: 'POST',
          body: uploadFormData,
        });

        // Handle non-JSON responses (e.g. Vercel's "Request Entity Too Large")
        let uploadResult: any;
        const contentType = uploadResponse.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          uploadResult = await uploadResponse.json();
        } else {
          const text = await uploadResponse.text();
          throw new Error(
            text.includes('Entity Too Large')
              ? 'Image is too large. Please use a smaller image.'
              : text || 'Upload failed',
          );
        }

        if (!uploadResponse.ok) {
          throw new Error(uploadResult.error || 'Failed to upload proof image');
        }

        proofUrl = uploadResult.data.url;
        setUploadingImage(false);
      } else if (overwrite && existingEntry?.proof_url) {
        proofUrl = existingEntry.proof_url;
      }

      // Upload second image if present
      let proofUrl2: string | null = null;
      if (selectedFile2) {
        let fileToUpload2: File | Blob = selectedFile2;
        if (
          selectedFile2.size > 3 * 1024 * 1024 &&
          selectedFile2.type.startsWith('image/')
        ) {
          try {
            const bitmap = await createImageBitmap(selectedFile2);
            const canvas = document.createElement('canvas');
            const maxDim = 1920;
            let { width, height } = bitmap;
            if (width > maxDim || height > maxDim) {
              const scale = maxDim / Math.max(width, height);
              width = Math.round(width * scale);
              height = Math.round(height * scale);
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(bitmap, 0, 0, width, height);
            const blob = await new Promise<Blob>((resolve) =>
              canvas.toBlob(
                (b) => resolve(b || selectedFile2),
                'image/jpeg',
                0.8,
              ),
            );
            fileToUpload2 = blob;
          } catch {
            /* use original */
          }
        }
        const uploadFormData2 = new FormData();
        uploadFormData2.append('file', fileToUpload2, selectedFile2.name);
        uploadFormData2.append('league_id', leagueId);
        const uploadResponse2 = await fetch('/api/upload/proof', {
          method: 'POST',
          body: uploadFormData2,
        });
        const ct2 = uploadResponse2.headers.get('content-type') || '';
        let uploadResult2: any;
        if (ct2.includes('application/json')) {
          uploadResult2 = await uploadResponse2.json();
        } else {
          const text = await uploadResponse2.text();
          throw new Error(
            text.includes('Entity Too Large')
              ? 'Second image is too large. Please use a smaller image.'
              : text || 'Upload failed',
          );
        }
        if (!uploadResponse2.ok)
          throw new Error(
            uploadResult2.error || 'Failed to upload second image',
          );
        proofUrl2 = uploadResult2.data.url;
      }

      // Step 2: Submit the activity entry
      const payload: Record<string, any> = {
        league_id: leagueId,
        date: format(activityDate, 'yyyy-MM-dd'),
        type: 'workout',
        workout_type: formData.activity_type,
        proof_url: proofUrl,
        proof_url_2: proofUrl2,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
        ianaTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        overwrite: overwrite,
        ...(overwrite && existingEntry?.id
          ? { overwrite_entry_id: existingEntry.id }
          : {}),
      };

      // Add relevant metrics based on what was entered
      if (formData.duration) payload.duration = parseInt(formData.duration);
      if (formData.distance) payload.distance = parseFloat(formData.distance);
      if (formData.steps) payload.steps = parseInt(formData.steps);
      if (formData.holes) payload.holes = parseInt(formData.holes);

      // Add notes if provided
      if (formData.notes) {
        payload.notes = formData.notes;
      }

      // Add outcome if selected
      if (formData.outcome) {
        payload.outcome = formData.outcome;
      }

      // Add custom field value if provided
      if (customFieldValue.trim()) {
        payload.custom_field_value = customFieldValue.trim();
      }

      // Add custom field 2 value if provided
      if (customFieldValue2.trim()) {
        payload.custom_field_value_2 = customFieldValue2.trim();
      }

      // Add reupload_of if this is a resubmission
      if (resubmitId) {
        payload.reupload_of = resubmitId;
      }

      const response = await fetch('/api/entries/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Handle non-JSON responses gracefully
      let result: any;
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || 'Submission failed');
      }

      if (!response.ok) {
        if (response.status === 409 && result.existing) {
          // Fallback if our frontend check missed it
          setExistingEntry(result.existing);
          setOverwriteDialogOpen(true);
          return;
        }
        throw new Error(result.error || 'Failed to submit activity');
      }

      setSubmittedData(result.data);
      setSubmitted(true);
      if (isLeagueEnded) {
        toast.success(
          'League completed — you did great! Your submission has been recorded.',
        );
      } else {
        toast.success('Activity submitted successfully!');
      }

      // Clear existing entry state since we just replaced it
      setExistingEntry(null);
      setAllDayEntries([]);
      setOverwriteDialogOpen(false);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit activity',
      );
      setUploadingImage(false);
    } finally {
      setLoading(false);
    }
  };

  // Submit rest day
  const submitRestDay = async () => {
    // START CHECK: Allow submissions 3 days before league start (Trial Period)
    if (leagueStartLocal) {
      const trialStartDate = subDays(leagueStartLocal, 3);
      const today = startOfDay(new Date());

      // If we are BEFORE the trial window (earlier than 3 days before start)
      if (isBefore(today, trialStartDate)) {
        toast.error(
          `Submissions open on ${format(trialStartDate, 'MMM d, yyyy')} (3 days before league start).`,
        );
        return;
      }
    }

    setLoading(true);

    try {
      // Check if this is an exemption request (over limit)
      const needsExemption = restDayStats?.isAtLimit || false;

      const payload: Record<string, any> = {
        league_id: leagueId,
        date: format(activityDate, 'yyyy-MM-dd'),
        type: 'rest',
        tzOffsetMinutes: new Date().getTimezoneOffset(),
        ianaTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        notes: needsExemption
          ? `[EXEMPTION_REQUEST] ${restDayReason || 'Rest day exemption requested'}`
          : restDayReason || undefined,
        overwrite: true,
      };

      const response = await fetch('/api/entries/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Handle non-JSON responses gracefully
      let result: any;
      const ctRest = response.headers.get('content-type') || '';
      if (ctRest.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || 'Submission failed');
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit rest day');
      }

      setSubmittedData({
        ...result.data,
        isRestDay: true,
        isExemption: needsExemption,
      });
      setSubmitted(true);

      if (needsExemption) {
        toast.success(
          'Rest day exemption request submitted! Awaiting approval.',
        );
      } else {
        if (isLeagueEnded) {
          toast.success(
            'League completed — you did great! Your rest day has been recorded.',
          );
        } else {
          toast.success('Rest day logged successfully!');
        }
      }

      // Refresh rest day stats
      fetchRestDayStats();
    } catch (error) {
      console.error('Rest day submit error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit rest day',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRestDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmSubmitType('rest');
    setConfirmDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmDialogOpen(false);
    if (confirmSubmitType === 'rest') {
      await submitRestDay();
    } else {
      await handleSubmissionFlow(false);
    }
  };

  // Access check — wait for league context to finish loading before denying access
  if (!canSubmitWorkouts) {
    if (leagueLoading || !activeLeague) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 lg:gap-6 lg:p-6">
          <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      );
    }
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            You must be a player in this league to submit activities.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If the league is completed, show a friendly, non-blocking note to the user
  // We still allow submissions but show a congratulatory banner.
  const CompletedBanner = () =>
    isLeagueEnded ? (
      <div className="mb-4">
        <Alert>
          <Info className="size-4" />
          <AlertTitle>League Completed</AlertTitle>
          <AlertDescription>
            This league has completed — congrats on making it this far! You can
            still submit activities and we'll record them. Keep up the great
            work.
          </AlertDescription>
        </Alert>
      </div>
    ) : null;

  // Loading state for activities
  if (activitiesLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 lg:gap-6 lg:p-6">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading activities...</p>
      </div>
    );
  }

  // If the league is completed, block submissions and show a message
  if (isLeagueEnded) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 lg:gap-6 lg:p-6">
        <Alert>
          <Info className="size-4" />
          <AlertTitle>League Completed</AlertTitle>
          <AlertDescription>
            This league has finished — thanks for participating! Submissions are
            now closed. You can still view standings and past activity entries.
          </AlertDescription>
        </Alert>
        <div>
          <Button variant="outline" asChild>
            <Link href={`/leagues/${leagueId}`}>Back to League</Link>
          </Button>
        </div>
      </div>
    );
  }

  // No activities configured check
  if (
    activitiesErrorCode === 'NO_ACTIVITIES_CONFIGURED' ||
    activityTypes.length === 0
  ) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Activities Not Configured</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>This league does not have any activities configured yet.</p>
            <p className="text-sm">
              Please contact the league host to configure activities before
              submitting workouts.
            </p>
          </AlertDescription>
        </Alert>
        <Button variant="outline" asChild className="w-fit">
          <Link href={`/leagues/${leagueId}`}>Back to League</Link>
        </Button>
      </div>
    );
  }

  // Success Dialog Handler
  const handleSubmitAnother = () => {
    setSubmitted(false);
    setSubmittedData(null);
    setShowConfetti(false);
    setFormData({
      activity_type: '',
      duration: '',
      distance: '',
      steps: '',
      holes: '',
      notes: '',
      outcome: '',
    });
    setSelectedFile(null);
    setImagePreview(null);
    setRestDayReason('');
    setIsExemptionRequest(false);
    // Refresh rest day stats if on rest tab
    if (submissionType === 'rest') {
      fetchRestDayStats();
    }
  };

  const confirmDateLabel = format(activityDate, 'MMMM d, yyyy');
  const confirmActivityLabel = selectedActivity?.activity_name || '—';
  const confirmMeasurementType =
    selectedActivity?.measurement_type || 'duration';
  const confirmMetrics = [
    formData.duration
      ? { label: 'Duration', value: `${formData.duration} min` }
      : null,
    formData.distance
      ? { label: 'Distance', value: `${formData.distance} km` }
      : null,
    formData.steps ? { label: 'Steps', value: `${formData.steps}` } : null,
    formData.holes ? { label: 'Holes', value: `${formData.holes}` } : null,
  ].filter(Boolean) as { label: string; value: string }[];
  const confirmNotes = formData.notes?.trim() || '—';
  const confirmProof = selectedFile ? selectedFile.name : 'Not attached';
  const confirmRestReason = restDayReason.trim() || '—';
  const confirmNeedsExemption = restDayStats?.isAtLimit || false;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Log Today's Activity
          </h1>
          <p className="text-muted-foreground">
            Add today's activity to help your team
            {activeLeague?.team_name && (
              <>
                {' '}
                - <span className="font-medium">{activeLeague.team_name}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <TrialBanner />

      {suspiciousProofStrikes >= suspiciousProofWarningThreshold && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <ShieldAlert className="size-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-400">
            Suspicious proof strike{suspiciousProofStrikes === 1 ? '' : 's'} on
            record
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            You currently have {suspiciousProofStrikes} suspicious proof strike
            {suspiciousProofStrikes === 1 ? '' : 's'}.
            {suspiciousProofStrikes >= suspiciousProofRejectionThreshold - 1
              ? ` One more suspicious-proof rejection can trigger permanent rejection at ${suspiciousProofRejectionThreshold} strikes.`
              : ' Keep your proof clear and accurate to avoid escalation.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Team Assignment Required Check */}
      {activeLeague && !activeLeague.team_id && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertCircle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 mb-1">
              Waiting for Team Assignment
            </h3>
            <p className="text-sm text-amber-800">
              Your league host hasn't assigned you to a team yet. Please wait
              for them to allocate you to a team before you submit activities.
            </p>
          </div>
        </div>
      )}

      <Tabs
        value={submissionType}
        onValueChange={(v) => setSubmissionType(v as 'workout' | 'rest')}
        className="w-full"
      >
        {/* Workout Tab Content */}
        <TabsContent value="workout" className="mt-3">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-lg border bg-card/70 shadow-sm p-4 space-y-4 max-w-2xl">
              <TabsList
                className={`grid w-full ${showRestDays ? 'grid-cols-2' : 'grid-cols-1'}`}
              >
                <TabsTrigger
                  value="workout"
                  className="flex items-center gap-2"
                  disabled={Boolean(activeLeague && !activeLeague.team_id)}
                >
                  <Dumbbell className="size-4" />
                  Activity
                </TabsTrigger>
                {showRestDays && (
                  <TabsTrigger
                    value="rest"
                    className="flex items-center gap-2"
                    disabled={Boolean(activeLeague && !activeLeague.team_id)}
                  >
                    <Moon className="size-4" />
                    Rest Day
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Activity Type - Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="activity-type">Activity Type *</Label>
                <Select
                  value={formData.activity_type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, activity_type: value }))
                  }
                >
                  <SelectTrigger id="activity-type">
                    <SelectValue placeholder="Choose your activity done today" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedActivity?.admin_info && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    {selectedActivity.admin_info}
                  </div>
                )}
                {isDailyMultiFrequency && (
                  <div
                    className={`text-xs p-2 rounded flex items-center gap-2 ${
                      canSubmitDailyMulti
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                    }`}
                  >
                    <Info className="size-3.5 shrink-0" />
                    {canSubmitDailyMulti
                      ? `${dailyEntryCount} of ${dailyFrequencyLimit} logged today — ${dailyFrequencyLimit - dailyEntryCount} remaining`
                      : `Daily limit reached (${dailyEntryCount}/${dailyFrequencyLimit} for today)`}
                  </div>
                )}
              </div>

              {/* Workout Metrics */}
              {formData.activity_type &&
                (() => {
                  const primary =
                    selectedActivity?.measurement_type || 'duration';
                  const secondary =
                    selectedActivity?.settings?.secondary_measurement_type;

                  // Handle 'none' measurement type - no metrics needed
                  if (primary === 'none') {
                    return null;
                  }

                  const renderInput = (type: string) => {
                    let label = '';
                    let unit = '';
                    const formKey = type === 'hole' ? 'holes' : type;

                    switch (type) {
                      case 'duration':
                        label = 'Duration';
                        unit = 'minutes';
                        break;
                      case 'distance':
                        label = 'Distance';
                        unit = 'km';
                        break;
                      case 'steps':
                        label = 'Steps';
                        unit = 'steps';
                        break;
                      case 'hole':
                        label = 'Holes';
                        unit = 'holes';
                        break;
                    }

                    return (
                      <div key={type} className="space-y-2">
                        <Label htmlFor={type}>{label} *</Label>
                        <div className="relative">
                          <Input
                            id={type}
                            type="number"
                            inputMode={
                              type === 'distance' ? 'decimal' : 'numeric'
                            }
                            min="0"
                            max={
                              type === 'duration'
                                ? '1440'
                                : type === 'distance'
                                  ? '1000'
                                  : type === 'steps'
                                    ? '500000'
                                    : type === 'hole'
                                      ? '36'
                                      : undefined
                            }
                            step={type === 'distance' ? '0.01' : '1'}
                            value={formData[formKey as keyof typeof formData]}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                [formKey]: e.target.value,
                              }))
                            }
                            className="pr-20 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [appearance:textfield]"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 border-l bg-muted/50 text-muted-foreground rounded-r-md px-3 text-sm">
                            {unit}
                          </div>
                        </div>
                        {(() => {
                          const req = getMinimumRequirement(type);
                          if (!req) return null;
                          return (
                            <p className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                              {req}
                            </p>
                          );
                        })()}
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-4">
                      {secondary ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {renderInput(primary)}
                          {renderInput(secondary)}
                        </div>
                      ) : (
                        renderInput(primary)
                      )}
                      {secondary && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Info className="size-3" />
                          Enter only one metric - {primary} OR {secondary}
                        </p>
                      )}
                    </div>
                  );
                })()}

              {/* Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Activity Date *</Label>
                  {isResubmission ? (
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted text-sm">
                      <span>{format(activityDate, 'MMM d, yyyy')}</span>
                      <Badge variant="secondary" className="text-xs">
                        Locked to original date
                      </Badge>
                    </div>
                  ) : isMonthlyFrequency ? (
                    <Input
                      type="date"
                      value={format(activityDate, 'yyyy-MM-dd')}
                      min={
                        minActivityDate
                          ? format(minActivityDate, 'yyyy-MM-dd')
                          : undefined
                      }
                      max={
                        maxActivityDate
                          ? format(maxActivityDate, 'yyyy-MM-dd')
                          : undefined
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const parsed = startOfDay(parseISO(val));
                          if (!isNaN(parsed.getTime())) setActivityDate(parsed);
                        }
                      }}
                    />
                  ) : (
                    <Select
                      value={isTodaySelected ? 'today' : 'yesterday'}
                      onValueChange={(value) =>
                        setActivityDate(value === 'today' ? today : yesterday)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">
                          Today ({format(today, 'MMM d, yyyy')})
                        </SelectItem>
                        <SelectItem value="yesterday">
                          Yesterday ({format(yesterday, 'MMM d, yyyy')})
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Photo Upload — hidden when proof_requirement is 'not_required' */}
              {(selectedActivity?.proof_requirement ?? 'mandatory') !==
                'not_required' && (
                <div className="space-y-2">
                  <Label htmlFor="proof-file">
                    Upload Proof
                    {(selectedActivity?.proof_requirement ?? 'mandatory') ===
                    'mandatory'
                      ? ' *'
                      : ' (Optional)'}
                  </Label>
                  <input
                    id="proof-file"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    aria-label="Upload proof screenshot"
                  />
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Selected workout"
                        className="w-full h-20 object-contain rounded-lg border bg-muted"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={handleUploadClick}
                      className="border-2 border-dashed rounded-lg p-2 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      {uploadingImage || ocrProcessing ? (
                        <Loader2 className="size-5 mx-auto text-primary animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="size-4 mx-auto text-muted-foreground mb-1" />
                          <p className="text-[11px] text-muted-foreground">
                            Click to upload image (JPG, PNG, GIF, WebP)
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Second Photo Upload — shown when max_images >= 2 */}
              {(selectedActivity?.max_images ?? 1) >= 2 &&
                (selectedActivity?.proof_requirement ?? 'mandatory') !==
                  'not_required' && (
                  <div className="space-y-2">
                    <Label>Upload Second Image (Optional)</Label>
                    <input
                      ref={fileInputRef2}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload2}
                      className="hidden"
                    />
                    {imagePreview2 ? (
                      <div className="relative">
                        <img
                          src={imagePreview2}
                          alt="Second proof"
                          className="w-full h-20 object-contain rounded-lg border bg-muted"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={removeImage2}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef2.current?.click()}
                        className="border-2 border-dashed rounded-lg p-2 text-center hover:border-primary/50 transition-colors cursor-pointer"
                      >
                        <ImageIcon className="size-4 mx-auto text-muted-foreground mb-1" />
                        <p className="text-[11px] text-muted-foreground">
                          Click to upload second image (JPG, PNG, GIF, WebP)
                        </p>
                      </div>
                    )}
                  </div>
                )}

              {/* Outcome picker — shown when activity has outcome_config */}
              {selectedActivity?.outcome_config &&
                selectedActivity.outcome_config.length > 0 && (
                  <div className="space-y-2">
                    <Label>Outcome *</Label>
                    <Select
                      value={formData.outcome || ''}
                      onValueChange={(v) =>
                        setFormData((prev) => ({ ...prev, outcome: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedActivity.outcome_config.map((o) => (
                          <SelectItem key={o.label} value={o.label}>
                            {o.label} ({o.points} pt{o.points !== 1 ? 's' : ''})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              {/* Notes — hidden when notes_requirement is 'not_required' */}
              {(selectedActivity?.notes_requirement ?? 'optional') !==
                'not_required' && (
                <div className="space-y-2">
                  <Label htmlFor="notes">
                    Notes
                    {selectedActivity?.notes_requirement === 'mandatory'
                      ? ' *'
                      : ' (Optional)'}
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder={
                      selectedActivity?.notes_requirement === 'mandatory'
                        ? 'Notes are required for this activity'
                        : 'Share a quick note (optional)'
                    }
                    rows={2}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                  />
                </div>
              )}

              {/* Custom field — shown when activity has custom_field_label */}
              {selectedActivity?.custom_field_label && (
                <div className="space-y-2">
                  <Label htmlFor="custom-field">
                    {selectedActivity.custom_field_label} *
                  </Label>
                  <Textarea
                    id="custom-field"
                    placeholder={
                      selectedActivity.custom_field_placeholder ||
                      selectedActivity.custom_field_label
                    }
                    rows={2}
                    value={customFieldValue}
                    onChange={(e) => setCustomFieldValue(e.target.value)}
                  />
                </div>
              )}

              {/* Custom field 2 — shown when activity has custom_field_label_2 */}
              {selectedActivity?.custom_field_label_2 && (
                <div className="space-y-2">
                  <Label htmlFor="custom-field-2">
                    {selectedActivity.custom_field_label_2} *
                  </Label>
                  <Textarea
                    id="custom-field-2"
                    placeholder={
                      selectedActivity.custom_field_placeholder_2 ||
                      selectedActivity.custom_field_label_2
                    }
                    rows={2}
                    value={customFieldValue2}
                    onChange={(e) => setCustomFieldValue2(e.target.value)}
                  />
                </div>
              )}

              {/* Summary and Submit */}
              <div className="pt-4 border-t space-y-4">
                {((activeLeague as any)?.rr_config?.formula || 'standard') ===
                  'standard' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      RR Value
                    </span>
                    <span className="text-lg font-bold text-primary">
                      {estimatedRR.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/leagues/${leagueId}`}>Cancel</Link>
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={
                      loading ||
                      uploadingImage ||
                      !formData.activity_type ||
                      ((selectedActivity?.proof_requirement ?? 'mandatory') ===
                        'mandatory' &&
                        !selectedFile &&
                        !resubmitId)
                    }
                  >
                    {loading || uploadingImage ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        {uploadingImage ? 'Uploading...' : 'Submitting...'}
                      </>
                    ) : (
                      <>
                        Log Today's Activity
                        <ArrowRight className="ml-2 size-4" />
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Submission will be reviewed by your captain
                </p>
              </div>
            </div>
          </form>
        </TabsContent>

        {/* Rest Day Tab Content */}
        <TabsContent value="rest" className="mt-3">
          <form onSubmit={handleRestDaySubmit} className="space-y-6">
            <div className="rounded-lg border p-4 space-y-4 max-w-2xl">
              <TabsList
                className={`grid w-full ${showRestDays ? 'grid-cols-2' : 'grid-cols-1'}`}
              >
                <TabsTrigger
                  value="workout"
                  className="flex items-center gap-2"
                >
                  <Dumbbell className="size-4" />
                  Activity
                </TabsTrigger>
                {showRestDays && (
                  <TabsTrigger value="rest" className="flex items-center gap-2">
                    <Moon className="size-4" />
                    Rest Day
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Rest Day Stats */}
              {restDayLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : restDayStats ? (
                <div className="space-y-3 pb-4 border-b">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rest Days</span>
                    <span className="font-medium">
                      {restDayStats.used} / {restDayStats.totalAllowed} used
                    </span>
                  </div>
                  <Progress
                    value={
                      (restDayStats.used / restDayStats.totalAllowed) * 100
                    }
                    className={cn(
                      'h-2',
                      restDayStats.isAtLimit && '[&>div]:bg-amber-500',
                    )}
                  />
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-lg font-bold text-green-600">
                        {restDayStats.remaining}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Remaining
                      </div>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-lg font-bold">
                        {restDayStats.used}
                      </div>
                      <div className="text-xs text-muted-foreground">Used</div>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-lg font-bold text-amber-600">
                        {restDayStats.pending}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Pending
                      </div>
                    </div>
                  </div>
                  {restDayStats.isAtLimit && (
                    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                      <ShieldAlert className="size-4 text-amber-600" />
                      <AlertTitle className="text-sm text-amber-800 dark:text-amber-400">
                        Limit Reached
                      </AlertTitle>
                      <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                        This will be an exemption request requiring approval.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : null}

              {/* Rest Day Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Rest Day Date</Label>
                  {isResubmission ? (
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted text-sm">
                      <span>{format(activityDate, 'MMM d, yyyy')}</span>
                      <Badge variant="secondary" className="text-xs">
                        Locked to original date
                      </Badge>
                    </div>
                  ) : (
                    <Select
                      value={isTodaySelected ? 'today' : 'yesterday'}
                      onValueChange={(value) =>
                        setActivityDate(value === 'today' ? today : yesterday)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">
                          Today ({format(today, 'MMM d, yyyy')})
                        </SelectItem>
                        <SelectItem value="yesterday">
                          Yesterday ({format(yesterday, 'MMM d, yyyy')})
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="restReason">
                    {restDayStats?.isAtLimit
                      ? 'Reason for Exemption *'
                      : 'Reason (Optional)'}
                  </Label>
                  <Textarea
                    id="restReason"
                    placeholder={
                      restDayStats?.isAtLimit
                        ? 'Please explain why you need an additional rest day...'
                        : 'E.g., Recovery day, feeling unwell, etc.'
                    }
                    value={restDayReason}
                    onChange={(e) => setRestDayReason(e.target.value)}
                    rows={3}
                    required={restDayStats?.isAtLimit}
                  />
                </div>

                {/* Summary and Submit */}
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {showRR ? 'RR Points' : 'Points'}
                    </span>
                    <span className="text-lg font-bold text-primary">
                      +1.0 {pointsUnit}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" asChild>
                      <Link href={`/leagues/${leagueId}`}>Cancel</Link>
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={
                        loading ||
                        (restDayStats?.isAtLimit && !restDayReason.trim())
                      }
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Submitting...
                        </>
                      ) : restDayStats?.isAtLimit ? (
                        <>
                          Request Exemption
                          <ArrowRight className="ml-2 size-4" />
                        </>
                      ) : (
                        <>
                          Log Rest Day
                          <ArrowRight className="ml-2 size-4" />
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {restDayStats?.isAtLimit
                      ? 'Requires approval from Captain or Governor'
                      : `Rest days earn 1.0 ${pointsUnit} when approved`}
                  </p>
                </div>
              </div>
            </div>
          </form>
        </TabsContent>
      </Tabs>

      {/* Confirm Submission Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Review your details before confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <span className="text-muted-foreground block text-xs">
                    Type
                  </span>
                  <span className="font-medium">
                    {confirmSubmitType === 'rest' ? 'Rest Day' : 'Activity'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">
                    Date
                  </span>
                  <span className="font-medium">{confirmDateLabel}</span>
                </div>
              </div>
            </div>

            {confirmSubmitType === 'workout' ? (
              <div className="rounded-md border bg-card/70 p-3 space-y-2">
                <div>
                  <span className="text-muted-foreground block text-xs">
                    Activity Type
                  </span>
                  <span className="font-medium">{confirmActivityLabel}</span>
                </div>

                {confirmMeasurementType !== 'none' &&
                  confirmMetrics.length > 0 && (
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Measurement
                      </span>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1">
                        {confirmMetrics.map((metric) => (
                          <div key={metric.label}>
                            <span className="text-muted-foreground block text-xs">
                              {metric.label}
                            </span>
                            <span className="font-medium">{metric.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {(selectedActivity?.notes_requirement ?? 'optional') !==
                  'not_required' &&
                  confirmNotes !== '—' && (
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Notes
                      </span>
                      <span className="font-medium">{confirmNotes}</span>
                    </div>
                  )}

                {(selectedActivity?.proof_requirement ?? 'mandatory') !==
                  'not_required' && (
                  <div>
                    <span className="text-muted-foreground block text-xs">
                      Upload Proof
                      {(selectedActivity?.proof_requirement ?? 'mandatory') ===
                      'mandatory'
                        ? ' (Required)'
                        : ' (Optional)'}
                    </span>
                    {imagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagePreview}
                        alt="Proof screenshot preview"
                        className="mt-2 h-28 w-full rounded-md border object-contain bg-muted"
                      />
                    ) : (
                      <span className="font-medium">{confirmProof}</span>
                    )}
                  </div>
                )}

                {((activeLeague as any)?.rr_config?.formula || 'standard') ===
                  'standard' && (
                  <div>
                    <span className="text-muted-foreground block text-xs">
                      Estimated RR
                    </span>
                    <span className="font-medium">
                      {estimatedRR.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border bg-card/70 p-3 space-y-2">
                <div>
                  <span className="text-muted-foreground block text-xs">
                    Reason
                  </span>
                  <span className="font-medium">{confirmRestReason}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">
                    Exemption
                  </span>
                  <span className="font-medium">
                    {confirmNeedsExemption ? 'Required' : 'No'}
                  </span>
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <div className="flex w-full sm:justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSubmit}
                disabled={loading || uploadingImage}
              >
                Confirm
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* OCR Success Dialog */}
      <AlertDialog open={ocrDialogOpen} onOpenChange={setOcrDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="size-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="size-6 text-green-600" />
            </div>
            <AlertDialogTitle className="text-center">
              Duration Detected!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              We extracted the workout duration from your screenshot
            </AlertDialogDescription>
          </AlertDialogHeader>
          {ocrResult && (
            <div className="text-center py-4">
              <div className="text-sm text-muted-foreground mb-2">
                Time found:
              </div>
              <div className="text-2xl font-bold text-primary mb-1">
                {ocrResult.raw}
              </div>
              <div className="text-sm text-muted-foreground">
                Converted to{' '}
                <span className="font-semibold text-foreground">
                  {ocrResult.minutes} minutes
                </span>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogAction>Got it!</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Overwrite Confirmation Dialog */}
      <AlertDialog
        open={overwriteDialogOpen}
        onOpenChange={setOverwriteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Replace{' '}
              {existingEntry?.workout_type
                ? activitiesData?.activities?.find(
                    (a: any) => a.value === existingEntry.workout_type,
                  )?.activity_name ||
                  existingEntry.workout_type.replace(/_/g, ' ')
                : ''}{' '}
              Entry?
            </AlertDialogTitle>
            <AlertDialogDescription
              asChild
              className="space-y-4 pt-2 text-left"
            >
              <div>
                <p>
                  You have already submitted{' '}
                  <strong>
                    {existingEntry?.workout_type
                      ? activitiesData?.activities?.find(
                          (a: any) => a.value === existingEntry.workout_type,
                        )?.activity_name ||
                        existingEntry.workout_type.replace(/_/g, ' ')
                      : 'an activity'}
                  </strong>{' '}
                  for <strong>{format(activityDate, 'MMMM d, yyyy')}</strong>.
                </p>

                {existingEntry && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <div className="font-semibold mb-2">
                      Existing Entry Details:
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-muted-foreground block text-xs">
                          Activity Type
                        </span>
                        <span className="font-medium capitalize">
                          {existingEntry.type === 'workout'
                            ? activitiesData?.activities?.find(
                                (a) => a.value === existingEntry.workout_type,
                              )?.activity_name ||
                              existingEntry.workout_type?.replace(/_/g, ' ') ||
                              'Activity'
                            : 'Rest Day'}
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-muted-foreground block text-xs">
                          Status
                        </span>
                        <span
                          className={cn(
                            'capitalize font-medium',
                            existingEntry.status === 'approved'
                              ? 'text-green-600 dark:text-green-400'
                              : existingEntry.status === 'rejected'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-yellow-600 dark:text-yellow-400',
                          )}
                        >
                          {existingEntry.status}
                        </span>
                      </div>

                      {existingEntry.duration !== null &&
                        existingEntry.duration !== undefined && (
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-muted-foreground block text-xs">
                              Duration
                            </span>
                            <span>{existingEntry.duration} mins</span>
                          </div>
                        )}
                      {existingEntry.distance !== null &&
                        existingEntry.distance !== undefined && (
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-muted-foreground block text-xs">
                              Distance
                            </span>
                            <span>{existingEntry.distance} km</span>
                          </div>
                        )}
                      {existingEntry.steps !== null &&
                        existingEntry.steps !== undefined && (
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-muted-foreground block text-xs">
                              Steps
                            </span>
                            <span>{existingEntry.steps}</span>
                          </div>
                        )}
                      {existingEntry.holes !== null &&
                        existingEntry.holes !== undefined && (
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-muted-foreground block text-xs">
                              Holes
                            </span>
                            <span>{existingEntry.holes}</span>
                          </div>
                        )}
                      {existingEntry.rr_value !== null &&
                        existingEntry.rr_value !== undefined && (
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-muted-foreground block text-xs">
                              {((activeLeague as any)?.rr_config?.formula ||
                                'standard') === 'standard'
                                ? 'RR Value'
                                : 'Points'}
                            </span>
                            <span>
                              {((activeLeague as any)?.rr_config?.formula ||
                                'standard') === 'standard'
                                ? Number(existingEntry.rr_value).toFixed(1)
                                : Math.round(Number(existingEntry.rr_value))}
                            </span>
                          </div>
                        )}
                    </div>

                    {existingEntry.proof_url && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-muted-foreground block text-xs mb-1">
                          Proof
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setViewProofUrl(existingEntry.proof_url)
                          }
                          className="text-primary hover:underline flex items-center gap-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-sm"
                        >
                          <ImageIcon className="size-4" />
                          View Uploaded Image
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <p>
                  This will replace your earlier{' '}
                  {existingEntry?.workout_type
                    ? activitiesData?.activities?.find(
                        (a: any) => a.value === existingEntry.workout_type,
                      )?.activity_name ||
                      existingEntry.workout_type.replace(/_/g, ' ')
                    : ''}{' '}
                  entry for this date.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <div className="flex w-full sm:justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOverwriteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setOverwriteDialogOpen(false);
                  handleSubmissionFlow(true); // Retry with overwrite=true
                }}
              >
                Replace & Submit
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog with Confetti */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.2}
          colors={[
            '#22c55e',
            '#10b981',
            '#14b8a6',
            '#6366f1',
            '#8b5cf6',
            '#f59e0b',
          ]}
        />
      )}

      <Dialog
        open={submitted}
        onOpenChange={(open) => !open && router.push(`/leagues/${leagueId}`)}
      >
        <DialogContent
          className="sm:max-w-md py-5"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-4">
              <div
                className={cn(
                  'size-20 rounded-full flex items-center justify-center animate-bounce',
                  submittedData?.isExemption
                    ? 'bg-gradient-to-br from-amber-400 to-orange-600'
                    : submittedData?.isRestDay
                      ? 'bg-gradient-to-br from-blue-400 to-indigo-600'
                      : 'bg-gradient-to-br from-green-400 to-emerald-600',
                )}
              >
                {submittedData?.isRestDay ? (
                  <Moon className="size-10 text-white" />
                ) : (
                  <PartyPopper className="size-10 text-white" />
                )}
              </div>
            </div>
            <DialogTitle className="text-2xl">
              {submittedData?.isExemption
                ? 'Exemption Request Submitted!'
                : submittedData?.isRestDay
                  ? 'Rest Day Logged!'
                  : 'Confirmed Submission!'}
            </DialogTitle>
            <DialogDescription className="text-base">
              {submittedData?.isExemption
                ? 'Your rest day exemption request has been submitted and is awaiting approval from your Captain or Governor.'
                : submittedData?.isRestDay
                  ? 'Your rest day has been logged and is pending validation.'
                  : 'Your activity has been submitted and is pending validation by your team captain.'}
            </DialogDescription>
          </DialogHeader>

          {(submittedData?.rr_value || submittedData?.isRestDay) &&
            (() => {
              const formula =
                (activeLeague as any)?.rr_config?.formula || 'standard';
              const isSimpleOrPoints =
                formula === 'simple' || formula === 'points_only';
              const pts = submittedData?.points_per_session ?? 1;
              const rr = submittedData?.rr_value?.toFixed(1) || '1.0';
              const exemptionSuffix = submittedData?.isExemption
                ? ' (if approved)'
                : '';
              const badgeStyle = submittedData?.isExemption
                ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20'
                : 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20';
              const textColor = submittedData?.isExemption
                ? 'text-amber-600'
                : 'text-green-600';
              return (
                <div className="flex justify-center gap-3 py-2">
                  {/* Points badge */}
                  <div
                    className={cn(
                      'inline-flex items-center gap-2 px-5 py-2.5 rounded-full border',
                      badgeStyle,
                    )}
                  >
                    <span className={cn('text-2xl font-bold', textColor)}>
                      +{pts}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {`pt${pts !== 1 ? 's' : ''}${exemptionSuffix}`}
                    </span>
                  </div>
                  {/* RR badge — only for standard formula */}
                  {!isSimpleOrPoints && (
                    <div
                      className={cn(
                        'inline-flex items-center gap-2 px-5 py-2.5 rounded-full border',
                        badgeStyle,
                      )}
                    >
                      <span className={cn('text-2xl font-bold', textColor)}>
                        {rr}
                      </span>
                      <span className="text-sm text-muted-foreground">RR</span>
                    </div>
                  )}
                </div>
              );
            })()}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center pt-2">
            <Button asChild className="flex-1">
              <Link href={`/leagues/${leagueId}`}>
                <Eye className="mr-2 size-4" />
                Back to My Activities
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog
        open={!!viewProofUrl}
        onOpenChange={(open) => !open && setViewProofUrl(null)}
      >
        <DialogContent
          className="max-w-3xl w-full p-0 overflow-hidden bg-transparent border-none shadow-none"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Proof Image Preview</DialogTitle>
          <div className="relative w-full h-auto max-h-[85vh] flex items-center justify-center bg-black/50 rounded-lg overflow-hidden backdrop-blur-sm">
            <button
              onClick={() => setViewProofUrl(null)}
              className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors z-10 shadow-sm"
              aria-label="Close preview"
            >
              <X className="size-5" />
            </button>
            {viewProofUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={viewProofUrl}
                alt="Proof Preview"
                className="max-w-full max-h-[80vh] object-contain rounded-md"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
