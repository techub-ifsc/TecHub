//const nodemailer = require('nodemailer'); precisa descomentar para funiconar

// Cria o transportador de e-mails
async function createTransporter() {
  const testAccount = await nodemailer.createTestAccount();

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

async function sendVerificationEmail(toEmail, token) {
  const transporter = await createTransporter();

  // Link que o usuário vai clicar (aponta pro seu front-end ou rota de confirmação)
  const verificationUrl = `http://localhost:5173/verify-email?token=${token}`;

  const info = await transporter.sendMail({
    from: '"Techub" <no-reply@techub.edu>',
    to: toEmail,
    subject: 'Techub - Confirmação de Cadastro',
    html: `
      <div style="font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
        <h2 style="color: #38bdf8;">Confirme sua conta no Techub</h2>
        <p>Olá! Seu cadastro está quase pronto.</p>
        <p>Clique no botão abaixo para validar seu endereço de e-mail. Este link é válido por <strong>24 horas</strong>:</p>
        <p style="margin: 24px 0;">
          <a href="${verificationUrl}" style="background-color: #38bdf8; color: #0f172a; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Confirmar E-mail
          </a>
        </p>
        <p style="font-size: 12px; color: #94a3b8;">Se você não solicitou este cadastro, desconsidere esta mensagem.</p>
      </div>
    `,
  });

  // Mostra no terminal o link para abrir a caixa postal virtual e ver o e-mail que acabou de chegar
  console.log('✉️ E-mail de confirmação enviado!');
  console.log('🔗 Visualize o e-mail aqui:', nodemailer.getTestMessageUrl(info));
}

module.exports = { sendVerificationEmail };