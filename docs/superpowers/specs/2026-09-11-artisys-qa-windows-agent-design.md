# ArtiSys QA Windows Agent Design

## Goal

Install ArtiSys QA once on Windows 10/11 and keep it available after logon, with project registration, LAN Remote Control supervision, stable-channel auto-update, A/B rollback, and no paid service dependency.

## Architecture

The Windows agent is a long-running Node.js supervisor started through Windows Task Scheduler at user logon. It owns a small registry under `%LOCALAPPDATA%\ArtiSys\QA`, starts one Remote Control child per registered project, checks a stable channel periodically, and delegates actual QA execution to the existing ArtiSys QA CLI.

Updates are A/B: the bootstrap always starts the active slot. The updater prepares the inactive slot, validates the candidate, switches the active-slot pointer only after validation, and falls back to the previous slot if the new agent cannot become healthy.

## Stable channel

`modules/artisys-qa/stable-channel.json` is the only automatic-update signal. The agent runs `git fetch origin main`, reads that file from `origin/main`, compares the declared semantic version to the installed version, and only updates when the stable-channel version increases. The candidate commit is the fetched `origin/main` commit containing that stable declaration. Because the repository is private, update operations reuse the machine's existing Git authentication; the agent never stores a GitHub token.

## Windows startup

Installation uses a PowerShell script and the built-in Task Scheduler (`schtasks.exe`). The task starts `%LOCALAPPDATA%\ArtiSys\QA\bootstrap.mjs` at user logon. No Windows service wrapper or paid dependency is required.

## Project registry

Projects are registered by absolute manifest path. Registry fields are `id`, `name`, `config`, `host`, `port`, `token`, and `enabled`. Ports are deterministic and must be unique. Tokens are generated locally and stored only in the user's local agent state.

Commands:

- `artisys-qa agent register --config <manifest> [--name <name>] [--port <port>]`
- `artisys-qa agent unregister --project <id>`
- `artisys-qa agent list`
- `artisys-qa agent status`
- `artisys-qa agent autoupdate on|off`
- `artisys-qa agent run`

## Security

- LAN Remote Control remains token-authenticated.
- No arbitrary shell command is accepted remotely.
- Project manifests are whitelisted by local registry.
- Update source is fixed to the configured repository and stable channel.
- Update failures keep the current slot active.
- Candidate validation runs before slot activation.
- Tokens are never written to repository files.

## Compatibility

The agent requires Node.js 22+, Git, and Windows 10/11. Existing `quick`, `full`, `release`, `run`, and `remote` commands remain unchanged. The agent is optional and does not become a dependency of normal QA execution.
