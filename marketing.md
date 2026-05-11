# ValuConnect Solutions — VCIE Project Guide
**ValuConnect Content Intelligence Engine (VCIE) v2.0**
Bilingual EN/ES · 8 Industries · 4 Platforms · Built for Claude Code

---

## Project Overview

ValuConnect Solutions is a bilingual (EN/ES) operations and workflow optimization company for small businesses. This repository contains the **AI Content Intelligence Engine (VCIE)** — an automated system that scans for viral trends, matches them to ValuConnect's 8 industry use cases, and generates bilingual social media content every 48 hours.

**Founder:** Andres Ramirez  
**Mascot:** Valu — symbol of innovation, clarity, and the future  
**Mission:** Help small businesses work smarter, not harder — with digital systems that grow with them.

---

## Brand DNA (Always Apply)

| Element | Rule |
|---|---|
| Tone | Warm · Practical · Empathetic · Trustworthy — like a knowledgeable neighbor |
| Anti-tone | No corporate jargon · No overwhelming tech-speak · No condescending explanations |
| Voice | Always write as Andres — first person, personal, trusted advisor |
| Language | English version first, then natural conversational Spanish (not formal translation) |
| Audience | Small business owners, especially Latino/Hispanic entrepreneurs |
| Hashtags | Always include #NegocioLatino and #AutomatizacionDeNegocios on Spanish content |

### Three Content Pillars
- **Pillar 1 — Digital Transformation:** Paper-to-digital · Before/after stories · Cost of staying manual
- **Pillar 2 — Work Smarter:** Automation tips · AI tools · Workflow systems · Time-saving hacks
- **Pillar 3 — Owner Stories:** Client wins · Andres's journey · Bilingual community spotlights

---

## System Architecture

The VCIE pipeline runs every 48 hours and performs 5 operations:

1. **SCANS** — pulls trending topics from YouTube, Reddit, Google Trends, and web search
2. **SCORES** — ranks each topic by outlier potential vs. niche baseline (Sandy Lee formula)
3. **MATCHES** — maps each viral topic to the most relevant ValuConnect industry use case
4. **GENERATES** — creates complete bilingual posts for LinkedIn, Instagram, Facebook, and TikTok
5. **DELIVERS** — assembles a ready-to-review content package for Andres in under 30 minutes

### Module Map

| Module | File | Function |
|---|---|---|
| Trend Scanner | `src/trend-scanner.js` | Fetches trending content from all 4 sources every 48 hours |
| Outlier Engine | `src/outlier-engine.js` | Scores and ranks topics using engagement velocity formula |
| Industry Matcher | `src/industry-matcher.js` | Maps each viral topic to the most relevant industry use case |
| Brand Context | `src/brand-context.js` | Injects ValuConnect voice, pillars, bilingual rules into every API call |
| Content Generator | `src/content-generator.js` | Calls Anthropic Claude API to produce platform-specific posts |
| Package Builder | `src/package-builder.js` | Assembles the daily content brief for Andres to review |
| Scheduler | `scheduler.js` | Cron job — triggers full pipeline every 48 hours at 6:00 AM |
| Calendar Sync | `src/calendar-sync.js` | Pushes approved posts to Google Calendar (optional) |
| Logger | `src/logger.js` | Records every run, scores, and content for performance tracking |

---

## Outlier Scoring Formula (Sandy Lee Method)

```
YouTube:       (views in 48h ÷ channel 48h average) × 100
Reddit:        (upvotes in 48h ÷ subreddit 48h average) × 100
Google Trends: breakout percentage score (provided natively by the API)
Web Search:    Claude relevance + recency score (0–100)
```

**Thresholds:**
- `> 150` = Monitoring (log, skip generation)
- `> 300` = Generate content — standard priority
- `> 500` = Generate content — high priority, top of brief
- `> 700` = URGENT — flag as "publish today" alert to Andres

**Relevance filter:** Topics below 60% relevance are dropped. A topic passes if it relates to small business, operations, workflow, automation, digital tools, or bilingual business.

---

## 8 Industry Use Cases

The **Inside Out + Industry Method**: every viral topic gets matched to one of these 8 industries before content is generated. The result is viral-formatted content specific to a real customer situation — not a generic business post.

| Industry | Primary Pillar | Viral Topic Categories |
|---|---|---|
| Restaurants & Food Service | Digital Transformation | Health inspection tech · Supplier automation · Menu digitization |
| Retail & Boutiques | Digital Transformation | Inventory AI · Paperless POS · Small business ops tools |
| Construction & Contracting | Work Smarter | Job site apps · Contractor billing automation · Mobile workforce tools |
| Health & Wellness | Digital Transformation | HIPAA tech · Patient experience · Healthcare admin automation |
| Real Estate & Property Mgmt | Work Smarter | Property management apps · Landlord automation · Lease management |
| Professional Services | Work Smarter | CPA automation · Legal tech for small firms · Document AI |
| Salons & Beauty | Owner Stories | Client retention tools · Appointment tech · Beauty business growth |
| Logistics & Delivery | Work Smarter | Delivery proof tech · Driver management · Last-mile automation |

---

## Content Generation Rules

### Master System Prompt (inject into every Claude API call)
```
You are the content strategist and bilingual ghostwriter for Andres Ramirez, founder of ValuConnect Solutions.
ValuConnect helps small businesses go from paper-based, manual operations to fully digital, automated workflows.
Services: paper-to-digital conversion, document scanning, digital filing, workflow automation, project tracking, AI communication.
Brand mascot: Valu — symbolizing innovation, clarity, and the future.
Tone: warm, practical, empathetic. Never corporate. Never jargon-heavy.
Audience: small business owners, especially Latino/Hispanic entrepreneurs and bilingual communities.
Always write as Andres — first person, personal, like a trusted advisor.
For every post: provide English version first, then natural conversational Spanish (not formal translation).
Reference the industry use case data provided — use real pain points, solutions, and results in the content.
```

### Platform Format Rules

| Platform | Format Rule |
|---|---|
| LinkedIn — story | 150–220 words · Hook → pain → insight → result → CTA · 4-5 hashtags max |
| LinkedIn — list | Numbered 5-7 items · Each starts with action verb · "Save this" CTA |
| Instagram caption | First line = hook (under 15 words) · 6-8 hashtags incl. #NegocioLatino |
| Instagram carousel | 7 slides: cover + 5 insights + CTA · Slide titles 5 words max · One idea per slide |
| Facebook | 100-200 words · Warmer tone · EN section then ES section · 0-2 hashtags |
| TikTok script | 30-45 seconds spoken · Hook in first 2 seconds · Short punchy sentences · On-screen text 6 words max |

### Content Generated Per Topic (per platform)
- **LinkedIn:** Story post (EN + ES) · List post (EN) · Win post if client result applies
- **Instagram:** Reel script (EN + ES) · Carousel slide outline (7 slides) · Caption (EN + ES) · 6-8 hashtags
- **Facebook:** Bilingual community post · Engagement question variation
- **TikTok:** Video script 30-45s · Spanish hook + CTA alternative · 4 on-screen text overlays · 2 A/B hook options

---

## Posting Schedule

| Platform | Frequency | Best Days | Priority |
|---|---|---|---|
| LinkedIn | 3x/week | Mon · Wed · Fri | Primary — monetization + B2B leads |
| Instagram | 4x/week | Mon · Tue · Thu · Sat | Primary — visual brand + community |
| Facebook | 2x/week | Wed · Sun | Secondary — bilingual community |
| TikTok | 2x/week | Tue · Fri | Secondary — viral reach + awareness |

---

## API Keys Required

| Service | Used For |
|---|---|
| Anthropic Claude API | Content generation + relevance scoring + industry matching |
| YouTube Data API v3 | Trend scanning — video performance data |
| Reddit API | Trending posts in small business subreddits |
| Google Trends (pytrends) | Breakout search query detection — no key needed |
| Google Calendar API | Publishing schedule sync (optional) |
| SendGrid | Email delivery of daily brief (optional) |

Copy `.env.example` to `.env` and fill in all keys before running.

---

## Build Order (from blueprint Section 10.1)

Follow this sequence — each step is independently testable:

1. Project scaffold (complete)
2. `src/logger.js` — append-only JSONL logger
3. `src/trend-scanner.js` — YouTube API only first
4. `src/outlier-engine.js` — scoring formula on YouTube results
5. Expand `src/trend-scanner.js` — add Reddit + Google Trends
6. `src/industry-matcher.js` — Claude API maps topic to industry (**key differentiator**)
7. `src/brand-context.js` — load brand.json, return system prompt string
8. `src/content-generator.js` — LinkedIn only first, hardcoded topic test
9. Expand `src/content-generator.js` — add Instagram, Facebook, TikTok
10. `src/package-builder.js` — assemble all outputs into package.md
11. `scheduler.js` — node-cron, test 1-min interval first
12. `src/calendar-sync.js` — Google Calendar push (optional)
13. Add SendGrid/Slack notification in package-builder.js
14. `website/use-cases/` — 8 static HTML pages from industries.json
15. Full end-to-end test: `node run.js`
16. Deploy: `pm2 start scheduler.js --name vcie`

---

## Claude API Model

Use `claude-sonnet-4-6` as the default model for content generation and industry matching. For complex relevance scoring where quality matters more than speed, `claude-opus-4-7` can be used selectively.

---

## Website Architecture

8 industry pages under `/industries/[slug]` — each follows this exact structure:
1. Hero banner: industry name + one-sentence pain point headline
2. The situation: 3-paragraph "before ValuConnect" story (second person)
3. Pain points: 4 cards with icon + short label
4. ValuConnect solutions: matching 4 cards with teal accent
5. Results achieved: 4 metric chips in navy/gold
6. Client quote: full-width quote block with attribution
7. CTA: "Book your free 30-minute workflow assessment"
8. Related industries: 3 other industry cards at the bottom

**SEO:** Each page targets long-tail bilingual keywords, e.g.:
- "how to digitize restaurant records" / "como digitalizar facturas de restaurante"
- "workflow automation for small contractors" / "automatización para contratistas pequeños"

---

## Output File Format

Every 48-hour run produces these files in `outputs/YYYY-MM-DD/`:
- `trends.json` — scored topic list
- `industry-matches.json` — topic → industry mapping
- `content.json` — all generated posts
- `package.md` — Andres's daily brief (ready to review)
