/**
 * Stands in for the paid screens in the free demo build.
 *
 * The real screens (and the game text inside them: coverage tips, fourth-down
 * scenarios, team scouting reports) are not in the demo build at all, so there
 * is nothing in the page to read or unlock. The full build has the real ones.
 * The app never opens these in the demo; the paywall catches it first.
 */
const Stub = () => null;

export const BeatTheCoverage = Stub;
export const CallThePlay = Stub;
export const CoachView = Stub;
export const DriveSimulator = Stub;
export const FourthDown = Stub;
export const HotRead = Stub;
export const ImportPlaybook = Stub;
export const PlayDesigner = Stub;
export const PrintCards = Stub;
export const Season = Stub;
