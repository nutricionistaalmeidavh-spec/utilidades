"""Lazy PaddleOCR 3 adapter; no dependency or model download at import time."""
import json
from .core import DocumentError, Line


def normalize_paddle(results):
    """Normalize documented PaddleOCR 3 Results or their JSON payloads."""
    for result in results:
        try:
            payload = result if isinstance(result, dict) else result.json
            if isinstance(payload, str):
                payload = json.loads(payload)
            if not isinstance(payload, dict):
                raise DocumentError("Invalid PaddleOCR 3 result object")
            payload = payload.get("res", payload)
            texts, scores, polygons = (payload[key] for key in ("rec_texts", "rec_scores", "rec_polys"))
            if not len(texts) == len(scores) == len(polygons):
                raise DocumentError("Inconsistent PaddleOCR result lengths")
            for text, score, polygon in zip(texts, scores, polygons):
                yield Line(text, float(score), tuple(tuple(float(v) for v in point) for point in polygon))
        except (AttributeError, KeyError, TypeError, ValueError) as exc:
            raise DocumentError("Invalid PaddleOCR 3 result schema") from exc


class PaddleBackend:
    def __init__(self, *, lang="pt", device="cpu", detection_model_dir=None, recognition_model_dir=None):
        # Caller must pre-provision models for fully offline first run.
        self.options = dict(lang=lang, device=device, use_doc_orientation_classify=False,
                            use_doc_unwarping=False, use_textline_orientation=False)
        if detection_model_dir:
            self.options["text_detection_model_dir"] = str(detection_model_dir)
        if recognition_model_dir:
            self.options["text_recognition_model_dir"] = str(recognition_model_dir)
        self._engine = None

    def recognize(self, image):
        try:
            import numpy as np
            from paddleocr import PaddleOCR
        except ImportError as exc:
            raise DocumentError("Install PaddleOCR extra and compatible PaddlePaddle engine; see README") from exc
        if self._engine is None:
            self._engine = PaddleOCR(**self.options)
        # Paddle's ndarray interface expects BGR, while our public seam uses RGB.
        bgr = np.asarray(image)[:, :, ::-1].copy()
        yield from normalize_paddle(self._engine.predict(input=bgr))
