const nodemailer = require('nodemailer');

// O provedor SMTP e as URLs públicas vêm do ambiente, nunca do Host da requisição.
function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const from = process.env.SMTP_FROM;
  if (!host || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Configure SMTP_HOST, SMTP_PORT e SMTP_FROM.');
  }
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (Boolean(user) !== Boolean(pass)) {
    throw new Error('Configure SMTP_USER e SMTP_PASSWORD juntos.');
  }
  return { host, port, from, auth: user ? { user, pass } : undefined };
}

function pageUrl(variable) {
  const value = process.env[variable];
  if (!value) throw new Error(`Configure ${variable}.`);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variable} deve ser uma URL HTTP(S).`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${variable} deve ser uma URL HTTP(S).`);
  }
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error(`${variable} deve usar HTTPS em produção.`);
  }
  return url;
}

function assertMailConfigured() {
  smtpConfig();
  pageUrl('EMAIL_VERIFICATION_URL');
}

function assertPasswordResetConfigured() {
  smtpConfig();
  pageUrl('PASSWORD_RESET_URL');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

// Corresponde aos tons de frontend/src/index.css e frontend/src/pages/LoginPage.css.
// E-mails usam valores inline, pois clientes de e-mail não leem variáveis CSS do site.
const EMAIL_PALETTE = Object.freeze({
  canvas: '#18191a',
  surface: '#222426',
  header: '#1e2022',
  border: '#33363a',
  green: '#78dc50',
  text: '#ffffff',
  muted: '#b6b9bd',
  buttonText: '#101010',
});

// Tabelas e estilos inline têm suporte amplo em clientes de e-mail.
// O texto simples continua disponível para acessibilidade e clientes sem HTML.
function emailHtml({ preview, title, message, action, link, detail }) {
  const button = link
    ? `<tr><td style="padding:28px 0 24px;"><a href="${escapeHtml(link)}" style="display:inline-block;background-color:${EMAIL_PALETTE.green};color:${EMAIL_PALETTE.buttonText};text-decoration:none;font-size:15px;font-weight:700;line-height:20px;padding:15px 24px;border-radius:8px;">${escapeHtml(action)}</a></td></tr>`
    : '';
  const fallback = link
    ? `<tr><td style="color:${EMAIL_PALETTE.muted};font-size:13px;line-height:20px;padding:0 0 18px;">Se o botão não funcionar, copie este endereço no navegador:<br><a href="${escapeHtml(link)}" style="color:${EMAIL_PALETTE.green};word-break:break-all;">${escapeHtml(link)}</a></td></tr>`
    : '';
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:${EMAIL_PALETTE.canvas};font-family:Arial,Helvetica,sans-serif;color:${EMAIL_PALETTE.text};">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${escapeHtml(preview)}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="${EMAIL_PALETTE.canvas}" style="background-color:${EMAIL_PALETTE.canvas};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="${EMAIL_PALETTE.surface}" style="max-width:560px;background-color:${EMAIL_PALETTE.surface};border:1px solid ${EMAIL_PALETTE.border};border-radius:12px;overflow:hidden;">
        <tr><td bgcolor="${EMAIL_PALETTE.header}" style="background-color:${EMAIL_PALETTE.header};padding:28px 36px;border-bottom:1px solid ${EMAIL_PALETTE.border};">
          <span style="color:${EMAIL_PALETTE.text};font-size:26px;font-weight:800;letter-spacing:-1px;">Tec<span style="color:${EMAIL_PALETTE.green};">Hub</span></span>
          <div style="color:${EMAIL_PALETTE.muted};font-size:12px;letter-spacing:1.4px;text-transform:uppercase;padding-top:8px;">Seu espaço para criar e compartilhar</div>
        </td></tr>
        <tr><td style="padding:36px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="color:${EMAIL_PALETTE.text};font-size:24px;font-weight:700;line-height:31px;padding-bottom:16px;">${escapeHtml(title)}</td></tr>
            <tr><td style="color:${EMAIL_PALETTE.muted};font-size:15px;line-height:24px;">${escapeHtml(message)}</td></tr>
            ${button}${fallback}
            <tr><td style="border-top:1px solid ${EMAIL_PALETTE.border};padding-top:20px;color:${EMAIL_PALETTE.muted};font-size:13px;line-height:21px;">${escapeHtml(detail)}</td></tr>
          </table>
        </td></tr>
      </table>
      <div style="max-width:560px;color:${EMAIL_PALETTE.muted};font-size:12px;line-height:18px;padding:20px 12px;text-align:center;">Mensagem automática do TecHub. Não responda a este e-mail.</div>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendMessage(toEmail, message) {
  const config = smtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: config.auth,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
  await transporter.sendMail({ from: config.from, to: toEmail, ...message });
}

async function sendVerificationEmail(toEmail, token) {
  const link = pageUrl('EMAIL_VERIFICATION_URL');
  link.searchParams.set('token', token);
  const address = link.toString();
  await sendMessage(toEmail, {
    subject: 'TecHub | Confirme seu e-mail',
    text: `Olá!\n\nConfirme seu e-mail para ativar sua conta no TecHub:\n${address}\n\nEste link é válido por 24 horas e pode ser usado uma única vez. Se você não criou esta conta, ignore esta mensagem.\n\nEquipe TecHub`,
    html: emailHtml({
      preview: 'Confirme seu e-mail para começar a usar o TecHub.',
      title: 'Falta só confirmar seu e-mail',
      message: 'Sua conta está quase pronta. Confirme seu endereço para entrar no TecHub e acompanhar seus projetos.',
      action: 'Confirmar meu e-mail',
      link: address,
      detail: 'Este link vale por 24 horas e pode ser usado uma vez. Se você não criou a conta, ignore esta mensagem.',
    }),
  });
}

async function sendPasswordResetEmail(toEmail, token) {
  const link = pageUrl('PASSWORD_RESET_URL');
  link.searchParams.set('token', token);
  const address = link.toString();
  await sendMessage(toEmail, {
    subject: 'TecHub | Redefina sua senha',
    text: `Olá!\n\nRecebemos um pedido para redefinir a senha da sua conta TecHub. Crie uma nova senha aqui:\n${address}\n\nEste link é válido por 1 hora e pode ser usado uma única vez. Se você não pediu a redefinição, ignore esta mensagem; sua senha atual continua válida.\n\nEquipe TecHub`,
    html: emailHtml({
      preview: 'Use este link para criar uma nova senha no TecHub.',
      title: 'Vamos redefinir sua senha?',
      message: 'Recebemos um pedido para criar uma nova senha para sua conta. Use o botão abaixo para continuar com segurança.',
      action: 'Criar nova senha',
      link: address,
      detail: 'O link vale por 1 hora e pode ser usado uma vez. Não foi você? Ignore esta mensagem; sua senha não muda.',
    }),
  });
}

async function sendPasswordChangedEmail(toEmail) {
  await sendMessage(toEmail, {
    subject: 'TecHub | Sua senha foi alterada',
    text: 'Olá!\n\nA senha da sua conta TecHub foi alterada. Se não foi você, entre em contato com a equipe responsável imediatamente.\n\nEquipe TecHub',
    html: emailHtml({
      preview: 'A senha da sua conta TecHub foi alterada.',
      title: 'Sua senha foi alterada',
      message: 'A nova senha já está ativa. Entre normalmente pela página de login.',
      detail: 'Não reconhece esta alteração? Entre em contato com a equipe responsável imediatamente.',
    }),
  });
}

module.exports = {
  assertMailConfigured,
  assertPasswordResetConfigured,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
};
