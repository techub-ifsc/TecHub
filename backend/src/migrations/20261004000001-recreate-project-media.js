'use strict';

// Ajusta project_media ao modelo de mídias definido para o cadastro de projetos
// (url + media_type + is_cover). A tabela anterior nunca foi usada pela aplicação;
// por segurança, a migration aborta se encontrar qualquer registro nela.
async function assertEmpty(queryInterface, transaction) {
  const [[{ exists }]] = await queryInterface.sequelize.query(
    "SELECT to_regclass('public.project_media') IS NOT NULL AS exists",
    { transaction }
  );
  if (!exists) return;

  const [[{ total }]] = await queryInterface.sequelize.query(
    'SELECT COUNT(*)::int AS total FROM public.project_media',
    { transaction }
  );
  if (total > 0) {
    throw new Error(`project_media possui ${total} registro(s). Migre os dados manualmente antes de continuar.`);
  }
}

module.exports = {
  async up(queryInterface) {
    if (queryInterface.sequelize.getDialect() !== 'postgres') {
      throw new Error('Esta migration de mídias requer PostgreSQL.');
    }
    await queryInterface.sequelize.transaction(async (transaction) => {
      await assertEmpty(queryInterface, transaction);
      await queryInterface.sequelize.query(`
        DROP TABLE IF EXISTS public.project_media;

        CREATE TABLE public.project_media (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
          url VARCHAR(500) NOT NULL,
          media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
          is_cover BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX idx_project_media_project_id ON public.project_media(project_id);
        -- Garante no banco que cada projeto tenha no máximo uma capa.
        CREATE UNIQUE INDEX idx_project_media_one_cover ON public.project_media(project_id) WHERE is_cover;
      `, { transaction });
    });
  },
  async down(queryInterface) {
    // Restaura a estrutura criada em 20260928000001-create-projects (somente se vazia).
    await queryInterface.sequelize.transaction(async (transaction) => {
      await assertEmpty(queryInterface, transaction);
      await queryInterface.sequelize.query(`
        DROP TABLE IF EXISTS public.project_media;

        CREATE TABLE public.project_media (
          id UUID PRIMARY KEY,
          project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
          url TEXT NOT NULL CHECK (char_length(btrim(url)) > 0),
          storage_key TEXT,
          original_name TEXT NOT NULL CHECK (char_length(btrim(original_name)) > 0),
          mime_type VARCHAR(150) NOT NULL CHECK (mime_type LIKE 'image/%' OR mime_type LIKE 'video/%'),
          size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 20971520),
          position SMALLINT NOT NULL CHECK (position BETWEEN 0 AND 9),
          caption VARCHAR(255),
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (project_id, position)
        );
      `, { transaction });
    });
  },
};
