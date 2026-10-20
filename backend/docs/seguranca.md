# Tech Hub — correções de segurança

Esta entrega reúne as correções da revisão de segurança de outubro de 2026, feitas na branch `fix/seguranca` a partir da `main` (`bdcf7f7`). Cada correção tem teste em `backend/test/security.test.js`, que também cobre os controles que já funcionavam e precisam continuar valendo.

## Resultado desta etapa

- textos do projeto (título, descrição, tecnologias e contribuição) são tratados como texto puro na API e na tela de edição;
- qualquer edição de um projeto já analisado o devolve à moderação;
- a listagem pública de projetos não traz mais o e-mail do autor;
- a paginação da listagem pública é validada e tem teto;
- trocar a senha encerra as sessões abertas antes da troca;
- a conexão com o banco valida o certificado do servidor;
- o Swagger não é servido no deploy de produção e nenhuma resposta anuncia o Express;
- na Vercel, o rate limit passa a contar pelo IP do usuário;
- dependências atualizadas e CI com testes, build e auditoria em cada push e pull request.

## Textos do projeto

`projectValidators.js` recusa os caracteres `<` e `>` em `title`, `description`, `technologies` e `contribution`, com a mensagem "Não use os caracteres < ou >". O frontend envia a descrição como texto, então o uso normal não é afetado.

No frontend, `EditProjectPage.jsx` carrega a descrição no editor com `textToEditorHtml`, que converte o texto em HTML escapado: o conteúdo vindo da API nunca é interpretado como marcação. `NewProjectPage.jsx` monta o rascunho com `DOMParser`, que não carrega imagens nem dispara eventos. As duas telas também avisam sobre `<` e `>` antes de enviar.

## Moderação

No `update` de `projectController.js`, um projeto aprovado ou rejeitado volta para `pending` e tem `submittedAt` reiniciado ao ser editado. Antes, só o rejeitado voltava; um projeto aprovado podia ter o conteúdo trocado e continuar público sem nova análise.

Enquanto espera a análise, o projeto sai da listagem pública. A tela de edição avisa isso antes de salvar.

## Listagem pública

- `LIST_INCLUDE` busca do autor apenas `id` e `name`. A fila da moderação continua trazendo o e-mail, pelo include próprio de `adminProjectController.js`.
- `page` e `limit` passam por `listQuerySchema`: valores inválidos voltam ao padrão (página 1, 10 itens) e `limit` tem teto de 100, valor que as telas de Projetos e Perfil já usam.

## Sessão

O token de login carrega `pwv`, uma impressão da senha atual (HMAC do hash com `JWT_SECRET`, que não revela a senha nem o hash). `authenticate` e `optionalAuthenticate` recusam o token quando a impressão não confere com a senha atual, com `401` e "Sessão expirada. Entre novamente.".

- `PATCH /auth/me` que troca a senha devolve `token` junto com `user`; o `AuthContext` guarda o novo token para a sessão atual continuar. Alterar só nome ou e-mail não muda o token.
- Tokens sem `pwv` são os emitidos antes desta versão e continuam válidos até expirar (`JWT_EXPIRES_IN`, hoje 1 dia).
- Não há coluna nova no banco.

## Banco de dados

`config.js` usa o objeto `ssl` com `rejectUnauthorized: true`. Antes, esse objeto era montado e descartado, e a conexão aceitava qualquer certificado. O Neon usa certificado de autoridade pública, reconhecido pelo Node sem configuração extra.

- `DB_SSL_CA_FILE` continua servindo para bancos com certificado próprio;
- `DB_SSL_REJECT_UNAUTHORIZED=false` desliga a validação e existe apenas para diagnóstico.

Teste feito sem credenciais, com a mesma configuração TLS de produção, contra os servidores do Neon em `sa-east-1` e `us-east-2` usando um endpoint inventado: o certificado foi aceito e a conexão só parou no login (`28P01 password authentication failed`), ou seja, depois do TLS. Como controle, a mesma conexão pelo IP do servidor foi recusada (`ERR_TLS_CERT_ALTNAME_INVALID`), o que confirma que a validação está ativa.

**Antes do merge:** confirmar com o banco real, com o `.env` e `NODE_ENV=production`, rodando `node scripts/check-db.cjs` na pasta `backend`. O script só lê dados e deve mostrar "Conexão PostgreSQL: OK" e "SSL da sessão: ATIVO".

## Servidor

Em `app.js`:

- `app.disable('x-powered-by')`, inclusive nas rotas do Swagger, que ficam sem o Helmet;
- `trust proxy` igual a `1` somente quando `VERCEL` está definida. Fora da Vercel não há proxy, e confiar em `X-Forwarded-For` permitiria falsificar o IP;
- o Swagger (`/api/docs` e `/api/docs.json`) fica desligado quando `VERCEL_ENV=production`. `API_DOCS=true` ou `false` força o comportamento.

## Dependências e CI

- `npm audit fix` nos dois projetos (sem `--force`): axios 1.20.0, express, qs, morgan e outras. Restam dois alertas moderados que só saem com troca de versão principal: `uuid` via Sequelize (a função afetada não é usada pelo Sequelize) e `react-router-dom` (correção apenas na versão 7).
- `.github/workflows/ci.yml`: testes do backend e do frontend, build do frontend e `npm audit --omit=dev --audit-level=high` em cada push e pull request.
- `.github/dependabot.yml`: pull requests semanais de atualização para backend e frontend.

## Arquivos criados

- `backend/docs/seguranca.md`: este documento.
- `backend/test/security.test.js`: testes de segurança.
- `.github/workflows/ci.yml` e `.github/dependabot.yml`.

## Arquivos modificados

- `backend/src/controllers/projectController.js`: moderação na edição, autor sem e-mail e paginação validada.
- `backend/src/validators/projectValidators.js`: recusa `<` e `>` nos textos do projeto.
- `backend/src/controllers/authController.js`, `backend/src/middlewares/auth.js` e `backend/src/utils/jwt.js`: sessão ligada à senha.
- `backend/src/config/config.js`: validação do certificado do banco.
- `backend/src/app.js`: `x-powered-by`, `trust proxy` e Swagger.
- `backend/.env.example`: `API_DOCS` e `DB_SSL_REJECT_UNAUTHORIZED`.
- `backend/test/moderation.test.js`: o teste que garantia que a edição não mudava um projeto aprovado passa a exigir a volta para a fila.
- `backend/package.json`: inclui `security.test.js` no `npm test`.
- `backend/package-lock.json` e `frontend/package-lock.json`: dependências atualizadas.
- `frontend/src/pages/EditProjectPage.jsx` e `NewProjectPage.jsx`: descrição como texto, aviso de nova análise e validação de `<` e `>`.
- `frontend/src/api/auth.js` e `frontend/src/context/AuthContext.jsx`: guardam o token novo após a troca de senha.

## Testes automatizados

```powershell
npm.cmd test
```

Na pasta `backend`, com as variáveis fictícias de banco usadas nos demais testes: 118 testes passam. Na pasta `frontend`: 11 testes passam e o build conclui.

## Integração com outras branches

- `feature/bloqueio-login-15min` (confirmação de e-mail e bloqueio de login): conflita em `package.json`, `.env.example`, `authController.js` e `auth.js`. A resolução mantém as duas mudanças: as variáveis de ambiente das duas, o `test` com `mail.test.js` e `security.test.js`, o login do bloqueio usando `signSessionToken(user)` e o middleware com as duas checagens (senha atual e e-mail confirmado). Com a resolução, os testes das duas branches juntas passam (128).
- `feat/funcionamento-edição-de-perfil`: sem conflito; testes juntos passam.

## Pontos em aberto

- confirmação de e-mail e bloqueio de login: implementados em `feature/bloqueio-login-15min`, aguardando merge;
- o cadastro ainda informa quando o e-mail já existe; com a confirmação de e-mail, a resposta pode passar a ser sempre a mesma;
- o bloqueio após cinco senhas erradas permite que alguém bloqueie a conta de outra pessoa por 15 minutos digitando senhas erradas; avaliar se basta o limite por IP ou se o bloqueio deve considerar também o IP;
- atualizar `react-router-dom` para a versão 7 em uma tarefa separada.
