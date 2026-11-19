# Plano de migração da identidade para o Keycloak

## Objetivo

Transferir para o Keycloak toda a gestão de identidade e acesso do Rodriguesk:

- usuários e perfis;
- credenciais, recuperação de senha e MFA;
- ativação, bloqueio e required actions;
- grupos, roles e permissões;
- emissão, renovação e revogação de tokens;
- sessões e logout global.

O Rodriguesk continuará responsável por:

- iniciar o fluxo de autenticação OIDC;
- validar os tokens emitidos por realms autorizados;
- aplicar, no backend, as permissões presentes no token;
- registrar a identidade do ator nas operações e auditorias;
- preservar snapshots de nome e e-mail para o histórico.

Este plano considera desde o início a possibilidade de aceitar mais de um realm.

## Princípios e decisões

### Identidade multi-realm

A identidade será sempre a combinação:

```text
(issuer, subject)
```

- `issuer`: claim `iss`, que identifica o realm emissor.
- `subject`: claim `sub`, que identifica o usuário dentro do emissor.

O sistema não usará e-mail, username, nome, ID inteiro local ou apenas o `sub` como identidade definitiva.

Modelo normalizado no backend:

```ts
type AuthUser = {
  issuer: string
  subject: string
  name: string
  email?: string
  username?: string
  permissions: string[]
}
```

### Fonte de verdade

- O Keycloak será a única fonte de verdade para usuários, credenciais, perfis, grupos, roles, sessões e tokens.
- O Rodriguesk não terá CRUD próprio de usuários.
- O Rodriguesk não emitirá JWT próprio.
- O banco local guardará apenas a identidade necessária para autoria e auditoria.
- Não haverá foreign key entre o PostgreSQL do Rodriguesk e o Keycloak.

### Autorização

O Keycloak define quais permissões cada usuário possui. O backend do Rodriguesk continua responsável por fiscalizar essas permissões em cada endpoint.

As permissões atuais devem ser representadas como client roles granulares:

```text
dashboard:read
costs:manage
orders:read
orders:write
orders:delete
pdf:generate
audit:read
```

`users:manage` deixará de existir no Rodriguesk, pois a administração de usuários será feita somente no Keycloak.

Os perfis `admin`, `manager`, `operator` e `viewer` podem existir como roles compostas no Keycloak. O código da aplicação, entretanto, deverá decidir acesso pelas permissões granulares, não pelo nome do perfil.

## Estado atual a ser substituído

Atualmente, o Rodriguesk:

- mantém usuários, hashes de senha, situação e role na tabela `users`;
- gera access e refresh tokens próprios com HS256;
- mantém refresh tokens em `refresh_sessions`;
- possui matriz local de roles e permissões;
- possui login, refresh, logout, troca de senha e edição de perfil locais;
- possui CRUD e interface próprios para usuários;
- usa IDs inteiros de `users` em pedidos, serviços a pagar e auditoria.

## Fase 1 — Preparar o client no Keycloak

Configurar no realm já existente um client OIDC confidencial, por exemplo `rodriguesk-web`.

Checklist:

- [ ] Habilitar Authorization Code Flow.
- [ ] Exigir PKCE `S256`.
- [ ] Desabilitar Implicit Flow.
- [ ] Desabilitar Direct Access Grants.
- [ ] Desabilitar Service Accounts, salvo necessidade documentada.
- [ ] Cadastrar redirect URIs exatos de desenvolvimento e produção.
- [ ] Cadastrar post logout redirect URIs exatos.
- [ ] Restringir Web Origins às origens reais da aplicação.
- [ ] Configurar o audience do Rodriguesk.
- [ ] Criar as client roles granulares.
- [ ] Criar roles compostas ou grupos para os perfis operacionais.
- [ ] Incluir as permissões necessárias no access token.
- [ ] Configurar o Account Console para perfil, senha e MFA.
- [ ] Exportar/guardar backup do realm antes da ativação.

Cada realm futuro deverá possuir seu próprio registro de client e secret. Todos deverão emitir o mesmo conjunto normalizado de permissões do Rodriguesk.

## Fase 2 — Configuração de providers permitidos

O backend deverá trabalhar com uma lista fechada de issuers confiáveis. Nunca deverá aceitar uma URL arbitrária de issuer enviada pelo navegador.

Exemplo conceitual:

```env
NUXT_OIDC_PROVIDERS='[
  {
    "id": "principal",
    "issuer": "https://login.exemplo.com/realms/principal",
    "clientId": "rodriguesk-web",
    "clientSecret": "..."
  },
  {
    "id": "filial",
    "issuer": "https://login.exemplo.com/realms/filial",
    "clientId": "rodriguesk-web",
    "clientSecret": "..."
  }
]'
```

Requisitos:

- [ ] Secrets disponíveis somente no servidor.
- [ ] Configuração validada na inicialização.
- [ ] Issuers duplicados rejeitados.
- [ ] Issuers fora da allowlist rejeitados.
- [ ] Discovery OIDC obtido de `{issuer}/.well-known/openid-configuration`.
- [ ] Chaves JWKS mantidas em cache com renovação segura.

## Fase 3 — Implementar o fluxo OIDC no backend

Substituir a autenticação própria por endpoints equivalentes a:

```text
GET  /api/auth/providers
GET  /api/auth/login?provider=principal
GET  /api/auth/callback/principal
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

Fluxo de login:

1. Selecionar apenas um provider cadastrado.
2. Gerar `state`, `nonce` e PKCE.
3. Guardar esses valores temporariamente em cookie protegido.
4. Redirecionar ao authorization endpoint do issuer.
5. Validar `state`, `nonce`, issuer e callback.
6. Trocar o authorization code no token endpoint.
7. Validar assinatura, `iss`, `aud`, `exp` e claims obrigatórios.
8. Normalizar identidade e permissões.
9. Criar cookies protegidos para a sessão.

Regras de tokens:

- [ ] O Keycloak é o único emissor.
- [ ] Access token com duração curta.
- [ ] Refresh token disponível somente em cookie `HttpOnly`.
- [ ] Cookies `Secure` em produção.
- [ ] Política `SameSite` compatível com o callback OIDC.
- [ ] ID token preservado somente se necessário para logout OIDC.
- [ ] Tamanho real dos tokens validado contra os limites de cookies.
- [ ] Refresh executado no token endpoint do issuer correto.
- [ ] Logout executado no end-session endpoint do issuer correto.
- [ ] Revogação utilizada quando aplicável.

Se os tokens ultrapassarem um tamanho seguro para cookies, utilizar uma sessão opaca no backend com tokens criptografados. Essa sessão não poderá restaurar gestão local de usuários ou emissão própria de tokens.

## Fase 4 — Adaptar middleware e autorização

Atualizar o middleware de autenticação para:

- [ ] liberar somente health check, início do login e callbacks necessários;
- [ ] identificar o issuer associado à sessão;
- [ ] validar o token usando discovery/JWKS daquele issuer;
- [ ] colocar o usuário normalizado em `event.context.user`;
- [ ] renovar tokens quando apropriado;
- [ ] manter proteção CSRF em operações mutáveis;
- [ ] responder `401` para sessão ausente, inválida ou expirada;
- [ ] responder `403` para permissão insuficiente;
- [ ] criar erros HTTP somente com `createApiError` e mensagem em `message`.

Alterar `requirePermission` para consultar permissões normalizadas:

```ts
user.permissions.includes(permission)
```

Remover do backend:

- [ ] matriz fixa de perfis e permissões;
- [ ] `mustChangePassword`;
- [ ] assinatura HS256 local;
- [ ] consulta à tabela `users` durante autenticação;
- [ ] dependência de `refresh_sessions`.

## Fase 5 — Criar a migração estrutural

Criar uma nova migração, sugerida como `0018_keycloak_identity.sql`. Esta é uma alteração estrutural nova e não deve ser incorporada às migrações consolidadas de produtos.

### Pedidos

Adicionar a `orders`:

```text
created_by_issuer
created_by_subject
created_by_name
created_by_email
updated_by_issuer
updated_by_subject
updated_by_name
updated_by_email
```

### Serviços a pagar

Adicionar o mesmo conjunto de autoria a `payable_services`.

### Auditoria

Adicionar a `audit_logs`:

```text
user_issuer
user_subject
user_name
user_email
```

### Índices

Criar índices compostos para as consultas de identidade:

```sql
CREATE INDEX ... ON audit_logs (user_issuer, user_subject);
CREATE INDEX ... ON orders (created_by_issuer, created_by_subject);
CREATE INDEX ... ON orders (updated_by_issuer, updated_by_subject);
```

Adicionar índices equivalentes onde houver busca por autoria em outras tabelas.

## Fase 6 — Mapear e migrar usuários existentes

Antes de remover a tabela `users`, produzir um mapeamento explícito:

```text
local_user_id -> issuer + Keycloak subject
```

O e-mail pode ajudar a localizar o usuário correspondente, mas o vínculo não deve ser concluído automaticamente sem validação.

Procedimento:

1. Adicionar as novas colunas inicialmente aceitando `NULL`.
2. Validar manualmente o mapeamento de cada usuário local relevante.
3. Fazer backfill de `orders`, `payable_services` e `audit_logs`.
4. Comparar contagens e verificar referências pendentes.
5. Impedir a remoção das colunas antigas enquanto houver referências não migradas.
6. Tornar obrigatórias as novas colunas onde toda operação exige usuário.
7. Remover as foreign keys para `users` somente após a validação.
8. Remover os campos inteiros antigos em uma release posterior.
9. Remover `refresh_sessions` e `users` somente no final.

Para um registro legado sem correspondência confiável no Keycloak, preservar uma identidade explícita:

```text
issuer:  legacy://rodriguesk
subject: user-7
name:    nome preservado da tabela local
```

Nunca inventar um vínculo com um usuário do Keycloak.

## Fase 7 — Atualizar autoria e auditoria

Substituir todos os usos de `user.id` por dados da identidade normalizada:

```text
user.issuer
user.subject
user.name
user.email
```

Pontos conhecidos:

- [ ] criação de pedidos;
- [ ] edição de pedidos;
- [ ] clonagem de pedidos;
- [ ] exclusão lógica de pedidos;
- [ ] alterações em lote de pedidos;
- [ ] criação e atualização de serviços a pagar;
- [ ] ações de clientes que registram o ator;
- [ ] logs de login, refresh e logout;
- [ ] helper central de auditoria;
- [ ] rate limit de consulta da auditoria.

O rate limit autenticado deverá usar uma chave baseada em `issuer + subject`, acrescentando IP quando necessário.

O helper central de auditoria deverá gravar os snapshots de nome e e-mail, evitando implementações divergentes entre endpoints.

## Fase 8 — Remover gestão local de usuários

Depois de validar o Keycloak em produção controlada:

- [ ] remover `/api/users`;
- [ ] remover a rota/tela `/usuarios`;
- [ ] remover formulários, filtros e modais de usuários;
- [ ] remover ativação e inativação local;
- [ ] remover troca e redefinição de senha local;
- [ ] remover edição local de nome e e-mail;
- [ ] remover a troca obrigatória de senha;
- [ ] remover `bcryptjs`;
- [ ] remover os secrets JWT próprios;
- [ ] remover `roleLabels` como fonte de autorização;
- [ ] remover `users` e `refresh_sessions` após o período de compatibilidade.

Substituições de interface:

- “Minha conta” deverá direcionar ao Account Console do Keycloak.
- Um eventual acesso administrativo será apenas um link para o Admin Console.
- O Rodriguesk não utilizará a Admin REST API para recriar a gestão de usuários dentro da aplicação.
- Qualquer confirmação futura continuará usando o modal compartilhado do projeto, nunca `window.confirm` ou `alert`.

## Fase 9 — Adaptar o frontend

O `/api/auth/me` deverá retornar uma identidade normalizada:

```json
{
  "user": {
    "issuer": "https://login.exemplo.com/realms/principal",
    "subject": "43188c2c-9560-47aa-99ec-28b07ec51031",
    "name": "Caíque Rodrigues",
    "email": "caique@example.com",
    "permissions": [
      "dashboard:read",
      "orders:read",
      "orders:write"
    ]
  }
}
```

Centralizar verificações de interface:

```ts
can("costs:manage")
can("orders:write")
can("audit:read")
```

- [ ] Navegação baseada em permissões.
- [ ] Botões e ações baseados em permissões.
- [ ] Nenhuma decisão baseada em `user.role === "admin"`.
- [ ] Backend mantido como autoridade final.
- [ ] Login direto quando houver apenas um provider.
- [ ] Seleção de organização/provider quando houver múltiplos realms.

## Fase 10 — Testes

### Autenticação

- [ ] Login válido.
- [ ] `state` inválido.
- [ ] `nonce` inválido.
- [ ] Callback expirado.
- [ ] Issuer não autorizado.
- [ ] Audience incorreto.
- [ ] Assinatura inválida.
- [ ] Access token expirado.
- [ ] Refresh token expirado ou revogado.
- [ ] Usuário desativado no Keycloak.
- [ ] Logout local.
- [ ] Logout no Keycloak.
- [ ] Sessão em múltiplas abas.

### Autorização

- [ ] Usuário autorizado recebe sucesso.
- [ ] Usuário autenticado sem permissão recebe `403`.
- [ ] Usuário não autenticado recebe `401`.
- [ ] Toda proteção visual possui proteção correspondente na API.
- [ ] Mudanças de permissão passam a valer após renovação ou novo login.

### Multi-realm

- [ ] O mesmo `sub` em dois realms representa identidades distintas.
- [ ] Realm não cadastrado é rejeitado.
- [ ] Token emitido para outro client é rejeitado.
- [ ] Permissões são normalizadas igualmente entre os realms.
- [ ] Refresh e logout usam o issuer correto.
- [ ] Falha de discovery de um realm não concede acesso por fallback.

### Migração de dados

- [ ] Nenhum histórico perde o ator.
- [ ] Contagens antes e depois permanecem iguais.
- [ ] Registros legados continuam pesquisáveis.
- [ ] Não restam referências obrigatórias sem identidade.
- [ ] Não restam foreign keys para `users` após a limpeza.
- [ ] Não restam hashes de senha ou refresh tokens locais.
- [ ] Rollback funciona antes da remoção definitiva das colunas antigas.

### Qualidade

- [ ] `pnpm typecheck` aprovado.
- [ ] `pnpm build` aprovado.
- [ ] Testes automatizados de autenticação e autorização aprovados.
- [ ] Logs não expõem tokens, secrets ou authorization codes.
- [ ] Erros HTTP seguem `createApiError` e usam `message`.

## Estratégia de implantação

Executar em duas releases principais.

### Release A — Compatibilidade e validação

- adicionar a integração OIDC;
- adicionar as novas colunas de identidade;
- manter temporariamente as colunas antigas;
- autenticar pelo Keycloak;
- gravar a nova identidade;
- executar e validar o backfill;
- observar logs, refresh, logout e auditoria;
- manter uma janela de rollback antes das remoções destrutivas.

### Release B — Limpeza definitiva

Somente após confirmar que não existem referências pendentes:

- invalidar todas as sessões locais antigas;
- remover autenticação local;
- remover CRUD e interface de usuários;
- remover `users`;
- remover `refresh_sessions`;
- remover colunas inteiras antigas de autoria;
- remover `bcryptjs` e secrets JWT locais;
- tornar obrigatórias as novas colunas aplicáveis.

## Plano de rollback

Durante a Release A:

- manter as colunas antigas sem sobrescrevê-las;
- manter backup do banco anterior à migração;
- manter configuração anterior disponível para rollback controlado;
- não remover `users` ou `refresh_sessions`;
- registrar métricas e logs suficientes para identificar falhas de issuer, audience, refresh e logout.

Depois da Release B, o rollback dependerá de restauração de banco e versão da aplicação. Por isso, a Release B somente poderá ocorrer após aceite explícito dos resultados da Release A.

## Critérios de conclusão

A migração estará concluída quando:

- [ ] nenhuma senha for recebida pelo Rodriguesk;
- [ ] nenhum JWT for emitido pelo Rodriguesk;
- [ ] usuários e roles forem administrados somente no Keycloak;
- [ ] toda API aplicar permissões vindas do token;
- [ ] toda autoria usar `(issuer, subject)`;
- [ ] o histórico continuar legível após alteração ou exclusão de usuário;
- [ ] tokens de issuers não cadastrados forem rejeitados;
- [ ] `users` e `refresh_sessions` não existirem mais;
- [ ] não houver dependência de IDs locais de usuário;
- [ ] build, typecheck e testes estiverem aprovados;
- [ ] o procedimento para adicionar um novo realm estiver documentado e testado.

## Referências

- [OpenID Connect no Keycloak](https://www.keycloak.org/securing-apps/oidc-layers)
- [Administração de realms, roles e grupos](https://www.keycloak.org/docs/latest/server_admin/)
- [Configuração do Keycloak para produção](https://www.keycloak.org/server/configuration-production)
- [Configuração de hostname](https://www.keycloak.org/server/hostname)
- [Configuração de reverse proxy](https://www.keycloak.org/server/reverseproxy)

