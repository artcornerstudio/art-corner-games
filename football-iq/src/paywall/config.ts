/**
 * Free demo or full game.
 *
 * The paid server (spread-out-server, which also sells this game) injects
 * window.FIQ_CONFIG into the page. With no config, a full build behaves exactly
 * as it always has (everything open) and a demo build still locks the paid parts.
 * Nothing here is a secret or a lock: the paid content is not in the demo build.
 */
import edition from "../content/edition.json";

export interface PaywallConfig {
  /** Turn the paywall on. */
  paywall?: boolean;
  /** This browser holds a valid purchase. */
  premium?: boolean;
  /** What the unlock panel shows, for example "$9.99". The real amount is whatever the Stripe price says. */
  price?: string;
}

declare global {
  interface Window {
    FIQ_CONFIG?: PaywallConfig;
  }
}

const injected: PaywallConfig | undefined = typeof window === "undefined" ? undefined : window.FIQ_CONFIG;

/** "demo" or "full": which build this is. */
export const EDITION: string = import.meta.env.VITE_EDITION ?? "full";
export const PAYWALL_ON: boolean = injected?.paywall ?? EDITION === "demo";
export const START_PREMIUM: boolean = injected?.premium ?? !PAYWALL_ON;
export const PRICE: string = injected?.price ?? "$9.99";
export const FREE_UNITS: readonly string[] = edition.freeUnits;
export const FREE_GAMES: readonly string[] = edition.freeGames;
export const SPOT_DEMO_ROUNDS: number = edition.spotRounds;
