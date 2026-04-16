# Changelog

All notable changes to My Fitness League (MFL) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — v2.6.0

### Added
- Team messaging engine with realtime chat, @mentions, read receipts, and guided onboarding tour
- AI Coach powered by Mistral: motivation nudges, captain insights, Q&A chatbot, and AI-assisted league creation wizard
- AI League Manager: end-to-end AI-powered league setup and management
- Workout link button in chat message input
- Landing page revamp with corporate imagery, orange accent theme, and wearable integration copy
- V2.5 P0/P1/P2 feature implementation across the platform

### Changed
- Client feedback: filter dropdown, instant messaging UX, left-aligned dropdowns, mobile nav, league info title, and tour flow improvements
- AI Coach v2.5: inline intelligence replaces standalone AI components

### Fixed
- Captain restricted to own team only; removed ability to switch between teams (#1)
- Add-member API returns proper response for captain on own team instead of 403 (#2)
- Chat attach workout: replaced auto-action with explicit popover menu (#3)
- Challenges page returns friendly empty state instead of 500 error (#4)
- Duration/distance/steps validation enforced on client and server with shared limits (#5)
- Chat deep links display human-readable labels instead of raw UUID paths (#6)
- AI Coach chat renders markdown properly (bold, italic, code blocks) (#7)
- AI nudges address teams collectively; individual player names are never exposed (#8)
- AI league creator progress bar no longer resets when fields contain null values (#9)
- Round-robin chart shows empty state message when no data is available (#10)
- Leaderboard stats section labeled "Your Activity Submissions" for clarity (#11)
- Help page: renamed duplicate "Getting Started" section to "Guided Tour" (#12)
- Sidebar text overflow fixed with proper truncation and min-width constraints (#13)
- Dashboard: `deriveLeagueStatus` wrapped in try-catch to prevent blank screen on corrupt data (#14)
- Null guards added on `.roles` and `.name` across dashboard, profile, leagues, sidebar, header, and league context (#15)
- Host landing page, activities fetch fallback, and chat badge count
- Fix captain permission to only remove members from their own team (#124)
- Toast scoping: informational toasts auto-dismiss after 4 seconds and all toasts clear on navigation (#151)
- Fix `use-tournament-matches` and `submissions-table` importing toast directly from sonner, bypassing wrapper duration rules (#151)

## [2.0.0] — 2026-04-01

### Added
- League feedback banner on My Activity page
- Admin dashboard: host info column and "Login as Host" impersonation button (#90, #91)
- MyTeam stats: activity/challenge statistics cards, welcome message with first name (#89)
- Individual leaderboard: top 20% player highlighting (#87)
- Multi-outcome UI for activities with unique workout editing (#96)
- Unique Workout Day challenge type: 1-point scoring, re-selection, pre-filter, normalized challenge points (#94)
- Activity customization engine: configurable proof/notes requirements, points per session, multi-outcome support (#93)
- Date picker for workout submission date selection (#98)

### Changed
- Text and CTA copy updates across the app (#84)
- League home: removed search/pagination, added RR column, improved UX (#88)
- Simplified team members view on individual leaderboard (#87)
- Player/team count cards added to configure dialogs (#94)

### Fixed
- Cron timezone handling for auto rest day, captain validation window, submit date (#85)
- Leaderboard RR tiebreaker logic, team name editing (#86)
- UI bugs, leaderboard deduplication, rest day count accuracy, league settings editability (#92)
- Leaderboard truncation and points mismatch (#95)
- Individual challenge points displaying decimals (#97)
- Image upload compression error (#98)
- Rejected workout resubmission and yesterday submission support (#99)
- Resubmit date lock, custom fields display, cross-login security hardening (#101)
- Resubmit button disabled state, custom fields not showing in activity config (#102)
- Activity `min_value` and `points_per_session` not applied correctly (#103)
- Submissions pagination capped at 1000, reverted points badge from confirmation (#104)
- Challenge system: removed payment gate, fixed team scoring, sub-team all-or-nothing logic (#105, #106)
- Auto rest day: pre-start assignment, donation direct approval, cron skipping scheduled/launched leagues, late submission not clearing rest day (#107)
- League report data accuracy for all players and leagues (#108)
- Challenge leaderboard not showing challenges and scores (#109)
- Admin impersonation crash, submit page crash, rest day counting, UI restructure (#91)

## [1.0.0] — 2026-02-11

### Added
- **Core platform**: Next.js application with Supabase backend and NextAuth (Google + Credentials)
- **League management**: Multi-step creation form with tier selection, pricing preview, Razorpay payment integration
- **Role-based access**: Host, Governor, Captain, Player roles with permission-gated pages and role context
- **Activity submission engine**: Workout logging with proof upload, notes, date picker, frequency and measurement type support (duration/count/none)
- **Activity categories**: Admin CRUD for categories with badges and usage counts
- **Custom activities**: Create/edit custom activities with category assignment
- **Challenge system**: Full CRUD with document upload, team/individual/sub-team types, pricing management, score publishing, lifecycle management
- **Leaderboard**: Real-time scoreboard with team/individual/challenge tabs, date filtering, challenge bonus points, average rank
- **Sub-team management**: Sub-team creation for challenges with dedicated leaderboard
- **Team management**: Member management with move/delete, team logo upload
- **Rest day system**: Rest day donation with two-stage approval (Captain → Governor), auto-assign rest days cron job
- **League reports & certificates**: PDF report generation and certificate download on league completion
- **Admin dashboard**: Statistics, revenue charts, recent activity tracking
- **League analytics**: Performance insights with export functionality
- **Profile pictures**: Upload/delete on profile page with avatar display across the app
- **Manual entry**: Manual workout entry page and API for league members
- **Invite system**: Invite codes with InviteDialog for hosts
- **Help & support**: FAQ sections with quick links navigation
- **League rules**: Dynamic rules with document upload (PDF, DOC, DOCX) and in-page viewing
- **Trial submission mode**: Submissions allowed 3 days before league start with trial badges, excluded from official stats
- **Rejection system**: Soft reject (allows resubmit) and permanent reject with reupload dialog and time window
- **WhatsApp reminder**: Dynamic reminder button
- **Theme system**: Color picker, depth selector, font switcher on profile page
- **Week view**: Anchored to league start weekday with activity and challenge points
- **Point normalization**: Toggle for team size vs capacity normalization
- **Share functionality**: Share challenges, league status derivation with persistence
- **SEO & branding**: Updated icons, manifest, metadata

### Changed
- Renamed "Workout" to "Activity" across all UI surfaces
- Renamed "Avg RR" to "RR" for consistency
- Renamed "Challenge Bonus" to "Challenge Points"
- Refactored `team_size` to `team_capacity` across the application
- Middleware renamed to proxy for Next.js 16 compatibility
- Replaced hardcoded colors with semantic CSS variables

### Fixed
- Realtime leaderboard accumulation on league completion
- Submission deadline extended to 9:00 AM UTC next day for league end day
- Timezone handling with IANA support and `date-fns-tz` v3.2.0
- Duplicate username/email error handling
- League status showing "Scheduled" instead of "Launched"
- Profile settings not updating on change
- League name validation before payment
- Auto rest day league query filtering

### Infrastructure
- Complete Supabase database schema (28 tables, enums, indexes)
- Row-level security policies for all tables
- Cron jobs: auto-approve old submissions, auto-assign rest days
- Jest test configuration

[Unreleased]: https://github.com/adminmfl/mfl-v2main/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/adminmfl/mfl-v2main/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/adminmfl/mfl-v2main/releases/tag/v1.0.0
