// Situação do projeto na moderação institucional. Não confundir com STATUS,
// que descreve o andamento do desenvolvimento (Em design, Concluído...).
const APPROVAL_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

module.exports = { APPROVAL_STATUS };