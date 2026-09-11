#!/usr/bin/env node
import path from 'node:path';
import { defaultAgentRoot, loadAgentState, registerAgentProject, unregisterAgentProject, setAgentAutoUpdate } from './agent-state.js';
import { readAgentHealth, startAgentSupervisor } from './agent-supervisor.js';
import { checkForStableUpdate } from './agent-updater.js';

function parseArgs(argv) {
  const [command = 'status', ...rest] = argv;
  const args = { command, positional: [] };
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (!token.startsWith('--')) {
      args.positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const value = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true;
    args[key] = value;
  }
  return args;
}

function usage() {
  console.log(`ArtiSys QA Agent\n\nCommands:\n  artisys-qa-agent register --config C:\\projeto\\qa\\artisys-qa.config.json [--name Sistema] [--port 4173]\n  artisys-qa-agent unregister --project sistema\n  artisys-qa-agent list\n  artisys-qa-agent status\n  artisys-qa-agent autoupdate on|off\n  artisys-qa-agent check-update\n  artisys-qa-agent run`);
}

function safeProject(project) {
  return {
    id: project.id,
    name: project.name,
    config: project.config,
    host: project.host,
    port: project.port,
    enabled: project.enabled !== false,
    url: `http://127.0.0.1:${project.port}`,
  };
}

async function nextPort(root) {
  const state = await loadAgentState(root);
  const used = new Set(state.projects.map(project => Number(project.port)));
  let port = 4173;
  while (used.has(port) && port < 65535) port += 1;
  return port;
}

const args = parseArgs(process.argv.slice(2));
const root = args.root ? path.resolve(String(args.root)) : defaultAgentRoot();

if (args.help || args.command === 'help') {
  usage();
  process.exit(0);
}

try {
  if (args.command === 'register') {
    if (!args.config || args.config === true) throw new Error('register requires --config');
    const config = path.resolve(String(args.config));
    const port = args.port && args.port !== true ? Number(args.port) : await nextPort(root);
    const project = await registerAgentProject({
      config,
      name: args.name && args.name !== true ? String(args.name) : undefined,
      id: args.id && args.id !== true ? String(args.id) : undefined,
      host: args.host && args.host !== true ? String(args.host) : '0.0.0.0',
      port,
    }, { root });
    console.log(JSON.stringify({ ...safeProject(project), token: project.token }, null, 2));
    console.log('Project registered. The running agent will pick it up automatically.');
  } else if (args.command === 'unregister') {
    const project = args.project && args.project !== true ? String(args.project) : args.positional[0];
    if (!project) throw new Error('unregister requires --project <id>');
    const id = await unregisterAgentProject(project, { root });
    console.log(`unregistered ${id}`);
  } else if (args.command === 'list') {
    const state = await loadAgentState(root);
    console.log(JSON.stringify(state.projects.map(safeProject), null, 2));
  } else if (args.command === 'status') {
    const state = await loadAgentState(root);
    const health = await readAgentHealth(root);
    console.log(JSON.stringify({
      root,
      autoUpdate: state.autoUpdate,
      activeSlot: state.activeSlot,
      previousSlot: state.previousSlot,
      lastUpdateCheckAt: state.lastUpdateCheckAt,
      lastUpdateResult: state.lastUpdateResult,
      projects: state.projects.map(safeProject),
      health,
    }, null, 2));
  } else if (args.command === 'autoupdate') {
    const value = String(args.positional[0] || '').toLowerCase();
    if (!['on', 'off'].includes(value)) throw new Error('autoupdate requires on or off');
    const enabled = await setAgentAutoUpdate(value === 'on', { root });
    console.log(`autoUpdate=${enabled}`);
  } else if (args.command === 'check-update') {
    const result = await checkForStableUpdate({ root });
    console.log(JSON.stringify({ ...result, error: result.error?.message || null }, null, 2));
    process.exit(result.reason === 'failed' ? 1 : 0);
  } else if (args.command === 'run') {
    await startAgentSupervisor({ root });
    await new Promise(() => {});
  } else {
    usage();
    throw new Error(`Unknown agent command: ${args.command}`);
  }
} catch (error) {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
}
