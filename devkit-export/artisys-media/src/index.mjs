function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

export function normalizeMediaJob(value) {
  object(value, 'media job');
  if (value.input == null || value.input === '') throw new TypeError('input is required');
  const output = object(value.output, 'output');
  if (typeof output.format !== 'string' || output.format.trim() === '') throw new TypeError('output format is required');
  const trim = value.trim ? { ...value.trim } : { start: 0, end: null };
  if (!Number.isFinite(trim.start ?? 0) || (trim.end != null && !Number.isFinite(trim.end))) throw new TypeError('trim values must be finite numbers');
  trim.start ??= 0;
  trim.end ??= null;
  if (trim.start < 0 || (trim.end != null && trim.end <= trim.start)) throw new RangeError('trim range is invalid');
  const resize = value.resize ? { ...value.resize, fit: value.resize.fit ?? 'contain' } : null;
  if (resize && (!Number.isFinite(resize.width) || !Number.isFinite(resize.height) || resize.width <= 0 || resize.height <= 0)) throw new RangeError('resize dimensions are invalid');
  const audio = { mute: false, volume: 1, ...(value.audio ?? {}) };
  if (!Number.isFinite(audio.volume) || audio.volume < 0) throw new RangeError('audio volume is invalid');
  const result = { input: value.input, output: { ...output }, trim };
  if (resize) result.resize = resize;
  result.audio = audio;
  return result;
}

export function mediaDuration(job) {
  const normalized = normalizeMediaJob(job);
  return normalized.trim.end == null ? null : normalized.trim.end - normalized.trim.start;
}

export function createMotionCanvasManifest(job, scenes = []) {
  const normalized = normalizeMediaJob(job);
  if (!Array.isArray(scenes) || scenes.some((scene) => typeof scene !== 'string' || !scene)) throw new TypeError('scenes must be non-empty strings');
  return {
    width: normalized.resize?.width ?? null,
    height: normalized.resize?.height ?? null,
    durationSeconds: mediaDuration(normalized),
    scenes: [...scenes]
  };
}

export async function executeMediaBunnyConversion(runtime, options) {
  if (!runtime?.Conversion || typeof runtime.Conversion.init !== 'function') throw new TypeError('MediaBunny runtime must expose Conversion.init');
  object(options, 'conversion options');
  const conversion = await runtime.Conversion.init(options);
  if (!conversion || conversion.isValid === false) {
    const reasons = conversion?.discardedTracks ? `: ${JSON.stringify(conversion.discardedTracks)}` : '';
    throw new Error(`MediaBunny conversion is invalid${reasons}`);
  }
  if (typeof conversion.execute !== 'function') throw new TypeError('MediaBunny conversion must expose execute');
  return conversion.execute();
}
