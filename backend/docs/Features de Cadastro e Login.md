# Features de Cadastro e Login

Este documento registra as entregas de cadastro e login do TecHub. Cada seção descreve o comportamento **na data daquela entrega**; a Feature 2 substitui o fluxo provisório da Feature 1. O guia `auth-prototype.md` reúne o estado atual do backend.

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

Na entrega original, a migração ainda aguardava a equipe de banco. Em 22/10/2026, uma consulta somente leitura com `sequelize-cli db:migrate:status` mostrou `20261013000002-add-email-verification.js` como `up` no banco configurado localmente. Ela preserva usuários antigos como confirmados. Outros ambientes ainda precisam ser verificados antes de publicar o backend; o rollback remove o estado de confirmação e exige aprovação/backup.

O frontend precisa criar a página `/verify-email`, ler `token` da URL, chamar `POST /api/auth/verify-email`, mostrar sucesso/erro e oferecer o reenvio. Também deve tratar o novo `403` no login e não dizer que a conta pode entrar imediatamente após o cadastro. Nenhuma tela do frontend foi alterada nesta feature.

## Feature 3 — Bloqueio de login após cinco falhas

### Requisito e decisão adotada

O RF-02-2 da US02 exige bloqueio **por conta** por 15 minutos após cinco senhas incorretas consecutivas. A sexta tentativa deve ser recusada mesmo se a senha estiver correta. A resposta durante o bloqueio informa o tempo restante. O contador volta a zero depois de um login bem-sucedido ou quando o bloqueio termina. A regra vale para `visitor`, `creator` e `super_admin`, porque todos usam a mesma rota de login e decidimos proteger também a conta administrativa.

O limitador já existente de 20 requisições por IP em 15 minutos continua ativo. Ele protege contra abuso geral, mas não substitui o bloqueio por conta: várias pessoas podem compartilhar o mesmo IP e uma pessoa pode mudar de IP. Nenhum campo foi acrescentado ao formulário do frontend.

Por decisão desta entrega, o bloqueio impede **somente novos logins**. Uma sessão/JWT emitida antes continua funcionando enquanto for válida; encerrá-la ou revogá-la pertence à futura implementação de sessões e logout da US02. Não alteramos o middleware das rotas já autenticadas.

### Passo a passo de `POST /api/auth/login`

1. O limitador por IP é executado pela rota. Depois, o Zod valida `email` e `password`; e-mail malformado ou senha ausente devolve `400` sem contar tentativa de uma conta.
2. O controller abre uma transação no PostgreSQL e consulta o usuário pelo e-mail normalizado com bloqueio da linha (`SELECT ... FOR UPDATE`). Enquanto uma tentativa atualiza o contador, outra tentativa da mesma conta espera; isso evita perder incrementos em requisições simultâneas.
3. E-mail sem conta retorna o mesmo `401` genérico usado para senha errada. Nenhum contador é criado para endereços inexistentes.
4. Se `lockedUntil` ainda estiver no futuro, a senha nem é comparada. A API devolve `429`, `Retry-After` em segundos e uma mensagem com os minutos restantes, arredondados para cima. Isso também acontece se a sexta tentativa trouxer a senha correta.
5. Se o prazo de bloqueio já terminou, `failedLoginAttempts` volta a zero e `lockedUntil` é limpo antes de avaliar a nova tentativa.
6. O bcrypt compara a senha enviada com o hash salvo. Uma senha errada aumenta `failedLoginAttempts` dentro da mesma transação. A quinta falha grava `lockedUntil = agora + 15 minutos`, mas ainda responde com o `401` genérico. A próxima tentativa recebe `429`.
7. Com senha correta e e-mail ainda não confirmado, a regra anterior da Feature 2 continua: resposta `403`, sem JWT. Isso não é um login bem-sucedido e, portanto, não zera falhas anteriores; um bloqueio expirado, porém, é limpo.
8. Com senha correta, conta confirmada e sem bloqueio, o contador é zerado e a API retorna `200` com usuário seguro e JWT. `failedLoginAttempts` e `lockedUntil` nunca entram no JSON público nem no JWT.

Exemplo de requisição:

```http
POST /api/auth/login
Content-Type: application/json

{"email":"maria@example.com","password":"SenhaTeste123"}
```

Nas primeiras cinco senhas erradas, a resposta é `401` com `{"message":"E-mail ou senha inválidos."}`. Depois da quinta falha, mesmo usando a senha correta, a tentativa dentro dos 15 minutos recebe algo como:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 900
Content-Type: application/json

{"message":"Conta temporariamente bloqueada. Tente novamente em 15 minutos.","retryAfterSeconds":900}
```

`900` é apenas o valor inicial aproximado: o backend calcula os segundos restantes em cada resposta, e a mensagem arredonda os minutos para cima. Ao terminar o prazo, uma senha errada passa a contar como primeira falha de uma nova sequência; uma senha correta faz login e mantém o contador zerado. O frontend atual já apresenta a propriedade `message` dos erros de login, mas pode usar `retryAfterSeconds` para mostrar uma contagem regressiva se a equipe desejar.

### Estado no banco e ordem de implantação

O model `User` ganhou `failedLoginAttempts` (inteiro, padrão `0`) e `lockedUntil` (data opcional). O Sequelize usa nomes `failed_login_attempts` e `locked_until` na tabela `users`. A migration `20261013000003-add-login-lockout.js` adiciona somente essas duas colunas numa transação; contas existentes começam com zero falhas e sem bloqueio. O rollback remove as duas colunas e perde esse estado, portanto exige revisão da equipe de banco.

As gravações desse estado usam `silent: true` no Sequelize para não alterar `updatedAt` do perfil apenas porque alguém tentou fazer login. O hash da senha e os demais dados do usuário não mudam quando uma tentativa falha.

Na entrega original, a migration ainda aguardava aplicação. Em 22/10/2026, uma consulta somente leitura com `sequelize-cli db:migrate:status` mostrou `20261013000003-add-login-lockout.js` como `up` no banco configurado localmente. Em outros ambientes, a equipe de banco deve revisá-la e aplicá-la antes de publicar este backend. A migration da confirmação de e-mail (`20261013000002`) vem antes da migration de bloqueio (`20261013000003`). O bloqueio não depende de SMTP para contar falhas, mas esta branch também contém a Feature 2.

### Arquivos e motivo de cada alteração

| Arquivo, relativo a `backend/` | Responsabilidade |
| --- | --- |
| `src/models/User.js` | Declara os dois campos persistidos e mantém os dados de bloqueio fora de `toSafeJSON()`. |
| `src/migrations/20261013000003-add-login-lockout.js` | Prepara as colunas no PostgreSQL para revisão da equipe de banco. |
| `src/controllers/authController.js` | Conta falhas, aplica e expira o bloqueio numa transação e conserva as respostas anteriores de credencial inválida e e-mail pendente. |
| `src/routes/authRoutes.js` | Documenta o novo `429`, o cabeçalho `Retry-After` e `retryAfterSeconds` no Swagger da rota de login. |
| `test/auth.test.js` | Verifica cinco falhas, sexta tentativa correta bloqueada, tempo restante, reset, independência entre contas, criador, super-admin, JWT anterior ainda válido e regressões do login existente. |
| `docs/auth-prototype.md` e este documento | Atualizam o resumo da autenticação e explicam a implementação completa. |

### Como verificar sem alterar o banco real

Na pasta `backend`, com dependências instaladas e variáveis de ambiente de teste definidas, execute `npm.cmd test` no PowerShell. Os testes de autenticação simulam o armazenamento e o envio de e-mail: **não enviam SMTP real nem aplicam migrations no Neon**. Para testar com PostgreSQL real, primeiro peça à equipe de banco a revisão das migrations e use um banco de teste separado. Depois, cadastre e confirme uma conta de teste, envie cinco senhas erradas a `POST /api/auth/login`, tente a senha correta uma sexta vez e confira `429` e `Retry-After`. Não use contas reais para esse experimento, pois elas seriam bloqueadas por 15 minutos.

## Feature 4 — Redefinição de senha

A recuperação de acesso acrescenta `POST /api/auth/forgot-password` e `POST /api/auth/reset-password`, link de 1 hora com token de uso único armazenado como hash, reaproveitamento da política de senha do cadastro e invalidação dos JWTs anteriores após o sucesso. O e-mail de confirmação de cadastro também ganhou um layout HTML mais agradável, com versão em texto simples; a marca exibida no backend passou a ser **TecHub**. O passo a passo, os arquivos, o contrato com o frontend, a migration e as limitações estão em [redefinicao-senha.md](redefinicao-senha.md).
