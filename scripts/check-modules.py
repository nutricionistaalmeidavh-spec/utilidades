#!/usr/bin/env python3
"""Local free verification entry point. Dependencies must already be installed."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
READY = ('artisys-qa', 'artisys-security', 'artisys-api-contracts', 'artisys-documents')


def run(args, cwd=ROOT, env=None):
    print('+ ' + ' '.join(map(str, args)), flush=True)
    subprocess.run(args, cwd=cwd, env=env, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', action='store_true')
    parser.add_argument('--pact', action='store_true')
    parser.add_argument('--generator', action='store_true')
    args = parser.parse_args()
    catalog = json.loads((ROOT / 'catalog/modules.json').read_text())['modules']
    if len({m['id'] for m in catalog}) != len(catalog):
        raise ValueError('Duplicate module id')
    upstreams = {p['id'] for p in json.loads((ROOT / 'catalog/projects.json').read_text())['projects']}
    for entry in catalog:
        path = ROOT / 'modules' / entry['id']
        manifest = json.loads((path / 'module.json').read_text())
        for key in ('id', 'version', 'status', 'consumptionMode', 'upstreams'):
            if entry[key] != manifest[key]:
                raise ValueError(f'{entry["id"]}: catalog mismatch at {key}')
        if not set(manifest['upstreams']) <= upstreams:
            raise ValueError(f'{entry["id"]}: unknown upstream')
        if entry['id'] in READY:
            if not manifest.get('implementedCapabilities') or entry['status'] != 'implemented':
                raise ValueError(f'{entry["id"]}: missing implementation metadata')
            if not (path / 'LICENSE').is_file():
                raise ValueError(f'{entry["id"]}: missing local code license')
    npm = 'npm.cmd' if os.name == 'nt' else 'npm'
    for module in ('artisys-qa', 'artisys-api-contracts'):
        run([npm, 'test'], ROOT / 'modules' / module)
    run([sys.executable, '-m', 'unittest', 'discover', '-s', 'modules/artisys-security/tests', '-v'])
    env = os.environ.copy()
    env['PYTHONPATH'] = str(ROOT / 'modules/artisys-documents/src') + os.pathsep + env.get('PYTHONPATH', '')
    run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-v'], ROOT / 'modules/artisys-documents', env)
    if args.browser:
        run([npm, 'run', 'test:example'], ROOT / 'modules/artisys-qa')
    if args.pact:
        run([npm, 'run', 'test:pact'], ROOT / 'modules/artisys-api-contracts')
    if args.generator:
        run([npm, 'run', 'test:generator'], ROOT / 'modules/artisys-api-contracts')
    print('Requested module checks passed. Consumer product acceptance is separate.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f'Module verification failed: {error}', file=sys.stderr)
        raise SystemExit(1)
