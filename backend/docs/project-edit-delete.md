# Integração da edição e exclusão com o CRUD de projetos

Esta entrega parte da branch `feat/CRUD-de-projetos` após o PR #21. Ela preserva o upload direto e assinado para o Cloudinary, a galeria compartilhada entre cadastro e edição, a exibição de mídias nos detalhes e a capa na listagem. Não retorna ao fluxo anterior de `POST /api/media/upload`.

## Edição

- `frontend/src/pages/EditProjectPage.jsx` carrega dados e mídias pelo ID do projeto. O hook `frontend/src/hooks/useProjectMedia.js` mantém mídias existentes, envia somente arquivos novos e monta a lista final para `PUT /api/projects/:id`.
- `backend/src/controllers/projectController.js` aceita dono ou colaborador para editar conteúdo. Apenas o dono pode enviar o campo `collaborators`. O backend impõe a regra mesmo se a interface for contornada.
- Dados principais, tecnologias, colaboradores e registros de mídia são atualizados em uma transação. Se `media` for omitido, a galeria atual permanece. Se for enviado, substitui os registros antigos; o validador continua exigindo pelo menos uma mídia.
- A resposta de sucesso é montada ainda dentro da transação. Isso evita tentar desfazer uma transação já confirmada caso a leitura final falhe.
- `GET /api/projects/:id` passa a retornar o nome real dos colaboradores, além do ID. `GET /api/projects/collaborators/search?q=...` fornece ao seletor somente IDs e nomes de contas criadoras reais, evitando os IDs fictícios anteriores.
- Na tela, colaboradores não veem nem enviam o campo de gestão de colaboradores. Após salvar, o usuário é levado aos detalhes do projeto.
- Mesmo o dono só reenvia `collaborators` quando a lista muda; isso preserva as contribuições registradas numa edição apenas de texto ou mídia.

## Exclusão

- `backend/src/controllers/projectController.js` permite `DELETE /api/projects/:id` somente ao dono. A remoção das relações e do projeto ocorre numa transação.
- `frontend/src/pages/CreatorProfilePage.jsx` pede confirmação explícita, bloqueia outro clique durante a requisição e remove o card apenas quando a API confirma sucesso. Colaboradores veem o botão de edição, mas não o de exclusão.
- Esta primeira versão exclui definitivamente os registros do banco. Ela **não** apaga os arquivos do Cloudinary e ainda não oferece lixeira ou restauração.

## Verificação e Testes

- `backend/test/projects.test.js` cobre edição de mídias, permissão do colaborador, gestão exclusiva do dono, exclusão e busca real de colaboradores. Os testes simulam persistência; não alteram o banco compartilhado.
- `npm test` em `backend`: 68 testes passaram com variáveis fictícias de banco fornecidas apenas ao processo de teste.
- `npm run build` em `frontend`: compilação concluída.
- **Atenção ao esquema do banco**: Verificar se a migration `backend/src/migrations/20261004000001-recreate-project-media.js` foi executada no ambiente compartilhado para assegurar a presença das colunas `media_type` e `is_cover` na tabela `project_media`.

## Roteiro de Teste Manual Recomendado

1. Entrar como criador e cadastrar um projeto com imagem.
2. Abrir o projeto pela página de perfil, editar somente o título e confirmar que a mídia permanece.
3. Adicionar outra mídia, trocar a capa, salvar e conferir o detalhe e o card do perfil.
4. Remover uma mídia, salvar e confirmar que ela desapareceu do detalhe.
5. Entrar como colaborador e editar conteúdo; tentar alterar a lista de colaboradores ou excluir e confirmar o retorno de status `403`.
6. Entrar como dono, confirmar a exclusão e verificar se o projeto saiu da listagem e não pode mais ser acessado pelo ID.

## Limites e próximas features

- Fluxo de aprovação e bloqueio de edição em análise depende de um estado ainda ausente no modelo.
- Lixeira, restauração e expurgo posterior continuam pendentes conforme o PRD.
- Ao remover mídia ou projeto, o arquivo enviado continua no Cloudinary; será necessário definir limpeza segura, inclusive para uploads que nunca forem vinculados a um projeto.
- Perfil e listagem consultam até 100 projetos nesta versão. Paginação completa ou uma rota de projetos por usuário será necessária quando o volume crescer.
- O limite de 10 MB por arquivo foi mantido conforme a branch mais recente da equipe e confirmado pelo responsável desta integração.