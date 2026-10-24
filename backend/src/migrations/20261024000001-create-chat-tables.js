'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Tabela conversations
      await queryInterface.createTable(
        'conversations',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          user1_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          user2_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
        },
        { transaction }
      );

      // Índices de conversations
      await queryInterface.addIndex('conversations', ['user1_id', 'user2_id'], {
        unique: true,
        name: 'conversations_user1_user2_unique',
        transaction,
      });

      await queryInterface.addIndex('conversations', ['user2_id'], {
        name: 'conversations_user2_id_idx',
        transaction,
      });

      await queryInterface.addIndex('conversations', ['updated_at'], {
        name: 'conversations_updated_at_idx',
        transaction,
      });

      // 2. Tabela messages
      await queryInterface.createTable(
        'messages',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
          },
          conversation_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'conversations',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          sender_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          recipient_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          content: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          read_at: {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: null,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
        },
        { transaction }
      );

      // Índices de messages
      await queryInterface.addIndex('messages', ['conversation_id'], {
        name: 'messages_conversation_id_idx',
        transaction,
      });

      await queryInterface.addIndex('messages', ['conversation_id', 'created_at'], {
        name: 'messages_conv_created_idx',
        transaction,
      });

      await queryInterface.addIndex('messages', ['recipient_id', 'read_at'], {
        name: 'messages_recipient_read_idx',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('messages', { transaction });
      await queryInterface.dropTable('conversations', { transaction });
    });
  },
};
