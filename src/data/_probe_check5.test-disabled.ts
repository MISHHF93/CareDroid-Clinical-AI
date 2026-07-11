const EXECUTION_MODES = Object.freeze({
  LOCAL_CALCULATOR: 'local-calculator',
  POST_EXECUTOR: 'post-executor',
});

function modeFor(x: string) {
  if (x === 'a') return EXECUTION_MODES.LOCAL_CALCULATOR;
  if (x === 'b') return EXECUTION_MODES.POST_EXECUTOR;
  return 'other';
}

function buildRow(x: string) {
  const mode = modeFor(x);
  return {
    id: x,
    executionMode: mode,
  };
}

function buildMatrix() {
  return ['a', 'b'].map(buildRow).sort((a, b) => a.id.localeCompare(b.id));
}

type MatrixRow = ReturnType<typeof buildMatrix>[number];
type ModeMatrix = MatrixRow['executionMode'];
const m3: ModeMatrix = 'zzz-not-a-real-mode';
