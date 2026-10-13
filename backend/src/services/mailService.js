const nodemailer = require('nodemailer');

// O PRD não escolhe um provedor. As credenciais ficam somente no .env local.
function mailConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const from = process.env.SMTP_FROM;
  const verificationPage = process.env.EMAIL_VERIFICATION_URL;
  if (!host || !from || !verificationPage || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Configure SMTP_HOST, SMTP_PORT, SMTP_FROM e EMAIL_VERIFICATION_URL.');
  }
  const url = new URL(verificationPage);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('EMAIL_VERIFICATION_URL deve ser uma URL HTTP(S).');
  }
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('EMAIL_VERIFICATION_URL deve usar HTTPS em produção.');
  }
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (Boolean(user) !== Boolean(pass)) {
    throw new Error('Configure SMTP_USER e SMTP_PASSWORD juntos.');
  }
  return { host, port, from, url, auth: user ? { user, pass } : undefined };
}

function assertMailConfigured() {
  mailConfig();
}

async function sendVerificationEmail(toEmail, token) {
  const config = mailConfig();
  const link = new URL(config.url);
  link.searchParams.set('token', token);
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: config.auth,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
  await transporter.sendMail({
    from: config.from,
    to: toEmail,
    subject: 'Tech Hub - confirme seu e-mail',
    text: `Confirme seu e-mail no Tech Hub: ${link.toString()}\nO link expira em 24 horas.`,
    html: `<p>Confirme seu e-mail no Tech Hub.</p><p><a href="${link.toString()}">Confirmar e-mail</a></p><p>O link expira em 24 horas.</p>`,
  });
}

module.exports = { assertMailConfigured, sendVerificationEmail };
