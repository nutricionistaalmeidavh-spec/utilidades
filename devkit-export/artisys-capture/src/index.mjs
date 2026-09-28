const CAPTURE_SOURCES = new Set(['camera', 'file']);
const CAPTURE_MODES = new Set(['qr', 'barcode', 'document']);

function nonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

export function createCaptureRequest({ source, mode, options = {} }) {
  if (!CAPTURE_SOURCES.has(source)) throw new TypeError('source must be camera or file');
  if (!CAPTURE_MODES.has(mode)) throw new TypeError('mode must be qr, barcode or document');
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object');
  return { source, mode, options: { ...options } };
}

export function normalizeCodeResult(value) {
  if (!value || typeof value !== 'object') throw new TypeError('result must be an object');
  const text = nonEmptyString(value.decodedText ?? value.text, 'decoded text');
  const format = value.result?.format?.formatName ?? value.format?.formatName ?? value.format ?? 'UNKNOWN';
  return { text, format: String(format || 'UNKNOWN') };
}

export async function scanQrFile(scanner, file, showImage = false) {
  if (!scanner || typeof scanner.scanFile !== 'function') throw new TypeError('scanner must expose scanFile');
  if (file == null || file === '') throw new TypeError('file is required');
  return scanner.scanFile(file, Boolean(showImage));
}

function assertCv(cv, fn) {
  if (!cv || typeof cv.Mat !== 'function' || typeof cv[fn] !== 'function') throw new TypeError(`OpenCV runtime must expose Mat and ${fn}`);
}

export function opencvGrayscale(cv, src) {
  assertCv(cv, 'cvtColor');
  if (!src) throw new TypeError('src Mat is required');
  const dst = new cv.Mat();
  try {
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
    return dst;
  } catch (error) {
    if (typeof dst.delete === 'function') dst.delete();
    throw error;
  }
}

export function opencvThreshold(cv, src, threshold = 127, maxValue = 255) {
  assertCv(cv, 'threshold');
  if (!src) throw new TypeError('src Mat is required');
  if (!Number.isFinite(threshold) || !Number.isFinite(maxValue)) throw new TypeError('threshold values must be finite numbers');
  const dst = new cv.Mat();
  try {
    cv.threshold(src, dst, threshold, maxValue, cv.THRESH_BINARY);
    return dst;
  } catch (error) {
    if (typeof dst.delete === 'function') dst.delete();
    throw error;
  }
}
