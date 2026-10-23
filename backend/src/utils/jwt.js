const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { JWT_SECRET, JWT_EXPIRES_IN = '1d' } = process.env;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET não configurado. Defina a variável de ambiente JWT_SECRET.');
}

// Gera um token JWT assinado com o conteúdo e o prazo definidos na configuração.
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Valida a assinatura e a expiração de um token JWT e retorna seu conteúdo.
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Impressão da senha atual (HMAC do hash, que não revela a senha nem o hash).
// Vai no token da sessão: quando a senha muda, a impressão muda e os tokens antigos,
// inclusive um que tenha vazado, deixam de valer sem precisar de lista de bloqueio.
function passwordFingerprint(passwordHash) {
  return crypto.createHmac('sha256', JWT_SECRET).update(String(passwordHash)).digest('base64url').slice(0, 22);
}

// Token de sessão do usuário, ligado à senha atual.
function signSessionToken(user) {
  return signToken({
    sub: user.id,
    role: user.role,
    pwv: passwordFingerprint(user.password),
    authVersion: Number(user.authVersion || 0),
  });
}

// Confere se o token foi emitido para a senha atual. Tokens sem a impressão são os
// emitidos antes desta versão e expiram sozinhos em até JWT_EXPIRES_IN.
function isTokenForCurrentPassword(payload, user) {
  return payload.pwv === undefined || payload.pwv === passwordFingerprint(user.password);
}

module.exports = { signToken, verifyToken, signSessionToken, isTokenForCurrentPassword };
