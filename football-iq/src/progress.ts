import { useSyncExternalStore } from "react";
import type { Tier } from "./types/play";

/**
 * Progress lives only in this browser. Nothing is sent anywhere.
 * Shape is versioned so a later phase can migrate it.
 */
export interface LessonProgress {
  bestScore: number;
  total: number;
  passed: boolean;
  completedAt: string;
}

export interface GameProgress {
  best: number;
  total: number;
  playedAt: string;
  plays: number;
}

export interface Progress {
  version: 1;
  lessons: Record<string, LessonProgress>;
  badges: Record<string, string>;
  /** Best score per mini game id. */
  games?: Record<string, GameProgress>;
  tier?: Tier;
  /** Sound effects on or off. Defaults to on. */
  sound?: boolean;
  /** Read lessons, questions, and feedback out loud. Defaults to off. */
  readAloud?: boolean;
  /** Season mode results, most recent season only. */
  season?: { games: { opponentId: string; yourPoints: number; theirPoints: number; won: boolean }[]; startedAt: string; championships: number };
}

const KEY = "football-iq.progress.v1";
const EMPTY: Progress = { version: 1, lessons: {}, badges: {}, games: {}, tier: "rookie" };
/** Share of quiz questions a kid must get right to pass a lesson. Pro demands a perfect quiz. */
export const PASS_RATIO = 0.8;
export function passRatioFor(tier: Tier): number {
  return tier === "pro" ? 1 : PASS_RATIO;
}

let cached: Progress | null = null;
const listeners = new Set<() => void>();

function read(): Progress {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Progress) : null;
    cached = parsed && parsed.version === 1 ? parsed : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

function write(next: Progress) {
  cached = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage blocked: the session still works, it just will not persist.
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function recordQuiz(lessonId: string, score: number, total: number): LessonProgress {
  const current = read();
  const prev = current.lessons[lessonId];
  const passed = score / total >= passRatioFor(current.tier ?? "rookie");
  const entry: LessonProgress = {
    bestScore: Math.max(score, prev?.bestScore ?? 0),
    total,
    passed: passed || (prev?.passed ?? false),
    completedAt: new Date().toISOString(),
  };
  write({ ...current, lessons: { ...current.lessons, [lessonId]: entry } });
  return entry;
}

/** Awards the unit badge when every lesson in it is passed. Returns true the first time it is earned. */
export function awardBadgeIfEarned(unitId: string, lessonIds: string[]): boolean {
  const current = read();
  if (current.badges[unitId]) return false;
  const all = lessonIds.length > 0 && lessonIds.every((id) => current.lessons[id]?.passed);
  if (!all) return false;
  write({ ...current, badges: { ...current.badges, [unitId]: new Date().toISOString() } });
  return true;
}

export function resetProgress() {
  write(EMPTY);
}

export function useTier(): Tier {
  return useProgress().tier ?? "rookie";
}

export function setTier(tier: Tier) {
  write({ ...read(), tier });
}

export function useSound(): boolean {
  return useProgress().sound ?? true;
}

export function setSound(sound: boolean) {
  write({ ...read(), sound });
}

export function useReadAloudSetting(): boolean {
  return useProgress().readAloud ?? false;
}

export function setReadAloudSetting(readAloud: boolean) {
  write({ ...read(), readAloud });
}

export function recordSeasonGame(opponentId: string, yourPoints: number, theirPoints: number, gamesPerSeason: number): Progress["season"] {
  const current = read();
  const prev = current.season ?? { games: [], startedAt: new Date().toISOString(), championships: 0 };
  const games = prev.games.length >= gamesPerSeason ? [] : [...prev.games];
  games.push({ opponentId, yourPoints, theirPoints, won: yourPoints > theirPoints });
  const wins = games.filter((g) => g.won).length;
  const champion = games.length === gamesPerSeason && wins >= Math.ceil(gamesPerSeason * 0.75);
  const season = { games, startedAt: games.length === 1 ? new Date().toISOString() : prev.startedAt, championships: prev.championships + (champion ? 1 : 0) };
  write({ ...current, season });
  return season;
}

export function resetSeason() {
  const current = read();
  write({ ...current, season: { games: [], startedAt: new Date().toISOString(), championships: current.season?.championships ?? 0 } });
}

/** Everything saved on this device, for the coach dashboard export. No personal data is ever stored. */
export function exportProgress(): string {
  return JSON.stringify(read(), null, 2);
}

export function importProgress(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as Progress;
    if (!parsed || parsed.version !== 1 || typeof parsed.lessons !== "object") return false;
    write({ ...EMPTY, ...parsed });
    return true;
  } catch {
    return false;
  }
}

export function recordGame(gameId: string, score: number, total: number): GameProgress {
  const current = read();
  const prev = current.games?.[gameId];
  const entry: GameProgress = {
    best: Math.max(score, prev?.best ?? 0),
    total,
    playedAt: new Date().toISOString(),
    plays: (prev?.plays ?? 0) + 1,
  };
  write({ ...current, games: { ...(current.games ?? {}), [gameId]: entry } });
  return entry;
}
