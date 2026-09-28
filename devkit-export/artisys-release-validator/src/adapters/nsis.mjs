function requiredPath(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required`);
  return value.trim();
}

function normalizeExtraArgs(args) {
  if (args == null) return [];
  if (!Array.isArray(args) || args.some(arg => typeof arg !== 'string')) throw new TypeError('NSIS args must be an array of strings');
  return args.filter(arg => arg.toUpperCase() !== '/S');
}

export function createNsisInstallSpec({ installer, args, installDir, timeoutMs = 180_000, cwd, env, redact } = {}) {
  const file = requiredPath(installer, 'installer');
  const finalArgs = ['/S', ...normalizeExtraArgs(args)];
  if (installDir != null) finalArgs.push(`/D=${requiredPath(installDir, 'installDir')}`);
  return { file, args: finalArgs, timeoutMs, cwd, env, redact };
}

export function createNsisUninstallSpec({ uninstaller, args, timeoutMs = 180_000, cwd, env, redact } = {}) {
  const file = requiredPath(uninstaller, 'uninstaller');
  return { file, args: ['/S', ...normalizeExtraArgs(args)], timeoutMs, cwd, env, redact };
}
