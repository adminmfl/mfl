"use client";

import { useAiInsights } from "@/hooks/use-ai-insights";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function AiWelcomeText({ leagueId }: { leagueId: string }) {
  const { insights, isLoading } = useAiInsights(leagueId, "my_activity", [
    "welcome_text",
  ]);

  if (isLoading) {
    return <Skeleton className="h-5 w-3/4 mb-1" aria-hidden="true" />;
  }

  return (
    <p className="text-muted-foreground min-h-[1.5rem] animate-in fade-in duration-500" aria-live="polite">
      {insights.welcome_text || "Add today's effort. Push your team forward."}
    </p>
  );
}

export function AiCoachInsight({ leagueId }: { leagueId: string }) {
  const { insights, isLoading } = useAiInsights(leagueId, "my_activity", [
    "coach_insight",
  ]);

  // Reserve space to prevent CLS, or show nothing if loading is done and no insight exists
  if (isLoading) return <Skeleton className="h-4 w-1/2 mt-1.5" aria-hidden="true" />;
  if (!insights.coach_insight) return <div className="mt-1.5 h-4" />; // Invisible spacer

  return (
    <p className="text-xs text-muted-foreground mt-1.5 px-1 flex items-center gap-1 animate-in slide-in-from-left-1 duration-300" aria-live="polite">
      <Sparkles className="size-3 text-primary/60 shrink-0" aria-hidden="true" />
      {insights.coach_insight}
    </p>
  );
}
