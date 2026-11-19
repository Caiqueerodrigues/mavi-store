<script setup lang="ts">
defineProps<{
  canWrite: boolean;
  filters: any;
  filtersChanged: boolean;
  items: any[];
  total: number;
  edit: (item?: any) => unknown;
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
}>();
</script>

<template>
  <section class="content">
    <div class="section-head">
      <div>
        <span class="eyebrow">Relacionamento</span>
        <h2>Clientes</h2>
        <p>Gerencie os clientes atendidos na prestação de serviços.</p>
      </div>
      <button v-if="canWrite" class="button" @click="edit()">
        <Icon name="lucide:plus" />Novo cliente
      </button>
    </div>
    <form class="panel data-table-filters" @submit.prevent="load('customers')">
      <label
        >Buscar<input
          v-model.trim="filters.search"
          type="search"
          placeholder="Nome, apelido ou telefone"
          @input="scheduleFilter('customers')" /></label
      ><label
        >Situação<select v-model="filters.active" @change="load('customers')">
          <option value="">Todas</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select></label
      ><button
        v-if="filtersChanged"
        type="button"
        class="button ghost"
        @click="resetFilters('customers')"
      >
        Limpar filtros</button
      ><span class="table-count">{{ total }} registro(s)</span>
    </form>
    <div
      class="panel table-wrap"
      @scroll="tableScroll('customers', $event, () => loadNext('customers'))"
    >
      <table>
        <thead>
          <tr>
            <th>
              <button class="sort-button" @click="sort('customers', 'name')">
                Nome<Icon :name="sortIcon(filters, 'name')" />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sort('customers', 'nickname')"
              >
                Apelido<Icon :name="sortIcon(filters, 'nickname')" />
              </button>
            </th>
            <th>
              <button class="sort-button" @click="sort('customers', 'phone')">
                Telefone<Icon :name="sortIcon(filters, 'phone')" />
              </button>
            </th>
            <th>
              <button class="sort-button" @click="sort('customers', 'active')">
                Situação<Icon :name="sortIcon(filters, 'active')" />
              </button>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in items" :key="customer.id">
            <td>
              <strong>{{ customer.name }}</strong>
            </td>
            <td>{{ customer.nickname || "—" }}</td>
            <td>{{ customer.phone || "—" }}</td>
            <td>
              <span
                :class="[
                  'status-badge',
                  customer.active ? 'ready' : 'cancelled',
                ]"
                >{{ customer.active ? "Ativo" : "Inativo" }}</span
              >
            </td>
            <td>
              <button
                v-if="canWrite"
                class="tiny-button"
                title="Editar"
                @click="edit(customer)"
              >
                <Icon name="lucide:pencil" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!items.length" class="empty">Nenhum cliente cadastrado.</div>
    </div>
  </section>
</template>
