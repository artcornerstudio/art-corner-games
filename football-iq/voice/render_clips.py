#!/usr/bin/env python3
"""
Record the coach voice: one short mp3 per sentence in voice/units.json.

    # render a slice (run several slices in parallel, e.g. 0/4 .. 3/4)
    python voice/render_clips.py --out public/voice --shard 0/4

    # after all slices are in place, list the clips that exist
    python voice/render_clips.py --out public/voice --manifest-only

Clips that already exist are skipped, so a run can be repeated safely and only
new or changed sentences get recorded. Ids come from a hash of the sentence
text, so an edited sentence simply gets a new clip.

The voice is Kokoro's "am_eric" (Kokoro-82M, Apache-2.0).
    --dry-run   makes short tones instead of speech, to test the plumbing.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import pathlib
import struct
import subprocess
import sys
import tempfile
import traceback
import wave

HERE = pathlib.Path(__file__).resolve().parent
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")
VOICE = "am_eric"
SPEED = 0.95
RATE = 24000
TARGET_RMS_DB = -18.0  # speech level every clip is brought to
PEAK_LIMIT = 0.89      # about -1 dBFS


def shape(samples):
    """Trim silence at both ends (keep a little), then bring the clip to one speech level."""
    import numpy as np

    x = np.asarray(samples, dtype="float32")
    loud = np.flatnonzero(np.abs(x) > 0.01)
    if loud.size:
        pad = int(RATE * 0.04)
        x = x[max(0, loud[0] - pad): min(len(x), loud[-1] + pad)]
    rms = float(np.sqrt(np.mean(np.square(x)))) if len(x) else 0.0
    if rms > 1e-6:
        gain = 10 ** ((TARGET_RMS_DB - 20 * math.log10(rms)) / 20)
        peak = float(np.max(np.abs(x)))
        if peak * gain > PEAK_LIMIT:
            gain = PEAK_LIMIT / peak
        x = x * gain
    return x


def encode(wav_path: pathlib.Path, mp3_path: pathlib.Path) -> None:
    tmp = mp3_path.with_suffix(".part")
    subprocess.run(
        [FFMPEG, "-y", "-loglevel", "error", "-i", str(wav_path), "-ac", "1", "-ar", str(RATE),
         "-codec:a", "libmp3lame", "-b:a", "64k", "-f", "mp3", str(tmp)],
        check=True,
    )
    tmp.replace(mp3_path)


def tone_wav(path: pathlib.Path, text: str) -> None:
    seconds = min(4.0, max(0.4, len(text) / 30))
    frames = b"".join(struct.pack("<h", int(8000 * math.sin(2 * math.pi * 200 * i / RATE))) for i in range(int(RATE * seconds)))
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(frames)


def write_manifest(units, out: pathlib.Path) -> int:
    ids = sorted(u["id"] for u in units if (out / f"{u['id']}.mp3").exists())
    (out / "manifest.json").write_text(json.dumps({"voice": VOICE, "count": len(ids), "ids": ids}, separators=(",", ":")) + "\n", encoding="utf-8")
    return len(ids)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--units", default=str(HERE / "units.json"))
    ap.add_argument("--out", required=True)
    ap.add_argument("--shard", default="0/1", help="i/n: record only units whose position % n == i")
    ap.add_argument("--skip-dir", action="append", default=[], help="a folder of finished clips; matching ids are not recorded again (repeatable)")
    ap.add_argument("--manifest-only", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0, help="stop after this many new clips (testing)")
    args = ap.parse_args()

    units = json.loads(pathlib.Path(args.units).read_text(encoding="utf-8"))
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    if args.manifest_only:
        n = write_manifest(units, out)
        missing = len(units) - n
        print(f"Manifest: {n} clips, {missing} sentences without a clip.")
        return 0 if n else 1

    i, n = (int(x) for x in args.shard.split("/"))
    mine = [u for k, u in enumerate(units) if k % n == i]
    done_dirs = [out] + [pathlib.Path(d) for d in args.skip_dir]
    todo = [u for u in mine if not any((d / f"{u['id']}.mp3").exists() for d in done_dirs)]
    if args.limit:
        todo = todo[: args.limit]
    print(f"Shard {i}/{n}: {len(mine)} sentences, {len(todo)} to record.")
    if not todo:
        return 0

    pipeline = None
    if not args.dry_run:
        from kokoro import KPipeline

        pipeline = KPipeline(lang_code="a")

    failed = []
    with tempfile.TemporaryDirectory() as tmp:
        work = pathlib.Path(tmp)
        for k, u in enumerate(todo, 1):
            try:
                wav = work / "clip.wav"
                if args.dry_run:
                    tone_wav(wav, u["text"])
                else:
                    import numpy as np
                    import soundfile as sf

                    parts = []
                    for _gs, _ps, audio in pipeline(u["text"], voice=VOICE, speed=SPEED):
                        arr = audio.detach().cpu().numpy() if hasattr(audio, "detach") else np.asarray(audio)
                        parts.append(arr.astype("float32"))
                        parts.append(np.zeros(int(RATE * 0.08), dtype="float32"))
                    if not parts:
                        raise RuntimeError("no audio produced")
                    sf.write(str(wav), shape(np.concatenate(parts)), RATE)
                encode(wav, out / f"{u['id']}.mp3")
            except Exception as exc:  # noqa: BLE001 - keep going, report at the end
                traceback.print_exc()
                failed.append({"id": u["id"], "text": u["text"], "error": f"{type(exc).__name__}: {exc}"})
            if k % 50 == 0:
                print(f"  {k}/{len(todo)}", flush=True)

    if failed:
        (out / f"failed-shard-{i}.json").write_text(json.dumps(failed, indent=1), encoding="utf-8")
        print(f"{len(failed)} sentences failed; see failed-shard-{i}.json")
    # Fail only when nothing at all was recorded, so a good partial result is still kept.
    return 0 if len(failed) < len(todo) else 1


if __name__ == "__main__":
    sys.exit(main())
