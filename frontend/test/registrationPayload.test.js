import test from 'node:test';
import assert from 'node:assert/strict';

import { createRegistrationPayload } from '../src/utils/registrationPayload.js';

test('cadastro envia à API o tipo de conta selecionado', () => {
  const form = {
    username: 'Conta de teste',
    email: ' TESTE@ALUNO.IFSC.EDU.BR ',
    password: 'SenhaTeste123',
  };

  assert.deepEqual(createRegistrationPayload(form, 'creator'), {
    name: 'Conta de teste',
    email: 'teste@aluno.ifsc.edu.br',
    password: 'SenhaTeste123',
    accountType: 'creator',
  });

  assert.deepEqual(createRegistrationPayload(form, 'visitor'), {
    name: 'Conta de teste',
    email: 'teste@aluno.ifsc.edu.br',
    password: 'SenhaTeste123',
    accountType: 'visitor',
  });
});
