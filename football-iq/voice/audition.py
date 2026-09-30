#!/usr/bin/env python3
"""
Render a few coach lines in several free male voices and build a listening
page, so a person can pick the voice for Football IQ by ear.

Engines (all free and open source, run on the machine that calls this):
  - Kokoro  (Apache-2.0 model, `pip install kokoro`)   needs espeak-ng
  - Piper   (`pip install piper-tts`, in its own venv)  optional

Every voice is rendered on its own inside a try block. A voice that fails is
listed on the page and in results.json instead of stopping the run.

    python football-iq/voice/audition.py --out voice-audition
    python football-iq/voice/audition.py --out /tmp/x --dry-run   # tones only, no models
"""
from __future__ import annotations

import argparse
import html
import json
import math
import os
import pathlib
import shutil
import struct
import subprocess
import sys
import tempfile
import traceback
import wave

HERE = pathlib.Path(__file__).resolve().parent
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")

# (voice id, label). Ids are Kokoro American-English male voices.
KOKORO_VOICES = [
    ("am_michael", "Michael"),
    ("am_adam", "Adam"),
    ("am_eric", "Eric"),
    ("am_liam", "Liam"),
    ("am_onyx", "Onyx"),
    ("am_fenrir", "Fenrir"),
]
# (voice name, label). Piper downloads each voice the first time it is used.
PIPER_VOICES = [
    ("en_US-ryan-high", "Ryan"),
    ("en_US-joe-medium", "Joe"),
]

KOKORO_SPEED = 0.95  # a touch slower than default, like the Rookie tier


def to_mp3(wav_path: pathlib.Path, mp3_path: pathlib.Path) -> None:
    """Loudness-match every clip so voices compare fairly, then make a small mono mp3."""
    subprocess.run(
        [
            FFMPEG, "-y", "-loglevel", "error", "-i", str(wav_path),
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "64k",
            str(mp3_path),
        ],
        check=True,
    )


def write_tone_wav(path: pathlib.Path, seconds: float, hz: float) -> None:
    rate = 24000
    frames = b"".join(
        struct.pack("<h", int(9000 * math.sin(2 * math.pi * hz * i / rate))) for i in range(int(rate * seconds))
    )
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(frames)


def render_dry(voices, lines, clips_dir, work):
    """Plumbing check with no models: one tone per line, pitch differs per voice."""
    out = []
    for n, (vid, label) in enumerate(voices):
        clips = {}
        for line in lines:
            wav = work / f"{vid}-{line['id']}.wav"
            write_tone_wav(wav, 0.6, 180 + 25 * n)
            mp3 = clips_dir / f"{vid}-{line['id']}.mp3"
            to_mp3(wav, mp3)
            clips[line["id"]] = f"clips/{mp3.name}"
        out.append({"engine": "Dry run", "voice": vid, "label": label, "clips": clips})
    return out


def render_kokoro(voices, lines, clips_dir, work):
    import numpy as np
    import soundfile as sf
    from kokoro import KPipeline

    pipeline = KPipeline(lang_code="a")  # American English
    results, failures = [], []
    for vid, label in voices:
        try:
            clips = {}
            for line in lines:
                parts = []
                for _gs, _ps, audio in pipeline(line["text"], voice=vid, speed=KOKORO_SPEED):
                    arr = audio.detach().cpu().numpy() if hasattr(audio, "detach") else np.asarray(audio)
                    parts.append(arr.astype("float32"))
                    parts.append(np.zeros(int(24000 * 0.12), dtype="float32"))  # short breath between sentences
                if not parts:
                    raise RuntimeError("no audio produced")
                wav = work / f"{vid}-{line['id']}.wav"
                sf.write(str(wav), np.concatenate(parts), 24000)
                mp3 = clips_dir / f"{vid}-{line['id']}.mp3"
                to_mp3(wav, mp3)
                clips[line["id"]] = f"clips/{mp3.name}"
            results.append({"engine": "Kokoro", "voice": vid, "label": label, "clips": clips})
        except Exception as exc:  # noqa: BLE001 - keep going, report at the end
            traceback.print_exc()
            failures.append({"engine": "Kokoro", "voice": vid, "error": f"{type(exc).__name__}: {exc}"})
    return results, failures


def render_piper(voices, lines, clips_dir, work, piper_python):
    results, failures = [], []
    model_dir = work / "piper-models"
    model_dir.mkdir(exist_ok=True)
    for name, label in voices:
        try:
            # Both commands run inside model_dir, which is where Piper downloads to and looks first.
            subprocess.run([piper_python, "-m", "piper.download_voices", name], cwd=model_dir, check=True)
            clips = {}
            for line in lines:
                wav = work / f"{name}-{line['id']}.wav"
                subprocess.run(
                    [piper_python, "-m", "piper", "-m", name, "--data-dir", str(model_dir), "-f", str(wav)],
                    input=line["text"], text=True, cwd=model_dir, check=True,
                )
                mp3 = clips_dir / f"{name}-{line['id']}.mp3"
                to_mp3(wav, mp3)
                clips[line["id"]] = f"clips/{mp3.name}"
            results.append({"engine": "Piper", "voice": name, "label": label, "clips": clips})
        except Exception as exc:  # noqa: BLE001
            traceback.print_exc()
            failures.append({"engine": "Piper", "voice": name, "error": f"{type(exc).__name__}: {exc}"})
    return results, failures


PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Coach voice audition</title>
<style>
  :root { --bg:#f6f7f4; --card:#fff; --ink:#1d2320; --muted:#5a6357; --line:#dfe3da; --green:#1b5e20; --gold:#e69f00; }
  @media (prefers-color-scheme: dark) { :root { --bg:#131612; --card:#1c211b; --ink:#f1f3ee; --muted:#a9b1a3; --line:#2f362d; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:17px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 20px 16px 60px; }
  h1 { margin: 0 0 6px; font-size: 1.9rem; }
  h2 { margin: 28px 0 8px; font-size: 1.15rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
  p { margin: 0 0 12px; }
  .lede { color: var(--muted); }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 16px; margin: 0 0 14px; }
  .card h3 { margin: 0 0 2px; font-size: 1.25rem; }
  .id { color: var(--muted); font-size: .9rem; margin: 0 0 10px; }
  .clip { margin: 12px 0 0; }
  .clip b { display: block; }
  .clip small { display: block; color: var(--muted); margin: 2px 0 6px; }
  audio { width: 100%; height: 44px; }
  .fail { border-color: var(--gold); }
  code { font-size: .9em; }
</style>
</head>
<body>
<main>
  <h1>Coach voice audition</h1>
  <p class="lede">Each voice reads the same three lines from the game. Listen on the iPad you will use, then tell Claude the voice names you like best, for example &ldquo;Michael and Onyx&rdquo;. Judge clarity first: could a 10 year old follow every word?</p>
{{CARDS}}
{{FAILED}}
</main>
</body>
</html>
"""


def build_page(results, failures, lines, out_dir: pathlib.Path) -> None:
    cards = []
    for engine in dict.fromkeys(r["engine"] for r in results):
        cards.append(f"  <h2>{html.escape(engine)} voices</h2>")
        for r in [x for x in results if x["engine"] == engine]:
            clips = []
            for line in lines:
                src = r["clips"][line["id"]]
                clips.append(
                    f'    <div class="clip"><b>{html.escape(line["title"])}</b>'
                    f'<small>{html.escape(line["text"])}</small>'
                    f'<audio controls preload="none" src="{html.escape(src)}"></audio></div>'
                )
            cards.append(
                f'  <section class="card"><h3>{html.escape(r["label"])}</h3>'
                f'<p class="id">{html.escape(r["engine"])} · <code>{html.escape(r["voice"])}</code></p>\n'
                + "\n".join(clips)
                + "\n  </section>"
            )
    failed = ""
    if failures:
        items = "".join(
            f"<li><code>{html.escape(f['engine'])} {html.escape(f['voice'])}</code>: {html.escape(f['error'])}</li>"
            for f in failures
        )
        failed = f'  <section class="card fail"><h3>Could not render</h3><ul>{items}</ul></section>'
    (out_dir / "index.html").write_text(PAGE.replace("{{CARDS}}", "\n".join(cards)).replace("{{FAILED}}", failed), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", required=True, help="folder for index.html, clips/, and results.json")
    ap.add_argument("--dry-run", action="store_true", help="make tones instead of speech; checks the plumbing only")
    ap.add_argument("--skip-kokoro", action="store_true")
    ap.add_argument("--piper-python", default="", help="python that has piper-tts installed; empty skips Piper")
    args = ap.parse_args()

    lines = json.loads((HERE / "lines.json").read_text(encoding="utf-8"))
    out_dir = pathlib.Path(args.out)
    if out_dir.exists():
        shutil.rmtree(out_dir)
    clips_dir = out_dir / "clips"
    clips_dir.mkdir(parents=True)

    results, failures = [], []
    with tempfile.TemporaryDirectory() as tmp:
        work = pathlib.Path(tmp)
        if args.dry_run:
            results += render_dry(KOKORO_VOICES + PIPER_VOICES, lines, clips_dir, work)
        else:
            if not args.skip_kokoro:
                r, f = render_kokoro(KOKORO_VOICES, lines, clips_dir, work)
                results += r
                failures += f
            if args.piper_python:
                r, f = render_piper(PIPER_VOICES, lines, clips_dir, work, args.piper_python)
                results += r
                failures += f

    build_page(results, failures, lines, out_dir)
    (out_dir / "results.json").write_text(json.dumps({"voices": results, "failed": failures}, indent=2), encoding="utf-8")
    print(f"Rendered {len(results)} voices, {len(failures)} failed. Page: {out_dir / 'index.html'}")
    # Fail the run only when nothing at all came out, so a good partial result still gets published.
    return 0 if results else 1


if __name__ == "__main__":
    sys.exit(main())
