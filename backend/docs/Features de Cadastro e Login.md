# Features de Cadastro e Login

Este documento registra as entregas de cadastro e login do Tech Hub. Cada seção descreve o comportamento **na data daquela entrega**; a Feature 2 substitui o fluxo provisório da Feature 1. O guia `auth-prototype.md` reúne o estado atual do backend.

## Feature 1 — Mensagem correta após o cadastro

### Problema

`POST /api/auth/register` criava a conta e dizia para a pessoa confirmar o e-mail em até 24 horas. O envio e a validação do link ainda não estão ativos. A conta já podia entrar pela rota de login. Assim, a mensagem prometia uma etapa que não acontecia.

### Alteração realizada

- A resposta de sucesso (`201`) passou a dizer: **“Cadastro realizado com sucesso. Você já pode fazer login.”**
- O guia anterior foi corrigido para mostrar a mensagem real e esclarecer que a confirmação por e-mail ainda não existe.
- O teste de cadastro passou a conferir a mensagem exata. Ele também continua verificando o perfil, o hash da senha e a obtenção do JWT no login.

Arquivos alterados nesta entrega:

| Arquivo | Papel |
| --- | --- |
| `src/controllers/authController.js` | Define a resposta de `register`. |
| `test/auth.test.js` | Verifica a mensagem e o fluxo de cadastro seguido de login. |
| `docs/auth-prototype.md` | Mantém o guia anterior coerente com a API. |

### Como o fluxo funcionava após a Feature 1

1. O frontend envia `name`, `email`, `password` e `accountType` para `POST /api/auth/register`.
2. O backend valida os dados. `accountType` aceita `visitor` ou `creator`; criadores precisam de um e-mail institucional permitido.
3. O backend verifica se o e-mail já existe e grava a senha como hash bcrypt.
4. A API responde `201` com uma mensagem e o usuário sem senha. Ela não devolve JWT no cadastro.
5. A pessoa envia e-mail e senha para `POST /api/auth/login` e recebe um JWT quando as credenciais estão corretas.
6. O JWT pode ser enviado em `Authorization: Bearer <JWT>` para acessar `GET /api/auth/me`.

Exemplo de cadastro:

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Maria Silva",
  "email": "maria@example.com",
  "password": "SenhaTeste123",
  "accountType": "visitor"
}
```

Resposta resumida:

```json
{
  "message": "Cadastro realizado com sucesso. Você já pode fazer login.",
  "user": {
    "id": "<uuid>",
    "name": "Maria Silva",
    "email": "maria@example.com",
    "role": "visitor"
  }
}
```

O usuário real também inclui as datas de criação e atualização. O frontend já mostra `data.message` quando o cadastro termina com sucesso, portanto a mensagem corrigida aparece na tela sem mudar o frontend.

### Verificação na Feature 1

Na pasta `backend`, execute `node --test test/auth.test.js` para verificar apenas a autenticação; os 16 casos passaram nesta entrega. Esses testes usam armazenamento simulado em memória e não alteram o Neon. Para um teste manual, abra o Swagger, cadastre uma conta nova em `POST /auth/register` e depois use `POST /auth/login` com as mesmas credenciais. Esse teste manual depende de um banco configurado com os perfis atuais.

## Feature 2 — Confirmação de e-mail

### Objetivo e regra do PRD

O RF-01-2 pede envio automático de link após o cadastro, validade de 24 horas, bloqueio da área logada até a confirmação e reenvio quando o link expirar. A nota técnica pede token criptograficamente aleatório armazenado como hash. Esta entrega implementa o fluxo de backend para `visitor` e `creator`; a interface de confirmação continua a cargo da equipe de frontend. O PRD não especifica provedor SMTP, então ele é configurável pelo ambiente.

### Fluxo implementado

1. `POST /api/auth/register` valida o cadastro como antes. Um token de 32 bytes aleatórios é gerado; apenas seu hash SHA-256 e a expiração de 24 horas são armazenados no usuário.
2. O backend envia ao endereço cadastrado um link para `EMAIL_VERIFICATION_URL?token=...`. A API responde `201` sem JWT, avisando que é preciso confirmar o e-mail.
3. A página de confirmação do frontend deve ler o parâmetro `token` e enviá-lo em JSON a `POST /api/auth/verify-email`. A API valida o hash e a expiração, marca a conta como confirmada e apaga o token; outro uso do mesmo link retorna `400`.
4. Antes da confirmação, `POST /api/auth/login` retorna `403` mesmo para senha correta. Um JWT antigo também não passa por `authenticate` ou `optionalAuthenticate` quando o e-mail está pendente.
5. `POST /api/auth/resend-verification` recebe `{ "email": "maria@example.com" }`. Para contas pendentes, cria outro token de 24 horas e invalida o anterior. A resposta é genérica para não informar se o e-mail existe.
6. Se uma pessoa autenticada mudar o e-mail em `PATCH /api/auth/me`, a conta volta ao estado pendente e precisa confirmar o novo endereço. O JWT anterior deixa de acessar rotas protegidas até a confirmação.

Resposta de cadastro:

```json
{
  "message": "Cadastro realizado. Confira seu e-mail para ativar a conta em até 24 horas.",
  "user": { "id": "<uuid>", "name": "Maria Silva", "email": "maria@example.com", "role": "visitor", "emailVerifiedAt": null }
}
```

Confirmação:

```http
POST /api/auth/verify-email
Content-Type: application/json

{"token":"<token-do-link>"}
```

Resposta `200`: `{ "message": "E-mail confirmado. Você já pode fazer login." }`. Token inválido, expirado ou usado responde `400`. Login antes da confirmação responde `403` com `Confirme seu e-mail antes de acessar a plataforma.`. O reenvio usa `POST /api/auth/resend-verification` e responde `200` com mensagem genérica.

### Arquivos e responsabilidades

| Arquivo | Mudança |
| --- | --- |
| `src/models/User.js` | Campos de confirmação; somente `emailVerifiedAt` entra no JSON público. |
| `src/migrations/20261013000002-add-email-verification.js` | Adiciona três colunas e índice único para o hash. Marca contas existentes como confirmadas para não bloquear usuários antigos; novas contas iniciam pendentes. |
| `src/services/mailService.js` | Envio SMTP configurável; link usa a URL da página do frontend. Não registra o token no terminal. |
| `src/controllers/authController.js` | Gera hash/TTL, envia, confirma, reenvia e exige nova confirmação após troca de endereço. |
| `src/validators/authValidators.js` | Valida corpos das rotas novas. |
| `src/middlewares/auth.js` | Bloqueia contas pendentes mesmo com JWT antigo. |
| `src/routes/authRoutes.js` e `src/config/swagger.js` | Publicam o contrato no Swagger. |
| `scripts/create-super-admin.cjs` | Marca como confirmado o super-admin criado internamente. |
| `.env.example` | Lista a configuração SMTP e a URL de confirmação sem valores secretos. |
| `test/auth.test.js`, `test/mail.test.js`, `test/media.test.js`, `test/projects.test.js`, `test/moderation.test.js` | Cobrem o fluxo, simulam SMTP sem envio real e mantêm os usuários fictícios das outras suítes confirmados. |
| `package.json` | Inclui `test/mail.test.js` em `npm.cmd test`. |

### Configuração e implantação

No `.env` local do backend, a equipe deve informar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` e `EMAIL_VERIFICATION_URL`. O PRD não escolhe um provedor. O servidor SMTP precisa entregar mensagens reais aos domínios institucionais, e a URL deve apontar para a página do frontend. Em produção, a URL deve ser HTTPS. Não coloque senhas SMTP no Git.

A migração foi criada, **mas não executada no Neon compartilhado**. A equipe de banco deve revisá-la, fazer backup, aprovar sua execução e combinar a ordem de deploy: aplicar a migração antes de subir o backend novo. Ela preserva usuários antigos como confirmados. Sem as colunas novas, o backend novo não deve ser publicado. O rollback remove o estado de confirmação e exige aprovação/backup.

O frontend precisa criar a página `/verify-email`, ler `token` da URL, chamar `POST /api/auth/verify-email`, mostrar sucesso/erro e oferecer o reenvio. Também deve tratar o novo `403` no login e não dizer que a conta pode entrar imediatamente após o cadastro. Nenhuma tela do frontend foi alterada nesta feature.
