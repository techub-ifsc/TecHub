# Gerência de rascunhos — frontend

Branch: `feat/gerencia-de-rascunhos-de-projeto`.

## O que foi implementado

- `Meus rascunhos` na navegação e na rota `/meus-rascunhos`.
- Listagem dos rascunhos do usuário conectado, busca por título/descrição/tecnologia e ordenação por atualização ou título.
- Estado vazio, tratamento de falha de armazenamento, exclusão com confirmação e layout responsivo.
- Salvar projetos incompletos, inclusive sem título, sem criar registros públicos nem enviar à fila de aprovação.
- Reabrir em `/meus-rascunhos/:draftId/editar`, editar e atualizar o mesmo rascunho.
- Persistência de campos, formatação da descrição, colaboradores, fotos, vídeos, links do YouTube e escolha da capa.
- Validação dos campos obrigatórios somente no envio para revisão.
- Submissão pela API existente: `POST /projects`. O rascunho só é removido depois de uma resposta de sucesso. Se o envio falhar, as últimas alterações ficam salvas.

## Limites desta etapa

O backend não foi alterado. Os rascunhos ficam no **IndexedDB deste navegador**, separados pelo ID do usuário autenticado. Eles não são sincronizados com outros dispositivos e podem ser perdidos ao limpar os dados do site. O isolamento por usuário é aplicado pela interface/serviço local; autorização no servidor e compartilhamento com colaboradores dependerão da futura API de rascunhos.

Salvar não chama a API de projetos nem faz upload de arquivos. Uploads só começam no envio para revisão. A busca de colaboradores continua usando a API existente.

O registro legado `techub:new-project-draft` não é migrado automaticamente: ele não possui identificação de proprietário. A nova implementação não o apaga.

## Executar

Na pasta `frontend`:

```powershell
npm ci
npm run dev
```

Para conferir a interface sem autenticação/backend, use o modo de desenvolvimento já existente no projeto:

```powershell
$env:VITE_MOCK_AUTH = 'creator'
npm run dev
```

Abra `http://localhost:5173/meus-rascunhos`. O modo mock só existe em desenvolvimento e não simula uma submissão bem-sucedida; a submissão real exige backend disponível e autenticação válida. As capturas entregues usam exemplos criados apenas no navegador de teste.

## Verificação

- `npm test`: 11 testes aprovados, incluindo múltiplos rascunhos, atualização, propriedade, arquivos/capa, exclusão e ausência de autenticação.
- `npm run build`: compilação de produção aprovada.
- Fluxo verificado em navegador: salvar sem POST, recarregar com arquivo/capa, editar sem duplicar, busca e estado sem resultados, cancelar/confirmar exclusão, validação antes do envio, falha preservando alterações e resposta de sucesso removendo o rascunho. As respostas de submissão foram simuladas no teste, sem alterar o backend.
- Layout da listagem e do editor conferido em 1440 px e 390 px, sem rolagem horizontal.
- `npm run lint`: o ZIP original não contém configuração do ESLint; o comando permanece bloqueado por essa ausência.

## Git

O ZIP recebido não contém `.git` nem remoto. A `main` local corresponde ao conteúdo extraído do arquivo recebido, e a branch da funcionalidade foi criada sobre essa base. Não foi feito push.
