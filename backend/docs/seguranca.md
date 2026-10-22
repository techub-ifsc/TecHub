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

`projectValidators.js` recusa os caracteres `<` e `>` em `title`, `technologies` e `contribution`, com a mensagem "Não use os caracteres < ou >".

A descrição aceita formatação (negrito, itálico, sublinhado, tachado, listas e alinhamento). Ela é limpa em duas camadas, com a mesma lista do que é permitido:

- **API** (`src/utils/richText.js`, biblioteca `sanitize-html`): antes de salvar, mantém só `p`, `div`, `br`, `b`, `strong`, `i`, `em`, `u`, `s`, `strike`, `ul`, `ol`, `li` e `span`; do atributo `style`, só `text-align`. Imagens, links, `script`, `iframe` e atributos como `onerror` são removidos. O limite de 3000 caracteres vale para o texto visível; o HTML tem teto de 20000.
- **Tela** (`frontend/src/utils/richText.js`, biblioteca DOMPurify): a descrição é limpa de novo antes de ir para o editor ou de ser exibida nos detalhes e na moderação. Descrições antigas, em texto puro, são escapadas e têm as quebras de linha convertidas. Cards e prévias mostram só o texto.

Os rascunhos (`POST /projects/draft` e `PUT /projects/draft/:id`) passam por `draftProjectSchema`: tudo é opcional, mas o que vier segue as mesmas regras, e `approvalStatus`, `ownerId`, parecer e datas enviados pelo cliente são descartados. Só um rascunho pode ser enviado para análise.

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

Teste no banco real (20/10/2026), com o `.env` de produção: `check-db.cjs` conectou e validou o esquema. A conexão do lado da API usou TLS 1.3 com o certificado `*.sa-east-1.aws.neon.tech` (Let's Encrypt) validado pelo Node. O script mostra "SSL da sessão: NÃO CONFIRMADO" porque o Neon termina o TLS num proxy na frente do banco, e `pg_stat_ssl` só enxerga a conexão entre o proxy e o banco.

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
