import type { PlayView, Point, Variant } from "../types/play";

export interface FieldSpec {
  /** Sideline to sideline, in yards. */
  width: number;
  /** Goal line to goal line, in yards. */
  length: number;
  /** Depth of each end zone, in yards. */
  endZone: number;
  /** Whether to draw NFL-style hash marks. */
  hashes: boolean;
  /** Default yard line for the line of scrimmage, measured from the offense's goal line. */
  losYard: number;
}

export const FIELD_SPECS: Record<Variant, FieldSpec> = {
  tackle11: { width: 53.33, length: 100, endZone: 10, hashes: true, losYard: 30 },
  // NFL FLAG fields are 30 yards wide and 50 yards long with 10-yard end zones.
  flag5: { width: 30, length: 50, endZone: 10, hashes: false, losYard: 15 },
  flag7: { width: 30, length: 50, endZone: 10, hashes: false, losYard: 15 },
};

/** How many yards of field the viewer shows behind and ahead of the line of scrimmage. */
export const VIEW_BEHIND = 10;
export const VIEW_AHEAD = 28;
export const VIEW_DEPTH = VIEW_BEHIND + VIEW_AHEAD;

export interface Viewport {
  spec: FieldSpec;
  /** Pixels per yard. */
  scale: number;
  widthPx: number;
  heightPx: number;
  /** Yards shown behind and ahead of the ball. */
  behind: number;
  ahead: number;
  /** Yard line the ball starts on, from the offense's goal line. */
  losYard: number;
}

/** Below this many pixels per yard, line players overlap; the stage then grows and scrolls sideways. */
export const MIN_SCALE = 9.5;

export function makeViewport(variant: Variant, containerPx: number, view?: PlayView, losYard?: number): Viewport {
  const spec = FIELD_SPECS[variant];
  const scale = Math.max(containerPx / spec.width, MIN_SCALE);
  const behind = view?.behind ?? VIEW_BEHIND;
  const ahead = view?.ahead ?? VIEW_AHEAD;
  return {
    spec,
    scale,
    widthPx: Math.round(spec.width * scale),
    heightPx: Math.round((behind + ahead) * scale),
    behind,
    ahead,
    losYard: losYard ?? spec.losYard,
  };
}

/** Converts play coordinates (yards, ball at origin, +y downfield) to stage pixels (+y down the screen). */
export function toPx(v: Viewport, p: Point): Point {
  return {
    x: (p.x + v.spec.width / 2) * v.scale,
    y: (v.ahead - p.y) * v.scale,
  };
}

/** Distance between two points in yards. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Yard-line label. Tackle fields count up to 50 and back down, the way they are painted.
 * Flag fields count straight up from the offense's goal line so kids never see the same
 * number twice on a short field.
 */
export function yardLabel(absoluteYard: number, spec: FieldSpec): string | null {
  if (absoluteYard <= 0 || absoluteYard >= spec.length) return null;
  if (!spec.hashes) return String(absoluteYard);
  return String(Math.min(absoluteYard, spec.length - absoluteYard));
}
