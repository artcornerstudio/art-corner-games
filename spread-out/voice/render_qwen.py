#!/usr/bin/env python3
"""
Record Spread Out!'s coach voice: one short mp3 per sentence in voice/units.json.

The voice is Qwen3-TTS (Qwen/Qwen3-TTS-12Hz-1.7B-Base, Apache-2.0) copying Coach
Eric from voice/coach-ref.flac, a short pep talk read by Kokoro's "am_eric"
(Apache-2.0). It is "Voice G" from the October 2026 sound check.

    # record a slice (run several slices in parallel, e.g. 0/10 .. 9/10)
    python spread-out/voice/render_qwen.py --out clips --shard 0/10 --skip-dir spread-out/voice

    # after all slices are in place, list the clips that exist
    python spread-out/voice/render_qwen.py --out spread-out/voice --manifest-only

Clips that already exist are skipped, so only new or changed sentences get
recorded. Each clip is checked: if it comes out far too long or too short for its
words (the model can ramble or cut off), it is recorded again with a new seed.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import pathlib
import subprocess
import sys
import tempfile
import traceback
import zlib

HERE = pathlib.Path(__file__).resolve().parent
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")
VOICE = "qwen3-tts-1.7b-base:coach-eric"
MODEL = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"
REF_AUDIO = HERE / "coach-ref.flac"
# The words spoken in coach-ref.flac (must match it exactly).
REF_TEXT = ("Hey team, great hustle out there today! Remember: spread out, find open space, "
            "and look before you pass. You've got this. Let's go!")
TARGET_RMS_DB = -18.0  # speech level every clip is brought to
PEAK_LIMIT = 0.89      # about -1 dBFS
TRIES = 4


def shape(x, rate):
    """Trim silence at both ends (keep a little), then bring the clip to one speech level."""
    import numpy as np

    x = np.asarray(x, dtype="float32").reshape(-1)
    loud = np.flatnonzero(np.abs(x) > 0.01)
    if loud.size:
        pad = int(rate * 0.04)
        x = x[max(0, loud[0] - pad): min(len(x), loud[-1] + pad)]
    rms = float(np.sqrt(np.mean(np.square(x)))) if len(x) else 0.0
    if rms > 1e-6:
        gain = 10 ** ((TARGET_RMS_DB - 20 * math.log10(rms)) / 20)
        peak = float(np.max(np.abs(x)))
        if peak * gain > PEAK_LIMIT:
            gain = PEAK_LIMIT / peak
        x = x * gain
    return x


def plausible(seconds: float, text: str) -> bool:
    """Speech runs about 14 characters a second; allow a wide margin either way."""
    chars = len(text)
    return chars / 40 <= seconds <= max(2.5, chars / 7 + 1.5)


def encode(wav_path: pathlib.Path, mp3_path: pathlib.Path) -> None:
    tmp = mp3_path.with_suffix(".part")
    subprocess.run(
        [FFMPEG, "-y", "-loglevel", "error", "-i", str(wav_path), "-ac", "1", "-ar", "24000",
         "-codec:a", "libmp3lame", "-b:a", "64k", "-f", "mp3", str(tmp)],
        check=True,
    )
    tmp.replace(mp3_path)


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
    ap.add_argument("--ref", default=str(REF_AUDIO))
    ap.add_argument("--manifest-only", action="store_true")
    ap.add_argument("--limit", type=int, default=0, help="stop after this many new clips (testing)")
    args = ap.parse_args()

    units = json.loads(pathlib.Path(args.units).read_text(encoding="utf-8"))
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    if args.manifest_only:
        n = write_manifest(units, out)
        print(f"Manifest: {n} clips, {len(units) - n} sentences without a clip.")
        return 0 if n else 1

    i, n = (int(x) for x in args.shard.split("/"))
    mine = [u for k, u in enumerate(units) if k % n == i]
    done_dirs = [out] + [pathlib.Path(d) for d in args.skip_dir]
    todo = [u for u in mine if not any((d / f"{u['id']}.mp3").exists() for d in done_dirs)]
    if args.limit:
        todo = todo[: args.limit]
    print(f"Shard {i}/{n}: {len(mine)} sentences, {len(todo)} to record.", flush=True)
    if not todo:
        return 0

    import soundfile as sf
    import torch
    from qwen_tts import Qwen3TTSModel

    torch.set_num_threads(max(1, os.cpu_count() or 1))
    model = Qwen3TTSModel.from_pretrained(MODEL, device_map="cpu", dtype=torch.float32)
    prompt = None
    try:  # build the voice prompt once when this version of qwen-tts allows it
        prompt = model.create_voice_clone_prompt(ref_audio=args.ref, ref_text=REF_TEXT)
    except Exception:  # noqa: BLE001
        prompt = None

    def speak(text):
        if prompt is not None:
            wavs, sr = model.generate_voice_clone(text=text, language="English", voice_clone_prompt=prompt)
        else:
            wavs, sr = model.generate_voice_clone(text=text, language="English", ref_audio=args.ref, ref_text=REF_TEXT)
        return wavs[0], sr

    failed = []
    with tempfile.TemporaryDirectory() as tmp:
        wav = pathlib.Path(tmp) / "clip.wav"
        for k, u in enumerate(todo, 1):
            try:
                best = None
                for attempt in range(TRIES):
                    torch.manual_seed(zlib.crc32(u["id"].encode()) + 7919 * attempt)  # same seed, same clip
                    audio, sr = speak(u["text"])
                    x = shape(audio, sr)
                    secs = len(x) / sr
                    best = (x, sr)
                    if plausible(secs, u["text"]) and float(abs(x).max()) > 0.05:
                        break
                    print(f"  retry {attempt + 1} for {u['id']} ({secs:.1f}s): {u['text']!r}", flush=True)
                else:
                    raise RuntimeError(f"no plausible take after {TRIES} tries")
                sf.write(str(wav), best[0], best[1])
                encode(wav, out / f"{u['id']}.mp3")
            except Exception as exc:  # noqa: BLE001 - keep going, report at the end
                traceback.print_exc()
                failed.append({"id": u["id"], "text": u["text"], "error": f"{type(exc).__name__}: {exc}"})
            if k % 5 == 0:
                print(f"  {k}/{len(todo)}", flush=True)

    if failed:
        (out / f"failed-shard-{i}.json").write_text(json.dumps(failed, indent=1), encoding="utf-8")
        print(f"{len(failed)} sentences failed; see failed-shard-{i}.json")
    # Fail only when nothing at all was recorded, so a good partial result is still kept.
    return 0 if len(failed) < len(todo) else 1


if __name__ == "__main__":
    sys.exit(main())
