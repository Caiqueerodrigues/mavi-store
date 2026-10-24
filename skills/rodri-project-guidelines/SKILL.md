---
name: rodri-project-guidelines
description: Apply Rodrigues project conventions when changing its Vue interface, list filters, confirmations, product costing, or spreadsheet-backed catalog data.
---

# Rodrigues project guidelines

Use this skill for changes to this application's interface, APIs, filters, product records, or spreadsheet-backed costs.

## Confirmations and modals

- Present every confirmation, including simple confirmations, in a reusable component using the application's modal design, not in a browser-native `confirm()` or `alert()`.
- Reuse the shared confirmation component. If the project has no shared component yet, create one using the existing modal classes, then use it at the calling site.
- Keep dialogs persistent: clicking the backdrop or pressing Escape must not silently discard the decision.

## List filters

- Apply filters at the API/database layer. Do not fetch a broad collection and filter it in Vue computed properties or templates.
- Send filter state to the server when it changes and display the returned page/results directly.
- Date filters must trigger a backend search immediately after a date is selected, without a debounce.
- Text, numeric, and all other filter input types must wait for 500 ms without further changes before triggering a backend search (debounce).
- Populate filter options from an API source when deriving them from the filtered result set could hide valid options.
- Put the inclusive option (`Todos`, `Todas`, or equivalent) first in every filter select.

## Inactive records

- Keep inactive records available through the situation filter; do not make inactivation indistinguishable from deletion.
- Give inactive cards/rows a clearly muted treatment and an explicit `Inativo` status badge, consistent with the existing visual system.
- When appropriate, provide an activation action so inactivation remains reversible.
- Default the product situation filter to `Todos`, and confirm both activation and inactivation through the shared modal.

## Spreadsheet-backed product data

- Treat `Calçado Próprio - Final.xlsx` as the source of truth for the modeled products' compositions, quantities/yields, costs, current prices, and model-specific profit assumptions.
- Do not add a product component when the corresponding spreadsheet quantity is zero or blank. Do not carry a component from one model into another merely because the models share a material category.
- If a spreadsheet formula references another model's result, verify the reference against its row/model before copying it into the application; preserve the model's own cost logic rather than reproducing a confirmed spreadsheet reference error.
- Prefer updating the existing consolidated migration when it can safely and idempotently correct these seeded records. Avoid adding a new migration solely for a correction to that same seed set.

## Erros HTTP

- Use `createApiError` de `shared/utils/api-error.ts` para criar erros HTTP em rotas, middlewares, validações e utilitários do servidor. O Nuxt o autoimporta.
- Passe em cada chamada o `statusCode` correspondente ao erro real; não aplique um status genérico fixo a todos os erros.
- Use `message` para a mensagem detalhada. Não use `statusMessage` para mensagens da aplicação, pois o H3 pode sanitizá-lo e emitir avisos.
- Preserve `data` ou outras informações adicionais quando forem necessárias e prefira `data.message` no cliente.
