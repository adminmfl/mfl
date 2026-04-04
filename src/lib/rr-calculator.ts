/**
 * Shared RR (Run Rate) calculation logic.
 * Used by both /api/entries/upsert and /api/entries/preview-rr.
 *
 * Supports 3 formula modes:
 * - "standard" (default): Current max-metric formula with age adjustments
 * - "simple": Binary 1.0 if any activity done, 0 otherwise
 * - "points_only": Always 1.0, points come from activity's points_per_session
 */

export interface RRConfig {
  formula: 'standard' | 'simple' | 'points_only';
  base_duration?: number;
  distance_divisor?: number;
  steps_min?: number;
  steps_max?: number;
  age_adjustments?: boolean;
}

export interface RRMetrics {
  duration?: number | null;
  distance?: number | null;
  steps?: number | null;
  holes?: number | null;
}

export const DEFAULT_RR_CONFIG: RRConfig = {
  formula: 'standard',
  age_adjustments: true,
};

/**
 * Get age-adjusted thresholds for the standard formula.
 */
export function getAgeThresholds(
  userAge: number | null,
  config: RRConfig
) {
  let baseDuration = config.base_duration ?? 45;
  let minSteps = config.steps_min ?? 10000;
  let maxSteps = config.steps_max ?? 20000;
  const useAgeAdjust = config.age_adjustments !== false;

  if (useAgeAdjust && typeof userAge === 'number') {
    if (userAge > 75) {
      minSteps = config.steps_min ?? 3000;
      maxSteps = config.steps_max ?? 6000;
      baseDuration = config.base_duration ?? 30;
    } else if (userAge > 65) {
      minSteps = config.steps_min ?? 5000;
      maxSteps = config.steps_max ?? 10000;
      baseDuration = config.base_duration ?? 30;
    }
  }

  return { baseDuration, minSteps, maxSteps };
}

/**
 * Calculate RR value based on formula and metrics.
 *
 * @param config - League's rr_config
 * @param type - 'workout' or 'rest'
 * @param metrics - Duration, distance, steps, holes
 * @param workoutType - Activity name (for cycling distance divisor)
 * @param userAge - User's age for threshold adjustments
 * @param measurementType - Activity's measurement_type ('none' = auto 1.0)
 * @param overrideBaseDuration - Per-activity min_value override for baseDuration
 */
export function calculateRR(
  config: RRConfig | null | undefined,
  type: 'workout' | 'rest',
  metrics: RRMetrics,
  workoutType: string | null,
  userAge: number | null,
  measurementType: string | null,
  overrideBaseDuration?: number | null,
): { rr_value: number; canSubmit: boolean } {
  const effectiveConfig = config || DEFAULT_RR_CONFIG;
  const formula = effectiveConfig.formula || 'standard';

  // Rest days always get 1.0
  if (type === 'rest') {
    return { rr_value: 1.0, canSubmit: true };
  }

  // measurement_type='none' always gets 1.0
  if (measurementType === 'none') {
    return { rr_value: 1.0, canSubmit: true };
  }

  // --- Simple formula: binary 1/0 ---
  if (formula === 'simple') {
    const hasAnyMetric =
      (typeof metrics.duration === 'number' && metrics.duration > 0) ||
      (typeof metrics.distance === 'number' && metrics.distance > 0) ||
      (typeof metrics.steps === 'number' && metrics.steps > 0) ||
      (typeof metrics.holes === 'number' && metrics.holes > 0);
    return { rr_value: hasAnyMetric ? 1.0 : 0, canSubmit: hasAnyMetric };
  }

  // --- Points-only formula: always 1.0 ---
  if (formula === 'points_only') {
    return { rr_value: 1.0, canSubmit: true };
  }

  // --- Standard formula: max-metric approach ---
  const { baseDuration, minSteps, maxSteps } = getAgeThresholds(userAge, effectiveConfig);
  const effectiveBaseDuration = overrideBaseDuration ?? baseDuration;

  let rrSteps = 0;
  let rrHoles = 0;
  let rrDuration = 0;
  let rrDistance = 0;

  // Steps
  if (typeof metrics.steps === 'number') {
    if (metrics.steps >= minSteps) {
      const capped = Math.min(metrics.steps, maxSteps);
      rrSteps = Math.min(1 + (capped - minSteps) / (maxSteps - minSteps), 2.0);
    }
  }

  // Holes
  if (typeof metrics.holes === 'number') {
    rrHoles = Math.min(metrics.holes / 9, 2.0);
  }

  // Duration
  if (typeof metrics.duration === 'number' && metrics.duration > 0) {
    rrDuration = Math.min(metrics.duration / effectiveBaseDuration, 2.0);
  }

  // Distance
  if (typeof metrics.distance === 'number' && metrics.distance > 0) {
    let distanceDivisor = effectiveConfig.distance_divisor ?? 4;
    if (workoutType === 'cycling') {
      distanceDivisor = 10;
    }
    rrDistance = Math.min(metrics.distance / distanceDivisor, 2.0);
  }

  const rr_value = Math.max(rrSteps, rrHoles, rrDuration, rrDistance);
  return { rr_value, canSubmit: rr_value >= 1.0 };
}
