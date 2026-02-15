#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync, spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RUN_DIR = path.join(ROOT, '.run');
const LOG_DIR = path.join(RUN_DIR, 'logs');
const STATE_FILE = path.join(RUN_DIR, 'dev-processes.json');

const SERVICES = {
  api: {
    name: 'api',
    port: 3001,
    cwd: path.join(ROOT, 'apps', 'api'),
    command: ['pnpm', 'start:dev'],
    log: path.join(LOG_DIR, 'api.log'),
  },
  web: {
    name: 'web',
    port: 3000,
    cwd: path.join(ROOT, 'apps', 'web'),
    command: ['pnpm', 'dev'],
    log: path.join(LOG_DIR, 'web.log'),
  },
};

function ensureRunDirs() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function sleep(ms) {
  const array = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(array, 0, 0, ms);
}

function parseSemver(input) {
  const parts = String(input || '')
    .replace(/^v/, '')
    .split('.')
    .map((n) => Number.parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return { major: parts[0], minor: parts[1], patch: parts[2] };
}

function compareSemver(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function semverAtLeast(version, minimum) {
  const a = parseSemver(version);
  const b = parseSemver(minimum);
  if (!a || !b) return false;
  return compareSemver(a, b) >= 0;
}

function resolveNodeBin() {
  const current = process.execPath;
  const currentVersion = String(process.version || '').replace(/^v/, '');
  if (semverAtLeast(currentVersion, '20.9.0')) {
    return current;
  }

  const nvmDir = process.env.NVM_DIR || path.join(os.homedir(), '.nvm');
  const versionsDir = path.join(nvmDir, 'versions', 'node');
  if (!fs.existsSync(versionsDir)) {
    return current;
  }

  let best = null;
  for (const entry of fs.readdirSync(versionsDir)) {
    const match = entry.match(/^v(\d+\.\d+\.\d+)$/);
    if (!match) continue;
    const version = match[1];
    if (!semverAtLeast(version, '20.9.0')) continue;
    const candidate = path.join(versionsDir, entry, 'bin', 'node');
    if (!fs.existsSync(candidate)) continue;
    if (!best || compareSemver(parseSemver(version), parseSemver(best.version)) > 0) {
      best = { version, candidate };
    }
  }

  return best?.candidate || current;
}

function resolvePortPid(port) {
  try {
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    if (!out) return null;
    const pid = Number.parseInt(out.split('\n')[0], 10);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

function isAlive(pid) {
  if (!pid || !Number.isFinite(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readState() {
  if (!fs.existsSync(STATE_FILE)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeState(state) {
  ensureRunDirs();
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function normalizeTargets(args) {
  const raw = args.filter(Boolean);
  if (raw.length === 0 || raw.includes('all')) return Object.keys(SERVICES);
  const invalid = raw.filter((name) => !SERVICES[name]);
  if (invalid.length) {
    throw new Error(`Unknown target(s): ${invalid.join(', ')}. Use: api | web | all`);
  }
  return [...new Set(raw)];
}

function serviceEnv(nodeBin) {
  const nodeDir = path.dirname(nodeBin);
  return {
    ...process.env,
    NODE_ENV: 'development',
    PATH: `${nodeDir}:${process.env.PATH || ''}`,
  };
}

function spawnService(service, nodeBin) {
  ensureRunDirs();
  const logFd = fs.openSync(service.log, 'a');
  try {
    const child = spawn(service.command[0], service.command.slice(1), {
      cwd: service.cwd,
      env: serviceEnv(nodeBin),
      detached: true,
      stdio: ['ignore', logFd, logFd],
    });
    child.unref();
    return child.pid;
  } finally {
    fs.closeSync(logFd);
  }
}

function stopPid(pid, managed) {
  if (!isAlive(pid)) return false;
  try {
    if (managed) {
      process.kill(-pid, 'SIGTERM');
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      return false;
    }
  }

  const end = Date.now() + 5000;
  while (Date.now() < end) {
    if (!isAlive(pid)) return true;
    sleep(100);
  }

  try {
    if (managed) {
      process.kill(-pid, 'SIGKILL');
    } else {
      process.kill(pid, 'SIGKILL');
    }
  } catch {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      return !isAlive(pid);
    }
  }
  return !isAlive(pid);
}

function cmdUp(targets) {
  const state = readState();
  const nodeBin = resolveNodeBin();

  console.log(`Using Node: ${nodeBin}`);
  for (const name of targets) {
    const service = SERVICES[name];
    const tracked = state[name];
    const trackedAlive = tracked?.pid && isAlive(tracked.pid);
    if (trackedAlive) {
      console.log(`[${name}] already running (pid ${tracked.pid}, port ${service.port})`);
      continue;
    }

    const portPid = resolvePortPid(service.port);
    if (portPid) {
      state[name] = {
        pid: portPid,
        port: service.port,
        managed: false,
        log: service.log,
        cwd: service.cwd,
        adoptedAt: new Date().toISOString(),
      };
      console.log(`[${name}] already listening on port ${service.port} (pid ${portPid}), not starting duplicate`);
      continue;
    }

    const pid = spawnService(service, nodeBin);
    if (!pid) {
      console.error(`[${name}] failed to start`);
      continue;
    }

    state[name] = {
      pid,
      port: service.port,
      managed: true,
      log: service.log,
      cwd: service.cwd,
      nodeBin,
      startedAt: new Date().toISOString(),
    };
    console.log(`[${name}] started (pid ${pid}, port ${service.port})`);
    console.log(`[${name}] log: ${service.log}`);
  }

  writeState(state);
}

function cmdDown(targets) {
  const state = readState();

  for (const name of targets) {
    const service = SERVICES[name];
    const tracked = state[name];
    const trackedPid = tracked?.pid;
    const portPid = resolvePortPid(service.port);
    const pidToStop = trackedPid || portPid;
    const managed = Boolean(tracked?.managed);

    if (!pidToStop) {
      console.log(`[${name}] not running`);
      delete state[name];
      continue;
    }

    const stopped = stopPid(pidToStop, managed);
    if (stopped) {
      console.log(`[${name}] stopped (pid ${pidToStop})`);
    } else {
      console.log(`[${name}] could not confirm stop for pid ${pidToStop}`);
    }
    delete state[name];
  }

  writeState(state);
}

function cmdStatus(targets) {
  const state = readState();
  for (const name of targets) {
    const service = SERVICES[name];
    const tracked = state[name];
    const trackedPid = tracked?.pid;
    const trackedAlive = trackedPid ? isAlive(trackedPid) : false;
    const portPid = resolvePortPid(service.port);

    if (trackedAlive) {
      console.log(
        `[${name}] RUNNING pid=${trackedPid} port=${service.port} managed=${Boolean(tracked?.managed)} log=${tracked?.log || service.log}`,
      );
      continue;
    }

    if (portPid) {
      console.log(`[${name}] RUNNING (untracked) pid=${portPid} port=${service.port}`);
      continue;
    }

    console.log(`[${name}] STOPPED port=${service.port}`);
  }
}

function main() {
  const [, , command = 'status', ...rest] = process.argv;
  let targets;
  try {
    targets = normalizeTargets(rest);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
    return;
  }

  if (command === 'up') {
    cmdUp(targets);
    return;
  }
  if (command === 'down' || command === 'stop') {
    cmdDown(targets);
    return;
  }
  if (command === 'status') {
    cmdStatus(targets);
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error('Usage: node scripts/dev-singleton.js <up|down|status> [api|web|all]');
  process.exit(1);
}

main();
