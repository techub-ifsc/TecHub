// Auditoria das dependências de produção usada no CI: falha com alerta high ou
// critical, exceto os listados abaixo, cada um com o motivo de não afetar a API.
// Revisar a lista sempre que uma dependência mudar; o script avisa quando uma
// exceção não aparece mais e pode ser apagada.
const { spawnSync } = require('child_process');

const ALLOWED = {
  // Falha no zod 4 ($ZodArray em v4/core). O pacote 3.25 traz esse código junto, mas
  // a API usa só require('zod'), que carrega a versão 3 (v3/*). Não há 3.x corrigida;
  // sai da lista na migração para o zod 4.6.6+.
  'GHSA-mrhx-c7xc-m3w5': 'zod: código do zod 4 não é carregado pela API',
};

// Pelo "npm run", npm_execpath aponta o npm em uso; chamá-lo pelo node evita shell no Windows.
const npm = process.env.npm_execpath
  ? [process.execPath, [process.env.npm_execpath]]
  : ['npm', []];
const result = spawnSync(npm[0], [...npm[1], 'audit', '--omit=dev', '--json'], {
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});
let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error('Não foi possível ler a saída do npm audit.');
  console.error(result.error?.message || result.stderr || result.stdout);
  process.exit(1);
}

const found = new Map();
for (const vulnerability of Object.values(report.vulnerabilities || {})) {
  for (const advisory of vulnerability.via) {
    if (typeof advisory !== 'object' || !['high', 'critical'].includes(advisory.severity)) continue;
    const id = advisory.url.split('/').pop();
    found.set(id, `${advisory.name} (${advisory.severity}): ${advisory.title} - ${advisory.url}`);
  }
}

const blocking = [...found].filter(([id]) => !ALLOWED[id]);
for (const [id, reason] of Object.entries(ALLOWED)) {
  if (found.has(id)) console.log(`Ignorado ${id}: ${reason}`);
  else console.log(`Aviso: ${id} não aparece mais na auditoria; pode sair da lista.`);
}
if (blocking.length) {
  console.error('Alertas high/critical em dependências de produção:');
  for (const [, line] of blocking) console.error(`- ${line}`);
  process.exit(1);
}
console.log('Nenhum alerta high/critical fora da lista de exceções.');
