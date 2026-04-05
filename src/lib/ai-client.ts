/**
 * Centralized AI Client — Single entry point for all LLM calls.
 *
 * - Wraps the Mistral SDK (swap provider by changing this file only)
 * - Auto-logs token usage + cost to `ai_usage_logs` table
 * - Pricing config in one place
 */
import { Mistral } from '@mistralai/mistralai';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = 'mistral-small-latest';

/** Cost per 1M tokens (USD). Add new models here when switching. */
const PRICING: Record<string, { input: number; output: number }> = {
  'mistral-small-latest': { input: 0.10, output: 0.30 },
  'mistral-medium-latest': { input: 0.75, output: 2.25 },
  'mistral-large-latest': { input: 2.00, output: 6.00 },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AIFeature =
  | 'ai-manager'
  | 'ai-coach'
  | 'league-creator'
  | 'league-plan'
  | 'ai-motivate';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIChatOptions {
  messages: ChatMessage[];
  feature: AIFeature;
  leagueId?: string | null;
  userId?: string | null;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIChatResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  model: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

function getClient() {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('MISTRAL_API_KEY not configured');
  return new Mistral({ apiKey });
}

/**
 * Extract text content from a Mistral response (handles string and array).
 */
function extractContent(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw)) {
    return raw
      .map((c: any) => (typeof c === 'string' ? c : c?.text || ''))
      .join('')
      .trim();
  }
  return '';
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Single function for all AI chat completions.
 * Handles client creation, response parsing, and usage logging.
 */
export async function aiChat(options: AIChatOptions): Promise<AIChatResult> {
  const {
    messages,
    feature,
    leagueId,
    userId,
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 500,
  } = options;

  const client = getClient();

  const response = await client.chat.complete({
    model,
    messages,
    temperature,
    maxTokens,
  });

  const content = extractContent(response.choices?.[0]?.message?.content);
  const promptTokens = response.usage?.promptTokens ?? 0;
  const completionTokens = response.usage?.completionTokens ?? 0;

  // Calculate cost
  const pricing = PRICING[model] || PRICING[DEFAULT_MODEL];
  const costUsd =
    (promptTokens * pricing.input + completionTokens * pricing.output) / 1_000_000;

  // Fire-and-forget log — never block the response
  logUsage({
    feature,
    leagueId: leagueId || null,
    userId: userId || null,
    model,
    promptTokens,
    completionTokens,
    costUsd,
  }).catch((err) => console.error('[AI Usage Log] Failed:', err));

  return { content, promptTokens, completionTokens, costUsd, model };
}

// ---------------------------------------------------------------------------
// Usage Logging
// ---------------------------------------------------------------------------

async function logUsage(data: {
  feature: string;
  leagueId: string | null;
  userId: string | null;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}) {
  const supabase = getSupabaseServiceRole();
  await supabase.from('ai_usage_logs').insert({
    feature: data.feature,
    league_id: data.leagueId,
    user_id: data.userId,
    model: data.model,
    prompt_tokens: data.promptTokens,
    completion_tokens: data.completionTokens,
    cost_usd: data.costUsd,
  });
}
