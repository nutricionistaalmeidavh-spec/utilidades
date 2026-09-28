import argparse
import json
from pathlib import Path
import sys
from .core import DocumentError, Limits, classify, extract_fields, process
from .paddle import PaddleBackend


def _rules(path):
    if path is None:
        return {}, {}
    with Path(path).open("rb") as stream:
        raw = stream.read(128 * 1024 + 1)
    if len(raw) > 128 * 1024:
        raise DocumentError("Rules exceed 128 KiB")
    data = json.loads(raw)
    if not isinstance(data, dict) or set(data) - {"classification", "fields"}:
        raise DocumentError("Rules require classification and/or fields objects")
    classes, fields = data.get("classification", {}), data.get("fields", {})
    if not isinstance(classes, dict) or not all(isinstance(v, list) and all(isinstance(w, str) and w for w in v) for v in classes.values()):
        raise DocumentError("Classification rules must contain lists of nonempty keywords")
    if not isinstance(fields, dict) or not all(isinstance(v, str) for v in fields.values()):
        raise DocumentError("Field rules must contain regular expressions")
    import re
    for pattern in fields.values():
        try:
            re.compile(pattern)
        except re.error as exc:
            raise DocumentError("Invalid field regular expression") from exc
    return classes, fields


def main(argv=None):
    parser = argparse.ArgumentParser(description="Process one local image without modifying the source")
    parser.add_argument("source")
    parser.add_argument("--output", required=True, help="New JSON file (existing files refused)")
    parser.add_argument("--rules", help="Trusted consumer JSON rules")
    parser.add_argument("--mode", choices=["color", "grayscale", "threshold"], default="color")
    parser.add_argument("--lang", default="pt")
    parser.add_argument("--detection-model-dir")
    parser.add_argument("--recognition-model-dir")
    parser.add_argument("--max-bytes", type=int, default=20 * 1024 * 1024)
    parser.add_argument("--max-pixels", type=int, default=25_000_000)
    args = parser.parse_args(argv)
    try:
        source, output = Path(args.source), Path(args.output)
        if source.resolve() == output.resolve() or output.exists() or output.is_symlink():
            raise DocumentError("Output must be a new file distinct from source")
        classes, fields = _rules(args.rules)
        result = process(source, PaddleBackend(lang=args.lang, detection_model_dir=args.detection_model_dir,
                                              recognition_model_dir=args.recognition_model_dir),
                         mode=args.mode, limits=Limits(max_bytes=args.max_bytes, max_pixels=args.max_pixels),
                         classifier=lambda text: classify(text, classes),
                         extractor=lambda text: extract_fields(text, fields))
        serialized = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
        # Exclusive creation prevents concurrent invocations overwriting a result.
        with output.open("x", encoding="utf-8") as stream:
            stream.write(serialized)
    except (DocumentError, OSError, ValueError) as exc:
        print(f"artisys-documents: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
