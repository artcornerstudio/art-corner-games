import type { Variant } from "../types/play";

/** Opponent shown behind a formation when a lesson draws the formation on its own. */
export const DEFAULT_OPPONENT: Record<Variant, { offense: string; defense: string }> = {
  tackle11: { offense: "singleback-tackle", defense: "base-43-tackle" },
  flag5: { offense: "trips-flag5", defense: "cover2-flag5" },
  flag7: { offense: "trips-flag7", defense: "zone-flag7" },
};
