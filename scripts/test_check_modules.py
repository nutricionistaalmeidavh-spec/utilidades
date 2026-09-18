import importlib.util
import json
import tempfile
from pathlib import Path
import unittest

SCRIPT = Path(__file__).with_name('check-modules.py')
spec = importlib.util.spec_from_file_location('check_modules', SCRIPT)
check_modules = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check_modules)


class CatalogExtensionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / 'catalog').mkdir(parents=True)
        self.original_root = check_modules.ROOT
        check_modules.ROOT = self.root

    def tearDown(self):
        check_modules.ROOT = self.original_root
        self.tmp.cleanup()

    def write(self, name, payload):
        (self.root / 'catalog' / name).write_text(json.dumps(payload), encoding='utf-8')

    def test_module_catalog_merges_extensions_by_id(self):
        self.write('modules.json', {'modules': [
            {'id': 'a', 'version': '1', 'status': 'implemented', 'consumptionMode': 'shared', 'upstreams': []},
        ]})
        self.write('modules-rag-quality-p0.json', {'modules': [
            {'id': 'b', 'version': '1', 'status': 'implemented', 'consumptionMode': 'shared', 'upstreams': ['fast-check']},
            {'id': 'a', 'version': '2', 'status': 'stable', 'consumptionMode': 'shared', 'upstreams': []},
        ]})
        catalog = check_modules.load_module_catalog()
        self.assertEqual([item['id'] for item in catalog], ['a', 'b'])
        self.assertEqual(catalog[0]['version'], '2')
        self.assertEqual(catalog[0]['status'], 'stable')

    def test_project_catalog_merges_extension_ids_for_upstream_validation(self):
        self.write('projects.json', {'projects': [{'id': 'promptfoo'}]})
        self.write('projects-rag-quality-p0.json', {'projects': [{'id': 'fast-check'}, {'id': 'stryker-js'}]})
        projects = check_modules.load_project_catalog()
        self.assertEqual({item['id'] for item in projects}, {'promptfoo', 'fast-check', 'stryker-js'})
        self.assertEqual(check_modules.known_upstreams(), {'promptfoo', 'fast-check', 'stryker-js'})

    def test_duplicate_ids_inside_one_catalog_file_are_rejected(self):
        self.write('modules.json', {'modules': [{'id': 'a'}, {'id': 'a'}]})
        with self.assertRaisesRegex(ValueError, 'Duplicate module id'):
            check_modules.load_module_catalog()


if __name__ == '__main__':
    unittest.main()
