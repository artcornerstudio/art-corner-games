# Gridiron IQ — Youth Football Learning Game PRD

Status: draft for review · As of 2026-09-20
Living review copy (comment and edit there): https://claude.ai/code/artifact/65fb7a0a-8990-4b07-881e-b7d52b78c61c

## Executive summary

Gridiron IQ is a browser game that teaches kids aged 8 to 16 how football works: positions, formations, plays, rules, and the reasoning behind them. Phase 1 is a small "Playbook Lab" web app that a child can finish in one sitting: animated play diagrams, a call-the-play mini game, and short quizzes with badges. Later phases add defensive reads, special teams, a play designer, and an AI coach.

- Working title: Gridiron IQ (placeholder)
- Platform: web first (phone, tablet, laptop), installable as a PWA
- Build approach: React + TypeScript with a Konva canvas for the field, all content in JSON; Phaser 4 added in Phase 2 for the playable sim
- Quick win target: Phase 1 playable in 2 to 3 weeks of part-time work
- Cost: zero for Phase 1 (free hosting, CC0 assets, no accounts, no backend)

Research found strong open-source building blocks for the field, play diagrams, and football data, but no existing open-source game that teaches fundamentals to kids. That gap is the opportunity.

## Vision, audience, and learning goals

A kid who has never watched a full game should be able to explain what each player does, read a basic play diagram, and call a sensible play after two or three sessions.

| Segment | Age | What they need | Design response |
| --- | --- | --- | --- |
| Curious beginners | 8 to 11 | Big icons, short text, animation over reading, instant feedback | 3 to 5 minute lessons, tap to play |
| Youth players | 10 to 14 | Position-specific detail, playbook vocabulary, why a play works | Position tracks, play-call scenarios, coach-style explanations |
| Older fans and flag players | 13 to 16 | Coverages, blitzes, situational football | Harder tiers, timed challenges, play designer |
| Parents and coaches | adult | Safe, ad-free, assignable | No accounts, no chat, printable play cards, progress summary |

| Unit | Kid can... |
| --- | --- |
| Field and rules | Name the parts of the field, explain downs and distance, scoring, and common penalties |
| Offense | Identify the 11 offensive positions, read O's, name 4 base formations, tell run from pass, know 6 basic routes |
| Defense | Identify the 11 defensive positions, read X's, 4-3 vs 3-4, man vs zone, spot a blitz |
| Special teams | Explain kickoff, punt, field goal, PAT and 2-point tries |
| Situational football | Choose a reasonable play given down, distance, clock, and score |
| Play design | Draw a legal formation and a play that beats a given defense |

Principles: show then ask; short loops under 5 minutes; visible progress (badges, a Playbook that fills in); safe by default (nothing leaves the device in Phase 1); content is data (JSON).

## Research: existing open-source football games, sims, and playbook tools

No open-source game teaches football fundamentals to kids. Closest projects:

| Project | Stack | License | What it has | Reuse |
| --- | --- | --- | --- | --- |
| [PlayForge](https://github.com/Patrickwesha/PlayForge) | Next.js, TS, SVG, IndexedDB | none | Formation library, curved routes with control points, block presets, motion, PNG/JSON export | Closest technical match; ask author for a license, else mirror the data model |
| [football-os](https://github.com/HoodieJav13/football-os) | Vite, canvas | none | Yard coordinates, offense and defense assignments (routes, blocking, zone/man), pre/post-snap animation, 48 real plays | Best data-model reference |
| [HardWorkIQ](https://github.com/johnd-commits/football) | JS PWA, Supabase | none | Trace-your-assignment trainer with points and streaks | Closest to our learning loop |
| [flag-football-plays](https://github.com/bsoeder/flag-football-plays) | Vanilla JS PWA | none | 5v5 youth playbook in one JSON file, kid-level concept taxonomy | Schema to copy in spirit |
| [playbook-creator](https://github.com/obraunsdorf/playbook-creator) | C++ Qt | GPL-3.0 | Most mature designer, PDF wrist-coach export | UX reference only |
| [football-play-simulator](https://github.com/jbullfrog81/football-play-simulator) | Go | MIT | Formation, routes, animation, PDF | Route-animation timing reference |
| [Fluent in Football](https://github.com/natebking/football-companion) | static JS | MIT | Beginner mode with plain-language explanations and tap-to-define terms | Reusable glossary pattern and code |
| [Football GM (zengm)](https://github.com/zengm-games/zengm) | TS | source-available, not open source | Tested play-by-play engine with formations, plays, penalties | Design reference; never copy code |
| [Statis-Pro-Football](https://github.com/RichardScottOZ/Statis-Pro-Football) | Python + React | none | Card-and-table outcome model | Transparent outcome model kids could understand |
| [TochoTactics](https://github.com/Dylntsu/TochoTactics), [Spellbound Gridiron](https://github.com/EdwardAThomson/Spellbound-Gridiron), [GridIronRoad](https://github.com/coleyadron/GridIronRoad) (MIT), [footballcoach](https://github.com/jonesguy14/footballcoach) (CC-BY) | various | mixed | Games and sims | Reference |

Avoid the 3kho/retro-bowl fork family (re-hosted commercial build, not open source). No open engine resolves a play from drawn alignments; the Phase 2 resolver is a small rules table we build.

## Research: APIs, data, MCP servers, and libraries

No open dataset of formations, routes, or plays exists; the play JSON is content we author. Everything else exists under permissive licenses.

| Name | Type | License | Use for us |
| --- | --- | --- | --- |
| [nflreadpy](https://github.com/nflverse/nflreadpy) | Python data loader (nflverse) | MIT code, CC-BY 4.0 data | Offline pipeline: real formation frequencies, rosters for quiz questions |
| [nflverse-data](https://github.com/nflverse/nflverse-data) | CSV/parquet releases | CC-BY 4.0 | Node-based pipeline alternative |
| [Big Data Bowl tracking data](https://www.kaggle.com/competitions/nfl-big-data-bowl-2025) | Dataset | Kaggle terms, likely non-commercial | Use its frame schema now; real plays later if licensing clears |
| [nfl-mcp](https://github.com/ebhattad/nfl-mcp) | MCP server | MIT | Dev-time content authoring with Claude |
| [Phaser Editor MCP](https://github.com/phaserjs/editor-mcp-server) | MCP server | official | Optional Phase 2 accelerator |
| [sportypy](https://github.com/sportsdataverse/sportypy) | Python field plotting | GPL-3.0 | Field renders for content; tooling only |
| [Konva / react-konva](https://konvajs.org/) | JS canvas scene graph | MIT | Field, play viewer, later play designer |
| [Phaser 4](https://github.com/phaserjs/phaser) | Game framework, v4.2.1 | MIT | Phase 2 playable sim |
| [KAPLAY](https://github.com/kaplayjs/kaplay) | Game lib | MIT | Prototypes |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | Spaced repetition | MIT | Review missed terms, Phase 2 |
| [h5p-standalone](https://github.com/tunapanda/h5p-standalone) | Quiz player | MIT | Fallback for quiz widgets |
| [Wikipedia glossary](https://en.wikipedia.org/wiki/Glossary_of_American_football_terms) | Content | CC BY-SA 4.0 | Glossary seed with attribution |
| [NFL Football Operations](https://operations.nfl.com/rules-officiating/nfl-football-basics/formations), [USA Football FDM](https://fdm.usafootball.com/), [NFL FLAG in Schools](https://nflflag.com/school) | Content | copyrighted | Accuracy and age-progression reference only |
| ESPN hidden API, API-Sports, BALLDONTLIE, SportsDataIO | Live data APIs | free tiers to paid | Not needed before Phase 4 |

AI pattern: draft quiz questions with the Claude API into a fixed JSON schema, human-reviewed. No runtime AI in Phase 1.

## Research: engines, learning-game patterns, comparables, connectors

| Option | Version (Sep 2026) | License | Fit |
| --- | --- | --- | --- |
| Phaser 4 | 4.2.1 | MIT | Best full engine; Phase 2 |
| KAPLAY | 3001 stable, v4000 alpha | MIT | Prototypes only |
| PixiJS | 8.21 | MIT | Renderer only, more plumbing |
| Excalibur | 0.32, no release since Dec 2024 | BSD-2 | Weak bet |
| Godot 4 web export | 4.6 | MIT | Too heavy for a Chromebook page |
| React + canvas/SVG | browser APIs | n/a | Best for Phase 1 |
| GDevelop / Construct 3 | 5.6 / SaaS | MIT / proprietary | Fast prototype, poor fit for a JSON curriculum |

Learning patterns adopted: short modular sessions with explanatory feedback (Heliyon 2024); pre-train names, segment, signal (Mayer); same skill in three modes; visible progress; gentle streaks with no guilt (Duolingo); a stage for every age (USA Football FDM).

Comparables: Madden 26 Skills Trainer (controller mastery, ~$70), Retro Bowl (no instruction), Playmaker X ($5 to $9/mo, coach play cards), Hudl Play Tools ($199/yr add-on), Football 101 (free, adult text), See the Field. Nothing is kid-first, curriculum-driven, gamified, and free with no data collection.

Our connectors: GitHub (repo, Pages, JSON schema CI), Claude Docs (this PRD), Claude API offline (quiz drafts), OpenArt (Phase 2 art), Canva (Phase 2 printable play cards), Google Drive (test-session notes), Artifacts (throwaway prototypes).

Assets: Kenney Sports Pack and UI Pack (CC0), OpenGameArt American Football Assets (CC-BY 3.0), itch.io free football tag, Freesound (skip non-commercial sounds).

## Recommended tech stack

| Layer | Choice |
| --- | --- |
| Language and build | TypeScript, Vite |
| UI | React (quizzes, menus, badges as real DOM) |
| Field and diagrams | react-konva |
| Playable sim (Phase 2) | Phaser 4 |
| Content | JSON validated by a schema in CI |
| Progress | localStorage, later IndexedDB via Dexie |
| Hosting | GitHub Pages or Cloudflare Pages, PWA |
| Content pipeline (dev only) | Python: nflreadpy, sportypy, Claude API |
| Testing | Vitest, Playwright smoke run on a phone viewport |

Play JSON uses a frame-based shape (play, frame, player, x, y) so real tracking data can drop in later.

## Phase 1: Playbook Lab (quick-win MVP)

In scope:
1. Home screen with three unit cards and a badge shelf
2. Animated top-down field; tap any player for name and job
3. 12 lessons (4 per unit) from JSON: diagram, animation steps, kid-language explanation
4. Play library: 8 offensive plays across 4 formations, 4 defensive fronts
5. Mini game A, Call the Play: situation card plus 3 choices, animated result, one-line reason
6. Mini game B, Spot the Position: tap the named position, 10 rounds
7. Quizzes: 5 questions per lesson, 80 percent unlocks the badge
8. Progress in localStorage with a reset button
9. Rookie and Varsity tiers
10. Phone, tablet, laptop; PWA; offline after first load

Out of scope: accounts, leaderboards, multiplayer, chat, full sim with scores, play designer, special teams (Phase 2), voice narration.

Acceptance criteria:
- [ ] First-time user reaches an animated play in under 30 seconds with no instructions
- [ ] All lessons, plays, and 60 quiz questions load from JSON
- [ ] Both mini games completable with touch on a 375 px screen
- [ ] Badges persist across browser restarts
- [ ] Lighthouse Performance and Accessibility 90 or better on mobile
- [ ] Zero network requests after first load; no third-party scripts
- [ ] Five kids in the age range each earn one badge unassisted in 15 minutes

Build plan: week 1 scaffold, field renderer, play schema, 2 plays, home screen; week 2 all lessons and plays, quiz engine, badges; week 3 mini games, Varsity tier, PWA, kid test, deploy.

## Phases 2 to 4

| Phase | Theme | Headline features | New tech | Effort |
| --- | --- | --- | --- | --- |
| 2 | Reads and decisions | Coverage lessons, blitz recognition, special teams unit, Fourth-Down Decision game, simple play-outcome engine, Pro tier, sound and art | Rule-based play resolver, OpenArt, Canva play cards | 3 to 4 weeks |
| 3 | Create and coach | Play Designer with legality checks, Drive Simulator vs AI defense, AI Coach explanations, optional real-play replays | Konva editor, Claude API behind a serverless function, nflverse pipeline | 4 to 6 weeks |
| 4 | Play together | Season lite, position deep dives, coach dashboard, share a playbook by link or QR, optional cloud save with parental consent | Supabase or Cloudflare D1, COPPA consent flow, PDF export | 6 to 8 weeks |

Gate between phases: real kids have played, badge completion above 60 percent, top two feedback items fixed.

## Curriculum map

| Phase | Unit | Lessons | Mini game | Badge |
| --- | --- | --- | --- | --- |
| 1 | Field and rules | Field and yard lines; downs and distance; scoring; 5 penalties | Down-and-distance picker | Rules Rookie |
| 1 | Offense basics | 11 positions; O's and the line; 4 formations; run vs pass; 6 routes | Call the Play | Offense Starter |
| 1 | Defense basics | 11 positions; X's; 4-3 vs 3-4; man vs zone | Spot the Position | Defense Starter |
| 2 | Defense reads | Cover 1/2/3; blitz; gap responsibility | Beat the Coverage | Coverage Reader |
| 2 | Offense depth | Full route tree; play action; screens; zone vs power; reading a blitz | Hot Read | Play Caller |
| 2 | Special teams | Kickoff, punt, FG and PAT, 2-point, onside | Fourth-Down Decision | Special Teams Captain |
| 3 | Situational football | Clock, 2-minute drill, red zone, goal line | Drive Simulator | Drive Master |
| 3 | Play designer | Draw formations and routes; legality checks | Design a play, test vs 3 defenses | Playbook Author |
| 4 | Position deep dives | QB reads, OL footwork, WR releases, DB technique, LB keys | Timed position drills | Position Specialist |
| 4 | Coach mode | Game plan a quarter; tendency chart; adjustments | Season lite, 4 games | Head Coach |

## Non-functional requirements

Safety and COPPA: Phase 1 collects no personal information (no accounts, chat, analytics, or ad scripts; progress on device only). Post a privacy notice anyway. Parental gate for the parents area. Neutral age screen and verifiable parental consent only when cloud save arrives (Phase 4). No league marks; fictional teams. Sources: [FTC six-step plan](https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business), [2025 COPPA rule](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule).

Accessibility: 44 px touch targets; never color alone (O vs X plus labels, Okabe-Ito palette); 18 px body text, 4.5:1 contrast, readable open font; keyboard-operable quizzes; no time pressure by default; captions, no flashing, pause anywhere.

Performance: first load under 2 MB, interactive under 3 seconds on a Chromebook; offline via service worker; last two versions of major browsers; 375 px and up.

Content quality: facts checked against NFL Football Operations; a football-literate adult reviews AI-drafted content; JSON schema check in CI.

## Risks and decisions needed

Risks: building a sim instead of a teacher (mitigated by phase gates); content authoring slower than code (spreadsheet plus Claude drafts, human review); kids find X's and O's boring (motion first, mini games before quizzes); trademark exposure (fictional teams); COPPA later (collect nothing now); solo bandwidth (ship weekly, cut features not the ship).

Decisions needed:
- [ ] Name: keep Gridiron IQ or pick another
- [ ] Phase 1 age focus (recommend write for 10 to 12, tier up and down)
- [ ] Art style: flat X's and O's with icons vs simple character sprites
- [ ] Tackle only, or include flag football variants
- [ ] Public or private repo
- [ ] Approve Phase 1 scope or mark items to cut

Open questions: access to a test group of kids; coaches as a Phase 1 audience (Canva play cards) or Phase 2; a real team playbook to mirror.

## Sources

See the linked review doc for the full source list with links to every project, dataset, API, MCP server, library, design paper, comparable product, compliance page, and asset pack cited above.
