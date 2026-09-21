import type { Verdict } from "../types/play";

/** A fourth-down scoreboard moment. Yard line is from the offense's own goal line. */
export interface FourthDownScenario {
  id: string;
  quarter: 1 | 2 | 3 | 4;
  /** Clock as shown, e.g. "1:10". */
  clock: string;
  /** Your points minus theirs. */
  margin: number;
  distance: number;
  yardLine: number;
  /** Optional hint the coach might notice. */
  note?: string;
}

export type FourthDownCall = "go" | "punt" | "field-goal";

export const CALL_LABEL: Record<FourthDownCall, string> = { go: "Go for it", punt: "Punt", "field-goal": "Kick a field goal" };

export const FOURTH_DOWN_SCENARIOS: FourthDownScenario[] = [
  { id: "own-20-long", quarter: 1, clock: "9:30", margin: 0, distance: 9, yardLine: 20 },
  { id: "opp-30-short", quarter: 2, clock: "6:00", margin: 3, distance: 1, yardLine: 70 },
  { id: "opp-15-medium", quarter: 3, clock: "11:00", margin: -4, distance: 6, yardLine: 85 },
  { id: "midfield-medium", quarter: 2, clock: "0:40", margin: 7, distance: 4, yardLine: 50, note: "Halftime is 40 seconds away." },
  { id: "own-45-short", quarter: 3, clock: "4:15", margin: -10, distance: 2, yardLine: 45 },
  { id: "opp-25-late-down3", quarter: 4, clock: "0:35", margin: -2, distance: 7, yardLine: 75, note: "No timeouts left." },
  { id: "opp-35-late-down8", quarter: 4, clock: "3:00", margin: -8, distance: 3, yardLine: 65 },
  { id: "opp-3-goal-lead", quarter: 4, clock: "2:10", margin: 6, distance: 3, yardLine: 97, note: "Fourth and goal." },
  { id: "own-40-long-late-lead", quarter: 4, clock: "1:50", margin: 4, distance: 12, yardLine: 40, note: "They have one timeout." },
  { id: "opp-40-tied", quarter: 4, clock: "5:00", margin: 0, distance: 5, yardLine: 60, note: "A field goal from here would be 57 yards." },
];

export interface CallJudgement {
  verdict: Verdict;
  reason: string;
}

/**
 * A coach's rule of thumb, in kid language. Not a full win-probability model:
 * distance, field position, score, and clock, in that order.
 */
export function judge(s: FourthDownScenario, call: FourthDownCall): CallJudgement {
  const fgDistance = 100 - s.yardLine + 17;
  const inFgRange = fgDistance <= 52;
  const lastMinutes = s.quarter === 4 && clockSeconds(s.clock) <= 300;
  const needTd = s.margin <= -4 && lastMinutes;
  const needScore = s.margin < 0 && lastMinutes;
  const shortYardage = s.distance <= 2;
  const ownEnd = s.yardLine < 50;

  const best: FourthDownCall = (() => {
    if (needTd) return "go";
    if (needScore && s.margin >= -3 && inFgRange) return "field-goal";
    if (needScore && !inFgRange) return "go";
    if (shortYardage && s.yardLine >= 40) return "go";
    if (inFgRange && !(shortYardage && s.yardLine >= 90 && s.margin <= 0)) return "field-goal";
    if (s.yardLine >= 60 && s.distance <= 5 && !inFgRange) return "go";
    return "punt";
  })();

  if (call === best) return { verdict: "best", reason: bestReason(s, best, fgDistance) };

  // Everything else: a fine or bad alternative, with a reason.
  if (call === "punt") {
    if (ownEnd && s.distance > 3 && !needScore) return { verdict: "ok", reason: "Punting is safe here, but the numbers say there was a better call." };
    if (needScore) return { verdict: "bad", reason: "You are losing late. Punting hands the ball away and you may never get it back." };
    if (s.yardLine >= 60) return { verdict: "bad", reason: `You are already on their side of the field. A punt from here barely gains anything and gives up a chance at points.` };
    return { verdict: "ok", reason: "Punting is never crazy from your own end, but this one left points on the field." };
  }
  if (call === "field-goal") {
    if (!inFgRange) return { verdict: "bad", reason: `That kick is ${fgDistance} yards. Almost nobody makes that, and a miss gives them the ball right there.` };
    if (needTd) return { verdict: "bad", reason: `You are down by ${-s.margin} with time running out. Three points does not get you there. You need the touchdown.` };
    return { verdict: "ok", reason: "Taking the points is reasonable. It just was not the best choice this time." };
  }
  // go
  if (ownEnd && !needScore) return { verdict: "bad", reason: `Failing here gives them the ball at your ${s.yardLine}, already close to scoring. Too risky when you are not desperate.` };
  if (inFgRange && s.distance > 4 && !needTd) return { verdict: "ok", reason: "Going for it is bold, but a field goal was the surer three points." };
  return { verdict: "ok", reason: "Going for it can work. The safer call had better odds." };
}

function bestReason(s: FourthDownScenario, best: FourthDownCall, fgDistance: number): string {
  const lastMinutes = s.quarter === 4 && clockSeconds(s.clock) <= 300;
  if (best === "punt") return "Fourth and long in your own end: punt. Make them drive the whole field.";
  if (best === "field-goal") {
    if (lastMinutes && s.margin < 0) return `Down by ${-s.margin} late, a ${fgDistance}-yard field goal changes the score. Take the points.`;
    return `A ${fgDistance}-yard field goal is a high-percentage kick. Three sure points beat a gamble.`;
  }
  if (lastMinutes && s.margin <= -4) return `Down by ${-s.margin} late, a field goal is not enough. Keep the drive alive and go for the touchdown.`;
  if (s.distance <= 2) return `Only ${s.distance} yard${s.distance === 1 ? "" : "s"} to go on their side of the field. Power run, get the first down, keep the drive going.`;
  return "Too far for a field goal and too close to punt. Go for it.";
}

export function clockSeconds(clock: string): number {
  const [m, s] = clock.split(":").map(Number);
  return m * 60 + s;
}

export function scoreboardLine(s: FourthDownScenario): string {
  const q = ["1st", "2nd", "3rd", "4th"][s.quarter - 1];
  const margin = s.margin === 0 ? "Tied" : s.margin > 0 ? `Up by ${s.margin}` : `Down by ${-s.margin}`;
  return `${q} quarter · ${s.clock} left · ${margin}`;
}
