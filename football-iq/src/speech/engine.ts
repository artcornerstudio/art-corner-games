/**
 * Read-aloud with the browser's own speech engine (Web Speech API).
 * Works offline, needs no account or key, and nothing leaves the device.
 * Browsers only allow speech after the kid has tapped something, which every
 * screen in the game already requires.
 */
import type { Tier } from "../types/play";
import { clipsReady, hasClips, loadManifest, missingClips, playClips, primeOnFirstTap, stopClips } from "./clips";
import { unitsFor } from "./units";
import { pickVoice, prosodyFor, readable } from "./voice";

type Listener = () => void;

let readAloud = false;
let tier: Tier = "rookie";
let speaking = false;
let current: SpeechSynthesisUtterance | null = null;
let voice: SpeechSynthesisVoice | null = null;
const listeners = new Set<Listener>();

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

/** True when this browser can read aloud at all. */
export function speechSupported(): boolean {
  return synth() !== null && typeof SpeechSynthesisUtterance !== "undefined";
}

function notify() {
  listeners.forEach((l) => l());
}

function setSpeaking(on: boolean) {
  if (speaking === on) return;
  speaking = on;
  notify();
}

function loadVoice() {
  const s = synth();
  if (!s) return;
  const voices = s.getVoices();
  if (voices.length) voice = pickVoice(voices);
}

if (speechSupported()) {
  loadVoice();
  // Chrome and Safari fill the voice list asynchronously.
  synth()?.addEventListener?.("voiceschanged", loadVoice);
  // The recorded coach voice: learn which clips exist, and unlock audio on the first tap.
  void loadManifest();
  primeOnFirstTap();
}

/** Test and debugging hook: set window.__voiceDebug to hear about every line and how it was spoken. */
interface VoiceDebugEvent {
  text: string;
  voice: "coach" | "device";
  missing: string[];
}
function debug(event: VoiceDebugEvent) {
  (window as unknown as { __voiceDebug?: (e: VoiceDebugEvent) => void }).__voiceDebug?.(event);
}

/** The auto-read setting. Off by default; the speaker buttons work regardless. */
export function setReadAloud(on: boolean) {
  readAloud = on;
  if (!on) stopSpeaking();
}

export function isReadAloud(): boolean {
  return readAloud;
}

/** Rookie gets a slower, brighter voice. */
export function setSpeechTier(t: Tier) {
  tier = t;
}

/**
 * Say something now, cutting off anything still being said. Uses the recorded
 * coach voice when every sentence of the line has a clip, and the device voice
 * otherwise, so one line is never spoken by two different voices.
 * Returns false when speech is unavailable.
 */
export function speak(text: string): boolean {
  const s = synth();
  if (!s || typeof SpeechSynthesisUtterance === "undefined") return false;
  const clean = readable(text);
  if (!clean) return false;
  stopSpeaking();
  const units = unitsFor(clean);
  const ids = units.map((u) => u.id);
  if (clipsReady() && hasClips(ids)) {
    const started = playClips(ids, {
      start: () => setSpeaking(true),
      end: () => setSpeaking(false),
      fail: (playedAny) => {
        setSpeaking(false);
        if (!playedAny) speakWithDevice(clean);
      },
    });
    if (started) {
      debug({ text: clean, voice: "coach", missing: [] });
      return true;
    }
  }
  debug({ text: clean, voice: "device", missing: units.filter((_, i) => missingClips([ids[i]]).length > 0).map((u) => u.text) });
  return speakWithDevice(clean);
}

function speakWithDevice(clean: string): boolean {
  const s = synth();
  if (!s) return false;
  const u = new SpeechSynthesisUtterance(clean);
  const { rate, pitch } = prosodyFor(tier);
  u.rate = rate;
  u.pitch = pitch;
  u.lang = voice?.lang ?? "en-US";
  if (voice) u.voice = voice;
  u.onstart = () => setSpeaking(true);
  u.onend = () => {
    if (current === u) current = null;
    setSpeaking(false);
  };
  u.onerror = () => {
    if (current === u) current = null;
    setSpeaking(false);
  };
  current = u;
  try {
    s.speak(u);
  } catch {
    current = null;
    setSpeaking(false);
    return false;
  }
  return true;
}

/** Speak only when the kid has turned auto-read on. Used when a new step, question, or result appears. */
export function autoSpeak(text: string): boolean {
  if (!readAloud) return false;
  return speak(text);
}

export function stopSpeaking() {
  const s = synth();
  current = null;
  stopClips();
  if (s && (s.speaking || s.pending)) s.cancel();
  setSpeaking(false);
}

export function isSpeaking(): boolean {
  return speaking;
}

export function subscribeSpeaking(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
