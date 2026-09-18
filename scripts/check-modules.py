#!/usr/bin/env python3
"""Local/CI verification entry point. Dependencies must already be installed."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
P0_JS_MODULES = (
    'artisys-alerts', 'artisys-workflow-engine', 'artisys-approvals',
    'artisys-contacts', 'artisys-assets', 'artisys-asset-lifecycle',
    'artisys-custody', 'artisys-maintenance', 'artisys-metering',
    'artisys-search', 'artisys-exporter'
)
READY = (
    'artisys-qa', 'artisys-security', 'artisys-api-contracts', 'artisys-documents',
    'artisys-pdf', 'artisys-workflows', 'artisys-capture', 'artisys-dashboard',
    'artisys-planning', 'artisys-media', 'artisys-office', 'artisys-ui-builder',
    'artisys-upload', 'artisys-files', 'artisys-annotations', 'artisys-serialport', 'artisys-printing',
    'artisys-video-engine', 'artisys-doc-convert', 'artisys-local-backend',
    'artisys-remote-support', 'artisys-release', 'artisys-release-validator', 'artisys-ci-reporter',
    'artisys-desktop-shell', 'artisys-whatsapp-launcher', 'artisys-ocr', 'artisys-product-qa', 'artisys-licensing',
    'artisys-ai-quality', 'artisys-privacy', 'artisys-bim', 'artisys-eventbus',
    'artisys-backup', 'artisys-importer', 'artisys-finance-domain', 'artisys-auth-rbac', 'artisys-storage',
    'artisys-audit-log', 'artisys-sync', 'artisys-pwa-runtime', 'artisys-webview-bridge',
    'artisys-inventory', 'artisys-os', 'artisys-catalog', 'artisys-pricing',
    'artisys-settings', 'artisys-multitenancy', 'artisys-feature-flags',
    'artisys-checklists', 'artisys-reporting', *P0_JS_MODULES
)
READY_STATUSES = ('implemented', 'stable')
JS_MODULES = (
    'artisys-qa', 'artisys-api-contracts', 'artisys-pdf', 'artisys-workflows',
    'artisys-capture', 'artisys-dashboard', 'artisys-planning', 'artisys-media',
    'artisys-office', 'artisys-ui-builder', 'artisys-upload', 'artisys-files', 'artisys-annotations',
    'artisys-serialport', 'artisys-printing', 'artisys-video-engine',
    'artisys-doc-convert', 'artisys-local-backend', 'artisys-remote-support',
    'artisys-release', 'artisys-release-validator', 'artisys-ci-reporter', 'artisys-desktop-shell', 'artisys-whatsapp-launcher', 'artisys-ocr',
    'artisys-product-qa', 'artisys-licensing', 'artisys-ai-quality',
    'artisys-privacy', 'artisys-bim', 'artisys-eventbus',
    'artisys-backup', 'artisys-importer', 'artisys-finance-domain', 'artisys-auth-rbac', 'artisys-storage',
    'artisys-audit-log', 'artisys-sync', 'artisys-pwa-runtime', 'artisys-webview-bridge',
    'artisys-inventory', 'artisys-os', 'artisys-catalog', 'artisys-pricing',
    'artisys-settings', 'artisys-multitenancy', 'artisys-feature-flags',
    'artisys-checklists', 'artisys-reporting', *P0_JS_MODULES
)
NEW_PRODUCT_MODULES = (
    'artisys-capture', 'artisys-dashboard', 'artisys-planning',
    'artisys-media', 'artisys-office', 'artisys-ui-builder',
    'artisys-upload', 'artisys-annotations', 'artisys-video-engine',
    'artisys-doc-convert', 'artisys-local-backend', 'artisys-remote-support',
    'artisys-release', 'artisys-desktop-shell', 'artisys-whatsapp-launcher', 'artisys-ocr',
    'artisys-product-qa', 'artisys-licensing', 'artisys-ai-quality',
    'artisys-privacy', 'artisys-bim', 'artisys-release-validator', 'artisys-eventbus',
    'artisys-files'
)


def run(args, cwd=ROOT, env=None):
    print('+ ' + ' '.join(map(str, args)), flush=True)
    subprocess.run(args, cwd=cwd, env=env, check=True)


def known_upstreams():
    upstreams = {p['id'] for p in json.loads((ROOT / 'catalog/projects.json').read_text())['projects']}
    incorporated = ROOT / 'catalog/incorporated-repos-2026-09-10.json'
    if incorporated.is_file():
        upstreams |= {p['id'] for p in json.loads(incorporated.read_text())['repositories']}
    return upstreams


def validate_display_catalog(catalog):
    display_path = ROOT / 'catalog/module-display.pt-BR.json'
    display = json.loads(display_path.read_text())['modules']
    catalog_ids = {entry['id'] for entry in catalog}
    display_ids = [entry['id'] for entry in display]
    if len(set(display_ids)) != len(display_ids):
        raise ValueError('Duplicate module display id')
    missing = catalog_ids - set(display_ids)
    extra = set(display_ids) - catalog_ids
    if missing or extra:
        raise ValueError(f'Module display mismatch: missing={sorted(missing)} extra={sorted(extra)}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', action='store_true')
    parser.add_argument('--pact', action='store_true')
    parser.add_argument('--generator', action='store_true')
    args = parser.parse_args()
    catalog = json.loads((ROOT / 'catalog/modules.json').read_text())['modules']
    if len({m['id'] for m in catalog}) != len(catalog):
        raise ValueError('Duplicate module id')
    validate_display_catalog(catalog)
    upstreams = known_upstreams()
    for entry in catalog:
        path = ROOT / 'modules' / entry['id']
        manifest = json.loads((path / 'module.json').read_text())
        for key in ('id', 'version', 'status', 'consumptionMode', 'upstreams'):
            if entry[key] != manifest[key]:
                raise ValueError(f'{entry["id"]}: catalog mismatch at {key}')
        if not set(manifest['upstreams']) <= upstreams:
            raise ValueError(f'{entry["id"]}: unknown upstream')
        if entry['id'] in READY:
            if not manifest.get('implementedCapabilities') or entry['status'] not in READY_STATUSES:
                raise ValueError(f'{entry["id"]}: missing implementation metadata')
            if not (path / 'LICENSE').is_file():
                raise ValueError(f'{entry["id"]}: missing local code license')
            if not (path / 'README.md').is_file():
                raise ValueError(f'{entry["id"]}: missing module README')
    npm = 'npm.cmd' if os.name == 'nt' else 'npm'
    for module in JS_MODULES:
        run([npm, 'test'], ROOT / 'modules' / module)
    for module in ('artisys-pdf', 'artisys-workflows', 'artisys-serialport', 'artisys-printing', 'artisys-finance-domain', 'artisys-ci-reporter', *NEW_PRODUCT_MODULES[8:]):
        run([npm, 'run', 'check'], ROOT / 'modules' / module)
    for module in NEW_PRODUCT_MODULES:
        run([npm, 'run', 'example'], ROOT / 'modules' / module)
    run(['node', 'scripts/reuse-smoke.mjs'])
    for module in JS_MODULES:
        run([npm, 'pack', '--dry-run'], ROOT / 'modules' / module)
    run([sys.executable, '-m', 'unittest', 'discover', '-s', 'modules/artisys-security/tests', '-v'])
    env = os.environ.copy()
    env['PYTHONPATH'] = str(ROOT / 'modules' / 'artisys-documents' / 'src') + os.pathsep + env.get('PYTHONPATH', '')
    run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-v'], ROOT / 'modules' / 'artisys-documents', env)
    if args.browser:
        run([npm, 'run', 'test:example'], ROOT / 'modules' / 'artisys-qa')
    if args.pact:
        run([npm, 'run', 'test:pact'], ROOT / 'modules' / 'artisys-api-contracts')
    if args.generator:
        run([npm, 'run', 'test:generator'], ROOT / 'modules' / 'artisys-api-contracts')
    print('Requested module checks passed. Packages are reusable-ready; consumer product acceptance remains separate.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f'Module verification failed: {error}', file=sys.stderr)
        raise SystemExit(1)
