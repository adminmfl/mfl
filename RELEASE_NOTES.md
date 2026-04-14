# Release Notes

## v2.5.0 — AI-Powered League Management & Team Messaging
**Status:** Unreleased (QA)
**Target:** TBD

### Highlights

**Team Messaging Engine** — Real-time chat is here. League members can now message within their teams with @mentions, read receipts, and a guided onboarding tour to get everyone started.

**AI Coach** — Powered by Mistral, the AI Coach delivers personalized motivation nudges, gives captains actionable insights on team engagement, and lets hosts create leagues through a conversational wizard.

**AI League Manager** — End-to-end AI-assisted league setup. Hosts can describe what they want in plain language, and the system generates a fully configured league ready to launch.

**Landing Page Revamp** — Fresh corporate design with orange accents, updated hero imagery, and wearable integration messaging.

### What's Fixed
- 15 bugs reported by QA testers have been resolved, including captain permissions, chat UX issues, data validation, AI rendering, and null safety across the app.

### Breaking Changes
- None. v2.5 is backward-compatible with v2.0 data.

### Database Migrations
- 5 new migrations required: messaging tables, message reactions, AI coach messages, AI league manager schema, and supporting tables.

### Environment Setup
- New environment variable required: `MISTRAL_API_KEY`

---

## v2.0.0 — Production-Ready Release
**Released:** April 1, 2026

### Highlights

**Activity Customization** — Hosts can now configure proof requirements, notes, points per session, and multi-outcome support for each activity. This gives league creators full control over how activities are scored and verified.

**Unique Workout Day** — A new challenge type where players earn points for logging unique activities. Encourages variety and exploration across different workout types.

**Admin Impersonation** — Platform admins can now impersonate hosts directly from the admin dashboard, making support and troubleshooting significantly faster.

**Challenge System Overhaul** — Removed the payment gate for challenges, fixed team scoring logic, and resolved sub-team all-or-nothing edge cases. Challenges are now more accessible and scores are accurate.

### What's Fixed
- 26 bug fixes across leaderboards, rest day automation, submission handling, report accuracy, and UI polish. Major areas:
  - Auto rest day cron: timezone handling, late submissions, pre-start assignment
  - Leaderboard: deduplication, RR tiebreakers, truncation, decimal display
  - Submissions: pagination cap at 1000, resubmit button states, date locking
  - Security: cross-login session hardening

### Upgrade Notes
- No database migrations required beyond v1.0.
- No breaking API changes.

---

## v1.0.0 — Initial Release
**Released:** February 11, 2026

### Highlights

**My Fitness League** launches as a complete league management platform for fitness communities. Hosts can create and manage leagues with teams, challenges, and leaderboards — all with built-in payment processing via Razorpay.

**League Management** — Create leagues with configurable tiers, team capacity, activity types, and scoring rules. Supports the full lifecycle from setup through completion with automated status transitions.

**Role-Based System** — Four distinct roles (Host, Governor, Captain, Player) with granular permissions. Each role sees a tailored dashboard and has access to role-specific actions.

**Activity & Challenge Engine** — Players log workouts with proof uploads, while hosts create challenges with documents, team/individual/sub-team formats, and custom scoring. Real-time leaderboards track performance with date-filtered views.

**Rest Day System** — Automated rest day assignment for missed entries, with a donation system that flows through two-stage approval (Captain → Governor).

**Reports & Certificates** — Generate PDF league reports and downloadable certificates on league completion.

### Platform
- **Frontend:** Next.js with TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL + Row-Level Security + Realtime)
- **Auth:** NextAuth.js with Google OAuth and email/password
- **Payments:** Razorpay integration
- **Hosting:** Vercel

### Known Limitations
- No team-level messaging (addressed in v2.5)
- No AI-powered features (addressed in v2.5)
- Single environment setup (multi-environment support added post-release)
