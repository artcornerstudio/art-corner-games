#!/usr/bin/env python3
"""
Voice audition for Spread Out!: the same coach lines in several free voice engines,
so a person can pick the most natural one by ear. Temporary; delete after choosing.

    python audition/voices.py kokoro  --out out/kokoro      # also writes out/kokoro/ref-eric.wav
    python audition/voices.py chatterbox --out out/chatterbox --ref out/kokoro/ref-eric.wav
    python audition/voices.py qwen    --out out/qwen        --ref out/kokoro/ref-eric.wav

Every variant runs in its own try block; a failure is written to failed.json and the
run goes on. Licences: Kokoro Apache-2.0, Chatterbox MIT, Qwen3-TTS Apache-2.0.
"""
import argparse, json, pathlib, sys, time, traceback

LINES = [
    "GOAL! Perfect pass!",
    "A chaser is hunting you! Sprint away!",
    "You win! Spreading out and smart passes did that!",
    "A triangle always gives your team two ways to pass!",
]
# What the cloning engines copy: Coach Eric (Kokoro am_eric) reading a short pep talk.
REF_TEXT = ("Hey team, great hustle out there today! Remember: spread out, find open space, "
            "and look before you pass. You've got this. Let's go!")


def save(path, audio, sr):
    import numpy as np, soundfile as sf
    a = audio.detach().cpu().numpy() if hasattr(audio, "detach") else np.asarray(audio)
    a = np.squeeze(a).astype("float32")
    sf.write(str(path), a, sr)


def run_variant(out, key, label, note, fn, results, failed):
    d = out / key
    d.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    try:
        for i, line in enumerate(LINES):
            audio, sr = fn(line)
            save(d / f"{i}.wav", audio, sr)
        secs = round(time.time() - t0, 1)
        results.append({"key": key, "label": label, "note": note, "seconds": secs})
        print(f"OK   {key} in {secs}s", flush=True)
    except Exception as e:
        traceback.print_exc()
        failed.append({"key": key, "label": label, "error": f"{type(e).__name__}: {e}"[:400]})
        print(f"FAIL {key}", flush=True)


def kokoro(out, ref):
    import numpy as np
    from kokoro import KPipeline
    pipe = KPipeline(lang_code="a")

    def say(voice, speed):
        def fn(text):
            chunks = [a for _, _, a in pipe(text, voice=voice, speed=speed)]
            return np.concatenate([np.asarray(c) for c in chunks]), 24000
        return fn

    audio, sr = say("am_eric", 0.95)(REF_TEXT)
    save(out / "ref-eric.wav", audio, sr)
    return [
        ("kokoro-eric", "Coach Eric today (Kokoro)", "The voice the game uses now.", say("am_eric", 0.95)),
    ]


def chatterbox(out, ref):
    import torch
    variants = []
    try:
        from chatterbox.tts_turbo import ChatterboxTurboTTS
        try:
            turbo = ChatterboxTurboTTS.from_pretrained(device="cpu")
        except Exception:
            from huggingface_hub import snapshot_download
            turbo = ChatterboxTurboTTS.from_local(snapshot_download("ResembleAI/chatterbox-turbo"), device="cpu")
        variants.append(("chatterbox-turbo-eric", "Chatterbox Turbo, Eric's voice",
                         "Newest Chatterbox, copying Coach Eric's voice with more natural rhythm.",
                         lambda t: (turbo.generate(t, audio_prompt_path=str(ref)), turbo.sr)))
    except Exception:
        traceback.print_exc()
    from chatterbox.tts import ChatterboxTTS
    m = ChatterboxTTS.from_pretrained(device="cpu")
    variants.append(("chatterbox-eric-calm", "Chatterbox, Eric's voice (calm)",
                     "Chatterbox copying Coach Eric, normal energy.",
                     lambda t: (m.generate(t, audio_prompt_path=str(ref), exaggeration=0.5, cfg_weight=0.5), m.sr)))
    variants.append(("chatterbox-eric-hype", "Chatterbox, Eric's voice (excited)",
                     "Chatterbox copying Coach Eric, turned up to sound like an excited coach.",
                     lambda t: (m.generate(t, audio_prompt_path=str(ref), exaggeration=0.8, cfg_weight=0.35), m.sr)))
    return variants


def qwen(out, ref):
    import torch
    from qwen_tts import Qwen3TTSModel
    variants = []
    try:
        cv = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice", device_map="cpu", dtype=torch.float32)
        coach = "Speak like a warm, upbeat youth soccer coach cheering on young kids: energetic, clear and friendly."
        for spk in ("Ryan", "Aiden"):
            def fn(t, spk=spk):
                wavs, sr = cv.generate_custom_voice(text=t, language="English", speaker=spk, instruct=coach)
                return wavs[0], sr
            variants.append((f"qwen-{spk.lower()}", f"Qwen3-TTS, {spk} (coach style)",
                             f"Qwen3-TTS's built-in {spk} voice, told to sound like an upbeat kids' coach.", fn))
    except Exception:
        traceback.print_exc()
    try:
        base = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-Base", device_map="cpu", dtype=torch.float32)
        def clone(t):
            wavs, sr = base.generate_voice_clone(text=t, language="English", ref_audio=str(ref), ref_text=REF_TEXT)
            return wavs[0], sr
        variants.append(("qwen-eric", "Qwen3-TTS, Eric's voice",
                         "Qwen3-TTS copying Coach Eric's voice.", clone))
    except Exception:
        traceback.print_exc()
    return variants


ENGINES = {"kokoro": kokoro, "chatterbox": chatterbox, "qwen": qwen}

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("engine", choices=ENGINES)
    ap.add_argument("--out", required=True)
    ap.add_argument("--ref", default="")
    a = ap.parse_args()
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    results, failed = [], []
    try:
        variants = ENGINES[a.engine](out, pathlib.Path(a.ref) if a.ref else None)
    except Exception as e:
        traceback.print_exc()
        variants = []
        failed.append({"key": a.engine, "label": a.engine, "error": f"{type(e).__name__}: {e}"[:400]})
    for key, label, note, fn in variants:
        run_variant(out, key, label, note, fn, results, failed)
    (out / "results.json").write_text(json.dumps({"lines": LINES, "voices": results, "failed": failed}, indent=1))
    sys.exit(0)
