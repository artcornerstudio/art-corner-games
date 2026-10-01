# Coach Eric's voice

Spread Out! reads its coach lines out loud in **Coach Eric's** voice, the same
recorded coach that Football IQ uses. Every fixed sentence the coach can say is
recorded once and shipped with the game as a tiny MP3 clip in this folder.
Anything that is not recorded (a kid's name, a brand-new line) falls back to the
voice built into the phone or computer.

**The voice:** Kokoro `am_eric` (Kokoro-82M, Apache-2.0). It is recorded on
GitHub's computers, not on a phone, so playing the game never contacts any
outside service.

## What is in this folder

| File | What it is |
| --- | --- |
| `units.json` | The list of sentences to record, each with a short id made from its words |
| `manifest.json` | The list of ids that actually have a clip (written by the recorder) |
| `<id>.mp3` | One recorded sentence (about 15 KB each) |
| `extract-units.mjs` | Rebuilds `units.json` by asking the game for every line it can say |
| `coverage.mjs` | Plays through every game mode and reports lines that would still use the device voice |

The recorder itself is shared with Football IQ: `football-iq/voice/render_clips.py`.

## How the game uses it

1. On load the game fetches `voice/manifest.json` to learn which clips exist.
2. When the coach speaks, the line is split into sentences, and each sentence's
   id is looked up. If **every** sentence has a clip, the clips play in order
   in Eric's voice. If any is missing, the whole line uses the device voice,
   so one line is never read by two different voices.
3. Clips are fetched once and cached by the service worker, so after a kid has
   heard a line it also works with no internet.

## Adding or changing a coach line

1. Edit the line in `spread-out/index.html` (the `SAY` table, `TIPS`, or `ZONES`).
2. From the repository root run `node spread-out/voice/extract-units.mjs`
   (needs `npm ci` in `football-iq` once, for the headless browser). Commit the
   new `units.json`.
3. Push the branch, then on GitHub: Actions tab, **Voice clips**,
   **Run workflow**, choose that branch and set the game to **spread-out**.
   It records only the sentences that have no clip yet and commits the clips
   to the same branch (it refuses to run on main).
4. Merge the branch through a pull request as usual. The site deploy picks the
   clips up automatically.

Because ids come from the words, an edited sentence simply gets a new clip and
the old one is ignored.

## Checking coverage

```
node spread-out/voice/coverage.mjs
```

It serves the game locally, stands in a silent clip for every id in
`units.json`, plays all four modes with a robot kid, taps the Read aloud
buttons, and prints every sentence that would fall back to the device voice.
The only expected fallbacks are lines with a player's name in them.
