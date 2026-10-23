const { ZodError } = require('zod');

// Responde com erro 404 quando nenhuma rota corresponde à requisição.
function notFoundHandler(req, res) {
  res.status(404).json({ message: 'Rota não encontrada.' });
}

// eslint-disable-next-line no-unused-vars
// Converte erros da aplicação, validação e banco em respostas HTTP padronizadas.
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Dados inválidos.',
      errors: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ message: 'Registro já existe.' });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      message: 'Dados inválidos.',
      errors: err.errors.map((e) => ({ path: e.path, message: e.message })),
    });
  }

  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }

  // Mensagens de ApiError são escritas por nós e podem ir ao cliente mesmo com status 5xx
  // (ex.: serviço indisponível). Erros inesperados continuam com a mensagem genérica.
  const exposeMessage = err instanceof ApiError || status < 500;
  res.status(status).json({
    message: exposeMessage ? err.message : 'Erro interno do servidor.',
  });
}

class ApiError extends Error {
  // Cria um erro de negócio com código HTTP e mensagem controlados.
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = { notFoundHandler, errorHandler, ApiError };
