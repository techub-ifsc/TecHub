const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
const {
  assertMailConfigured, assertPasswordResetConfigured,
  sendVerificationEmail, sendPasswordResetEmail, sendPasswordChangedEmail,
} = require('../src/services/mailService');

const names = [
  'NODE_ENV', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD',
  'SMTP_FROM', 'EMAIL_VERIFICATION_URL', 'PASSWORD_RESET_URL',
];
const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));

afterEach(() => {
  for (const name of names) {
    if (original[name] === undefined) delete process.env[name];
    else process.env[name] = original[name];
  }
});

function configure() {
  process.env.NODE_ENV = 'test';
  process.env.SMTP_HOST = 'smtp.example.com';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_USER = 'mailer';
  process.env.SMTP_PASSWORD = 'secret-for-test';
  process.env.SMTP_FROM = 'TecHub <no-reply@example.com>';
  process.env.EMAIL_VERIFICATION_URL = 'https://techub.example/verify-email';
  process.env.PASSWORD_RESET_URL = 'https://techub.example/reset-password';
}

test('serviço SMTP exige configuração antes de cadastrar', () => {
  for (const name of names) delete process.env[name];
  assert.throws(() => assertMailConfigured(), /Configure SMTP_HOST/);
});

test('e-mail contém link da página de confirmação e token, sem envio de rede no teste', async (t) => {
  configure();
  let transportOptions;
  let message;
  t.mock.method(nodemailer, 'createTransport', (options) => {
    transportOptions = options;
    return { sendMail: async (data) => { message = data; } };
  });
  await sendVerificationEmail('maria@ifsc.edu.br', 'a'.repeat(64));
  assert.equal(transportOptions.host, 'smtp.example.com');
  assert.equal(transportOptions.secure, true);
  assert.equal(transportOptions.auth.user, 'mailer');
  assert.equal(message.to, 'maria@ifsc.edu.br');
  assert.equal(message.subject, 'TecHub | Confirme seu e-mail');
  assert.match(message.text, /https:\/\/techub\.example\/verify-email\?token=a{64}/);
  assert.match(message.text, /24 horas/);
  assert.match(message.html, /Confirmar meu e-mail/);
  assert.match(message.html, /<table/);
  assert.match(message.html, /TecHub/);
  assert.doesNotMatch(message.html, /Tech\sHub/);
  assert.match(message.html, /background-color:#78dc50/);
  assert.match(message.html, /background-color:#18191a/);
  assert.doesNotMatch(message.html, /#00b89c|#39d5b8/i);
});

test('link de produção precisa usar HTTPS', () => {
  configure();
  process.env.NODE_ENV = 'production';
  process.env.EMAIL_VERIFICATION_URL = 'http://techub.example/verify-email';
  assert.throws(() => assertMailConfigured(), /HTTPS/);
  process.env.EMAIL_VERIFICATION_URL = 'https://techub.example/verify-email';
  process.env.PASSWORD_RESET_URL = 'http://techub.example/reset-password';
  assert.throws(() => assertPasswordResetConfigured(), /HTTPS/);
});

test('redefinição envia link de 1 hora e aviso de senha alterada, sem senha no e-mail', async (t) => {
  configure();
  const messages = [];
  t.mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async (message) => { messages.push(message); },
  }));
  assert.doesNotThrow(() => assertPasswordResetConfigured());
  await sendPasswordResetEmail('maria@ifsc.edu.br', 'b'.repeat(64));
  await sendPasswordChangedEmail('maria@ifsc.edu.br');
  assert.equal(messages.length, 2);
  assert.equal(messages[0].subject, 'TecHub | Redefina sua senha');
  assert.match(messages[0].text, /https:\/\/techub\.example\/reset-password\?token=b{64}/);
  assert.match(messages[0].text, /1 hora/);
  assert.match(messages[0].html, /Criar nova senha/);
  assert.match(messages[0].html, /background-color:#78dc50/);
  assert.match(messages[1].html, /color:#78dc50/);
  assert.equal(messages[1].subject, 'TecHub | Sua senha foi alterada');
  assert.doesNotMatch(messages[1].text, /b{64}/);
  assert.doesNotMatch(messages[1].html, /b{64}/);
});
