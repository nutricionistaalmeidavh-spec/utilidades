import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('security', Path(__file__).parents[1] / 'security.py')
security = importlib.util.module_from_spec(spec)
spec.loader.exec_module(security)

class SecurityTests(unittest.TestCase):
    def test_policy_thresholds(self):
        report = {'SchemaVersion': 2, 'ArtifactName': 'fixture', 'ArtifactType': 'filesystem', 'Metadata': {}, 'Results': [{'Target': 'package-lock.json', 'Vulnerabilities': [{'Severity': 'MEDIUM'}]}]}
        self.assertEqual(security.evaluate('trivy', report, 'commit')['blocking'], 0)
        self.assertEqual(security.evaluate('trivy', report, 'release')['blocking'], 1)
        report['Results'][0]['Vulnerabilities'][0]['Severity'] = 'UNKNOWN'
        self.assertEqual(security.evaluate('trivy', report, 'commit')['blocking'], 1)
        self.assertEqual(security.evaluate('gitleaks', [{'RuleID': 'fake', 'Secret': 'DO-NOT-PRINT'}], 'commit')['blocking'], 1)
        self.assertEqual(security.evaluate('semgrep', {'results': [{'extra': {'severity': 'ERROR'}}], 'errors': []}, 'commit')['blocking'], 1)

    def test_invalid_and_partial_reports_fail_closed(self):
        for tool, report in [('trivy', {}), ('trivy', {'SchemaVersion': 2, 'ArtifactName': 'x', 'Results': {}}), ('semgrep', {'results': [], 'errors': ['parse error']}), ('gitleaks', [{}]), ('semgrep', {})]:
            with self.subTest(tool=tool), self.assertRaises(security.GateError):
                security.evaluate(tool, report, 'commit')

    def test_cli_boundary_and_no_raw_output(self):
        calls = []
        def fake(command, **kwargs):
            if command[1] in ('version', '--version'):
                return subprocess.CompletedProcess(command, 0, stdout=security.VERSIONS[command[0]].encode())
            calls.append(command)
            self.assertEqual(kwargs['stdout'], subprocess.DEVNULL)
            self.assertEqual(kwargs['stderr'], subprocess.DEVNULL)
            tool = command[0]
            flag = '--report-path' if tool == 'gitleaks' else '--output'
            output = Path(command[command.index(flag) + 1])
            reports = {'gitleaks': [], 'trivy': {'SchemaVersion': 2, 'ArtifactName': 'fixture', 'ArtifactType': 'filesystem', 'Metadata': {}, 'Results': []}, 'semgrep': {'results': [], 'errors': []}}
            output.write_text(json.dumps(reports[tool]))
            return subprocess.CompletedProcess(command, 0)
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / '.git').mkdir()
            result = security.scan(directory, 'release', execute=fake)
        self.assertTrue(result['passed'])
        self.assertEqual(len(calls), 4)
        self.assertEqual(calls[0][1], 'dir')
        self.assertEqual(calls[1][1], 'git')
        self.assertIn('--redact=100', calls[0])
        self.assertIn('--strict', calls[-1])

    def test_docker_engine_uses_portable_container_paths(self):
        calls = []
        reports = {
            'gitleaks': [],
            'trivy': {'SchemaVersion': 2, 'ArtifactName': 'fixture', 'ArtifactType': 'filesystem', 'Metadata': {}, 'Results': []},
            'semgrep': {'results': [], 'errors': []},
        }
        def fake(command, **kwargs):
            calls.append(command)
            self.assertEqual(command[0:3], ['docker', 'run', '--rm'])
            tool = command[command.index('--entrypoint') + 1]
            flag = '--report-path' if tool == 'gitleaks' else '--output'
            container_output = command[command.index(flag) + 1]
            self.assertTrue(container_output.startswith('/artisys-output/'))
            output_mount = next(value for value in command if isinstance(value, str) and value.endswith(':/artisys-output'))
            host_output_dir = Path(output_mount[:-len(':/artisys-output')])
            host_output = host_output_dir / Path(container_output).name
            host_output.write_text(json.dumps(reports[tool]))
            self.assertIn('/workspace', command)
            self.assertIn('/artisys-security', ' '.join(command))
            return subprocess.CompletedProcess(command, 0)
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / '.git').mkdir()
            result = security.scan(directory, 'release', engine='docker', execute=fake)
        self.assertTrue(result['passed'])
        self.assertEqual(len(calls), 4)

    def test_wrong_native_version_blocks(self):
        with tempfile.TemporaryDirectory() as directory, self.assertRaises(security.GateError):
            security.scan(directory, execute=lambda *args, **kwargs: subprocess.CompletedProcess(args, 0, stdout=b'99.0.0'))

    def test_execution_failures_and_missing_report(self):
        for code in (0, 1, 2):
            with tempfile.TemporaryDirectory() as directory, self.assertRaises(security.GateError):
                security.scan(directory, execute=lambda *args, **kwargs: subprocess.CompletedProcess(args, code))
        def missing(*args, **kwargs):
            raise FileNotFoundError('DO-NOT-PRINT')
        with tempfile.TemporaryDirectory() as directory, self.assertRaises(security.GateError):
            security.scan(directory, execute=missing)

    def test_release_rejects_shallow_history(self):
        with tempfile.TemporaryDirectory() as directory:
            git = Path(directory) / '.git'
            git.mkdir()
            (git / 'shallow').write_text('fake-sha')
            with self.assertRaises(security.GateError):
                security.scan(directory, 'release')

    def test_release_requires_git_checkout(self):
        with tempfile.TemporaryDirectory() as directory, self.assertRaises(security.GateError):
            security.scan(directory, 'release', execute=lambda *args, **kwargs: subprocess.CompletedProcess(args, 2))

if __name__ == '__main__':
    unittest.main()
