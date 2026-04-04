"use client";

import { useState, useEffect, useCallback } from "react";

export interface TourStep {
  step_id: string;
  title: string;
  description: string;
  icon_name: string;
  icon_color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TourStepInput {
  title: string;
  description: string;
  icon_name?: string;
  icon_color?: string;
  sort_order?: number;
  is_active?: boolean;
}

interface UseAdminTourStepsReturn {
  steps: TourStep[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createStep: (data: TourStepInput) => Promise<TourStep | null>;
  updateStep: (stepId: string, data: Partial<TourStepInput>) => Promise<TourStep | null>;
  deleteStep: (stepId: string) => Promise<boolean>;
}

export function useAdminTourSteps(): UseAdminTourStepsReturn {
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSteps = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/tour-steps");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch tour steps");
      }

      setSteps(result.steps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSteps([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  const createStep = async (data: TourStepInput): Promise<TourStep | null> => {
    try {
      const response = await fetch("/api/admin/tour-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create step");

      await fetchSteps();
      return result.step as TourStep;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create step");
      return null;
    }
  };

  const updateStep = async (stepId: string, data: Partial<TourStepInput>): Promise<TourStep | null> => {
    try {
      const response = await fetch("/api/admin/tour-steps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step_id: stepId, ...data }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update step");

      await fetchSteps();
      return result.step as TourStep;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update step");
      return null;
    }
  };

  const deleteStep = async (stepId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/tour-steps?step_id=${stepId}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete step");

      await fetchSteps();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete step");
      return false;
    }
  };

  return {
    steps,
    isLoading,
    error,
    refetch: fetchSteps,
    createStep,
    updateStep,
    deleteStep,
  };
}
