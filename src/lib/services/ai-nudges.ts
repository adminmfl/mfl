/**
 * AI Motivation Nudges — Daily personalized messages for all league members.
 *
 * Strategy: categorize players by situation, generate ONE AI template per
 * category (saves tokens), personalize with name/stats, send via host.
 */
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { aiChat } from '@/lib/ai-client';
import { buildLeagueHealthContext } from '@/lib/services/ai-league-manager';
import { sendMessage } from '@/lib/services/messages';
import type { MemberSnapshot, ActiveChallengeInfo } from '@/lib/ai/types';

// ---------------------------------------------------------------------------
// Player Categories
// ---------------------------------------------------------------------------

type NudgeCategory =
  | 'streak_hero'       // 5+ day streak
  | 'consistent'        // logged today/yesterday, 2-4 day streak
  | 'mild_inactive'     // 2-3 days inactive
  | 'serious_inactive'  // 4+ days inactive
  | 'streak_broken'     // had a streak, just broke it
  | 'new_player'        // 0-1 total points, early in league
  | 'challenge_push';   // active challenge, hasn't submitted yet

interface CategorizedMember {
  member: MemberSnapshot;
  category: NudgeCategory;
}

function categorizeMembers(
  members: MemberSnapshot[],
  challenges: ActiveChallengeInfo[],
  leagueDay: number,
): CategorizedMember[] {
  const hasActiveChallenge = challenges.length > 0;

  return members.map((m) => {
    let category: NudgeCategory;

    if (m.consecutiveDaysActive >= 5) {
      category = 'streak_hero';
    } else if (m.streakBroken) {
      category = 'streak_broken';
    } else if (m.consecutiveDaysInactive >= 4) {
      category = 'serious_inactive';
    } else if (m.consecutiveDaysInactive >= 2) {
      category = 'mild_inactive';
    } else if (leagueDay <= 5 && m.totalPoints <= 1) {
      category = 'new_player';
    } else if (hasActiveChallenge && !m.hasLoggedToday) {
      category = 'challenge_push';
    } else {
      category = 'consistent';
    }

    return { member: m, category };
  });
}

// ---------------------------------------------------------------------------
// AI Template Generation (one call per category)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are Coach MFL, a friendly fitness motivation coach. Generate a short motivational message template (2-3 sentences max) for a category of players.

Rules:
- NEVER use individual player names — these messages are posted in team chat visible to everyone
- Use {team} for their team name
- Use {streak} for current streak days
- Use {points} for total points
- Use {days_inactive} for inactive day count
- Address the team collectively (e.g., "Hey team!", "Team {team}!", "Everyone")
- Be warm, specific, and action-driven
- No hashtags, max 1 emoji
- Never guilt-trip inactive players — be encouraging
- Never single out or call out specific individuals
- Return ONLY the message template, nothing else`;

const CATEGORY_PROMPTS: Record<NudgeCategory, string> = {
  streak_hero:
    'Some team members have great streaks going. Celebrate consistency and push the whole team to keep it alive. Do NOT name individuals.',
  consistent:
    'The team has been logging activity recently. Encourage everyone to stay consistent. Do NOT name individuals.',
  mild_inactive:
    'Some team members have been less active recently. Gently nudge the whole team to get back on track without singling anyone out.',
  serious_inactive:
    'Team participation has dropped. Warmly encourage the whole team — some members might be struggling. Be empathetic. Do NOT name individuals.',
  streak_broken:
    'Some team streaks have been broken. Acknowledge it happens and motivate the team to start fresh today. Do NOT name individuals.',
  new_player:
    'The team has new members in their first few days. Welcome and encourage the whole team to be active together. Do NOT name individuals.',
  challenge_push:
    'There\'s an active challenge happening. Remind the team to participate and earn bonus points today. Do NOT name individuals.',
};

async function generateTemplates(
  categories: NudgeCategory[],
  leagueName: string,
  leagueId: string,
): Promise<Record<NudgeCategory, string>> {
  const templates: Partial<Record<NudgeCategory, string>> = {};

  // Generate all category templates in parallel
  const results = await Promise.allSettled(
    categories.map(async (cat) => {
      const result = await aiChat({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `League: ${leagueName}\nCategory: ${cat}\nContext: ${CATEGORY_PROMPTS[cat]}\n\nGenerate the message template.`,
          },
        ],
        feature: 'ai-coach',
        leagueId,
        temperature: 0.9,
        maxTokens: 150,
      });
      return { cat, content: result.content };
    }),
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.content) {
      templates[r.value.cat] = r.value.content;
    }
  }

  return templates as Record<NudgeCategory, string>;
}

// ---------------------------------------------------------------------------
// Personalize + Send
// ---------------------------------------------------------------------------

function personalize(template: string, member: MemberSnapshot): string {
  return template
    .replace(/\{name\}/g, 'team')
    .replace(/\{streak\}/g, String(member.consecutiveDaysActive))
    .replace(/\{points\}/g, String(Math.round(member.totalPoints)))
    .replace(/\{team\}/g, member.teamName || 'your team')
    .replace(/\{days_inactive\}/g, String(member.consecutiveDaysInactive));
}

// ---------------------------------------------------------------------------
// Main: Run Nudges for One League
// ---------------------------------------------------------------------------

export async function runNudgesForLeague(
  leagueId: string,
  hostUserId: string,
): Promise<{ sent: number; skipped: number; categories: number }> {
  const ctx = await buildLeagueHealthContext(leagueId);

  // Categorize all members
  const categorized = categorizeMembers(ctx.allMembers, ctx.activeChallenges, ctx.leagueDay);

  // Find unique categories that have members
  const usedCategories = [...new Set(categorized.map((c) => c.category))];

  if (usedCategories.length === 0) {
    return { sent: 0, skipped: 0, categories: 0 };
  }

  // Generate one AI template per category
  const templates = await generateTemplates(usedCategories, ctx.leagueName, leagueId);

  let sent = 0;
  let skipped = 0;

  // Group by team+category to send ONE message per team per category
  // (avoids flooding team chat with duplicate messages and naming individuals)
  const teamCategorySent = new Set<string>();

  for (const { member, category } of categorized) {
    const template = templates[category];
    if (!template) {
      skipped++;
      continue;
    }

    if (!member.teamId) {
      skipped++;
      continue;
    }

    // Only send one message per team per category
    const teamCatKey = `${member.teamId}:${category}`;
    if (teamCategorySent.has(teamCatKey)) {
      skipped++;
      continue;
    }

    const message = personalize(template, member);

    const result = await sendMessage(leagueId, hostUserId, {
      content: `💪 ${message}`,
      teamId: member.teamId,
      messageType: 'chat',
      visibility: 'all',
    });
    if (result) {
      sent++;
      teamCategorySent.add(teamCatKey);
    } else {
      skipped++;
    }
  }

  return { sent, skipped, categories: usedCategories.length };
}

// ---------------------------------------------------------------------------
// Main: Run Nudges for All Active Leagues
// ---------------------------------------------------------------------------

export async function runAllNudges(): Promise<{
  leaguesProcessed: number;
  results: { leagueId: string; sent: number; skipped: number; categories: number }[];
}> {
  const supabase = getSupabaseServiceRole();
  const today = new Date().toISOString().split('T')[0];

  const { data: leagues } = await supabase
    .from('leagues')
    .select('league_id, created_by')
    .lte('start_date', today)
    .gte('end_date', today);

  const results: { leagueId: string; sent: number; skipped: number; categories: number }[] = [];

  for (const league of leagues || []) {
    try {
      const result = await runNudgesForLeague(league.league_id, league.created_by);
      results.push({ leagueId: league.league_id, ...result });
    } catch (err) {
      console.error(`[ai-nudges] Failed for league ${league.league_id}:`, err);
      results.push({ leagueId: league.league_id, sent: 0, skipped: 0, categories: 0 });
    }
  }

  return { leaguesProcessed: results.length, results };
}
