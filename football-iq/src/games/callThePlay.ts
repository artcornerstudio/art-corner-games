import { playById } from "../content";
import type { SituationOption, Verdict } from "../types/play";

export const CALL_THE_PLAY_ROUNDS = 6;
export const POINTS: Record<Verdict, number> = { best: 2, ok: 1, bad: 0 };

export function describeSpot(yardLine: number): string {
  if (yardLine === 50) return "midfield";
  return yardLine < 50 ? `your own ${yardLine}` : `the other team's ${100 - yardLine}`;
}

export function downLabel(down: number, distance: number, yardLine: number): string {
  const ordinal = ["1st", "2nd", "3rd", "4th"][down - 1];
  const goal = yardLine + distance >= 100;
  return `${ordinal} and ${goal ? "goal" : distance}`;
}

export function optionLabel(o: SituationOption): string {
  if (o.special === "punt") return "Punt";
  if (o.special === "field-goal") return "Kick a field goal";
  return playById(o.playId!).name;
}
