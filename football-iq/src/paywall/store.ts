import { useSyncExternalStore } from "react";
import { FREE_GAMES, FREE_UNITS, PAYWALL_ON, START_PREMIUM } from "./config";

/** Why the unlock panel opened. It picks the sentence at the top. */
export type Reason = { kind: "unit"; title: string } | { kind: "game"; title: string } | { kind: "feature"; title: string } | { kind: "rounds" } | { kind: "menu" };

export interface PaywallState {
  /** True once this browser holds a purchase. */
  premium: boolean;
  open: boolean;
  view: "buy" | "unlocked";
  reason: Reason;
  busy: boolean;
  error: string | null;
  /** Shown once, right after buying. */
  licenseCode: string | null;
}

let state: PaywallState = { premium: START_PREMIUM, open: false, view: "buy", reason: { kind: "menu" }, busy: false, error: null, licenseCode: null };
const listeners = new Set<() => void>();

function set(patch: Partial<PaywallState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function usePaywall(): PaywallState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export const paywallOn = (): boolean => PAYWALL_ON;
export const isPremium = (): boolean => state.premium;
const locked = (): boolean => PAYWALL_ON && !state.premium;

export const unitLocked = (unitId: string): boolean => locked() && !FREE_UNITS.includes(unitId);
export const gameLocked = (gameId: string): boolean => locked() && !FREE_GAMES.includes(gameId);
export const featureLocked = (): boolean => locked();

export function showPaywall(reason: Reason = { kind: "menu" }) {
  set({ open: true, view: "buy", reason, error: null });
}
export function hidePaywall() {
  set({ open: false, error: null });
}

// ---- talking to the server (all paths are relative to the page, so they work under /football-iq/)

function api(path: string): string {
  return new URL(path, document.baseURI).toString();
}

async function post(path: string, body?: unknown): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const res = await fetch(api(path), {
    method: "POST",
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* the server answered with something that is not JSON */
  }
  return { ok: res.ok && json.ok !== false, status: res.status, json };
}

/** Remove this game's offline copy so the next load comes from the server (the full game after a purchase). */
export async function retireOfflineCopy(): Promise<void> {
  const scope = new URL("./", document.baseURI).href;
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    // Only this game's own worker. Other games on this address have their own.
    await Promise.all(regs.filter((r) => r.scope === scope).map((r) => r.unregister()));
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith("workbox-precache") && n.includes(scope)).map((n) => caches.delete(n)));
  } catch {
    /* no service worker support: nothing to retire */
  }
}

async function enterFullGame() {
  await retireOfflineCopy();
  window.location.replace(new URL("./", document.baseURI).toString());
}

export async function startCheckout(): Promise<void> {
  set({ busy: true, error: null });
  try {
    const r = await post("api/checkout");
    const url = typeof r.json.url === "string" ? r.json.url : null;
    if (!r.ok || !url) throw new Error("no checkout");
    window.location.assign(url);
  } catch {
    set({ busy: false, error: "Checkout is not available right now. Please try again in a minute." });
  }
}

export async function restoreWithCode(code: string): Promise<void> {
  set({ busy: true, error: null });
  try {
    const r = await post("api/restore", { code });
    if (!r.ok) {
      set({ busy: false, error: typeof r.json.error === "string" ? r.json.error : "That code did not work. Check it and try again." });
      return;
    }
    await enterFullGame();
  } catch {
    set({ busy: false, error: "Could not reach the server. Check your connection and try again." });
  }
}

async function claim(sessionId: string): Promise<void> {
  set({ busy: true, open: true, view: "buy", error: null });
  try {
    const r = await post("api/claim", { session_id: sessionId });
    if (!r.ok) {
      set({ busy: false, error: typeof r.json.error === "string" ? `We could not confirm the payment: ${r.json.error}.` : "We could not confirm the payment." });
      return;
    }
    set({ busy: false, view: "unlocked", licenseCode: typeof r.json.licenseCode === "string" ? r.json.licenseCode : null });
  } catch {
    set({ busy: false, error: "Could not reach the server. Reload this page and it will try again." });
  }
}

/** Called once when the app starts. Handles the return from checkout and a stale offline copy. */
export async function bootPaywall(): Promise<void> {
  if (!PAYWALL_ON || state.premium) return;
  const params = new URLSearchParams(window.location.search);
  const sid = params.get("session_id");
  if (sid) {
    // Tidy the address bar first, so a reload does not try to claim twice.
    window.history.replaceState(null, "", window.location.pathname);
    await claim(sid);
    return;
  }
  if (params.get("canceled")) window.history.replaceState(null, "", window.location.pathname);
  // An old offline copy of the demo can be showing for someone who has since bought the game.
  try {
    const res = await fetch(api("api/me"), { credentials: "same-origin", cache: "no-store" });
    const me = (await res.json()) as { premium?: boolean };
    if (me.premium && sessionStorage.getItem("fiq-upgraded") !== "1") {
      sessionStorage.setItem("fiq-upgraded", "1");
      await enterFullGame();
    }
  } catch {
    /* offline, or not on the paid server: stay in the demo */
  }
}

export function finishUnlock(): void {
  void enterFullGame();
}
