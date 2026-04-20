# Release Notes

## v2.6.0 - Client Readiness Release

**Status:** On QA
**Target:** v2.6 validation

### Highlights

**Corporate & Community Landing Pages** - Two new public-facing landing routes are now available at `/corporate` and `/communities`, with working CTAs, improved mobile readability, and cleaner routing.

**Performance & Speed** - The app now loads faster on the key dashboard and leaderboard flows, with better mobile responsiveness and reduced perceived wait time.

**Deployment Stability** - The release train was stabilized for QA with scoped lint/format guardrails and cleaner promotion hygiene.

**Rest Day Donation Sync Improvements** — Rest day donations now reflect instantly, with real-time updates to both recipient availability and donor balances.

**Auto-Assignment Refinements** — Automatic rest day assignment now avoids days with existing submissions and respects updated rest day availability.

**Fair Play Safeguards** — Suspicious submissions can now be flagged and tracked through a strike-based system, with warnings for players and improved visibility for captains and organizers.

### What's Fixed

- Captain permissions and add-member edge cases
- Chat workout attach flow and deep-link usability
- Validation issues around duration, distance, and steps
- AI Coach markdown rendering and AI creator null-state handling
- Null-safety and dashboard crash guards across core screens
- Landing-page anchor, analytics placeholder, and CTA polish issues

- Rest day donation sync, balance tracking, and auto-assignment inconsistencies.

### Breaking Changes

- None.

### Database Migrations

- No new database migrations required for v2.6 deliverables.

### Environment Setup

- No new production environment variables required for v2.6 deliverables.

---

## v2.0.0 - Production-Ready Release

**Released:** April 1, 2026

### Highlights

**Activity Customization** - Hosts can now configure proof requirements, notes, points per session, and multi-outcome support for each activity. This gives league creators full control over how activities are scored and verified.

**Unique Workout Day** - A new challenge type where players earn points for logging unique activities. Encourages variety and exploration across different workout types.

**Admin Impersonation** - Platform admins can now impersonate hosts directly from the admin dashboard, making support and troubleshooting significantly faster.

**Challenge System Overhaul** - Removed the payment gate for challenges, fixed team scoring logic, and resolved sub-team all-or-nothing edge cases. Challenges are now more accessible and scores are accurate.

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

## v1.0.0 - Initial Release

**Released:** February 11, 2026

### Highlights

**My Fitness League** launches as a complete league management platform for fitness communities. Hosts can create and manage leagues with teams, challenges, and leaderboards - all with built-in payment processing via Razorpay.

**League Management** - Create leagues with configurable tiers, team capacity, activity types, and scoring rules. Supports the full lifecycle from setup through completion with automated status transitions.

**Role-Based System** - Four distinct roles (Host, Governor, Captain, Player) with granular permissions. Each role sees a tailored dashboard and has access to role-specific actions.

**Activity & Challenge Engine** - Players log workouts with proof uploads, while hosts create challenges with documents, team/individual/sub-team formats, and custom scoring. Real-time leaderboards track performance with date-filtered views.

**Rest Day System** - Automated rest day assignment for missed entries, with a donation system that flows through two-stage approval (Captain -> Governor).

**Reports & Certificates** - Generate PDF league reports and downloadable certificates on league completion.

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
