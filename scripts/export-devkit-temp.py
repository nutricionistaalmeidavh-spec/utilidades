import base64
import hashlib
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'devkit-export'
MAX_CHUNK = 300_000


def motivo_bloqueio(rel):
    low = rel.replace('\\', '/').lower()
    parts = low.split('/')
    name = parts[-1]
    if '.git' in parts or 'node_modules' in parts:
        return 'diretorio nao distribuivel'
    if name == '.env':
        return 'ambiente local'
    if name.startswith('.env.') and name not in ('.env.example', '.env.sample', '.env.template'):
        return 'ambiente local'
    if any(name.endswith(ext) for ext in ('.pem', '.key', '.p12', '.pfx', '.sqlite', '.sqlite3', '.db', '.log')):
        return 'arquivo local/sensivel'
    if re.match(r'^(credentials|credential|secrets?|private[-_]?key)(\.|$)', name, re.I):
        return 'arquivo local/sensivel'
    return None


def flush(chunks, lines, index):
    if not lines:
        return index
    payload = ''.join(lines).encode('utf-8')
    name = f'chunk-{index:03d}.jsonl'
    (OUT / name).write_bytes(payload)
    chunks.append({'arquivo': name, 'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()})
    return index + 1


def main():
    if OUT.exists():
        for p in sorted(OUT.rglob('*'), reverse=True):
            if p.is_file() or p.is_symlink():
                p.unlink()
            elif p.is_dir():
                p.rmdir()
    OUT.mkdir(parents=True, exist_ok=True)

    source_commit = subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', 'origin/main'], text=True).strip()
    tracked = subprocess.check_output(['git', '-C', str(ROOT), 'ls-files', 'modules/artisys-*'], text=True).splitlines()
    records = []
    bloqueados = []
    modules = set()
    raw_bytes = 0

    for repo_rel in sorted(tracked):
        parts = pathlib.PurePosixPath(repo_rel).parts
        if len(parts) < 3:
            continue
        module = parts[1]
        rel = '/'.join(parts[2:])
        modules.add(module)
        motivo = motivo_bloqueio(rel)
        if motivo:
            bloqueados.append(f'{module}/{rel}: {motivo}')
            continue
        data = (ROOT / repo_rel).read_bytes()
        raw_bytes += len(data)
        records.append({
            'module': module,
            'path': rel,
            'sha256': hashlib.sha256(data).hexdigest(),
            'contentBase64': base64.b64encode(data).decode('ascii'),
        })

    if bloqueados:
        raise SystemExit('Arquivos bloqueados encontrados:\n' + '\n'.join(bloqueados))

    chunks = []
    lines = []
    size = 0
    index = 1
    for rec in records:
        line = json.dumps(rec, ensure_ascii=False, separators=(',', ':')) + '\n'
        n = len(line.encode('utf-8'))
        if lines and size + n > MAX_CHUNK:
            index = flush(chunks, lines, index)
            lines = []
            size = 0
        lines.append(line)
        size += n
    flush(chunks, lines, index)

    manifest = {
        'schemaVersion': 1,
        'sourceRepository': 'nutricionistaalmeidavh-spec/utilidades',
        'sourceCommit': source_commit,
        'moduleCount': len(modules),
        'fileCount': len(records),
        'rawBytes': raw_bytes,
        'chunks': chunks,
    }
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
