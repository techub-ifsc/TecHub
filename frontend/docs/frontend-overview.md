# Tech Hub — estrutura e convenções do frontend

## Resultado desta etapa

O frontend passa a ter documentação própria, equivalente à que já existe em `backend/docs`. Este documento descreve a estrutura atual da aplicação React, o controle de acesso por perfil, como o cliente guarda a sessão, as formas de chamar a API que convivem hoje e as convenções de estilo.

Também nesta etapa:

- a barra de rolagem das listas suspensas passou a usar um padrão único, declarado em `src/index.css`;
- o CSS herdado do e-commerce Órbita foi removido de `src/index.css`, que passou de 1760 para 733 linhas;
- a declaração duplicada e desprotegida de `/criadores/:id/editar` foi removida, mantendo apenas a que fica dentro de `CreatorProfileRoute`.

Decisões e limitações registradas:

- a aplicação é uma SPA criada com Vite; não há renderização no servidor;
- o roteamento é feito inteiramente no cliente com `react-router-dom`;
- os perfis exibidos na interface são `Criador` e `Visitante`, mas os valores trocados com a API são `creator`, `visitor` e `super_admin`;
- não existe biblioteca de componentes nem framework de CSS; cada página tem sua própria folha de estilo;
- não existem testes automatizados no frontend nesta etapa.

## Estrutura de pastas

```
frontend/
├── docs/              documentação desta pasta
└── src/
    ├── api/           camada de acesso HTTP
    ├── assets/        imagens, ícones e fontes
    ├── components/    componentes reutilizáveis e guardas de rota
    ├── context/       estado global (sessão do usuário)
    ├── pages/         uma tela por arquivo, com o CSS ao lado
    ├── App.jsx        tabela de rotas
    ├── main.jsx       ponto de entrada; monta os providers
    └── index.css      estilos globais e variáveis compartilhadas
```

Cada página tem um arquivo `.css` de mesmo nome ao lado do `.jsx`. A única exceção atual é `EditProjectPage.jsx`, que não possui folha própria e reaproveita classes de outras telas.

## Rotas e controle de acesso

A tabela de rotas fica em `src/App.jsx`. O `Header` e o `Footer` ficam fora do `Routes`, portanto aparecem em todas as telas.

Rotas públicas:

- `/` — página inicial;
- `/projetos` — listagem pública de projetos;
- `/projetos/:id` — detalhes de um projeto;
- `/criadores` — listagem pública de criadores;
- `/criadores/:id` — perfil público de um criador;
- `/cadastro` e `/login` — autenticação;
- `*` — qualquer outro caminho cai no `EmptyState` de página não encontrada.

Rotas protegidas e seus guardas:

- `/projeto/novo` fica dentro de `CreatorRoute`, que exige `creator` ou `super_admin`;
- `/criadores/:id/editar` fica dentro de `CreatorProfileRoute`, que exige `creator` e que o `id` da URL seja o do próprio usuário;
- `/admin/projetos/pendentes` fica dentro de `AdminRoute`, que exige `super_admin`.

Os três guardas mostram `Spinner` enquanto `loading` for verdadeiro e redirecionam para `/login`, guardando a origem em `state.from`, quando não há sessão. Quando há sessão mas falta permissão, `AdminRoute` e `CreatorProfileRoute` redirecionam para a página inicial, e `CreatorRoute` redireciona para `/login`.

Existe um quarto guarda, `PrivateRoute.jsx`, que verifica apenas se há sessão, sem olhar o perfil. Ele não está sendo usado por nenhuma rota nesta etapa.

### Rota declarada em duplicidade

`/projetos/:id/editar` aparece duas vezes na tabela e precisa de decisão da equipe:

- dentro de `CreatorRoute`, apontando para `NewProjectPage`;
- no fim do arquivo, fora de qualquer guarda, apontando para `EditProjectPage`.

As duas telas leem o `:id` da URL, mas não fazem a mesma coisa:

- `EditProjectPage` busca o projeto existente, preenche o formulário e salva com `PUT`;
- `NewProjectPage` usa o `:id` apenas para trocar o título para "Editar projeto" e o destino do botão de cancelar. Ela não busca o projeto e salva sempre com `POST /projects`, criando um registro novo.

Enquanto a duplicidade existir, não é seguro afirmar qual componente responde pela rota nem se a proteção de perfil está sendo aplicada. Se for `NewProjectPage`, a edição abre com o formulário vazio e, ao salvar, cria um projeto duplicado em vez de atualizar o existente. Se for `EditProjectPage`, a edição funciona, mas a rota fica acessível sem sessão.

## Autenticação no cliente

O estado de sessão vive em `src/context/AuthContext.jsx`. O provider é montado em `main.jsx` e envolve toda a aplicação.

O contexto expõe:

- `user`, `loading` e `isAuthenticated`;
- `isCreator`, verdadeiro quando `user.role === "creator"`;
- `isAdmin`, verdadeiro quando `user.role === "super_admin"`;
- as ações `login`, `register`, `logout` e `updateProfile`.

Ao carregar a página, o provider procura um token salvo e chama `GET /auth/me` para restaurar a sessão. Se a chamada falhar, as chaves são apagadas e o usuário fica deslogado.

### Chaves do `localStorage`

A sessão é gravada em três chaves simultaneamente:

- `token` — usada pelo interceptador do `axiosClient`;
- `techub_token` — cópia do mesmo token;
- `techub_user` — o usuário serializado.

O `axiosClient` lê apenas `token`. As outras duas existem porque telas diferentes foram escritas em momentos diferentes. As telas que leem o token usam as duas chaves como alternativa uma da outra (`techub_token || token`), por isso o comportamento atual é consistente. Unificar em uma única chave é um ajuste pendente; enquanto houver mais de uma, qualquer código novo precisa gravar todas.

## Comunicação com a API

O endereço base vem de `VITE_API_URL` e, quando a variável não está definida, cai em `http://localhost:3001/api`. O valor é declarado em três lugares: `src/api/apiUrl.js`, `src/api/axiosClient.js` e uma constante própria em `SignUpPage.jsx`. Os três usam o mesmo valor padrão.

Convivem hoje duas formas de chamar a API:

- `src/api/axiosClient.js` — instância do axios que injeta `Authorization: Bearer <token>` em toda requisição e, ao receber `401`, limpa as chaves `token` e `user`. É usada apenas por `src/api/auth.js`, que por sua vez é usado apenas pelo `AuthContext`;
- `fetch` direto, montando a URL a partir do endereço base. É o que fazem `SignUpPage`, `ProjectsPage`, `ProjectDetailsPage`, `NewProjectPage`, `EditProjectPage` e `CreatorProfilePage`.

As chamadas feitas com `fetch` não passam pelo interceptador, portanto não ganham o cabeçalho de autorização automaticamente nem o tratamento de `401`. Padronizar em uma única forma é um ajuste pendente.

`CreatorsPage` e `ProjectValidationPage` ainda não chamam a API: exibem listas fixas declaradas no próprio arquivo (`CREATORS` e `INITIAL_PROJECTS`).

### Cadastro

`SignUpPage` guarda o tipo de conta escolhido em estado próprio, já com os valores aceitos pela API, `creator` e `visitor`. Os rótulos em português aparecem apenas no texto dos botões; o valor do estado é enviado sem conversão.

O corpo enviado a `POST /auth/register` contém exatamente `name`, `email`, `password` e `accountType`. O schema do backend é estrito e rejeita campos extras, portanto nenhum outro campo pode ser acrescentado sem alteração correspondente na API.

As regras de e-mail institucional para contas de criador são validadas apenas no backend. O frontend não as replica; ele apenas exibe os erros devolvidos, usando `errors[].path` para colocar a mensagem no campo correto.

## Convenções de estilo

`src/index.css` guarda os estilos globais e as variáveis compartilhadas. As folhas de cada página importam apenas o próprio arquivo.

### Variáveis compartilhadas

Os botões de todas as telas apontam para as variáveis declaradas em `index.css`:

```css
--tc-green          cor principal
--tc-green-hover    estado de passagem do mouse
--tc-green-active   estado pressionado
--tc-btn-radius     arredondamento
--tc-btn-padding    espaçamento interno
--tc-remove-bg      fundo dos botões de remoção
--tc-remove-bg-hover
```

Para mudar a cor ou o formato dos botões do site inteiro, altera-se o valor nessas variáveis e em nenhum outro lugar.

A barra de rolagem das listas suspensas segue o mesmo princípio:

```css
--tc-scrollbar-width       largura da barra
--tc-scrollbar-track       cor do trilho
--tc-scrollbar-thumb       cor do indicador
--tc-scrollbar-thumb-hover
--tc-scrollbar-radius      arredondamento
```

A classe utilitária `.tc-scrollbar` aplica esse conjunto e deve ser usada em qualquer nova lista com rolagem, em vez de declarar regras `::-webkit-scrollbar` na folha da página.

### CSS herdado do Órbita

O projeto nasceu a partir do código de um e-commerce chamado Órbita. Nesta etapa, as seções de carrinho, checkout, pedidos, grade e detalhes de produto, controle de quantidade, barra de navegação, rodapé e telas de autenticação desse e-commerce foram removidas de `index.css`. Antes da remoção, foi conferido que nenhuma das classes dessas seções aparecia em arquivos `.jsx`.

Também foram removidas as regras que impunham aparência a todo elemento `button` por meio de uma cadeia de cinco `:not()`. A especificidade dessas regras era maior que a de uma classe simples, de modo que o estilo próprio de cada página só prevalecia quando declarado com `!important`. A regra base de botão, que define apenas fonte, cursor e alinhamento, foi mantida.

As 534 ocorrências de `!important` nas folhas do frontend existiam para vencer aquelas regras. Com elas removidas, deixaram de ser necessárias, mas continuam no código. Retirá-las muda a ordem de resolução dentro de cada arquivo e precisa ser feito folha por folha, com verificação visual. Cinco telas só são alcançáveis com sessão iniciada e perfil adequado, então essa limpeza depende de alguém que consiga entrar no sistema.

Verificação feita na remoção: aparência de 136 elementos em cinco telas públicas, comparada antes e depois. A remoção das seções do e-commerce não alterou nenhum elemento. A remoção das regras de `button` alterou 16, todos passando a usar o espaçamento e o arredondamento declarados na folha da própria página em vez dos valores impostos pelo Órbita.

## Execução local

A partir da pasta `frontend`:

```powershell
npm.cmd install
```

Crie o arquivo `.env` com o endereço da API:

```dotenv
VITE_API_URL=http://localhost:3001/api
```

O `.env` é local e está no `.gitignore`; ele não vem junto ao clonar o repositório. Sem ele, a aplicação usa o endereço padrão do backend local.

Para subir o servidor de desenvolvimento:

```powershell
npm.cmd run dev
```

A aplicação fica em `http://localhost:5173`. As variáveis de ambiente são lidas na subida do servidor; depois de criar ou alterar o `.env` é preciso reiniciar.

Para gerar a versão de produção e conferir que o projeto compila:

```powershell
npm.cmd run build
```

As telas renderizam sem o backend, mas cadastro, login, listagem e detalhes de projetos, perfil de criador e as telas de criação e edição precisam da API no ar.

## Dependências

- `react` e `react-dom` 18;
- `react-router-dom` 6 para o roteamento;
- `axios` para a camada de autenticação;
- `vite` como servidor de desenvolvimento e empacotador.

Não há biblioteca de componentes, de formulários ou de estado. Validação de formulário e controle de estado são feitos com `useState` e funções próprias de cada página.

## Arquivos criados

- `docs/frontend-overview.md`: este documento.

## Arquivos modificados

- `src/index.css`: remove as seções do e-commerce Órbita e as regras globais de `button`; acrescenta as variáveis `--tc-scrollbar-*` e a classe `.tc-scrollbar`.
- `src/App.jsx`: remove a declaração duplicada e desprotegida de `/criadores/:id/editar`.
- `src/components/CustomSelect.css`: a barra de rolagem passa a usar as variáveis compartilhadas e ganha `scrollbar-width` e `scrollbar-color`, que faltavam para o Firefox.
- `src/pages/NewProjectPage.css`, `ProfileEditPage.css`, `ProjectsPage.css` e `ProjectValidationPage.css`: a barra de rolagem passa a usar as variáveis compartilhadas.

Nenhum arquivo do backend foi alterado.

## Pontos em aberto

- decidir qual componente responde por `/projetos/:id/editar` e remover a outra declaração;
- verificar se a edição de projeto deve ser restrita ao dono do projeto; `CreatorRoute` libera qualquer `creator`;
- decidir se `PrivateRoute` será usado ou removido;
- unificar as chaves de sessão do `localStorage` em uma só;
- padronizar as chamadas à API em uma única forma, para que todas passem pelo interceptador, e ler o endereço base apenas de `apiUrl.js`;
- ligar `CreatorsPage` e `ProjectValidationPage` à API;
- remover os `!important` que existiam apenas por causa das regras herdadas, folha por folha;
- criar a folha de estilo própria de `EditProjectPage` ou unificá-la com `NewProjectPage`;
- definir se haverá testes automatizados no frontend.
