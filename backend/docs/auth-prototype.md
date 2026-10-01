# Tech Hub — autenticação e perfis de usuário

## Resultado desta etapa

O backend usa agora os perfis próprios do Tech Hub:

- `visitor`: conta comum cadastrada; visitantes anônimos continuam podendo acessar rotas públicas.
- `creator`: conta que pode publicar/administrar conteúdo; no cadastro público exige e-mail institucional.
- `super_admin`: conta interna com acesso total às autorizações por perfil; não pode ser criada no cadastro público.

Os nomes persistidos no banco, enviados no JWT e devolvidos pela API permanecem em inglês. O frontend pode exibir `Visitante`, `Criador` e `Superadministrador` em português.

Decisões temporárias registradas:

- os domínios de criador vêm de `CREATOR_ALLOWED_DOMAINS` e, nesta etapa, são `@ifsc.edu.br` e `@aluno.ifsc.edu.br`;
- cada domínio é conferido como sufixo exato; outros subdomínios não são aceitos automaticamente;
- a `main` atual grava o usuário e responde sem token; o login ainda está liberado porque a confirmação de e-mail não foi implementada;
- a resposta de cadastro ainda menciona confirmação em 24 horas, mas o envio e a validação do e-mail estão comentados e não acontecem;
- o frontend envia `accountType` com `visitor` ou `creator`; a API não aceita o campo `role`;
- `super_admin` é criado apenas pela equipe usando um script interno e variáveis de ambiente;
- o super-admin já ignora restrições de perfil. Fluxos administrativos específicos, como aprovação de projetos, ainda não foram criados.

## Fluxo de cadastro

1. `POST /api/auth/register` passa pelo limitador de requisições.
2. Zod valida `name`, `email`, `password` e `accountType` e rejeita qualquer campo extra.
3. Se `accountType` for `creator`, o e-mail precisa terminar exatamente com o domínio configurado.
4. O controller procura o e-mail normalizado para evitar duplicidade.
5. O model `User` gera o hash bcrypt com custo 12 antes de salvar.
6. A API devolve `message` e o usuário sem senha, sem JWT. O cliente deve chamar login para obter o token.

O campo `role` nunca é copiado diretamente da requisição. O valor persistido vem do `accountType` já validado, impedindo a criação pública de `super_admin`.

Exemplo de visitante:

```json
{
  "name": "Maria Silva",
  "email": "maria@example.com",
  "password": "SenhaTeste123",
  "accountType": "visitor"
}
```

Exemplo de criador durante a regra temporária:

```json
{
  "name": "João Silva",
  "email": "joao@aluno.ifsc.edu.br",
  "password": "SenhaTeste123",
  "accountType": "creator"
}
```

Resposta de sucesso: HTTP `201`. Esta é a resposta atual da `main`; ela ainda mostra uma mensagem de confirmação, mas nenhum e-mail é enviado neste fluxo.

```json
{
  "message": "Cadastro realizado! Verifique seu e-mail em até 24 horas para ativar sua conta.",
  "user": {
    "id": "<uuid>",
    "name": "Maria Silva",
    "email": "maria@example.com",
    "role": "visitor",
    "createdAt": "<data ISO>",
    "updatedAt": "<data ISO>"
  }
}
```

Apesar do texto da mensagem, o backend ainda não envia o e-mail e o login não verifica confirmação. O token de sessão é obtido em `POST /api/auth/login`.

Erros principais:

- `400`: dados inválidos, `accountType` desconhecido, domínio de criador inválido, `role` ou outro campo extra;
- `409`: e-mail já cadastrado;
- `429`: limite de requisições excedido;
- `503`: banco/tabela indisponível.

## Login e perfil

`POST /api/auth/login` continua recebendo `email` e `password`. O bcrypt compara a senha enviada com o hash; a senha original não é descriptografada. Credenciais incorretas sempre retornam o mesmo `401`, sem revelar se o e-mail existe.

`GET /api/auth/me` exige `Authorization: Bearer <JWT>` e devolve os dados seguros do usuário.

`PATCH /api/auth/me` exige a senha atual. Um usuário `creator` não pode trocar seu e-mail por um endereço fora do domínio institucional, pois isso permitiria contornar a regra do cadastro. Trocar o e-mail não muda automaticamente o perfil de uma conta.

## Migração do banco

Arquivo: `src/migrations/20260921000001-replace-ecommerce-user-roles.js`.

A migração:

- renomeia `customer` para `visitor`;
- renomeia `seller` para `creator`;
- adiciona `super_admin` ao ENUM;
- muda o valor padrão para `visitor`;
- preserva as contas existentes durante os renomes.

A reversão recusa continuar enquanto existir uma conta `super_admin`, evitando rebaixamento ou perda silenciosa de permissão.

Importante: esta migração foi preparada, mas não foi executada no Neon compartilhado nesta etapa. A equipe de banco deve revisar e autorizar a aplicação. Até a migração ser executada, o banco antigo rejeitará os novos valores de perfil.

Com autorização da equipe, a partir da pasta `backend`:

```powershell
npm.cmd run db:migrate
```

Depois, a verificação somente leitura pode ser executada:

```powershell
node scripts/check-db.cjs
```

Ela espera exatamente `visitor`, `creator` e `super_admin` no ENUM atual.

## Criação interna de super-admin

Não existe rota HTTP para essa operação. Depois da migração, a equipe preenche temporariamente no `.env`:

```dotenv
SUPER_ADMIN_NAME=Nome da pessoa
SUPER_ADMIN_EMAIL=email@exemplo.com
SUPER_ADMIN_PASSWORD=UmaSenhaSegura123
```

E executa:

```powershell
npm.cmd run admin:create
```

O script valida os dados, verifica duplicidade e usa o mesmo hook bcrypt do model. Ele não imprime a senha. Depois da criação, recomenda-se remover essas três variáveis do `.env`; a conta permanece no banco.

## Configuração local

O arquivo `.env` real é local e não deve ser enviado ao GitHub. Acrescente nele:

```dotenv
CREATOR_ALLOWED_DOMAINS=@ifsc.edu.br,@aluno.ifsc.edu.br
```

O `.env.example` contém apenas nomes e exemplos seguros para orientar a equipe.

## Arquivos criados

- `src/constants/roles.js`: fonte única dos perfis e dos tipos permitidos no cadastro público.
- `src/config/creatorDomain.js`: lê e valida o domínio institucional do ambiente.
- `src/migrations/20260921000001-replace-ecommerce-user-roles.js`: converte o ENUM e os perfis legados.
- `scripts/create-super-admin.cjs`: cria uma conta administrativa internamente.

## Arquivos modificados

- `src/validators/authValidators.js`: exige `accountType`, valida o domínio do criador e exporta as regras reutilizadas pelo script.
- `src/controllers/authController.js`: persiste o perfil validado e protege o e-mail institucional nas alterações de perfil.
- `src/models/User.js`: define `visitor`, `creator` e `super_admin`, com padrão `visitor`.
- `src/middlewares/auth.js`: permite que `super_admin` atravesse qualquer autorização por perfil.
- `src/routes/categoryRoutes.js`, `productRoutes.js`, `orderRoutes.js` e `favoriteRoutes.js`: substituem as referências herdadas a `seller/customer` por `creator/visitor`.
- `src/controllers/orderController.js`: trata `creator` e `super_admin` como perfis que podem consultar todos os registros no fluxo herdado.
- `src/routes/authRoutes.js` e `src/config/swagger.js`: documentam o novo contrato de cadastro e seus erros.
- `src/app.js`: ajusta apenas o título da documentação para Tech Hub.
- `scripts/check-db.cjs`: verifica o novo ENUM.
- `package.json`: adiciona o comando `admin:create`.
- `.env.example`: documenta domínio e variáveis temporárias do script administrativo.
- `test/auth.test.js`: cobre os novos perfis e preserva os testes anteriores de cadastro/login.

Nenhum arquivo do frontend foi alterado.

## Testes automatizados

Na pasta `backend`:

```powershell
npm.cmd test
```

Os testes usam persistência simulada em memória, mas executam Express, rotas, controllers, Zod, model, hook bcrypt, JWT e middleware reais. Eles não alteram o Neon.

Cobertura relevante:

- visitante e criador são criados com o perfil correto;
- criador aceita `@ifsc.edu.br` e `@aluno.ifsc.edu.br`, rejeitando domínios não configurados;
- cadastro público rejeita `role` e `accountType=super_admin`;
- criador não troca o e-mail para fora do domínio;
- super-admin passa por autorizações de perfil;
- hash bcrypt, JWT, login, `/me`, duplicidade, erros genéricos e rate limit continuam funcionando.

Esses testes não substituem o teste de integração no Neon depois que a migração for aplicada.

## Alinhamento necessário com frontend

O formulário deve enviar os quatro campos exatos: `name`, `email`, `password` e `accountType`. Os valores aceitos em `accountType` são `visitor` e `creator`. Na `main` analisada, a tela ainda não envia `accountType` e mantém valores de interface em português; ela precisa mapear `criador` para `creator` e `visitante` para `visitor` no corpo da requisição. Sem esse alinhamento, a API rejeita o cadastro com `400`.

A interface não deve enviar `role`, nem oferecer `super_admin`. Deve tratar `errors[].path`, especialmente erros no caminho `email`, e armazenar/enviar o JWT conforme o fluxo já combinado.

## Decisões futuras

- confirmar se a lista temporária de domínios continuará fixa ou será administrável no sistema;
- decidir confirmação de e-mail e/ou aprovação antes de ativar um criador;
- definir ações administrativas específicas do super-admin e auditoria dessas ações;
- confirmar se outras rotas herdadas do e-commerce permanecerão no Tech Hub;
- implementar confirmação de e-mail, recuperação de senha, bloqueio por tentativas, logout com revogação e demais histórias futuras do PRD.

Esta etapa altera somente o backend de autenticação/perfis e a consistência das autorizações herdadas. Ela não cria os fluxos administrativos completos.
