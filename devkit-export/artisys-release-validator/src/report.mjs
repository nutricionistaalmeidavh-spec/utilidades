import path from 'node:path';
import { mkdir, rename, writeFile } from 'node:fs/promises';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function redactString(value, patterns) {
  let result = String(value);
  for (const pattern of patterns) result = result.split(pattern).join('[REDACTED]');
  return result;
}

function redactValue(value, patterns) {
  if (!patterns?.length) return value;
  if (typeof value === 'string') return redactString(value, patterns);
  if (Array.isArray(value)) return value.map(item => redactValue(item, patterns));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactValue(item, patterns)]));
  return value;
}

function renderHtml(result) {
  const rows = (result.phases || []).map(phase => `
      <tr>
        <td>${escapeHtml(phase.id)}</td>
        <td>${phase.required ? 'required' : 'optional'}</td>
        <td>${escapeHtml(phase.status)}</td>
        <td>${escapeHtml(phase.attempts)}</td>
        <td>${escapeHtml(phase.durationMs)}</td>
        <td>${escapeHtml(phase.reason || '')}</td>
      </tr>`).join('');
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ArtiSys Release Validation</title></head>
<body>
  <main>
    <h1>ArtiSys Release Validation</h1>
    <p><strong>Result:</strong> ${escapeHtml(result.status)}</p>
    <p><strong>Product:</strong> ${escapeHtml(result.product)}</p>
    <p><strong>Version:</strong> ${escapeHtml(result.version)}</p>
    <p><strong>Artifact:</strong> ${escapeHtml(result.artifact?.path || '')}</p>
    <p><strong>SHA-256:</strong> ${escapeHtml(result.artifact?.sha256 || '')}</p>
    <table border="1" cellspacing="0" cellpadding="6">
      <thead><tr><th>Phase</th><th>Requirement</th><th>Status</th><th>Attempts</th><th>Duration ms</th><th>Reason</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>\n`;
}

async function atomicWrite(filePath, content) {
  const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, content, 'utf8');
  await rename(temp, filePath);
}

export async function writeValidationReports(result, reportDir, { redact = [] } = {}) {
  if (!result || typeof result !== 'object') throw new TypeError('result is required');
  if (typeof reportDir !== 'string' || !reportDir.trim()) throw new TypeError('reportDir is required');
  if (!Array.isArray(redact)) throw new TypeError('redact must be an array');
  const safe = redactValue(result, redact.filter(Boolean));
  await mkdir(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, 'validation-report.json');
  const htmlPath = path.join(reportDir, 'validation-report.html');
  await atomicWrite(jsonPath, `${JSON.stringify(safe, null, 2)}\n`);
  await atomicWrite(htmlPath, renderHtml(safe));
  return { jsonPath, htmlPath };
}

export { escapeHtml, redactValue };
