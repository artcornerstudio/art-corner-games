# Football IQ Coach (Cloudflare Worker)

A tiny proxy that lets the static Football IQ app ask Claude one short,
kid-safe question about the play on screen. The Worker holds the Anthropic
API key; the browser never sees it and never sends free text to the model.

- `POST /coach` with `{ question, context }` returns `{ answer }`.
- `question` is one of `what-happens`, `why-it-works`, `who-is-open`,
  `what-beats-it`, `explain-position`, `explain-result`. Anything else is a 400.
- `context` carries the play facts the app already has (name, type,
  description, why it works, both formations, optional position, situation,
  outcome, and the kid's age band). Every string is capped at 600 characters
  and unknown fields are rejected.
- The prompt is built here from those facts. The system prompt makes Coach
  answer only from the facts, in 2 to 4 plain sentences, with no real players,
  teams, gambling, or injuries, and no questions back to the kid.
- Model: see `MODEL_ID` in `src/index.ts` (one constant).
- Basic per-IP rate limit (30 requests per minute, in memory) and a 15 second
  model timeout.

## Deploy

```bash
cd coach
npm install
npx wrangler login                          # first time only
npx wrangler secret put ANTHROPIC_API_KEY   # paste your key; it is stored by Cloudflare, never in git
npx wrangler deploy
```

`wrangler deploy` prints the Worker URL, e.g. `https://football-iq-coach.<you>.workers.dev`.

Then build the app with that URL:

```bash
cd ..
VITE_COACH_URL=https://football-iq-coach.<you>.workers.dev npm run build
```

For GitHub Pages, add `VITE_COACH_URL` as a repository variable and pass it to
the build step in `.github/workflows/`. Without it the app still works: the
"Ask Coach" card answers from built-in templates and shows "Offline coach".

## Restrict who can call it

By default `ALLOWED_ORIGIN` is `*` so local dev works. Before going live, lock
it to your Pages origin (scheme + host, no path):

```toml
# wrangler.toml
[vars]
ALLOWED_ORIGIN = "https://your-user.github.io"
```

or from the CLI without editing the file:

```bash
npx wrangler deploy --var ALLOWED_ORIGIN:https://your-user.github.io
```

With a specific origin set, browser requests from any other site get a 403 and
the CORS headers only allow that origin.

## Local dev

```bash
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .dev.vars   # gitignored
npx wrangler dev                                 # http://localhost:8787
```

Then run the app with `VITE_COACH_URL=http://localhost:8787 npm run dev`.

## Try it

```bash
curl -s http://localhost:8787/coach -H 'Content-Type: application/json' -d '{
  "question": "why-it-works",
  "context": {
    "playName": "Slant Flat", "playType": "pass",
    "description": "The outside receiver runs a quick slant while the back runs to the flat.",
    "why": "One defender has to pick: the slant or the flat. The quarterback throws to the one he leaves.",
    "offense": { "name": "Spread", "description": "Four receivers spread out wide." },
    "defense": { "name": "Cover 3", "description": "Three deep defenders, four underneath." },
    "ageBand": "8-10"
  }
}'
```
