# TecHub — redefinição de senha

Esta entrega acrescenta recuperação de acesso ao backend e às telas do TecHub. O PDF oficial exige hash para senhas (RNF02) e rate limiting em rotas sensíveis, incluindo recuperação de acesso (RNF06), mas não define telas, nome de rota nem validade do link de redefinição. Por isso, adotamos um link de uso único com validade de **1 hora**. A interface reaproveita a aparência da tela de login existente; o Órbita orientou apenas a separação entre página, validação e API.

## O que mudou para a pessoa usuária

1. Na tela `/forgot-password`, acessível pelo link “Esqueceu a senha?” no login, ela informa o e-mail. O frontend chama `POST /api/auth/forgot-password`.
2. A API sempre responde a mesma mensagem para contas existentes e inexistentes. Para uma conta existente, gera um token criptograficamente aleatório de 32 bytes, guarda **apenas o hash SHA-256** e envia o link ao e-mail cadastrado. Um novo pedido substitui o link anterior.
3. A página `/reset-password` lê o parâmetro `token` da URL e pede a nova senha duas vezes. Ela chama `POST /api/auth/reset-password` com `token`, `password` e `confirmPassword`.
4. A API aceita somente token válido, não expirado e ainda não usado. A nova senha segue a mesma regra do cadastro: pelo menos 8 caracteres, uma letra, um número e até 72 bytes UTF-8. O hook do model a armazena com bcrypt (custo 12); nem senha nem token aparecem na resposta.
5. Após o sucesso, o link é apagado e os JWTs antigos são invalidados por `authVersion`. A API não faz login automaticamente: a pessoa entra novamente com a senha nova. O bloqueio de 15 minutos por cinco senhas erradas continua até seu prazo terminar. Um e-mail separado avisa que a senha foi alterada, sem revelar a senha.

## Contrato HTTP

O prefixo de todas as rotas abaixo é `/api`. O Swagger está em `/api/docs`.

### Solicitar link

```http
POST /api/auth/forgot-password
Content-Type: application/json

{"email":"maria@example.com"}
```

- `200`: `{"message":"Se existir uma conta para este e-mail, enviaremos um link para redefinir a senha."}`. A mesma resposta vale para e-mail ausente.
- `400`: e-mail malformado ou campo extra.
- `429`: mais de cinco solicitações por IP em 15 minutos.
- `503`: banco indisponível ou SMTP/URL de redefinição não configurados. Se o SMTP falhar durante o envio para uma conta existente, a resposta continua genérica; a pessoa pode solicitar outro link mais tarde.

### Definir nova senha

```http
POST /api/auth/reset-password
Content-Type: application/json

{"token":"<64 caracteres do link>","password":"NovaSenha123","confirmPassword":"NovaSenha123"}
```

- `200`: `{"message":"Senha redefinida. Entre novamente com a nova senha."}`. Não retorna JWT.
- `400`: token malformado, expirado, usado ou substituído; senha fora da política; confirmação diferente.
- `429`: mais de cinco tentativas por IP em 15 minutos.
- `503`: banco indisponível.

O link de redefinição é montado com `PASSWORD_RESET_URL?token=...`; ele **não** aponta diretamente para a API. Em desenvolvimento, configure `NODE_ENV=development`, `PASSWORD_RESET_URL=http://localhost:5173/reset-password` e inicie o frontend na porta 5173. Se `NODE_ENV=production`, o backend exige HTTPS nesse link. Nunca publique ou compartilhe esse token.

## Onde está cada parte

| Arquivo relativo a `backend/` | Responsabilidade |
| --- | --- |
| `src/routes/authRoutes.js` | Publica as duas rotas, limite por IP e documentação OpenAPI. |
| `src/validators/authValidators.js` | Confere e-mail, token, nova senha e confirmação. Reaproveita `passwordSchema` do cadastro. |
| `src/controllers/authController.js` | Gera e valida o token, coordena banco/e-mail e redefine a senha em transação com bloqueio da linha do usuário. |
| `src/services/mailService.js` | Envia e-mails HTML e texto simples de confirmação, redefinição e aviso de senha alterada. Usa o mesmo SMTP existente. |
| `src/models/User.js` | Declara hash/expiração do token de redefinição e `authVersion`; o hook bcrypt continua protegendo a senha. |
| `src/middlewares/auth.js` | Rejeita JWTs cuja versão não corresponde à conta após a redefinição. |
| `src/migrations/20261022000002-add-password-reset.js` | Acrescenta três colunas à tabela `users` e índice único para o hash. |
| `src/config/swagger.js`, `src/app.js` | Descrevem os corpos das rotas e exibem o nome correto, TecHub. |
| `.env.example` | Mostra `PASSWORD_RESET_URL` e a grafia correta do remetente, sem credenciais reais. |
| `test/auth.test.js`, `test/mail.test.js` | Exercitam os fluxos sem alterar o banco compartilhado nem enviar e-mails reais. |

No frontend, `src/pages/ForgotPasswordPage.jsx` solicita o link, `src/pages/ResetPasswordPage.jsx` consome o token e mostra sucesso ou link inválido, e `src/pages/PasswordRecoveryPage.css` reutiliza as cores e controles do login. `src/api/auth.js` centraliza as duas chamadas HTTP; `src/utils/passwordResetValidation.js` espelha as validações essenciais do backend. `src/App.jsx` publica as duas rotas e `src/pages/LoginPage.jsx` liga a recuperação ao login. `test/passwordResetValidation.test.js` verifica os formatos aceitos.

## Banco e implantação

Esta branch foi criada sobre `feature/bloqueio-login-15min`, que já inclui a confirmação de e-mail. A migration nova **não foi executada nesta tarefa**. A equipe de banco deve revisá-la, fazer backup e aplicá-la **antes** de publicar este backend. Ela acrescenta `password_reset_token_hash`, `password_reset_expires_at` e `auth_version`. Contas antigas começam com `auth_version = 0`; JWTs antigos sem essa informação continuam válidos até uma redefinição. Depois de redefinir, a versão aumenta e invalida sessões anteriores.

O `.env` real permanece local e ignorado pelo Git. Configure o SMTP existente e `PASSWORD_RESET_URL` com a página do frontend. Em desenvolvimento, pode apontar para `http://localhost:5173/reset-password`; em produção precisa ser HTTPS. Não coloque senha de SMTP, token de recuperação ou link real em commits, prints e logs.

As duas páginas de recuperação já estão conectadas à API. A página de confirmação de cadastro `/verify-email` continua sendo uma integração separada pendente do frontend.

## Como testar sem afetar o Neon

Na pasta `backend`, com dependências instaladas, execute `npm.cmd test` no PowerShell. Os testes simulam banco e SMTP. Eles cobrem resposta genérica, hash e expiração do token, invalidação do link anterior, senha inválida, uso único, bcrypt, JWT antigo invalidado, novo login, falha de envio e permanência do bloqueio de login. Na pasta `frontend`, execute `npm.cmd test` e `npm.cmd run build` para testar validação e compilação.

Para o teste manual completo, aguarde a migration da equipe de banco. Configure SMTP e `PASSWORD_RESET_URL` no `backend/.env` local, inicie backend e frontend e acesse `http://localhost:5173/login`. Clique em “Esqueceu a senha?”, peça o link com uma conta de teste, abra o e-mail e crie outra senha na página aberta. Confirme que o link não funciona uma segunda vez, que a senha antiga falha no login e que a nova funciona. A etapa real ainda depende da migration e da configuração correta dos serviços; os testes automatizados não escrevem no Neon.

## Limites e decisões desta entrega

- A escolha de 1 hora para o link de redefinição é uma decisão técnica desta feature; o PDF não define esse prazo.
- O envio SMTP continua síncrono, como na confirmação de cadastro atual. Uma fila/outbox e mitigação mais forte de diferença de tempo entre contas existentes e inexistentes são melhorias futuras.
- O limite novo é por IP, cinco requisições em 15 minutos. Um controle persistente por conta para evitar excesso de e-mails por IPs diferentes pode ser acrescentado depois.
- A redefinição não confirma automaticamente um e-mail ainda pendente e não remove um bloqueio de login ativo.

Referência de segurança: [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
