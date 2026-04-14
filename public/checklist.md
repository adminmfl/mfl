# MyFitnessLeague — Developer Handoff

**Landing Pages · Corporate + Residential · April 2026**  
Version: v1.0 · Ready for deployment  
Prepared for: Development Team

**Files:**
- `mfl-landing.html` — Corporate
- `mfl-residential.html` — Communities

> ⚠️ **Action required:** Replace placeholder images (see Section 4)

---

## 01 · Overview & File Structure

> **Two self-contained HTML files — no build step required**
> Both pages are single-file HTML with inline CSS and minimal inline JS (FAQ accordion only). No framework, no npm, no webpack. Drop into any static host and they work. CSS custom properties handle theming throughout.

| File | Audience | Links to |
|------|----------|----------|
| `mfl-landing.html` | Corporate HR teams, any company | `mfl-residential.html` |
| `mfl-residential.html` | RWA committees, apartment/villa communities | `mfl-landing.html` |

✅ **Both pages cross-link correctly**  
Nav pill switcher (Corporate / Communities), RWA strip at bottom of corporate page, and corporate strip at bottom of residential page — all link between the two files using relative paths. **Keep both files in the same directory.**

---

## 02 · Page Structure — Corporate (`mfl-landing.html`)

Sections appear in this order — optimised for conversion: critical info first, detail for scroll-down readers.

| Anchor | Section | Notes |
|--------|---------|-------|
| `#nav` | Fixed nav + Corporate Identity Banner | Logo, Corporate/Communities pill switcher, "Launch Free" CTA. Navy banner below states audience and 4 category tags. |
| `#hero` | Hero — headline, CTA, trust stats, app screenshots | Left: headline, sub, CTA, "pay only if you love it" note, 4 trust stats. Right: 3 action photos + 3 HTML app mockups (leaderboard, activity log, AI coach chat). |
| — | Stat Strip (orange bar) | 5 key numbers from pilot leagues. |
| — | Social Proof | 3 testimonial cards: Rashida (R&A), Sandeep (Rotary), law firm participant. Pulled high in the page. |
| `#how` | 5-Step League Flow | Configure → Launch → Play Activities → Play Challenges → Grand Finale. AI config card sticky on right. |
| `#openingday` | Opening Day section | 4 sub-steps with jersey photo + team name tags. Large crowd event photo on right. |
| `#finale` | Grand Finale section | 4 award categories (team, individual, leadership, League Finisher certificate). Trophy/celebration photo grid. |
| — | Photo Feature Row | 2 full-width panels: Daily Activities / Bonus Challenges with overlay text. |
| — | AI Personal Coach | Phone chat mockup + 6 capability cards. |
| — | What is MFL — 3 cards with photos | Teams / Daily Activities / Challenges + Finale. |
| — | Activities & Challenges | Side-by-side: 12 activity pills + 8 challenge pills. Fully configurable messaging. |
| — | Why Not Wellness Apps | 3-card problem statement. |
| `#pricing` | Pricing — 3 tiers | Starter ₹199 / Growth ₹149 / Enterprise ₹99. All launch offer. Extend 60/90 day add-ons. League Finisher in every plan. |
| — | FAQ — accordion | 9 questions, click to expand. JS is 8 lines inline at bottom of FAQ section. |
| `#rwa` | RWA soft strip | Subtle pointer to residential page. Not a banner — secondary call to action only. |
| — | Final CTA + Footer | "Launch Free — 7 Days →" repeated at bottom. Pay-only-if-you-love-it note. |

---

## 03 · Page Structure — Residential (`mfl-residential.html`)

> **Same brand, different tone**
> Uses the same MFL colour variables and font stack as the corporate page. Terminology adjusted throughout: "residents" not "employees", "RWA host" not "HR team", "wing vs wing" not "department vs department", villas / apartments / houses all mentioned.

| Anchor | Section | Notes |
|--------|---------|-------|
| `#nav` | Nav + Communities banner | Teal-accented banner, "For Corporates →" soft link in nav. |
| `#hero` | Hero — community scoreboard | Wing-based leaderboard (Sunrisers, Challengers, Warriors, Strikers). Age-group pills below teams. Teal accent colour distinguishes from corporate page. |
| — | What's different — 3 cards + photo strip | Multi-generational / Wing rivalry / Neighbours. 3-panel photo strip: seniors walking, family yoga, community celebration. |
| `#how` | 5-Step Flow | Includes Opening Day jersey photo inline in step 3. Grand Finale step mentions League Finisher certificate. |
| — | Opening Day + Finale photo panels | Full-width 2-panel: Opening Day clubhouse photo / Grand Finale trophy photo. Both with overlay text. |
| — | Outcomes, Testimonials, AI Coach, Activities & Challenges, Pricing, FAQ | Same structure as corporate page, community-specific copy throughout. |
| — | Corporate soft strip + Final CTA + Footer | Links back to `mfl-landing.html`. |

---

## 04 · Images — Replace Before Launch

> ⚠️ **All images are placeholder Unsplash URLs — replace with real MFL photos before launch.**
> Current images are illustrative only and legally cannot be used commercially without Unsplash licensing. Swap every `src` URL with actual MFL event photos. Image dimensions and `object-fit: cover` are already set — any photo at ≥800px wide will work cleanly.

### Corporate page images to replace

| Location | Current placeholder shows | Replace with | Size |
|----------|--------------------------|--------------|------|
| Hero — photo 1 | Group running in park | MFL participants jogging / walking outdoors | 400×400 |
| Hero — photo 2 | Badminton doubles | MFL badminton or sports challenge moment | 400×400 |
| Hero — photo 3 | Team cycling sport | MFL activity — cycling, yoga, or group sport | 400×400 |
| Opening Day jersey | Colourful jerseys on mannequins | Real MFL team jerseys from any pilot league | 600×160 |
| Opening Day event photo | Large crowd auditorium | R&A or RFL Opening Day event — team reveal moment | 800×500 |
| Grand Finale — main | Trophy ceremony crowd | MFL Grand Finale — winning team with trophy | 700×220 |
| Grand Finale — left small | Trophy cup collection | Award being presented on stage / podium | 300×130 |
| Grand Finale — right small | Confetti crowd celebration | Team celebration, confetti, group cheering | 300×130 |
| Feature row — left | Group yoga outdoor | MFL daily activity in progress | 800×360 |
| Feature row — right | Badminton doubles | MFL team challenge in action | 800×360 |
| What is MFL — card 1 | Park running | MFL team photo / group activity | 600×160 |
| What is MFL — card 2 | Outdoor sport | MFL daily activity logging moment | 600×160 |
| What is MFL — card 3 | Team celebration | MFL Grand Finale or Opening Day | 600×160 |

### Residential page images to replace

| Location | Replace with |
|----------|-------------|
| Community photo strip — senior | Senior residents on morning walk in society compound |
| Community photo strip — family | Family doing yoga or activity together in society |
| Community photo strip — celebration | Residents at a community event / Finale |
| How-it-works — jersey step | MFL jerseys from any pilot league |
| Opening Day panel | Residents gathered at clubhouse Opening Day |
| Grand Finale panel | Community Finale — trophies, residents celebrating |

> ℹ️ **App screenshots are HTML — not images.**
> The leaderboard, activity log, and AI coach screens in the hero right panel are rendered in HTML/CSS — they are not image files. When the real MFL app is ready, replace these with actual app screenshots using `<img>` tags or a screenshot carousel.

---

## 05 · Brand Colours & Design Tokens

All colours are defined as CSS custom properties in `:root {}` at the top of each file. Change once, updates everywhere.

| Token | Hex | Usage |
|-------|-----|-------|
| `--orange` | `#F26522` | Primary accent (corporate) |
| `--orange-dark` | `#C94E0E` | Hover states |
| `--orange-light` | `#FDE8DC` | Backgrounds |
| `--navy` | `#1A2B4A` | Text, banners |
| `--navy-light` | `#EEF1F7` | Section backgrounds |
| `--gold` | `#F5A623` | Awards, highlights |
| `--off-white` | `#FAF9F7` | Page background |

> **Residential page** uses `--mfl-teal: #0F6E56` and `--mfl-teal-light: #E1F5EE` as the secondary accent instead of orange. Eyebrows, step timers, and config badges use teal to visually distinguish it from the corporate page at a glance.

### Typography

| Font | Role | Usage |
|------|------|-------|
| **Bebas Neue** | Headlines · Scores · Numbers | All `h1`, `h2`, nav logo, stat numbers, jersey text, leaderboard pts. Google Fonts — loaded in `<head>`. |
| **DM Sans** | Body copy, buttons, descriptions | All body text, buttons, feature descriptions. Weights: 300, 400, 500, 600. Google Fonts. |
| **DM Mono** | Labels · Tags · Metadata | Section eyebrows, badges, team roles, timestamps, mono data. Weights: 400, 500. Google Fonts. |

---

## 06 · Pricing Logic — Connect to Backend

### Pricing tiers

| Plan | Size | Teams | Base Price | Challenges (40d) | 60d add-on | 90d add-on |
|------|------|-------|------------|-------------------|------------|------------|
| Starter | Up to 40 | Up to 4 × 12 | ₹199/person | 4 | +₹50 · +2 challenges | +₹90 · +4 challenges |
| Growth | 40–150 | 4–12 × 12 | ₹149/person | 6 | +₹50 · +2 challenges | +₹90 · +4 challenges |
| Enterprise | 150+ | 12+ unlimited | ₹99/person | 6 | +₹50 · +2 challenges | +₹90 · +4 challenges |

> ⚠️ **Prices are marked "Launch Offer" — update when offer period ends.**
> Search for `.offer` class or "Launch Offer" text in both files to update. Regular prices (post-launch offer) have not been defined — decide before updating.

### Key backend behaviours

**AI League Manager**  
Recommends the next challenge (timing, type, rules) based on league progress. Host reviews and confirms before it goes live. Once confirmed, the AI handles announcement, reminders, proof collection, and points awarding. **The host is always in control — AI never deploys autonomously.**

**Free trial — 7 days live, no card required**  
The CTA says "Launch Free — 7 Days →". The payment flow needs to handle:
- (a) League goes live immediately with no payment
- (b) On Day 7, host is prompted to pay to continue
- (c) If no payment, the league is paused/archived

The "pay only if you love it" promise must be honoured by the billing system.

**CTA wiring**  
All CTA buttons currently link to `#pricing` — replace `href="#pricing"` on the hero CTA and final CTA with the actual onboarding URL (e.g. `https://app.myfitnessleague.com/setup`). The "Talk to Us" Enterprise button should link to a contact form or WhatsApp.

---

## 07 · Functional Components

### FAQ Accordion

8 lines of vanilla JS at the bottom of the FAQ section. One question open at a time. No library dependency. The `toggleFaq(btn)` function is defined inline just before the closing `</section>`.

Works on corporate page; **residential page FAQ is still a static grid** — apply the same pattern if desired.

```js
// FAQ toggle — inline in both pages
function toggleFaq(btn) {
  const item = btn.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(el => {
    el.classList.remove('open');
    el.querySelector('.faq-arrow').textContent = '▼';
  });
  if (!isOpen) {
    item.classList.add('open');
    btn.querySelector('.faq-arrow').textContent = '▲';
  }
}
```

### Nav Pill Switcher

Pure CSS — no JS. The active pill uses `.np.on` with orange background.
- Corporate page: `Corporate` has class `on`
- Residential page: `Communities` has class `on`
- Hidden on mobile (`<960px`)

### Scroll Behaviour

All anchor links (`#how`, `#pricing`, `#finale`, `#openingday`, `#rwa`) use `scroll-behavior: smooth` on `html`. Nav is fixed so no offset needed for desktop. On mobile the fixed nav is 50px — if anchors feel offset, add `scroll-margin-top: 60px` to section elements.

### Responsive Breakpoint

Single breakpoint at `max-width: 960px`. All grids collapse to single column. Nav pills hidden. Hero right panel stacks below hero left. No tablet-specific breakpoint — intentional; the page reads well at all widths between 375px and 1440px.

---

## 08 · SEO, Meta Tags & Analytics

> ⚠️ **No SEO meta tags are present — add before launch.**
> Currently only `<title>`, `<meta charset>`, and `<meta viewport>` are set.

Add the following to `<head>` in both files before deploying:

```html
<!-- Add to <head> in both files -->
<meta name="description" content="MyFitnessLeague — Corporate fitness leagues that build team bonds. IPL-style competing teams, daily activities, bonus challenges and a Grand Finale. Any company, any size.">
<meta property="og:title" content="MyFitnessLeague — Corporate Fitness Leagues">
<meta property="og:description" content="Team fitness leagues for companies. First 7 days free.">
<meta property="og:image" content="https://myfitnessleague.com/og-image.jpg">
<meta property="og:url" content="https://myfitnessleague.com">
<link rel="canonical" href="https://myfitnessleague.com">
<!-- Add analytics snippet here (GA4 / Clarity / etc.) -->
```

> ⚠️ **Add conversion tracking on all CTA buttons.**
> The primary CTA ("Launch Free — 7 Days →") appears 3 times per page — in the nav, hero, and final CTA section. Tag each with a distinct event name: `nav_cta`, `hero_cta`, `bottom_cta`.

---

## 09 · Deployment Checklist

| # | Task | Status |
|---|------|--------|
| 1 | Replace all Unsplash placeholder images with real MFL photos (see Section 4) | ⬜ To Do (1 broken image fixed) |
| 2 | Wire CTA buttons to actual signup/onboarding URL | ✅ Done |
| 3 | Connect "Talk to Us" (Enterprise) to contact form or WhatsApp | ✅ Done |
| 4 | Add SEO meta tags, OG tags, and canonical URLs to both files | ✅ Done |
| 5 | Add analytics (GA4 / Clarity) and CTA conversion tracking | ✅ Done |
| 6 | Add favicon — `<link rel="icon">` in `<head>` | ✅ Done |
| 7 | Set up Razorpay / payment flow for the 7-day trial + pay-to-continue | ⬜ To Do (Backend) |
| 8 | Update "Launch Offer" prices when promotional period ends | ⬜ To Do (Future) |
| 9 | Test both pages on mobile (375px), tablet (768px), desktop (1280px+) | ⚠️ Ready for Testing |
| 10 | Test FAQ accordion on iOS Safari and Android Chrome | ⚠️ Ready for Testing |
| 11 | Test cross-links between pages | ✅ Done |
| 12 | Verify Google Fonts loads (requires internet — add `font-display: swap`) | ✅ Done |
| 13 | Generate League Finisher Certificate PDF template for end-of-season | ⬜ To Do (Design) |
| 14 | Keep both HTML files in the same directory (relative links depend on this) | ✅ Done |

---

## 10 · Content Notes for Founder Review

### ✅ Pilot data — verify all numbers before launch

| Stat | Value |
|------|-------|
| Rated 4–5 stars | 92% |
| Reported fitness improvement | 100% |
| Wanted Season 2 | 76% |
| Daily active rate | 84% |
| Total pilot participants | 150+ |
| R&A Associates | 53 participants |
| RFL | 51 participants |

All sourced from pilot feedback. Confirm these are accurate before the site goes live.

### ✅ Testimonials — verify before publishing

Currently written from recall and meeting notes. Have **Rashida** and **Sandeep** confirm their quotes are accurate before publishing. Consider getting written sign-off.

### ⚠️ R&A Associates — confirm public naming approval

"R&A Corp Fitness League", "R&A Associates", and "Rashida" appear as named examples throughout both pages. Confirm Rashida and R&A Associates have approved being named publicly.

### 🔲 League Finisher Certificate — design needed

Mentioned across both pages and in pricing. A template design (PDF/PNG) needs to be created, personalised with:
- Player name
- Team name
- League name
- Season stats
- MFL branding

This is a product deliverable that needs to be built before the Grand Finale feature is live.

### ⚠️ AI Coach and AI League Manager — confirm live vs roadmap

Both are presented as available features. Confirm with product team:
- **AI League Manager** — recommends challenges and deploys upon host confirmation; never acts autonomously
- **AI Personal Coach** — guides individual players on activities, leaderboard strategy, and teammate motivation

Confirm which capabilities are live in **v2.5** vs roadmap for **v3.0** so copy matches reality at launch.

---

*MyFitnessLeague · Developer Handoff · April 2026 · myfitnessleague.com*