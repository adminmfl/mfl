/**
 * POST /api/ai-coach/league-creator
 *
 * Conversational AI endpoint for league creation.
 * The LLM converses with the user to collect league configuration fields,
 * extracts structured data from natural language, and tracks progress.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { Mistral } from '@mistralai/mistralai';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeagueFields {
  league_name?: string;
  description?: string;
  num_teams?: number;
  max_participants?: number;
  start_date?: string;
  duration?: number;
  rest_days?: number;
  is_public?: boolean;
  is_exclusive?: boolean;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are the MFL League Creation Assistant. You help users create fitness leagues through natural conversation.

YOUR JOB:
1. Greet the user warmly and explain you'll help them set up their fitness league
2. Collect the required information through natural conversation
3. After EVERY user message, extract any league configuration data they mentioned
4. Ask follow-up questions for missing required fields
5. When all required fields are collected, present a summary for confirmation

REQUIRED FIELDS:
- league_name: Name of the league (min 3 characters, must be unique)
- num_teams: Number of teams (e.g., 2-20)
- max_participants: Total number of players across all teams
- start_date: When the league starts (YYYY-MM-DD format)
- duration: How many days the league runs (e.g., 30, 60, 90)

OPTIONAL FIELDS (have defaults):
- description: A short description of the league
- rest_days: Number of rest days per week (0-7, default: auto-calculated as 20% of duration)
- is_public: Whether the league is publicly visible (default: false)
- is_exclusive: Whether joining requires an invite (default: true)

RULES:
- Be conversational, friendly, and concise (2-3 sentences per response)
- If a user says something like "5 teams with 50 players for 30 days", extract ALL fields mentioned
- Help users understand fields: e.g., "max_participants is the total number of players across ALL teams"
- For dates, accept natural language like "next Monday", "March 25", "in 2 weeks" — convert to YYYY-MM-DD
- If user gives team size (e.g., "10 per team"), calculate max_participants = num_teams × team_size
- Give examples when the user seems confused
- When showing the summary, format it clearly and ask "Shall I proceed with creating this league?"

IMPORTANT RESPONSE FORMAT:
You MUST end every response with a JSON block on its own line, wrapped in triple backticks, containing the extracted fields so far. Include ONLY fields that have been explicitly mentioned or confirmed by the user. Example:

\`\`\`json
{"league_name": "RFL Corporate League", "num_teams": 5, "max_participants": 50, "duration": 30}
\`\`\`

If no fields have been extracted yet, return:
\`\`\`json
{}
\`\`\`

The JSON block is parsed by the system — always include it, even if empty.`;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { message, history, currentFields } = body as {
      message: string;
      history: ConversationMessage[];
      currentFields: LeagueFields;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // Build conversation with context about what's been collected
    const filledFields = Object.entries(currentFields || {})
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    const missingRequired = ['league_name', 'num_teams', 'max_participants', 'start_date', 'duration']
      .filter((f) => !(currentFields as any)?.[f]);

    const contextNote = `
[SYSTEM CONTEXT — not visible to user]
Fields collected so far: ${filledFields || 'None'}
Missing required fields: ${missingRequired.length > 0 ? missingRequired.join(', ') : 'ALL REQUIRED FIELDS COLLECTED — present summary and ask for confirmation'}
Today's date: ${new Date().toISOString().split('T')[0]}
`;

    // Filter out any messages with empty content (Mistral rejects them)
    const validHistory = (history || [])
      .filter((m) => m.content && m.content.trim().length > 0)
      .slice(-10);

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: SYSTEM_PROMPT + contextNote },
      ...validHistory,
      { role: 'user', content: message },
    ];

    const client = new Mistral({ apiKey });
    const response = await client.chat.complete({
      model: 'mistral-small-latest',
      messages,
      temperature: 0.7,
      maxTokens: 600,
    });

    const rawContent = response.choices?.[0]?.message?.content;
    let assistantMessage = '';
    if (typeof rawContent === 'string') {
      assistantMessage = rawContent.trim();
    } else if (Array.isArray(rawContent)) {
      assistantMessage = rawContent.map((c: any) => (typeof c === 'string' ? c : c?.text || '')).join('').trim();
    }

    // Extract JSON block from response
    let extractedFields: LeagueFields = {};
    const jsonMatch = assistantMessage.match(/```json\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        extractedFields = JSON.parse(jsonMatch[1]);
      } catch {
        // If JSON parsing fails, keep empty
      }
    }

    // Remove the JSON block from the visible message
    const visibleMessage = assistantMessage
      .replace(/```json\s*\n?[\s\S]*?\n?```/g, '')
      .trim();

    // Merge extracted fields with current fields (new extractions override)
    const mergedFields: LeagueFields = { ...(currentFields || {}), ...extractedFields };

    // Check if all required fields are present
    const allRequiredPresent = ['league_name', 'num_teams', 'max_participants', 'start_date', 'duration']
      .every((f) => (mergedFields as any)[f] !== undefined && (mergedFields as any)[f] !== null && (mergedFields as any)[f] !== '');

    return NextResponse.json({
      success: true,
      message: visibleMessage,
      extractedFields: mergedFields,
      isComplete: allRequiredPresent,
    });
  } catch (error) {
    console.error('Error in league creator AI:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
