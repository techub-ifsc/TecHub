'use strict';

// Nova estrutura: não altera as migrations nem as tabelas anteriores.
// PostgreSQL (Neon). Cada direção executa em uma transação.
module.exports = {
  async up(queryInterface) {
    if (queryInterface.sequelize.getDialect() !== 'postgres') {
      throw new Error('Esta migration de projetos requer PostgreSQL.');
    }
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        CREATE TABLE public.projects (
          id UUID PRIMARY KEY,
          owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
          title VARCHAR(200) NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
          description TEXT NOT NULL DEFAULT '',
          description_text TEXT NOT NULL DEFAULT '' CHECK (char_length(description_text) <= 3000),
          course VARCHAR(150),
          phase SMALLINT CHECK (phase > 0),
          status VARCHAR(40) NOT NULL DEFAULT 'Em desenvolvimento'
            CHECK (status IN ('Em design', 'Em desenvolvimento', 'Concluído', 'Pausado')),
          publication_status VARCHAR(16) NOT NULL DEFAULT 'draft'
            CHECK (publication_status IN ('draft', 'published')),
          github_url TEXT,
          live_url TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT projects_published_fields CHECK (
            publication_status = 'draft' OR (
              char_length(btrim(title)) >= 3 AND
              char_length(btrim(description_text)) >= 20 AND
              course IS NOT NULL AND char_length(btrim(course)) > 0 AND
              phase IS NOT NULL
            )
          )
        );
        CREATE INDEX projects_owner_id_idx ON public.projects(owner_id);
        CREATE INDEX projects_publication_created_idx ON public.projects(publication_status, created_at DESC);
        CREATE INDEX projects_course_phase_idx ON public.projects(course, phase);

        CREATE TABLE public.project_technologies (
          project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL CHECK (char_length(btrim(name)) > 0),
          PRIMARY KEY (project_id, name)
        );
        CREATE INDEX project_technologies_name_idx ON public.project_technologies(name);

        CREATE TABLE public.project_collaborators (
          project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          contribution VARCHAR(100),
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (project_id, user_id)
        );
        CREATE INDEX project_collaborators_user_idx ON public.project_collaborators(user_id);

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
  async down(queryInterface) {
    // Rollback exclui os dados de projetos. Não executar no banco compartilhado
    // sem combinar com a equipe e preservar os dados necessários.
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DROP TABLE public.project_media;
        DROP TABLE public.project_collaborators;
        DROP TABLE public.project_technologies;
        DROP TABLE public.projects;
      `, { transaction });
    });
  },
};
