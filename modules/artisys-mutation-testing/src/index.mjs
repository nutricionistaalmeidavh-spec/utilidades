export const DEFAULT_MUTATION_THRESHOLDS = Object.freeze({ high: 90, low: 80, break: 80 });

function normalizeThresholds(value = DEFAULT_MUTATION_THRESHOLDS) {
  const out = {
    high: Number(value.high ?? DEFAULT_MUTATION_THRESHOLDS.high),
    low: Number(value.low ?? DEFAULT_MUTATION_THRESHOLDS.low),
    break: Number(value.break ?? DEFAULT_MUTATION_THRESHOLDS.break),
  };
  for (const [key, number] of Object.entries(out)) {
    if (!Number.isFinite(number) || number < 0 || number > 100) throw new RangeError(`threshold ${key} must be between 0 and 100`);
  }
  if (out.high < out.low || out.low < out.break) throw new RangeError('mutation thresholds must satisfy high >= low >= break');
  return out;
}

export function buildStrykerConfig(options = {}) {
  const mutate = options.mutate ?? ['src/**/*.mjs'];
  if (!Array.isArray(mutate) || mutate.length === 0) throw new TypeError('mutate must be a non-empty array');
  const testCommand = String(options.testCommand ?? 'npm test').trim();
  if (!testCommand) throw new TypeError('testCommand is required');
  const config = {
    mutate: [...mutate],
    testRunner: 'command',
    commandRunner: { command: testCommand },
    reporters: [...(options.reporters ?? ['clear-text', 'progress'])],
    coverageAnalysis: 'off',
    thresholds: normalizeThresholds(options.thresholds),
    timeoutMS: Math.max(1000, Number(options.timeoutMS ?? 60000)),
  };
  if (options.concurrency != null) config.concurrency = Math.max(1, Math.floor(Number(options.concurrency)));
  if (options.tempDirName) config.tempDirName = String(options.tempDirName);
  return config;
}
