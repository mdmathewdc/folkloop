import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';

function log(color, tag, msg) {
  process.stdout.write(`${color}[${tag}]${RESET} ${msg}\n`);
}

function waitForPort(port, host = '127.0.0.1', timeoutMs = 30_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      const retry = () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
        } else {
          setTimeout(attempt, 500);
        }
      };
      socket.once('error', retry);
      socket.once('timeout', retry);
      socket.connect(port, host);
    };
    attempt();
  });
}

function prefixStream(stream, color, tag) {
  let buf = '';
  stream.on('data', (chunk) => {
    buf += chunk.toString();
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim().length > 0) {
        log(color, tag, line);
      }
    }
  });
}

async function main() {
  // 1. Auto-create .env from .env.example if missing
  const envFile = path.join(repoRoot, '.env');
  const envExample = path.join(repoRoot, '.env.example');
  if (!fs.existsSync(envFile) && fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envFile);
    log(GREEN, 'setup', 'Created .env from .env.example');
  }

  // 2. Start PostgreSQL + Temporal via Docker Compose
  log(GREEN, 'infra', 'Starting PostgreSQL & Temporal Server (Docker Compose)...');
  const compose = spawnSync(
    'docker',
    ['compose', '-f', 'infrastructure/docker-compose.yml', 'up', '-d'],
    { cwd: repoRoot, stdio: 'inherit' },
  );

  if (compose.status !== 0) {
    log(
      RED,
      'infra',
      'Could not start Docker containers. Make sure Docker Desktop is running, then run `pnpm dev` again.',
    );
    process.exit(1);
  }

  // 3. Wait for Postgres (5432) and Temporal (7233)
  log(GREEN, 'infra', 'Waiting for PostgreSQL (:5432) and Temporal (:7233)...');
  await Promise.all([waitForPort(5432), waitForPort(7233)]);
  log(GREEN, 'infra', 'PostgreSQL & Temporal are ready!');

  // 4. Run database migrations
  const migrate = spawnSync(process.execPath, ['scripts/migrate.mjs'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (migrate.status !== 0) {
    log(RED, 'migrate', 'Database migration failed.');
    process.exit(1);
  }

  // 5. Launch Temporal Worker + Next.js in one terminal
  log(GREEN, 'dev', 'Launching Temporal Worker and Next.js Web UI...');
  log(GREEN, 'dev', '  -> Folkloop Village: http://localhost:3000');
  log(GREEN, 'dev', '  -> Temporal Web UI:  http://localhost:8233');

  const isWin = process.platform === 'win32';
  const binExt = isWin ? '.cmd' : '';
  const tsxBin = path.join(repoRoot, 'node_modules', '.bin', `tsx${binExt}`);
  const nextBin = path.join(repoRoot, 'node_modules', '.bin', `next${binExt}`);

  const workerProc = spawn(tsxBin, ['watch', 'src/temporal/worker.ts'], {
    cwd: repoRoot,
    shell: isWin,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  prefixStream(workerProc.stdout, YELLOW, 'worker');
  prefixStream(workerProc.stderr, YELLOW, 'worker');

  const webProc = spawn(nextBin, ['dev', '-p', '3000'], {
    cwd: repoRoot,
    shell: isWin,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  prefixStream(webProc.stdout, CYAN, 'web');
  prefixStream(webProc.stderr, CYAN, 'web');

  workerProc.on('exit', (code, signal) => {
    log(
      YELLOW,
      'worker',
      `Worker exited (code=${code ?? 'null'}, signal=${signal ?? 'null'}). Web UI stays up! Run \`pnpm run dev:worker\` to restart it.`,
    );
  });

  const cleanup = () => {
    log(GREEN, 'dev', 'Shutting down Folkloop...');
    if (!workerProc.killed) workerProc.kill('SIGTERM');
    if (!webProc.killed) webProc.kill('SIGTERM');
    process.exit(0);
  };

  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);
}

main().catch((err) => {
  log(RED, 'dev', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
