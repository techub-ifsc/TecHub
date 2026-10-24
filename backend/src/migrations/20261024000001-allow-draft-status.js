'use strict';

// Rascunhos salvos no backend usam approval_status = 'draft', que o CHECK da moderação
// não aceitava (salvar rascunho dava 500). Só amplia a lista: nenhum dado muda.
// O CHECK é localizado pela definição, e não pelo nome, porque o banco de produção não
// foi criado só pelas migrations; a regra da justificativa de rejeição não é tocada.
const FIND_STATUS_CHECKS = `
  SELECT conname FROM pg_constraint
  WHERE conrelid = 'public.projects'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%approval_status%'
    AND pg_get_constraintdef(oid) NOT LIKE '%review_notes%'
`;

async function replaceStatusCheck(queryInterface, transaction, statuses) {
  const [checks] = await queryInterface.sequelize.query(FIND_STATUS_CHECKS, { transaction });
  for (const { conname } of checks) {
    await queryInterface.sequelize.query(
      `ALTER TABLE public.projects DROP CONSTRAINT "${conname.replace(/"/g, '""')}"`,
      { transaction }
    );
  }
  const list = statuses.map((status) => `'${status}'`).join(', ');
  await queryInterface.sequelize.query(
    `ALTER TABLE public.projects ADD CONSTRAINT projects_approval_status_check
       CHECK (approval_status IN (${list}))`,
    { transaction }
  );
}

module.exports = {
  async up(queryInterface) {
    if (queryInterface.sequelize.getDialect() !== 'postgres') {
      throw new Error('Esta migration de rascunhos requer PostgreSQL.');
    }
    await queryInterface.sequelize.transaction(async (transaction) => {
      await replaceStatusCheck(queryInterface, transaction, ['draft', 'pending', 'approved', 'rejected']);
    });
  },
  async down(queryInterface) {
    // Só volta se não houver rascunhos: apagá-los perderia o trabalho dos criadores.
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [[{ total }]] = await queryInterface.sequelize.query(
        "SELECT COUNT(*)::int AS total FROM public.projects WHERE approval_status = 'draft'",
        { transaction }
      );
      if (total > 0) {
        throw new Error(`Existem ${total} rascunho(s). Publique ou remova antes de desfazer esta migration.`);
      }
      await replaceStatusCheck(queryInterface, transaction, ['pending', 'approved', 'rejected']);
    });
  },
};
