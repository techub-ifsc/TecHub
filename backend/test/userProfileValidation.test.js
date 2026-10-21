const test = require('node:test');
const assert = require('node:assert/strict');
const { profileSchema } = require('../src/validators/userProfileValidators');
const base = {
  name: 'Pessoa Teste',
  major: 'Ciência da Computação'
};

test('aceita links HTTPS e campos opcionais vazios', () => {
  const result = profileSchema.parse({ ...base, github_url: 'https://github.com/exemplo', linkedin_url: '', bio: '' });
  assert.equal(result.linkedin_url, null);
});
test('rejeita HTTP e URL inválida', () => {
  for (const github_url of ['http://github.com/teste', 'não-é-url']) {
    assert.equal(profileSchema.safeParse({ ...base, github_url }).success, false);
  }
});
test('valida nome entre 3 e 100 caracteres', () => {
  assert.equal(profileSchema.safeParse({ ...base, name: 'AB' }).success, false);
  assert.equal(profileSchema.safeParse({ ...base, name: 'X'.repeat(101) }).success, false);
});
test('valida bio até 500 caracteres', () => {
  assert.equal(profileSchema.safeParse({ ...base, bio: 'X'.repeat(501) }).success, false);
});
test('valida curso', () => {
  assert.equal(
    profileSchema.safeParse({
      ...base,
      major: 'Curso inexistente'
    }).success,
    false
  );
});
