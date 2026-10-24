const { spawn } = require('child_process');
const path = require('path');

const defaultTestFiles = [
  'test/auth.test.js',
  'test/mail.test.js',
  'test/media.test.js',
  'test/projects.test.js',
  'test/moderation.test.js',
  'test/userProfileValidation.test.js',
  'test/userProfileUpload.test.js',
  'test/security.test.js',
  'test/chat.test.js',
];

const rawArgs = process.argv.slice(2);
let detectOpenHandles = false;
let runInBand = false;
let watch = false;
const testFiles = [];

for (const arg of rawArgs) {
  if (arg === '--detectOpenHandles') {
    detectOpenHandles = true;
  } else if (arg === '--runInBand' || arg === '-i') {
    runInBand = true;
  } else if (arg === '--watchAll=false' || arg === '--watch=false') {
    watch = false;
  } else if (arg === '--watchAll' || arg === '--watch' || arg === '--watchAll=true') {
    watch = true;
  } else if (!arg.startsWith('-')) {
    testFiles.push(arg);
  }
}

const filesToRun = testFiles.length > 0 ? testFiles : defaultTestFiles;

const nodeArgs = ['--test'];

if (runInBand) {
  nodeArgs.push('--test-concurrency=1');
}

if (watch) {
  nodeArgs.push('--watch');
}

nodeArgs.push(...filesToRun);

if (detectOpenHandles) {
  console.log('[test-runner] Modo --detectOpenHandles ativado: monitorando handles e conexões.');
}

if (runInBand) {
  console.log('[test-runner] Modo --runInBand ativado: testes executados sequencialmente (concurrency=1).');
}

const child = spawn(process.execPath, nodeArgs, {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
  env: {
    ...process.env,
    DETECT_OPEN_HANDLES: detectOpenHandles ? 'true' : 'false',
  },
});

child.on('exit', (code, signal) => {
  if (detectOpenHandles) {
    const stdio = [process.stdin, process.stdout, process.stderr];
    const handles = typeof process._getActiveHandles === 'function' ? process._getActiveHandles() : [];
    const openSockets = handles.filter((h) => h && !stdio.includes(h) && (h.constructor?.name === 'Socket' || h.constructor?.name === 'Server'));
    if (openSockets.length > 0) {
      console.warn(`[test-runner] Aviso: ${openSockets.length} handle(s) pendente(s):`, openSockets.map((s) => s.constructor?.name));
    } else {
      console.log('[test-runner] Nenhum handle aberto pendente. Encerrado limpo.');
    }
  }

  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
