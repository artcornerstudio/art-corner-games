/**
 * Plays the recorded coach voice. Each sentence of the game has its own short
 * clip at voice/<id>.mp3, and voice/manifest.json lists which clips exist.
 *
 * Clips are fetched (not streamed by the audio tag) so the service worker can
 * cache them for offline play, then played one after another through one shared
 * audio element that is unlocked by the first tap, which is what iPad needs.
 */

const SILENCE = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
const GAP_MS = 140;
const MAX_CACHED = 150;

let known: Set<string> | null = null;
let loading: Promise<void> | null = null;
let audio: HTMLAudioElement | null = null;
let run = 0;
let cancelCurrent: (() => void) | null = null;
const blobs = new Map<string, Promise<string>>();

function base(): string {
  return import.meta.env?.BASE_URL ?? "/";
}

/** Fetch the list of recorded clips once. A missing or broken manifest just means no clips. */
export function loadManifest(): Promise<void> {
  if (loading) return loading;
  if (typeof fetch === "undefined") return Promise.resolve();
  loading = fetch(`${base()}voice/manifest.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((m: { ids?: string[] } | null) => {
      if (m && Array.isArray(m.ids) && m.ids.length > 0) known = new Set(m.ids);
    })
    .catch(() => {
      loading = null; // try again next time
    });
  return loading;
}

export function clipsReady(): boolean {
  return known !== null;
}

export function hasClips(ids: string[]): boolean {
  return known !== null && ids.length > 0 && ids.every((id) => known!.has(id));
}

export function missingClips(ids: string[]): string[] {
  return known === null ? ids : ids.filter((id) => !known!.has(id));
}

function element(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (!audio) {
    audio = new Audio();
    audio.preload = "auto";
  }
  return audio;
}

/** Unlock the shared audio element. Call from a tap; later plays are then allowed without one. */
export function primeAudio(): void {
  const el = element();
  if (!el || el.src) return;
  el.src = SILENCE;
  el.play()
    .then(() => {
      if (el.src === SILENCE) el.pause();
    })
    .catch(() => {});
}

/** Unlock audio on the first tap anywhere, so spoken lines that start on their own are allowed. */
export function primeOnFirstTap(): void {
  if (typeof window === "undefined") return;
  const events = ["pointerup", "touchend", "click"] as const;
  const once = () => {
    events.forEach((e) => window.removeEventListener(e, once, true));
    primeAudio();
  };
  events.forEach((e) => window.addEventListener(e, once, true));
}

function loadClip(id: string): Promise<string> {
  let p = blobs.get(id);
  if (!p) {
    p = fetch(`${base()}voice/${id}.mp3`).then((r) => {
      if (!r.ok) throw new Error(`clip ${id}: ${r.status}`);
      return r.blob().then((b) => URL.createObjectURL(b));
    });
    blobs.set(id, p);
    p.catch(() => blobs.delete(id));
  }
  return p;
}

function trimCache(keep: string[]): void {
  if (blobs.size <= MAX_CACHED) return;
  for (const [id, p] of blobs) {
    if (keep.includes(id)) continue;
    blobs.delete(id);
    void p.then((u) => URL.revokeObjectURL(u)).catch(() => {});
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    cancelCurrent = () => {
      clearTimeout(t);
      resolve();
    };
  });
}

function playOne(el: HTMLAudioElement, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      el.removeEventListener("ended", onEnd);
      el.removeEventListener("error", onErr);
      cancelCurrent = null;
    };
    const onEnd = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error("audio error"));
    };
    cancelCurrent = () => {
      cleanup();
      resolve();
    };
    el.addEventListener("ended", onEnd);
    el.addEventListener("error", onErr);
    el.src = url;
    el.play().catch((e) => {
      cleanup();
      reject(e);
    });
  });
}

export interface ClipEvents {
  start(): void;
  end(): void;
  /** Something went wrong. `playedAny` says whether the listener already heard part of the line. */
  fail(playedAny: boolean): void;
}

/** Play the clips in order. Returns false when this browser has no audio. */
export function playClips(ids: string[], on: ClipEvents): boolean {
  const el = element();
  if (!el || ids.length === 0) return false;
  const token = ++run;
  const loads = ids.map(loadClip);
  loads.forEach((p) => p.catch(() => {})); // failures are handled where each clip is awaited
  trimCache(ids);
  let played = 0;
  void (async () => {
    try {
      on.start();
      for (let i = 0; i < loads.length; i++) {
        const url = await loads[i];
        if (token !== run) return;
        await playOne(el, url);
        if (token !== run) return;
        played++;
        if (i < loads.length - 1) {
          await wait(GAP_MS);
          if (token !== run) return;
        }
      }
      on.end();
    } catch {
      if (token === run) on.fail(played > 0);
    }
  })();
  return true;
}

export function stopClips(): void {
  run++;
  cancelCurrent?.();
  if (audio && !audio.paused) audio.pause();
}
