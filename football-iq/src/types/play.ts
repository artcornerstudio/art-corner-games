/**
 * Content model for Football IQ.
 *
 * Coordinates are in yards, relative to the ball at the snap:
 *   x: lateral, positive to the offense's right, 0 at the ball
 *   y: depth, positive downfield toward the defense, 0 at the line of scrimmage
 * Offense lines up at y <= 0, defense at y > 0.
 */

export type Variant = "tackle11" | "flag5" | "flag7";
export type Side = "offense" | "defense";
export type PlayType = "run" | "pass";

export interface Point {
  x: number;
  y: number;
}

export interface FormationPlayer {
  /** Stable id used by plays to reference this player, e.g. "qb", "wr-x". */
  id: string;
  /** Position code, must exist in positions.json, e.g. "QB". */
  position: string;
  /** Short label drawn on the field token. Defaults to the position code. */
  label?: string;
  x: number;
  y: number;
}

export interface Formation {
  id: string;
  name: string;
  variant: Variant;
  side: Side;
  /** One or two kid-language sentences. */
  description: string;
  players: FormationPlayer[];
}

export type AssignmentKind =
  | "route"
  | "block"
  | "carry"
  | "dropback"
  | "rush"
  | "cover"
  | "pursue"
  | "stay";

export interface Assignment {
  playerId: string;
  kind: AssignmentKind;
  /** Waypoints after the snap. The player starts at their formation spot. */
  path: Point[];
  /** Seconds after the snap before the player starts moving. */
  delay?: number;
  /** Yards per second. Defaults depend on kind. */
  speed?: number;
}

export interface BallEvent {
  /** Seconds after the snap. */
  t: number;
  /** Player id that has the ball from this moment. */
  to: string;
  /** True when the ball is thrown rather than handed off. */
  throw?: boolean;
}

export interface Play {
  id: string;
  name: string;
  variant: Variant;
  type: PlayType;
  formationId: string;
  defenseFormationId: string;
  /** What happens, in kid language. */
  description: string;
  /** Why it works, one or two sentences. */
  why: string;
  assignments: Assignment[];
  ball: {
    /** Player id holding the ball at the snap, usually the center. */
    start: string;
    events: BallEvent[];
  };
}

export interface PositionInfo {
  name: string;
  side: Side;
  job: string;
}

export type PositionBook = Record<string, PositionInfo>;
