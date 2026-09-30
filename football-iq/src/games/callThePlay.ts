import { playById } from "../content";
import type { SituationOption, Verdict } from "../types/play";

export { describeSpot, downLabel } from "./situationText";

export const CALL_THE_PLAY_ROUNDS = 6;
export const POINTS: Record<Verdict, number> = { best: 2, ok: 1, bad: 0 };

export function optionLabel(o: SituationOption): string {
  if (o.special === "punt") return "Punt";
  if (o.special === "field-goal") return "Kick a field goal";
  return playById(o.playId!).name;
}
