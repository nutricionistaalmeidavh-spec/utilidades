"""Real local OCR example: python examples/process_receipt.py receipt.png

Requires OCR extra, PaddlePaddle, pre-provisioned models or first-run internet.
Product owns these rules; installing a new core version does not replace them.
"""
import json
import sys
from artisys_documents import PaddleBackend, classify, extract_fields, process

result = process(sys.argv[1], PaddleBackend(),
                 classifier=lambda text: classify(text, {"receipt": ["recibo", "valor"]}),
                 extractor=lambda text: extract_fields(text, {"amount": r"R\$\s*([0-9.,]+)"}))
print(json.dumps(result, ensure_ascii=False, indent=2))
