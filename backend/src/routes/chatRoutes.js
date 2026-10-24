const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const chatController = require('../controllers/chatController');

const router = Router();

// Todas as rotas de chat exigem autenticação
router.use(authenticate);

// 2.1 Listar conversas do usuário autenticado
router.get('/conversations', chatController.getConversations);

// 2.3 Iniciar ou obter conversa existente com outro criador
router.post('/conversations/init', chatController.initConversation);

// 2.2 Obter histórico de mensagens de uma conversa
router.get('/conversations/:conversationId/messages', chatController.getMessages);

// 2.4 Enviar mensagem em uma conversa (REST)
router.post('/conversations/:conversationId/messages', chatController.sendMessage);

module.exports = router;
