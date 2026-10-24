'use strict';

// A produção ganhou as colunas major e semester fora das migrations. Um banco novo,
// criado só por elas, ficava sem as duas e o cadastro de projetos respondia 500.
// IF NOT EXISTS: onde as colunas já existem (produção), nada muda. O CHECK é o mesmo
// que a produção tem em semester.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE public.projects
        ADD COLUMN IF NOT EXISTS major VARCHAR(100),
        ADD COLUMN IF NOT EXISTS semester SMALLINT CHECK (semester > 0)
    `);
  },

  // Sem volta: na produção as colunas são anteriores a esta migration e guardam dados.
  async down() {},
};
