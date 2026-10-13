'use strict';

// Moderação institucional: o projeto precisa ser aprovado antes de ficar público.
// Os projetos que já existiam eram públicos, então entram como aprovados; a partir
// daqui o padrão da coluna é 'pending'. Só acrescenta colunas: nenhum dado é removido.
module.exports = {
  async up(queryInterface) {
    if (queryInterface.sequelize.getDialect() !== 'postgres') {
      throw new Error('Esta migration de moderação requer PostgreSQL.');
    }
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE public.projects
          ADD COLUMN approval_status VARCHAR(16) NOT NULL DEFAULT 'approved'
            CONSTRAINT projects_approval_status_check
            CHECK (approval_status IN ('pending', 'approved', 'rejected')),
          ADD COLUMN submitted_at TIMESTAMPTZ,
          ADD COLUMN review_notes TEXT,
          ADD COLUMN reviewed_at TIMESTAMPTZ;

        UPDATE public.projects SET submitted_at = created_at;

        ALTER TABLE public.projects
          ALTER COLUMN approval_status SET DEFAULT 'pending',
          ALTER COLUMN submitted_at SET DEFAULT CURRENT_TIMESTAMP,
          ALTER COLUMN submitted_at SET NOT NULL,
          -- Garante no banco que toda rejeição guarde a justificativa exibida ao criador.
          ADD CONSTRAINT projects_rejection_needs_notes CHECK (
            approval_status <> 'rejected'
            OR (review_notes IS NOT NULL AND char_length(btrim(review_notes)) > 0)
          );

        CREATE INDEX projects_approval_submitted_idx
          ON public.projects(approval_status, submitted_at);
      `, { transaction });
    });
  },
  async down(queryInterface) {
    // Rollback apaga as decisões e justificativas da moderação. Não executar no banco
    // compartilhado sem combinar com a equipe.
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DROP INDEX public.projects_approval_submitted_idx;
        ALTER TABLE public.projects
          DROP CONSTRAINT projects_rejection_needs_notes,
          DROP COLUMN reviewed_at,
          DROP COLUMN review_notes,
          DROP COLUMN submitted_at,
          DROP COLUMN approval_status;
      `, { transaction });
    });
  },
};
