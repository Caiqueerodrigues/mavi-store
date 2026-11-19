<script setup lang="ts">
defineProps<{
  filters: any;
  items: any[];
  currentUser: any;
  labels: Record<string, string>;
  total: number;
  edit: (item?: any) => unknown;
  remove: (item: any) => unknown;
  load: (key: any) => unknown;
  scheduleFilter: (key: any) => unknown;
  resetFilters: (key: any) => unknown;
  tableScroll: (
    key: string,
    event: Event,
    load: () => Promise<void>,
  ) => unknown;
  loadNext: (key: string) => Promise<void>;
  sort: (key: any, column: string) => unknown;
  sortIcon: (filters: any, column: string) => string;
  brDate: (value: any) => string;
}>();
</script>
<template>
  <section class="content">
    <div class="section-head">
      <div>
        <span class="eyebrow">Acesso e permissões</span>
        <h2>Usuários e perfis</h2>
        <p>Somente administradores podem conceder acesso.</p>
      </div>
      <button class="button" @click="edit()">
        <Icon name="lucide:user-plus" />Novo usuário
      </button>
    </div>
    <form class="panel data-table-filters" @submit.prevent="load('users')">
      <label
        >Buscar<input
          v-model.trim="filters.search"
          type="search"
          placeholder="Nome ou e-mail"
          @input="scheduleFilter('users')" /></label
      ><label
        >Perfil<select v-model="filters.role" @change="load('users')">
          <option value="">Todos</option>
          <option v-for="(label, key) in labels" :key="key" :value="key">
            {{ label }}
          </option>
        </select></label
      ><label
        >Situação<select v-model="filters.active" @change="load('users')">
          <option value="">Todas</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select></label
      ><button
        type="button"
        class="button ghost"
        @click="resetFilters('users')"
      >
        Limpar</button
      ><span class="table-count">{{ total }} registro(s)</span>
    </form>
    <div
      class="panel table-wrap"
      @scroll="tableScroll('users', $event, () => loadNext('users'))"
    >
      <table>
        <thead>
          <tr>
            <th>
              <button class="sort-button" @click="sort('users', 'name')">
                Usuário<Icon :name="sortIcon(filters, 'name')" />
              </button>
            </th>
            <th>
              <button class="sort-button" @click="sort('users', 'role')">
                Perfil<Icon :name="sortIcon(filters, 'role')" />
              </button>
            </th>
            <th>
              <button class="sort-button" @click="sort('users', 'active')">
                Status<Icon :name="sortIcon(filters, 'active')" />
              </button>
            </th>
            <th>
              <button class="sort-button" @click="sort('users', 'lastLoginAt')">
                Último acesso<Icon :name="sortIcon(filters, 'lastLoginAt')" />
              </button>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>
              <strong>{{ item.name }}</strong><small>{{ item.email }}</small>
            </td>
            <td>{{ labels[item.role] }}</td>
            <td>
              <span
                :class="['status-badge', item.active ? 'ready' : 'cancelled']"
                >{{ item.active ? "Ativo" : "Inativo" }}</span
              >
            </td>
            <td>{{ item.lastLoginAt ? brDate(item.lastLoginAt) : "Nunca" }}</td>
            <td class="actions">
              <button class="tiny-button" @click="edit(item)">
                <Icon name="lucide:pencil" /></button
              ><button
                v-if="item.id !== currentUser.id"
                class="tiny-button danger-text"
                @click="remove(item)"
              >
                <Icon name="lucide:trash-2" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="permissions panel">
      <h3>Permissões por perfil</h3>
      <div>
        <strong>Administrador</strong
        ><span>Acesso total, usuários e auditoria.</span><strong>Gestor</strong
        ><span>Custos, pedidos, PDFs e auditoria.</span><strong>Operador</strong
        ><span>Cria e atualiza pedidos e PDFs.</span><strong>Consulta</strong
        ><span>Visualização de pedidos e auditoria.</span>
      </div>
    </div>
  </section>
</template>
