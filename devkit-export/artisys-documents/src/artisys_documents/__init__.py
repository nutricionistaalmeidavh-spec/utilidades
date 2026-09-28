"""Local reusable document processing; no product-specific storage rules."""
from .core import DocumentError, Limits, Line, process, extract_fields, classify
from .paddle import PaddleBackend, normalize_paddle

__all__ = ["DocumentError", "Limits", "Line", "process", "extract_fields", "classify", "PaddleBackend", "normalize_paddle"]
