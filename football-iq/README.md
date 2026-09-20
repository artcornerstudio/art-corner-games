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
| `src/content/schema/` | JSON Schemas that CI checks every content file against |
| `src/field/` | Field drawing, play animation math, the Konva play viewer |
| `src/screens/` | Home and Play Lab screens (plain React) |

## Adding a play

1. Copy a file in `src/content/plays/` and give it a new `id` and `name`.
2. Pick an offense `formationId` and a `defenseFormationId` with the same `variant`.
3. Give every player on both sides one assignment. Paths are waypoints in yards,
   with the ball at `(0, 0)` on the line of scrimmage, `x` to the offense's right,
   `y` downfield. A player with nothing to do gets `"kind": "stay"` and an empty path.
4. Describe the ball: who snaps it (`start`), then each handoff or throw with its time in seconds.
5. Run `npm run validate`. It tells you exactly what is missing.

## Content rules

- Kid language: short sentences, no jargon without a one-line explanation.
- Fictional teams only. No league, team, or player names or logos.
- Nothing leaves the device: no analytics, no accounts, no third-party scripts.
