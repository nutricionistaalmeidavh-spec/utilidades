import { spawn } from 'node:child_process';

function redactText(value, patterns = []) {
  let output = String(value ?? '');
  for (const pattern of patterns) {
    if (!pattern) continue;
    output = output.split(String(pattern)).join('[REDACTED]');
  }
  return output;
}

function appendLimited(current, chunk, maxBytes) {
  const next = current + String(chunk);
  if (Buffer.byteLength(next, 'utf8') <= maxBytes) return next;
  const buffer = Buffer.from(next, 'utf8');
  return buffer.subarray(Math.max(0, buffer.length - maxBytes)).toString('utf8');
}

export function runCommand(spec = {}, { spawnImpl = spawn } = {}) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) throw new TypeError('command spec must be an object');
  if (typeof spec.file !== 'string' || !spec.file.trim()) throw new TypeError('command file is required');
  const args = spec.args == null ? [] : spec.args;
  if (!Array.isArray(args) || args.some(arg => typeof arg !== 'string')) throw new TypeError('command args must be an array of strings');
  const timeoutMs = Number(spec.timeoutMs ?? 60_000);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new TypeError('command timeoutMs must be a positive integer');
  const maxOutputBytes = Number(spec.maxOutputBytes ?? 262_144);
  if (!Number.isInteger(maxOutputBytes) || maxOutputBytes <= 0) throw new TypeError('maxOutputBytes must be a positive integer');
  const redact = spec.redact ?? [];
  if (!Array.isArray(redact)) throw new TypeError('redact must be an array');

  return new Promise((resolve) => {
    const started = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    let child;

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ...payload,
        stdout: redactText(stdout, redact),
        stderr: redactText(stderr, redact),
        durationMs: Math.max(0, Date.now() - started)
      });
    };

    try {
      child = spawnImpl(spec.file, args, {
        cwd: spec.cwd || undefined,
        env: spec.env ? { ...process.env, ...spec.env } : process.env,
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (error) {
      resolve({ status: 'fail', code: null, timedOut: false, reason: redactText(error?.message || error, redact), stdout: '', stderr: '', durationMs: 0 });
      return;
    }

    child.stdout?.on('data', chunk => { stdout = appendLimited(stdout, chunk, maxOutputBytes); });
    child.stderr?.on('data', chunk => { stderr = appendLimited(stderr, chunk, maxOutputBytes); });
    child.on('error', error => finish({ status: 'fail', code: null, timedOut, reason: redactText(error?.message || error, redact) }));
    child.on('close', (code, signal) => finish({
      status: !timedOut && code === 0 ? 'pass' : 'fail',
      code: Number.isInteger(code) ? code : null,
      signal: signal || null,
      timedOut,
      reason: timedOut ? 'timeout' : (code === 0 ? null : `exit-${code ?? 'unknown'}`)
    }));

    const timer = setTimeout(() => {
      if (settled) return;
      timedOut = true;
      try { child.kill('SIGKILL'); } catch {}
      setTimeout(() => finish({ status: 'fail', code: null, signal: null, timedOut: true, reason: 'timeout' }), 250).unref?.();
    }, timeoutMs);
    timer.unref?.();
  });
}

export { redactText };
