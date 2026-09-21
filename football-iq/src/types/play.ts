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
  /** Player id that has the ball from this moment. Omit when the ball is kicked to a spot. */
  to?: string;
  /** A spot on the field the ball flies to, for kicks. The ball then sits there until someone picks it up. */
  toPoint?: Point;
  /** True when the ball is thrown rather than handed off. Kicks to a point are always in flight. */
  throw?: boolean;
  /** Seconds in the air. Defaults to 0.6 for throws and 2.5 for kicks. */
  flight?: number;
}

/** How much field a play shows behind and ahead of the ball, in yards. */
export interface PlayView {
  behind: number;
  ahead: number;
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
  /**
   * "demo" marks a teaching diagram that the Play Lab does not list.
   * Other tags describe the play to the outcome engine, e.g. "quick", "deep", "screen", "inside-run".
   */
  tags?: string[];
  /** Override the default window around the ball. Special teams plays need to show more field. */
  view?: PlayView;
  /** Override the yard line the ball starts on, measured from the offense's goal line. */
  losYard?: number;
  /** On a pass play, the receiver to throw to right away if the defense blitzes. */
  hot?: string;
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

/** A diagram shown in a lesson step or quiz question: a play (animated) or a formation (static). */
export interface DiagramRef {
  playId?: string;
  formationId?: string;
  /** Player ids drawn with a ring while everyone else is dimmed. */
  highlight?: string[];
}

export interface LessonStep {
  /** One short paragraph in kid language. */
  text: string;
  diagram?: DiagramRef;
}

export interface ChoiceQuestion {
  type: "choice";
  prompt: string;
  choices: string[];
  /** Index into choices. */
  answer: number;
  explanation: string;
  diagram?: DiagramRef;
}

export interface TapQuestion {
  type: "tap";
  prompt: string;
  diagram: DiagramRef;
  /** Player id the kid must tap. */
  target: string;
  explanation: string;
}

export type Question = ChoiceQuestion | TapQuestion;

export interface Lesson {
  id: string;
  unitId: string;
  order: number;
  title: string;
  /** One sentence shown on the lesson card. */
  summary: string;
  steps: LessonStep[];
  quiz: Question[];
}

export interface Unit {
  id: string;
  order: number;
  title: string;
  blurb: string;
  badge: string;
}

/** Difficulty tier. Varsity shuffles answers, hides hints, and adds a timer to Spot the Position. */
export type Tier = "rookie" | "varsity" | "pro";

export type Verdict = "best" | "ok" | "bad";

export interface SituationOption {
  /** A play to animate, or a special-teams call. Exactly one of the two. */
  playId?: string;
  special?: "punt" | "field-goal";
  verdict: Verdict;
  /** One line shown after the kid chooses, in kid language. */
  reason: string;
}

/** A play-calling scenario for the Call the Play mini game. */
export interface Situation {
  id: string;
  variant: Variant;
  down: 1 | 2 | 3 | 4;
  /** Yards to go for a first down. */
  distance: number;
  /** Yards from the offense's own goal line: 25 is "your own 25", 75 is "the other team's 25". */
  yardLine: number;
  /** Extra context, e.g. "Fourth quarter, down by 2, 1:10 left." */
  context?: string;
  options: SituationOption[];
}
