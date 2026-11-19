<script setup lang="ts">
defineProps<{
  filters: any;
  items: any[];
  labels: Record<string, string>;
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
  money: (value?: number) => string;
}>();
</script>

<template>
  <section class="content">
    <div class="section-head">
      <div>
        <span class="eyebrow">Base de custos</span>
        <h2>Insumos e custos de produção</h2>
        <p>Matérias-primas, rendimento, mão de obra, serviços e embalagens.</p>
      </div>
      <button class="button" @click="edit()">
        <Icon name="lucide:plus" />Novo insumo
      </button>
    </div>
    <form class="panel data-table-filters" @submit.prevent="load('materials')">
      <label
        >Buscar<input
          v-model.trim="filters.search"
          type="search"
          placeholder="Insumo, fornecedor ou unidade"
          @input="scheduleFilter('materials')" /></label
      ><label
        >Tipo<select v-model="filters.costType" @change="load('materials')">
          <option value="">Todos</option>
          <option v-for="(label, key) in labels" :key="key" :value="key">
            {{ label }}
          </option>
        </select></label
      ><label
        >Situação<select v-model="filters.active" @change="load('materials')">
          <option value="">Todas</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select></label
      ><button
        type="button"
        class="button ghost"
        @click="resetFilters('materials')"
      >
        Limpar</button
      ><span class="table-count">{{ total }} registro(s)</span>
    </form>
    <div
      class="panel table-wrap"
      @scroll="tableScroll('materials', $event, () => loadNext('materials'))"
    >
      <table>
        <thead>
          <tr>
            <th>
              <button class="sort-button" @click="sort('materials', 'name')">
                Insumo<Icon :name="sortIcon(filters, 'name')" />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sort('materials', 'costType')"
              >
                Tipo<Icon :name="sortIcon(filters, 'costType')" />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sort('materials', 'supplier')"
              >
                Fornecedor<Icon :name="sortIcon(filters, 'supplier')" />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sort('materials', 'purchasePrice')"
              >
                Compra<Icon :name="sortIcon(filters, 'purchasePrice')" />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sort('materials', 'yieldQuantity')"
              >
                Rendimento<Icon :name="sortIcon(filters, 'yieldQuantity')" />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sort('materials', 'unitCost')"
              >
                Custo unitário<Icon :name="sortIcon(filters, 'unitCost')" />
              </button>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>
              <strong>{{ item.name }}</strong>
            </td>
            <td>{{ labels[item.costType] || item.costType }}</td>
            <td>{{ item.supplier || "—" }}</td>
            <td>{{ money(item.purchasePrice) }}</td>
            <td>{{ item.yieldQuantity }} {{ item.unit }} por compra</td>
            <td>
              <strong>{{ money(item.unitCost) }} / {{ item.unit }}</strong>
            </td>
            <td>
              <button
                class="edit-button"
                title="Editar insumo"
                @click="edit(item)"
              >
                <Icon name="lucide:pencil" /><span>Editar</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
