import test from 'node:test';
import assert from 'node:assert/strict';

import { getSlaStatus } from '../src/utils/moderationSla.js';

// Projeto enviado em 10/10 ao meio-dia, com prazo de 3 dias.
const project = {
  submittedAt: '2026-10-10T12:00:00.000Z',
  dueAt: '2026-10-13T12:00:00.000Z',
};
const at = (iso) => getSlaStatus(project, new Date(iso));

test('dentro do prazo mostra os dias que faltam', () => {
  assert.deepEqual(at('2026-10-10T12:00:00.000Z'), { tone: 'ok', label: 'Faltam 3 dias', progress: 0 });
  assert.deepEqual(at('2026-10-11T00:00:00.000Z'), { tone: 'ok', label: 'Faltam 2 dias', progress: 17 });
  assert.deepEqual(at('2026-10-11T18:00:00.000Z'), { tone: 'ok', label: 'Falta 1 dia', progress: 42 });
});

test('nas últimas 24 horas vira alerta e conta em horas', () => {
  assert.deepEqual(at('2026-10-12T12:00:00.000Z'), { tone: 'warning', label: 'Vence em 24 horas', progress: 67 });
  assert.deepEqual(at('2026-10-13T10:59:00.000Z'), { tone: 'warning', label: 'Vence em 1 hora', progress: 99 });
  assert.deepEqual(at('2026-10-13T11:30:00.000Z'), { tone: 'warning', label: 'Vence em menos de 1 hora', progress: 99 });
  assert.equal(at('2026-10-13T12:00:00.000Z').tone, 'warning');
});

test('depois do prazo mostra há quanto tempo está atrasado', () => {
  assert.deepEqual(at('2026-10-13T12:10:00.000Z'), { tone: 'late', label: 'Atrasado há 1 hora', progress: 100 });
  assert.deepEqual(at('2026-10-13T17:00:00.000Z'), { tone: 'late', label: 'Atrasado há 5 horas', progress: 100 });
  assert.deepEqual(at('2026-10-14T12:00:00.000Z'), { tone: 'late', label: 'Atrasado há 1 dia', progress: 100 });
  assert.deepEqual(at('2026-10-20T13:00:00.000Z'), { tone: 'late', label: 'Atrasado há 7 dias', progress: 100 });
});

test('datas ausentes ou inválidas não geram prazo', () => {
  assert.equal(getSlaStatus({ submittedAt: null, dueAt: null }), null);
  assert.equal(getSlaStatus({ submittedAt: 'x', dueAt: project.dueAt }), null);
  assert.equal(getSlaStatus({ submittedAt: project.dueAt, dueAt: project.submittedAt }), null);
});
