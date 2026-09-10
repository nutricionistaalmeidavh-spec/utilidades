import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image
from artisys_documents import DocumentError, Limits, Line, process, classify, extract_fields, normalize_paddle
from artisys_documents.cli import main


class BoundaryOCR:
    """Fixture only at the engine boundary; not a claim of OCR accuracy."""
    def recognize(self, image):
        self.image = image
        return [Line("RECIBO", .95, ((0, 0), (10, 0), (10, 3), (0, 3))),
                Line("Valor: R$ 12,50", .90, ((0, 4), (20, 4), (20, 8), (0, 8)))]


class DocumentsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "image.png"
        Image.new("RGB", (30, 10), (255, 0, 0)).save(self.source)

    def test_pipeline_and_consumer_rules_leave_source_unchanged(self):
        original = self.source.read_bytes()
        result = process(self.source, BoundaryOCR(), classifier=lambda text: classify(text, {"receipt": ["recibo", "valor"]}),
                         extractor=lambda text: extract_fields(text, {"amount": r"R\$ (\d+,\d+)", "missing": "ABC"}))
        self.assertEqual(result["classification"], "receipt")
        self.assertEqual(result["fields"], {"amount": "12,50", "missing": None})
        self.assertEqual(result["text"], "RECIBO\nValor: R$ 12,50")
        self.assertEqual(result["sourceSha256"], hashlib.sha256(original).hexdigest())
        self.assertEqual(self.source.read_bytes(), original)
        self.assertTrue(result["requiresHumanReview"])
        json.dumps(result, allow_nan=False)

    def test_actual_opencv_grayscale_and_threshold(self):
        engine = BoundaryOCR()
        process(self.source, engine, mode="grayscale")
        self.assertEqual(engine.image.getpixel((0, 0)), (76, 76, 76))
        process(self.source, engine, mode="threshold")
        self.assertEqual(engine.image.getpixel((0, 0)), (255, 255, 255))
        process(self.source, engine, mode="color")
        self.assertEqual(engine.image.getpixel((0, 0)), (255, 0, 0))

    def test_exif_orientation(self):
        photo = self.root / "rotated.jpg"
        exif = Image.Exif()
        exif[274] = 6
        Image.new("RGB", (30, 10)).save(photo, exif=exif)
        result = process(photo, BoundaryOCR())
        self.assertEqual((result["image"]["width"], result["image"]["height"]), (10, 30))

    def test_input_and_ocr_limits(self):
        for limits in [Limits(max_bytes=1), Limits(max_pixels=2), Limits(max_lines=1), Limits(max_text_chars=1)]:
            with self.subTest(limits=limits), self.assertRaises(DocumentError):
                process(self.source, BoundaryOCR(), limits=limits)
        with self.assertRaises(DocumentError):
            Limits(max_bytes=0)

    def test_invalid_inputs(self):
        for path in [self.root, self.root / "absent", self.root / "invalid.png"]:
            if path.name == "invalid.png":
                path.write_bytes(b"not an image")
            with self.subTest(path=path), self.assertRaises(DocumentError):
                process(path, BoundaryOCR())
        with self.assertRaises(DocumentError):
            process(self.source, BoundaryOCR(), mode="unknown")
        multi = self.root / "multi.tiff"
        Image.new("RGB", (3, 3)).save(multi, save_all=True, append_images=[Image.new("RGB", (3, 3))])
        with self.assertRaises(DocumentError):
            process(multi, BoundaryOCR())

    def test_normalize_documented_paddle_payload(self):
        fixture = {"res": {"rec_texts": ["Olá"], "rec_scores": [.91], "rec_polys": [[[1, 2], [8, 2], [8, 4], [1, 4]]]}}
        class Result:
            json = fixture
        line, = normalize_paddle([Result()])
        self.assertEqual(line.text, "Olá")
        self.assertEqual(line.polygon[0], (1., 2.))
        fixture["res"]["rec_scores"] = []
        with self.assertRaises(DocumentError):
            list(normalize_paddle([fixture]))

    def test_empty_and_invalid_backend_results(self):
        class EmptyOCR:
            def recognize(self, image):
                return []
        result = process(self.source, EmptyOCR())
        self.assertEqual(result["text"], "")
        self.assertTrue(result["requiresHumanReview"])
        for invalid in [None, {}, {"res": []}, {"res": {"rec_texts": [], "rec_scores": [], "rec_polys": None}}]:
            with self.subTest(invalid=invalid), self.assertRaises(DocumentError):
                list(normalize_paddle([invalid]))

    def test_bad_confidence_and_polygon(self):
        for score in [float("nan"), 1.1, -.1]:
            with self.assertRaises(DocumentError):
                Line("x", score, ((0, 0),) * 4)
        with self.assertRaises(DocumentError):
            Line("x", .5, ((float("inf"), 0),) * 4)
        with self.assertRaises(DocumentError):
            Line("x", .5, ())

    def test_ambiguous_classification_requires_review(self):
        self.assertIsNone(classify("recibo valor", {"a": ["recibo"], "b": ["valor"]}))
        self.assertIsNone(classify("anything", {"a": []}))

    def test_cli_real_file_and_no_overwrite(self):
        output = self.root / "result.json"
        with patch("artisys_documents.cli.PaddleBackend", return_value=BoundaryOCR()):
            self.assertEqual(main([str(self.source), "--output", str(output)]), 0)
            self.assertEqual(json.loads(output.read_text())["text"], "RECIBO\nValor: R$ 12,50")
            self.assertEqual(main([str(self.source), "--output", str(output)]), 2)
            self.assertEqual(main([str(self.source), "--output", str(self.source)]), 2)

    def test_cli_invalid_rules_fail_before_ocr_and_write(self):
        rules, output = self.root / "rules.json", self.root / "result.json"
        for data in [{"fields": {"a": "["}}, {"classification": {"x": "bad"}}, []]:
            rules.write_text(json.dumps(data))
            self.assertEqual(main([str(self.source), "--output", str(output), "--rules", str(rules)]), 2)
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
