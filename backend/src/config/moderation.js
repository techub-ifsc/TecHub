const DEFAULT_SLA_DAYS = 3;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Prazo, em dias corridos, que a moderação tem para analisar um projeto enviado.
function getModerationSlaDays() {
  const days = Number(process.env.MODERATION_SLA_DAYS);
  return Number.isInteger(days) && days > 0 ? days : DEFAULT_SLA_DAYS;
}

// Data limite da análise, contada a partir do envio (ou reenvio) do projeto.
function getReviewDueDate(submittedAt) {
  return new Date(new Date(submittedAt).getTime() + getModerationSlaDays() * DAY_IN_MS);
}

module.exports = { getModerationSlaDays, getReviewDueDate };
