const { Op } = require('sequelize');
const { Conversation, Message, User } = require('../models');
const { notifyNewMessage, notifyMessagesRead, sanitizeMessageContent } = require('../socket');

const CREATOR_COLORS = [
  '#315b92', '#8b3a57', '#555f68', '#94602e',
  '#347554', '#65438a', '#356c74', '#775060',
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getCreatorColor(id = '') {
  let hash = 0;
  for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return CREATOR_COLORS[hash % CREATOR_COLORS.length];
}

function formatParticipant(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    course: user.major || 'Estudante IFSC',
    avatarUrl: user.avatar_url || null,
    initials: getInitials(user.name),
    color: getCreatorColor(user.id),
  };
}

// 2.1 GET /api/chat/conversations
async function getConversations(req, res, next) {
  try {
    const userId = req.userId;

    const conversations = await Conversation.findAll({
      where: {
        [Op.or]: [{ user1_id: userId }, { user2_id: userId }],
      },
      include: [
        {
          model: User,
          as: 'user1',
          attributes: ['id', 'name', 'avatar_url', 'major'],
        },
        {
          model: User,
          as: 'user2',
          attributes: ['id', 'name', 'avatar_url', 'major'],
        },
      ],
      order: [['updated_at', 'DESC']],
    });

    const result = await Promise.all(
      conversations.map(async (conv) => {
        const otherUser = conv.user1_id === userId ? conv.user2 : conv.user1;

        // Última mensagem da conversa
        const lastMessage = await Message.findOne({
          where: { conversation_id: conv.id },
          order: [['created_at', 'DESC']],
        });

        // Contagem de não lidas para o usuário logado
        const unreadCount = await Message.count({
          where: {
            conversation_id: conv.id,
            recipient_id: userId,
            read_at: null,
          },
        });

        return {
          id: conv.id,
          participant: formatParticipant(otherUser),
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                senderId: lastMessage.sender_id,
                content: lastMessage.content,
                text: lastMessage.content,
                createdAt: lastMessage.created_at,
                readAt: lastMessage.read_at,
                read: Boolean(lastMessage.read_at),
              }
            : null,
          unreadCount,
          updatedAt: conv.updated_at,
        };
      })
    );

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// 2.2 GET /api/chat/conversations/:conversationId/messages
async function getMessages(req, res, next) {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;

    if (!conversationId || !UUID_REGEX.test(conversationId)) {
      return res.status(404).json({ message: 'Conversa não encontrada.' });
    }

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversa não encontrada.' });
    }

    const isParticipant =
      conversation.user1_id === userId || conversation.user2_id === userId;
    if (!isParticipant) {
      return res.status(403).json({ message: 'Acesso negado para esta conversa.' });
    }

    const otherUserId =
      conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;

    // Atualiza automaticamente read_at para mensagens recebidas não lidas
    const now = new Date();
    const [updatedRows] = await Message.update(
      { read_at: now },
      {
        where: {
          conversation_id: conversationId,
          recipient_id: userId,
          read_at: null,
        },
      }
    );

    if (updatedRows > 0) {
      notifyMessagesRead(conversationId, userId, otherUserId);
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    // Pega as mais recentes (offset conta a partir da última) e devolve em ordem cronológica.
    const latestFirst = await Message.findAll({
      where: { conversation_id: conversationId },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });
    const messages = latestFirst.reverse();

    const formattedMessages = messages.map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      recipientId: m.recipient_id,
      content: m.content,
      text: m.content,
      createdAt: m.created_at,
      readAt: m.read_at,
      read: Boolean(m.read_at),
    }));

    return res.json(formattedMessages);
  } catch (err) {
    next(err);
  }
}

// 2.3 POST /api/chat/conversations/init
async function initConversation(req, res, next) {
  try {
    const userId = req.userId;
    const { recipientId } = req.body || {};

    if (!recipientId || !UUID_REGEX.test(recipientId)) {
      return res.status(400).json({ message: 'Identificador do destinatário (recipientId) inválido.' });
    }

    if (recipientId === userId) {
      return res.status(400).json({ message: 'Você não pode iniciar uma conversa consigo mesmo.' });
    }

    const recipient = await User.findByPk(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Destinatário não encontrado.' });
    }

    // Busca se já existe conversa entre o par de usuários
    let conversation = await Conversation.findOne({
      where: {
        [Op.or]: [
          { user1_id: userId, user2_id: recipientId },
          { user1_id: recipientId, user2_id: userId },
        ],
      },
    });

    let statusCode = 200;
    if (!conversation) {
      const [u1, u2] = userId < recipientId ? [userId, recipientId] : [recipientId, userId];
      conversation = await Conversation.create({
        user1_id: u1,
        user2_id: u2,
        updated_at: new Date(),
      });
      statusCode = 201;
    }

    const unreadCount = await Message.count({
      where: {
        conversation_id: conversation.id,
        recipient_id: userId,
        read_at: null,
      },
    });

    const lastMessage = await Message.findOne({
      where: { conversation_id: conversation.id },
      order: [['created_at', 'DESC']],
    });

    return res.status(statusCode).json({
      id: conversation.id,
      participant: formatParticipant(recipient),
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            senderId: lastMessage.sender_id,
            content: lastMessage.content,
            text: lastMessage.content,
            createdAt: lastMessage.created_at,
            readAt: lastMessage.read_at,
            read: Boolean(lastMessage.read_at),
          }
        : null,
      unreadCount,
      updatedAt: conversation.updated_at,
    });
  } catch (err) {
    next(err);
  }
}

// 2.4 POST /api/chat/conversations/:conversationId/messages (HTTP fallback & REST support)
async function sendMessage(req, res, next) {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;
    const { content } = req.body || {};

    if (!conversationId || !UUID_REGEX.test(conversationId)) {
      return res.status(404).json({ message: 'Conversa não encontrada.' });
    }

    const cleanContent = sanitizeMessageContent(content);
    if (!cleanContent) {
      return res.status(400).json({ message: 'O conteúdo da mensagem não pode ser vazio.' });
    }

    if (cleanContent.length > 5000) {
      return res.status(400).json({ message: 'A mensagem excede o limite de 5000 caracteres.' });
    }

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversa não encontrada.' });
    }

    const isParticipant =
      conversation.user1_id === userId || conversation.user2_id === userId;
    if (!isParticipant) {
      return res.status(403).json({ message: 'Acesso negado para esta conversa.' });
    }

    const recipientId =
      conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;

    const now = new Date();
    const createdMessage = await Message.create({
      conversation_id: conversation.id,
      sender_id: userId,
      recipient_id: recipientId,
      content: cleanContent,
      read_at: null,
      created_at: now,
      updated_at: now,
    });

    await conversation.update({ updated_at: now });

    notifyNewMessage(createdMessage, conversation);

    return res.status(201).json({
      id: createdMessage.id,
      conversationId: conversation.id,
      senderId: userId,
      recipientId,
      content: cleanContent,
      text: cleanContent,
      createdAt: createdMessage.created_at,
      readAt: null,
      read: false,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getConversations,
  getMessages,
  initConversation,
  sendMessage,
};
