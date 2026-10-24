# Convenções do projeto

Antes de alterar a interface, filtros ou dados de produtos, leia `skills/rodri-project-guidelines/SKILL.md` e mantenha estas regras:

- Toda confirmação, inclusive confirmações simples, deve usar um componente modal reutilizável com o padrão visual da aplicação. Não use `window.confirm`, `alert` nem confirmações nativas do navegador.
- Filtros de listagens devem ser aplicados pela API/banco, nunca filtrando as coleções no frontend. Ao mudar um filtro, buscar os resultados correspondentes no servidor.
- Endpoints de listagem devem retornar somente os campos necessários para a própria listagem; não incluir campos extensos ou relações que a tela da lista não exibe.
- Ao abrir um registro da listagem para consultar ou editar, buscar seus dados completos por um GET individual pelo ID. Não depender do objeto resumido da listagem como fonte dos dados do formulário.
- Filtros de data devem buscar no backend imediatamente após a seleção da data, sem debounce.
- Inputs de texto, número e demais tipos usados como filtro devem aguardar 500 ms sem novas alterações antes de buscar no backend (debounce).
- Em todo select de filtro, a opção abrangente (`Todos`, `Todas` ou equivalente) deve ser a primeira opção.
- Registros inativos precisam continuar acessíveis pelo filtro de situação e ter aparência claramente distinta, sem parecer excluídos.
- O filtro de situação de produtos inicia em `Todos`; ativar ou inativar um produto sempre pede confirmação no modal compartilhado.
- Para composições, custos, rendimentos, preços e margens dos modelos, use a planilha `Calçado Próprio - Final.xlsx` como referência. Não inclua componente cuja quantidade na planilha seja zero ou que não componha aquele modelo.
- Ao corrigir dados já cobertos pela migração consolidada, ajuste a migração existente quando for seguro e idempotente; não crie outra migração sem necessidade. Atualize o banco local quando isso fizer parte do pedido.

## Erros HTTP

- Crie erros de API com o helper compartilhado `createApiError`, definido em `shared/utils/api-error.ts` e autoimportado pelo Nuxt.
- Informe em cada chamada o `statusCode` correspondente ao erro real; não use um código genérico fixo para todos os erros.
- Coloque a mensagem detalhada em `message`. Não use `statusMessage` para mensagens da aplicação, pois o H3 pode sanitizá-lo e emitir avisos.
- Preserve os dados adicionais do erro quando necessários e, no cliente, prefira `data.message` ao apresentar a mensagem recebida.
