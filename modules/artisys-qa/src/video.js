import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ensureDir } from './helpers.js';

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${stderr}`)));
  });
}

export function createFrameRecorder(page, { dir, fps = 4 } = {}) {
  let stopped = false;
  let index = 0;
  let task = Promise.resolve();
  const intervalMs = Math.max(100, Math.floor(1000 / fps));

  async function capture() {
    if (stopped) return;
    const file = path.join(dir, `${String(index++).padStart(6, '0')}.png`);
    try { await page.screenshot({ path: file }); } catch { /* page may be closing */ }
  }

  return {
    async start() {
      await ensureDir(dir);
      await capture();
      task = (async () => {
        while (!stopped) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
          await capture();
        }
      })();
    },
    async stop(outputFile) {
      stopped = true;
      await task;
      if (index < 2) return null;
      try {
        await run('ffmpeg', [
          '-y', '-framerate', String(fps), '-i', path.join(dir, '%06d.png'),
          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outputFile,
        ]);
        await fs.rm(dir, { recursive: true, force: true });
        return outputFile;
      } catch (error) {
        await fs.writeFile(path.join(dir, 'VIDEO_BUILD_FAILED.txt'), `${error.stack || error}\n`, 'utf8');
        return null;
      }
    },
  };
}
