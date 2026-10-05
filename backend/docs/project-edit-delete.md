# Edição e exclusão de projetos — primeira entrega

Este documento explica as mudanças na branch de CRUD para que a equipe consiga revisar, testar e continuar o trabalho. A decisão desta entrega é manter o fluxo atual de até 10 mídias de 20 MB, incluindo imagens, vídeos e links do YouTube. Lixeira, restauração e limpeza de arquivos no Cloudinary ficam para features futuras.

## Como a edição funciona

1. A tela de edição busca o projeto por ID e carrega dados, tecnologias, colaboradores e mídias atuais. Antes ela procurava o projeto na primeira página da listagem, o que falhava para projetos fora dessa página e não trazia a galeria completa.
2. O usuário mantém ou remove mídias existentes, adiciona arquivos ou links do YouTube e escolhe uma imagem de capa. Apenas arquivos novos vão para o endpoint de upload. URLs já obtidas são reaproveitadas se for preciso tentar salvar novamente.
3. A tela envia ao PUT /api/projects/:id a lista final de mídias com URL, tipo e indicação de capa. O backend valida essa lista com as mesmas regras usadas na criação.
4. A API atualiza dados e relações dentro de uma transação. Se o campo media não vier, as mídias existentes são preservadas. Se vier, a lista enviada substitui os registros antigos. Uma lista vazia é rejeitada porque a regra atual exige ao menos uma mídia.
5. A resposta inclui a galeria atualizada. Após salvar, a tela abre os detalhes do projeto, que agora buscam dados reais da API e exibem imagens, vídeos e YouTube.

Arquivos principais: backend/src/controllers/projectController.js, backend/src/routes/projectRoutes.js, frontend/src/pages/EditProjectPage.jsx, frontend/src/pages/ProjectDetailsPage.jsx e frontend/src/pages/ProjectDetailsPage.css.

## Permissões

- Dono e colaboradores podem editar o conteúdo do projeto.
- Apenas o dono pode alterar a lista de colaboradores e excluir o projeto.
- Pessoas sem vínculo recebem 403. Projeto inexistente recebe 404. Dados inválidos recebem 400.
- O backend aplica as permissões independentemente dos botões visíveis no front-end.

O seletor da tela de edição consulta contas reais de criadores em GET /api/projects/collaborators/search?q=..., evitando os IDs fictícios que podiam causar erro de chave estrangeira. A busca retorna somente ID e nome. A tela oculta a gestão de colaboradores para quem não é dono.

## Como a exclusão funciona nesta versão

O perfil pede confirmação explícita. O DELETE /api/projects/:id verifica a propriedade e, em uma transação, remove mídias, tecnologias, colaboradores e o projeto. O card só some da tela depois da resposta de sucesso. O endereço da API foi alinhado ao usado no cadastro.

Esta exclusão é definitiva no banco. Ainda não existe lixeira ou restauração por 30 dias, como previsto no PRD. Os arquivos do Cloudinary não são removidos; apenas seus registros no banco são apagados. Isso precisa ser tratado em uma feature posterior para evitar arquivos órfãos.

Arquivos principais: backend/src/controllers/projectController.js e frontend/src/pages/CreatorProfilePage.jsx.

## Exibição e conferência

A listagem da API inclui a URL da capa em coverUrl. O perfil e a página de projetos usam essa URL nos cards; quando não há imagem, a página de projetos mantém sua ilustração alternativa. A tela de detalhes consulta GET /api/projects/:id para mostrar o conteúdo e a galeria que estão no banco. Isso permite conferir visualmente o resultado da edição e evita mostrar dados fictícios após salvar. Arquivos: frontend/src/pages/ProjectsPage.jsx e frontend/src/pages/ProjectsPage.css.

## Testes executados

- npm test no backend: 60 testes passaram. Os testes novos fazem requisições HTTP com persistência simulada e cobrem preservação e substituição de mídias, troca de capa, rejeição de galeria vazia/URL inválida, permissões de dono e colaborador, exclusão, leitura do detalhe e busca de colaboradores. Não alteram o banco compartilhado.
- npm run build no frontend: compilação concluída.
- npm run lint no frontend: não executou porque esta branch não contém arquivo de configuração do ESLint.
- Conexão somente de leitura ao banco: funcionou. Entretanto, project_media ainda tem o esquema antigo (storage_key, original_name, mime_type, size_bytes, position, caption), sem media_type e is_cover. A tabela estava vazia no momento da verificação. A equipe de banco precisa avaliar e aplicar a migration backend/src/migrations/20261004000001-recreate-project-media.js antes de testar o fluxo real de cadastro/edição com mídia. Nenhuma migration foi executada durante este trabalho.

## Teste manual após alinhar o banco

1. Entrar como criador e cadastrar um projeto com imagem.
2. Abrir o projeto pela página de perfil, editar somente o título e confirmar que a mídia permanece.
3. Adicionar outra mídia, trocar a capa, salvar e conferir o detalhe e o card do perfil.
4. Remover uma mídia, salvar e confirmar que ela desapareceu do detalhe.
5. Entrar como colaborador e editar conteúdo; tentar alterar a lista de colaboradores ou excluir e confirmar o 403.
6. Entrar como dono, excluir com confirmação e confirmar que o projeto saiu da listagem e não abre mais pelo ID.

## Features posteriores e dependências

- Fluxo de aprovação e status “em análise”: o modelo atual não possui esse estado, então o bloqueio de edição durante a análise depende da futura feature de aprovação e da estrutura de banco correspondente.
- Lixeira, restauração durante 30 dias e expurgo definitivo após esse prazo.
- Remoção de arquivos do Cloudinary quando mídias são retiradas ou projetos são excluídos; limpeza de uploads que não foram associados após falha de gravação.
- A paginação da área de gestão ainda usa a listagem geral de projetos; uma API específica de projetos do usuário será necessária se o volume crescer.
