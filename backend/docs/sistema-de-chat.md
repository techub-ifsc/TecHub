# TecHub — Sistema de Chat e Mensagens em Tempo Real

Esta entrega implementa o módulo de mensagens e chat em tempo real do TecHub, permitindo que criadores e usuários autenticados troquem mensagens diretamente pela plataforma, com histórico persistido no banco de dados e sincronização instantânea via WebSockets (Socket.io).

---

## 1. O que mudou para a pessoa usuária

1. **Acesso ao Chat**:
   - Disponível na rota `/mensagens` (protegida por autenticação) ou pelo botão **"Enviar mensagem"** localizado no card de apresentação de qualquer criador (`/criadores/:id`).
   - O cabeçalho da aplicação (`LoggedHeader`) exibe o ícone de mensagens com um badge dinâmico indicando a quantidade total de mensagens não lidas em tempo real.
2. **Experiência de Conversa**:
   - Lista lateral (sidebar) com todas as conversas do usuário ordenadas pela interação mais recente, busca por nome e contador de não lidas por conversa.
   - Janela central com histórico de mensagens agrupado por divisores de data (*"Hoje"*, *"Ontem"* e datas completas).
   - Balões de mensagem com confirmação visual de envio e leitura (ícones de check / double-check).
   - Envio otimista instantâneo: a mensagem aparece de imediato na tela ao pressionar `Enter`, sendo sincronizada em segundo plano com o banco de dados e entregue na hora ao destinatário conectado.

---

## 2. Arquitetura de Comunicação em Tempo Real (Socket.io)

O servidor HTTP do Express ([server.js](file:///c:/Users/crist/Documents/Asstes%20TecHub/Código/branch-sistema-de-chat/TecHub/backend/src/server.js)) inicializa a camada de WebSockets em [src/socket/index.js](file:///c:/Users/crist/Documents/Asstes%20TecHub/Código/branch-sistema-de-chat/TecHub/backend/src/socket/index.js):

- **Autenticação no Handshake**:
  - O cliente envia o token JWT via `auth.token`.
  - O middleware do Socket.io valida a assinatura do token ([src/utils/jwt.js](file:///c:/Users/crist/Documents/Asstes%20TecHub/Código/branch-sistema-de-chat/TecHub/backend/src/utils/jwt.js)) e vincula o usuário autenticado à sessão (`socket.userId`).
- **Salas Privadas**:
  - No momento da conexão, cada usuário ingressa automaticamente em sua sala privada: `user_${userId}`.
  - As mensagens são emitidas de forma direcionada apenas aos participantes envolvidos, sem broadcast público.
- **Eventos WebSocket**:
  - `send_message`: remetente envia mensagem (`conversationId` ou `recipientId`, `content`, `tempId`). O servidor valida, higieniza, persiste e notifica.
  - `new_message`: emitido para a sala do destinatário e do remetente com a mensagem persistida e formatada.
  - `mark_read`: destinatário notifica que visualizou a conversa; o servidor atualiza `read_at` no banco e emite `messages_read` para o remetente.

---

## 3. Contrato da API REST

O prefixo de todas as rotas do chat é `/api/chat`. Todas as rotas exigem autenticação via cabeçalho `Authorization: Bearer <token>`.

### 3.1 Listar conversas do usuário

```http
GET /api/chat/conversations
```

- **Resposta 200**:
  ```json
  [
    {
      "id": "1282d405-88f6-4910-b566-cb90678b96ba",
      "participant": {
        "id": "ad6e93bd-9889-404f-a34e-767419747510",
        "name": "Mariana Costa",
        "course": "Ciência da Computação",
        "avatarUrl": "https://.../foto.webp",
        "initials": "MC",
        "color": "#347554"
      },
      "lastMessage": {
        "id": "b845337f-a190-44cc-b58e-39a5a141b368",
        "senderId": "29b65f28-17f9-4b3f-a81d-116794cca77e",
        "content": "Olá, tudo bem?",
        "text": "Olá, tudo bem?",
        "createdAt": "2026-10-24T21:58:46.496Z",
        "readAt": "2026-10-24T21:58:49.513Z",
        "read": true
      },
      "unreadCount": 0,
      "updatedAt": "2026-10-24T22:06:42.490Z"
    }
  ]
  ```

### 3.2 Obter histórico de mensagens

```http
GET /api/chat/conversations/:conversationId/messages?limit=50&offset=0
```

- **200**: As `limit` mensagens mais recentes (padrão 50, máximo 100), em ordem cronológica. `offset` pula as mais recentes, para carregar as anteriores. Marca automaticamente as mensagens pendentes recebidas como lidas (`read_at = NOW()`).
- **403**: Usuário não participa da conversa informada.
- **404**: Conversa inexistente ou ID com formato UUID inválido.

### 3.3 Iniciar ou obter conversa existente

```http
POST /api/chat/conversations/init
Content-Type: application/json

{
  "recipientId": "ad6e93bd-9889-404f-a34e-767419747510"
}
```

- **200**: Conversa pré-existente entre as partes retornada.
- **201**: Nova conversa criada com sucesso.
- **400**: Tentativa de iniciar conversa consigo mesmo ou `recipientId` ausente/inválido.
- **404**: Destinatário não encontrado no banco.

### 3.4 Enviar mensagem via HTTP (Fallback)

```http
POST /api/chat/conversations/:conversationId/messages
Content-Type: application/json

{
  "content": "Olá! Gostei muito do seu projeto."
}
```

- **201**: Mensagem gravada no banco e notificada aos sockets conectados via `notifyNewMessage`.
- **400**: Conteúdo vazio ou superior a 5000 caracteres.
- **403**: Remetente não pertence à conversa.

---

## 4. Banco de Dados e Modelagem

Criado através da migration [20261024000001-create-chat-tables.js](file:///c:/Users/crist/Documents/Asstes%20TecHub/Código/branch-sistema-de-chat/TecHub/backend/src/migrations/20261024000001-create-chat-tables.js):

### Tabela `conversations`
- `id` (UUID, Primary Key, padrão UUIDv4)
- `user1_id` (UUID, Foreign Key `users.id`, `ON DELETE CASCADE`)
- `user2_id` (UUID, Foreign Key `users.id`, `ON DELETE CASCADE`)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE, indexado para ordenação de atividade)
- *Constraint de Unicidade*: Índice único composto em `(user1_id, user2_id)` com ordenação normalizada (`user1_id < user2_id`) evitando conversas duplicadas invertidas.

### Tabela `messages`
- `id` (UUID, Primary Key, padrão UUIDv4)
- `conversation_id` (UUID, Foreign Key `conversations.id`, `ON DELETE CASCADE`)
- `sender_id` (UUID, Foreign Key `users.id`, `ON DELETE CASCADE`)
- `recipient_id` (UUID, Foreign Key `users.id`, `ON DELETE CASCADE`)
- `content` (TEXT, não nulo, higienizado contra XSS)
- `read_at` (TIMESTAMP WITH TIME ZONE, nulo enquanto não lida)
- `created_at` / `updated_at` (TIMESTAMP WITH TIME ZONE)

---

## 5. Onde está cada parte

| Arquivo relativo a `backend/` | Responsabilidade |
| --- | --- |
| `src/models/Conversation.js` | Modelo Sequelize para conversas com validação de participantes. |
| `src/models/Message.js` | Modelo Sequelize para mensagens com carimbo de leitura e relacionamentos. |
| `src/models/index.js` | Registra os modelos e define as associações `belongsTo` / `hasMany` com `User`. |
| `src/migrations/20261024000001-create-chat-tables.js` | Cria as tabelas `conversations` e `messages`, índices e chaves estrangeiras. |
| `src/socket/index.js` | Servidor WebSocket Socket.io: autenticação JWT, salas `user_${id}`, eventos `send_message` e `mark_read`, encerramento seguro (`closeSocket`). |
| `src/controllers/chatController.js` | Controladores REST para conversas, histórico de mensagens, inicialização e fallback de envio. |
| `src/routes/chatRoutes.js` | Mapeamento das rotas REST protegidas pelo middleware `auth`. |
| `src/routes/index.js` | Monta o roteador `/chat` sob o prefixo `/api`. |
| `src/server.js` | Vincula a instância HTTP do Express à inicialização do Socket.io. |
| `scripts/run-tests.js` | Test runner com suporte a concorrência serial (`--runInBand`) e detecção de handles abertos (`--detectOpenHandles`). |
| `test/chat.test.js` | Testes automatizados cobrindo rotas REST, autenticação, persistência e comunicação WebSocket em tempo real. |

---

## 6. Segurança e Resiliência

1. **Prevenção de XSS**: Todas as mensagens passam por `sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} })` antes de qualquer persistência ou broadcast.
2. **Blindagem de UUIDs**: Todas as rotas e eventos do socket validam identificadores com regex (`UUID_REGEX`). Identificadores malformados ou provisórios locais não chegam ao PostgreSQL, prevenindo erros `500 (Internal Server Error)`.
3. **Controle de Acesso Estrito**: O usuário só pode consultar histórico ou enviar mensagens em conversas onde seu `userId` seja comprovadamente `user1_id` ou `user2_id`.
4. **Fechamento Limpo de Conexões**: Em testes e rotinas de shutdown, `closeSocket()` invoca `io.disconnectSockets(true)` e `io.close()` para evitar sockets órfãos ou timers em aberto.

---

## 7. Como Executar os Testes

Para executar os testes automatizados do chat:
```bash
npm run test:chat
```

Para executar com verificação de handles abertos e execução serial:
```bash
npm run test:chat -- --detectOpenHandles --runInBand
```
