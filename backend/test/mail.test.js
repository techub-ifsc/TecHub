const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');
const { assertMailConfigured, sendVerificationEmail } = require('../src/services/mailService');

const names = [
  'NODE_ENV', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD',
  'SMTP_FROM', 'EMAIL_VERIFICATION_URL',
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
  process.env.SMTP_FROM = 'Tech Hub <no-reply@example.com>';
  process.env.EMAIL_VERIFICATION_URL = 'https://techub.example/verify-email';
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
  assert.match(message.text, /https:\/\/techub\.example\/verify-email\?token=a{64}/);
  assert.match(message.text, /24 horas/);
});

test('link de produção precisa usar HTTPS', () => {
  configure();
  process.env.NODE_ENV = 'production';
  process.env.EMAIL_VERIFICATION_URL = 'http://techub.example/verify-email';
  assert.throws(() => assertMailConfigured(), /HTTPS/);
});
