from __future__ import annotations

from dataclasses import asdict, dataclass
from hashlib import sha256
from io import BytesIO
import math
from pathlib import Path
import re
from typing import Callable, Iterable, Protocol
import warnings


class DocumentError(ValueError):
    """An input, dependency or processing error safe to show without OCR content."""


@dataclass(frozen=True)
class Limits:
    max_bytes: int = 20 * 1024 * 1024
    max_pixels: int = 25_000_000
    max_lines: int = 10_000
    max_text_chars: int = 1_000_000

    def __post_init__(self):
        if any(type(v) is not int or v <= 0 for v in asdict(self).values()):
            raise DocumentError("All limits must be positive integers")


@dataclass(frozen=True)
class Line:
    text: str
    confidence: float
    polygon: tuple[tuple[float, float], ...]

    def __post_init__(self):
        if not isinstance(self.text, str) or not math.isfinite(self.confidence) or not 0 <= self.confidence <= 1:
            raise DocumentError("Invalid OCR text or confidence")
        if len(self.polygon) != 4 or any(len(p) != 2 or any(not math.isfinite(c) for c in p) for p in self.polygon):
            raise DocumentError("OCR polygon must contain four finite coordinate pairs")


class Backend(Protocol):
    def recognize(self, image) -> Iterable[Line]:
        """Receive an EXIF-oriented RGB Pillow image; return pixel coordinates."""
        ...


def extract_fields(text: str, patterns: dict[str, str]) -> dict[str, str | None]:
    """Trusted consumer regexes: first capture if present, else entire match."""
    fields = {}
    for name, pattern in patterns.items():
        match = re.search(pattern, text, re.MULTILINE | re.IGNORECASE)
        fields[name] = (match.group(1) if match.lastindex else match.group(0)) if match else None
    return fields


def classify(text: str, rules: dict[str, list[str]]) -> str | None:
    """Require all literal keywords; ambiguous documents require manual review."""
    folded = text.casefold()
    matches = [name for name, words in rules.items() if words and all(w.casefold() in folded for w in words)]
    return matches[0] if len(matches) == 1 else None


def _load(source: Path, limits: Limits):
    try:
        from PIL import Image, ImageOps, UnidentifiedImageError
    except ImportError as exc:
        raise DocumentError("Install artisys-documents dependencies (Pillow)") from exc
    try:
        if not source.is_file():
            raise DocumentError("Source must be a local image file")
        with source.open("rb") as stream:
            data = stream.read(limits.max_bytes + 1)
        if len(data) > limits.max_bytes:
            raise DocumentError("Source exceeds max_bytes")
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as original:
                if original.format not in {"PNG", "JPEG", "TIFF", "BMP", "WEBP"}:
                    raise DocumentError("Unsupported format; use PNG, JPEG, single-page TIFF, BMP or WEBP")
                if getattr(original, "n_frames", 1) != 1:
                    raise DocumentError("Multi-page/animated images must be split before processing")
                if original.width * original.height > limits.max_pixels:
                    raise DocumentError("Source exceeds max_pixels")
                image = ImageOps.exif_transpose(original).convert("RGB")
        return image, sha256(data).hexdigest()
    except DocumentError:
        raise
    except (OSError, ValueError, UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise DocumentError("Cannot decode local image or image safety limit exceeded") from exc


def _preprocess(image, mode: str):
    if mode == "color":
        return image
    try:
        import cv2
        import numpy as np
        from PIL import Image
    except ImportError as exc:
        raise DocumentError("Grayscale/threshold requires: pip install 'artisys-documents[preprocess]'") from exc
    gray = cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2GRAY)
    if mode == "threshold":
        _, gray = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    return Image.fromarray(gray).convert("RGB")


def process(source: str | Path, backend: Backend, *, mode: str = "color", limits: Limits | None = None,
            classifier: Callable[[str], str | None] | None = None,
            extractor: Callable[[str], dict] | None = None) -> dict:
    """Read-only source processing; storage destinations remain consumer-owned.

    Callbacks execute trusted application code. OCR confidence is not evidence of
    authenticity. No signatures, identity or fiscal validity are inferred.
    """
    if mode not in {"color", "grayscale", "threshold"}:
        raise DocumentError("Mode must be color, grayscale or threshold")
    limits = limits or Limits()
    image, digest = _load(Path(source), limits)
    prepared = _preprocess(image, mode)
    lines = []
    total = 0
    try:
        for line in backend.recognize(prepared):
            if not isinstance(line, Line):
                raise DocumentError("Backend must return Line objects")
            total += len(line.text)
            if len(lines) >= limits.max_lines or total > limits.max_text_chars:
                raise DocumentError("OCR result exceeds configured limits")
            lines.append(line)
    except DocumentError:
        raise
    except Exception as exc:
        raise DocumentError("OCR backend failed; verify local models and engine installation") from exc
    text = "\n".join(line.text for line in lines)
    return {
        "schemaVersion": 1, "sourceSha256": digest,
        "image": {"width": image.width, "height": image.height, "mode": mode},
        "coordinateSpace": "exif-oriented-image-pixels",
        "lines": [asdict(line) for line in lines], "text": text,
        "classification": classifier(text) if classifier else None,
        "fields": extractor(text) if extractor else {},
        "requiresHumanReview": True,
    }
