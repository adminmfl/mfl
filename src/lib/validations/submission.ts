// Submission validation schemas (Zod)
// TODO: Install zod: npm install zod
// import { z } from 'zod'

export type SubmissionInput = {
  type: 'workout' | 'rest';
  workout_type?: string;
  duration?: number;
  distance?: number;
  steps?: number;
  holes?: number;
  date: string;
}

/**
 * Maximum allowed values for activity metrics.
 * These limits are enforced on both client-side forms and the server-side API.
 */
export const METRIC_LIMITS = {
  duration: { min: 0, max: 1440, label: 'Duration (minutes)', unit: 'minutes' },
  distance: { min: 0, max: 1000, label: 'Distance (km)', unit: 'km' },
  steps:    { min: 0, max: 500000, label: 'Steps', unit: 'steps' },
  holes:    { min: 0, max: 36, label: 'Holes', unit: 'holes' },
} as const;
