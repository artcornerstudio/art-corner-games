# Football IQ: Flag and Field

A browser game that teaches kids aged 8 to 16 the X's and O's of football:
positions, formations, plays, and rules. Tackle 11-on-11 and flag 5v5 and 7v7.

Product requirements: [docs/PRD-football-iq.md](../docs/PRD-football-iq.md).

## Run it

```bash
cd football-iq
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck + content validation + unit tests
npm run build      # production build in dist/
```

## How the app is put together

| Folder | What lives there |
| --- | --- |
| `src/content/formations/` | One JSON file per formation (offense or defense) |
| `src/content/plays/` | One JSON file per play: who goes where, and where the ball goes |
| `src/content/positions.json` | Every position code with a kid-language job description |
| `src/content/lessons/` | One JSON file per lesson: steps with diagrams, then a 5-question quiz |
| `src/content/units.json` | The three units and their badges |
| `src/content/schema/` | JSON Schemas that CI checks every content file against |
| `src/field/` | Field drawing, play animation math, the Konva play viewer |
| `src/screens/` | Home, unit, lesson, quiz, and Play Lab screens (plain React) |
| `src/progress.ts` | Progress and badges, saved in localStorage only |
| `src/speech/` | Read-aloud: recorded coach clips for fixed lines, the browser's speech engine for the rest |
| `voice/` | The sentence list, the clip recorder, and the voice audition |

## Adding a play

1. Copy a file in `src/content/plays/` and give it a new `id` and `name`.
2. Pick an offense `formationId` and a `defenseFormationId` with the same `variant`.
3. Give every player on both sides one assignment. Paths are waypoints in yards,
   with the ball at `(0, 0)` on the line of scrimmage, `x` to the offense's right,
   `y` downfield. A player with nothing to do gets `"kind": "stay"` and an empty path.
4. Describe the ball: who snaps it (`start`), then each handoff or throw with its time in seconds.
5. Run `npm run validate`. It tells you exactly what is missing.

## Adding a lesson

1. Copy a file in `src/content/lessons/` and set `id`, `unitId`, `order`, `title`, and `summary`.
2. Write 2 to 8 steps. Each step is one short paragraph and can show a `diagram`:
   a `playId` (animated) or a `formationId` (still), plus optional `highlight` player ids.
3. Write exactly 5 quiz questions. `choice` questions have 3 or 4 choices and an `answer` index.
   `tap` questions show a diagram and name the `target` player id the kid must tap.
4. Every question has a one-line `explanation` shown after the answer, right or wrong.
5. Run `npm run validate`.

## AI Coach

The "Ask Coach" card lets a kid tap a question about the play on screen
("What happens?", "Why does it work?", "Who is open?", "What beats it?",
"What does this position do?", "What happened?") and get a two-to-four
sentence answer from Coach, a friendly youth football coach voiced by Claude.

It is optional. With no coach configured the card still works: answers come
from built-in templates made from the play's own description, and the card
says "Offline coach". Nothing is sent anywhere.

To turn on the live coach, deploy the tiny proxy in `coach/` (a Cloudflare
Worker that holds the API key) and point the build at it:

```bash
cd coach && npm install
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler deploy
cd .. && VITE_COACH_URL=https://football-iq-coach.<you>.workers.dev npm run build
```

See `coach/README.md` for local dev and for locking the Worker to your Pages
origin with `ALLOWED_ORIGIN`. `.env.example` lists the variable.

Safety rules, enforced in the Worker and the client:

- No free-form chat. The kid only picks from the fixed question menu; the
  browser sends a question type plus the play facts, never typed text.
- The prompt is built server-side from those facts. Unknown question types,
  extra fields, and strings over 600 characters are rejected.
- Coach answers only from the facts, in 2 to 4 plain sentences, with no
  markdown or emoji. If the facts do not cover it, Coach says so and gives one
  general football tip.
- Coach never mentions real players, teams, gambling, or injuries, and never
  asks the kid for personal information.
- No memory: every question is a fresh request. Short answers (about 200
  tokens), a 15 second timeout, and a per-IP rate limit keep costs and misuse
  small.

## Read aloud

The "Read aloud" switch on the home screen makes Coach read every lesson
step, quiz question (with the choices), game prompt, result, and position
card out loud. Every one of those also has a speaker button for a replay.

Fixed lines use a recorded male coach voice (Kokoro "Eric"), shipped as short
clips and cached for offline play. Lines written while playing, such as the
AI Coach's answers, use the device's own voice through the Web Speech API,
which needs no key or account. Nothing is sent anywhere either way. The
switch is off by default. See `voice/README.md` for how the clips are made.

## Free demo and full game

The game can be sold as a free demo plus a one-time unlock. `src/content/edition.json` says what is
free: the first unit, five rounds of Spot the Position, and four sample plays. Everything else is the
full game.

```
npm run build:editions    # builds dist-demo and dist-full, then checks the demo holds none of the paid content
```

The demo build is made without the paid lessons, situations, plays, and paid game screens (see
`vite.edition.ts`), so there is nothing in the page to unlock. `src/paywall/` holds the unlock dialog
and the calls to the server. The server that sells it, and how it is deployed, is described in
[`../spread-out-server/README.md`](../spread-out-server/README.md#football-iq-on-this-server).
`npm run build` with no edition still makes the plain, fully open game, which is what the free GitHub
Pages copy used to be.

When you add a paid lesson, nothing else is needed: units not listed in `freeUnits` are paid. Run
`npm run voice:units` after changing lesson text so the voice list marks it paid or free.

## Content rules

- Kid language: short sentences, no jargon without a one-line explanation.
- Fictional teams only. No league, team, or player names or logos.
- No analytics, no accounts for kids, no third-party scripts. In the paid edition a grown-up's checkout email is the only personal data, and the privacy page says so.
