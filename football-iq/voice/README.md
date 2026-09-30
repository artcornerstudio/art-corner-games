# Coach voice

Tools for choosing and, later, recording the coach voice for read-aloud.

## Audition

`audition.py` renders the three lines in `lines.json` in several free male
voices so a person can pick one by ear.

| Engine | Voices | License |
| --- | --- | --- |
| Kokoro | Michael, Adam, Eric, Liam, Onyx, Fenrir | Model is Apache-2.0 |
| Piper | Ryan, Joe | Check each voice's own license before shipping |

Run it on GitHub, where the models can be downloaded: Actions tab, **Voice
audition**, **Run workflow**. When it finishes, open the run and download the
**voice-audition** artifact. It holds the clips and a small `index.html`.

To check the plumbing on any machine without models (tones instead of speech):

```
FFMPEG=/path/to/ffmpeg python football-iq/voice/audition.py --out /tmp/audition --dry-run
```

## After a voice is chosen

The plan is to record every fixed line once with the chosen voice and ship the
clips with the game, falling back to the device voice for lines that change
during play. That keeps everything on the device.
