const { Server } = require('socket.io');
const sanitizeHtml = require('sanitize-html');
const { verifyToken } = require('../utils/jwt');
const { User, Conversation, Message } = require('../models');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let io = null;

function sanitizeMessageContent(content) {
  if (typeof content !== 'string') return '';
  return sanitizeHtml(content.trim(), {
    allowedTags: [],
    allowedAttributes: {},
  });
}

function initSocket(server, customOptions = {}) {
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
    },
    ...customOptions,
  });

  // Middleware de autenticação do WebSocket
  io.use(async (socket, next) => {
    try {
      const authHeader =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization ||
        socket.handshake.query?.token;

      if (!authHeader) {
        return next(new Error('Token de autenticação ausente'));
      }

      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader.trim();

      let payload;
      try {
        payload = verifyToken(token);
      } catch (err) {
        return next(new Error('Token inválido ou expirado'));
      }

      const userId = payload.sub || payload.id;
      if (!userId) {
        return next(new Error('Identificador de usuário ausente no token'));
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return next(new Error('Usuário não encontrado'));
      }

      socket.user = user;
      socket.userId = user.id;
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;

    // Usuário entra em sua sala privada
    socket.join(`user_${userId}`);

    // Evento de envio de mensagem em tempo real
    socket.on('send_message', async (data, callback) => {
      try {
        const { conversationId, recipientId, content } = data || {};
        const cleanContent = sanitizeMessageContent(content);

        if (!cleanContent) {
          const errResponse = { error: 'O conteúdo da mensagem não pode ser vazio.' };
          if (typeof callback === 'function') callback(errResponse);
          return socket.emit('error', errResponse);
        }

        if (cleanContent.length > 5000) {
          const errResponse = { error: 'A mensagem excede o limite de 5000 caracteres.' };
          if (typeof callback === 'function') callback(errResponse);
          return socket.emit('error', errResponse);
        }

        let conversation = null;

        if (conversationId) {
          if (UUID_REGEX.test(conversationId)) {
            conversation = await Conversation.findByPk(conversationId);
          }
        } else if (recipientId) {
          if (!UUID_REGEX.test(recipientId)) {
            const errResponse = { error: 'Destinatário inválido.' };
            if (typeof callback === 'function') callback(errResponse);
            return socket.emit('error', errResponse);
          }

          const { Op } = require('sequelize');
          conversation = await Conversation.findOne({
            where: {
              [Op.or]: [
                { user1_id: userId, user2_id: recipientId },
                { user1_id: recipientId, user2_id: userId },
              ],
            },
          });

          if (!conversation) {
            const [u1, u2] = userId < recipientId ? [userId, recipientId] : [recipientId, userId];
            conversation = await Conversation.create({
              user1_id: u1,
              user2_id: u2,
              updated_at: new Date(),
            });
          }
        }

        if (!conversation) {
          const errResponse = { error: 'Conversa não encontrada.' };
          if (typeof callback === 'function') callback(errResponse);
          return socket.emit('error', errResponse);
        }

        // Verifica permissão na conversa
        const isParticipant =
          conversation.user1_id === userId || conversation.user2_id === userId;
        if (!isParticipant) {
          const errResponse = { error: 'Acesso negado para esta conversa.' };
          if (typeof callback === 'function') callback(errResponse);
          return socket.emit('error', errResponse);
        }

        const actualRecipientId =
          conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;

        const now = new Date();
        const createdMessage = await Message.create({
          conversation_id: conversation.id,
          sender_id: userId,
          recipient_id: actualRecipientId,
          content: cleanContent,
          read_at: null,
          created_at: now,
          updated_at: now,
        });

        await conversation.update({ updated_at: now });

        const formatted = {
          id: createdMessage.id,
          conversationId: conversation.id,
          senderId: userId,
          recipientId: actualRecipientId,
          content: cleanContent,
          text: cleanContent,
          tempId: data?.tempId || null,
          createdAt: createdMessage.created_at,
          readAt: null,
          read: false,
        };

        // Emite imediatamente para a sala do destinatário e para o remetente
        io.to(`user_${actualRecipientId}`).emit('new_message', formatted);
        io.to(`user_${userId}`).emit('new_message', formatted);

        if (typeof callback === 'function') {
          callback({ status: 'ok', data: formatted });
        }
      } catch (err) {
        console.error('Erro ao processar send_message no socket:', err);
        const errResponse = { error: 'Falha ao enviar mensagem.' };
        if (typeof callback === 'function') callback(errResponse);
        socket.emit('error', errResponse);
      }
    });

    // Evento de marcação de leitura em tempo real
    socket.on('mark_read', async (data, callback) => {
      try {
        const { conversationId } = data || {};
        if (!conversationId || !UUID_REGEX.test(conversationId)) return;

        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) return;

        const isParticipant =
          conversation.user1_id === userId || conversation.user2_id === userId;
        if (!isParticipant) return;

        const otherUserId =
          conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;

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
          io.to(`user_${otherUserId}`).emit('messages_read', {
            conversationId,
            readerId: userId,
            readAt: now,
          });
        }

        if (typeof callback === 'function') {
          callback({ status: 'ok', updatedRows });
        }
      } catch (err) {
        console.error('Erro ao marcar mensagens como lidas no socket:', err);
      }
    });
  });

  return io;
}

function getIO() {
  return io;
}

function closeSocket() {
  if (io) {
    try {
      io.disconnectSockets(true);
      io.close();
    } catch (err) {
      // ignore
    }
    io = null;
  }
}

function notifyNewMessage(message, conversation) {
  if (!io || !message || !conversation) return;
  const formatted = {
    id: message.id,
    conversationId: conversation.id,
    senderId: message.sender_id,
    recipientId: message.recipient_id,
    content: message.content,
    text: message.content,
    createdAt: message.created_at,
    readAt: message.read_at,
    read: Boolean(message.read_at),
  };

  io.to(`user_${message.recipient_id}`).emit('new_message', formatted);
  io.to(`user_${message.sender_id}`).emit('new_message', formatted);
}

function notifyMessagesRead(conversationId, readerId, otherUserId) {
  if (!io) return;
  io.to(`user_${otherUserId}`).emit('messages_read', {
    conversationId,
    readerId,
    readAt: new Date(),
  });
}

module.exports = {
  initSocket,
  getIO,
  closeSocket,
  notifyNewMessage,
  notifyMessagesRead,
  sanitizeMessageContent,
};
