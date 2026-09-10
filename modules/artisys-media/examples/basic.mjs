import { normalizeMediaJob, createMotionCanvasManifest } from '../src/index.mjs';
const job = normalizeMediaJob({ input: 'demo.mp4', output: { format: 'webm' }, trim: { start: 0, end: 15 }, resize: { width: 1080, height: 1920 } });
console.log(job);
console.log(createMotionCanvasManifest(job, ['intro', 'demo', 'outro']));
