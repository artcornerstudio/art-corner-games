# Coach voice

The game reads lessons, questions, and feedback out loud. The fixed lines are
recorded once with one voice and shipped with the game. Anything else falls
back to the device's own voice.

**The voice:** Kokoro `am_eric` (Kokoro-82M, Apache-2.0), chosen by ear from
the audition below.

## How it fits together

| Piece | What it does |
| --- | --- |
| `src/speech/units.ts` | Splits a spoken line into sentences and gives each one a stable id from a hash of its text |
| `scripts/extract-voice-units.ts` | Lists every sentence the game can say from fixed content, into `voice/units.json` |
| `voice/extra-lines.json` | Sentences the game says that are not in the content files, added by hand |
| `voice/render_clips.py` | Records each sentence in `units.json` as `public/voice/<id>.mp3`, and writes `manifest.json` |
| `.github/workflows/voice-clips.yml` | Runs the recording on GitHub in six parallel slices and puts the clips on the `voice-clips` branch |
| `src/speech/clips.ts` | Plays a line's clips in order in the browser, with offline caching through the service worker |

A line is spoken in the coach voice only when **every** sentence in it has a
clip. Otherwise the whole line uses the device voice, so one line is never
read by two different voices. A missing or broken clip also falls back.

## Recording the clips

1. `npm run voice:units` after changing lesson text or adding spoken lines.
   Commit `voice/units.json`. A unit test fails until you do.
2. On GitHub: Actions tab, **Voice clips**, **Run workflow**. It records only
   sentences that have no clip yet, then pushes the `voice-clips` branch.
   It never touches `main` and never deploys.
3. Open a pull request from `voice-clips` into `main` and merge it.

Because ids come from the text, an edited sentence simply gets a new clip and
the old one is ignored.

## Checking coverage

```
npm run build && npx vite preview --port 4173 &
npm run voice:coverage
```

This plays every lesson and every game with the sentence list loaded and
lists any spoken sentence that has no clip. It uses silent stand-in audio, so
it checks coverage, not sound. Add what it lists to `extra-lines.json`, or fix
the number ranges in the extraction script. Text written live by the AI Coach
is expected to use the device voice.

## The audition

`audition.py` and the **Voice audition** workflow render three real lines in
several free voices so a person can choose by ear. Run it again to compare
new voices. To check the plumbing on any machine without models:

```
FFMPEG=/path/to/ffmpeg python football-iq/voice/audition.py --out /tmp/audition --dry-run
```
