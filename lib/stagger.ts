const GROUP_STAGGER_STEP_MS = 55;
const ASSIGNMENT_STAGGER_STEP_MS = 35;
/** Past this many steps the delays stop growing so long lists stay responsive. */
const MAX_STAGGER_STEPS = 8;

function staggerDelay(index: number, stepMs: number): number {
  return Math.min(index, MAX_STAGGER_STEPS) * stepMs;
}

/** Delay before a class or date group starts sliding in. */
export function groupStaggerDelay(index: number): number {
  return staggerDelay(index, GROUP_STAGGER_STEP_MS);
}

/** Delay before an assignment inside a group starts sliding in. */
export function assignmentStaggerDelay(
  groupIndex: number,
  index: number
): number {
  return (
    groupStaggerDelay(groupIndex) +
    staggerDelay(index, ASSIGNMENT_STAGGER_STEP_MS)
  );
}
