# Convenções do projeto

Antes de alterar a interface, filtros ou dados de produtos, leia `skills/rodri-project-guidelines/SKILL.md` e mantenha estas regras:

- Toda confirmação, inclusive confirmações simples, deve usar um componente modal reutilizável com o padrão visual da aplicação. Não use `window.confirm`, `alert` nem confirmações nativas do navegador.
- Filtros de listagens devem ser aplicados pela API/banco, nunca filtrando as coleções no frontend. Ao mudar um filtro, buscar os resultados correspondentes no servidor.
- Em todo select de filtro, a opção abrangente (`Todos`, `Todas` ou equivalente) deve ser a primeira opção.
- Registros inativos precisam continuar acessíveis pelo filtro de situação e ter aparência claramente distinta, sem parecer excluídos.
- O filtro de situação de produtos inicia em `Todos`; ativar ou inativar um produto sempre pede confirmação no modal compartilhado.
- Para composições, custos, rendimentos, preços e margens dos modelos, use a planilha `Calçado Próprio - Final.xlsx` como referência. Não inclua componente cuja quantidade na planilha seja zero ou que não componha aquele modelo.
- Ao corrigir dados já cobertos pela migração consolidada, ajuste a migração existente quando for seguro e idempotente; não crie outra migração sem necessidade. Atualize o banco local quando isso fizer parte do pedido.
