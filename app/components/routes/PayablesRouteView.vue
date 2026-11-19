<script setup lang="ts">
defineProps<{
  filters: any;
  filtersChanged: boolean;
  items: any[];
  statusLabels: Record<string, string>;
  total: number;
  edit: (item?: any) => unknown;
  load: () => unknown;
  scheduleFilter: () => unknown;
  resetFilters: () => unknown;
  openDatePicker: (event: Event) => unknown;
  tableScroll: (
    key: string,
    event: Event,
    load: () => Promise<void>,
  ) => unknown;
  loadNext: (key: string) => Promise<void>;
  sort: (key: any, column: string) => unknown;
  sortIcon: (filters: any, column: string) => string;
  brDate: (value: any) => string;
  money: (value?: number) => string;
}>();
</script>

<template>
  <section class="content">
    <div class="section-head">
      <div>
        <span class="eyebrow">Financeiro</span>
        <h2>Contas a pagar</h2>
        <p>Serviços prestados à empresa e seus pagamentos.</p>
      </div>
      <button class="button" @click="edit()">
        <Icon name="lucide:plus" />Nova conta
      </button>
    </div>
    <form class="panel data-table-filters" @submit.prevent="load">
      <label
        >Buscar<input
          v-model.trim="filters.search"
          type="search"
          placeholder="Tipo de serviço ou recebedor"
          @input="scheduleFilter"
      /></label>
      <label
        >De<input
          v-model="filters.from"
          type="date"
          @change="load"
          @click="openDatePicker"
      /></label>
      <label
        >Até<input
          v-model="filters.to"
          type="date"
          @change="load"
          @click="openDatePicker"
      /></label>
      <label
        >Status do pagamento<select
          v-model="filters.paymentStatus"
          @change="load"
        >
          <option value="">Todos</option>
          <option v-for="(label, key) in statusLabels" :key="key" :value="key">
            {{ label }}
          </option>
        </select></label
      >
      <button
        v-if="filtersChanged"
        type="button"
        class="button ghost"
        @click="resetFilters"
      >
        Limpar filtros</button
      ><span class="table-count">{{ total }} registro(s)</span>
    </form>
    <div
      class="panel table-wrap"
      @scroll="tableScroll('payables', $event, () => loadNext('payables'))"
    >
      <table>
        <thead>
          <tr>
            <th>
              <button
                class="sort-button"
                @click="sort('payables', 'orderDate')"
              >
                Data do pedido<Icon :name="sortIcon(filters, 'orderDate')" />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sort('payables', 'deliveryDate')"
              >
                Data de entrega<Icon
                  :name="sortIcon(filters, 'deliveryDate')"
                />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sort('payables', 'serviceTypeName')"
              >
                Tipo de serviço<Icon
                  :name="sortIcon(filters, 'serviceTypeName')"
                />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sort('payables', 'recipientName')"
              >
                Recebedor<Icon :name="sortIcon(filters, 'recipientName')" />
              </button>
            </th>
            <th>
              <button class="sort-button" @click="sort('payables', 'quantity')">
                Pares<Icon :name="sortIcon(filters, 'quantity')" />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sort('payables', 'agreedAmount')"
              >
                Valor combinado<Icon
                  :name="sortIcon(filters, 'agreedAmount')"
                />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sort('payables', 'totalAmount')"
              >
                Valor total<Icon :name="sortIcon(filters, 'totalAmount')" />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sort('payables', 'paymentDate')"
              >
                Pagamento<Icon :name="sortIcon(filters, 'paymentDate')" />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sort('payables', 'paymentStatus')"
              >
                Status<Icon :name="sortIcon(filters, 'paymentStatus')" />
              </button>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>{{ brDate(item.orderDate) }}</td>
            <td>{{ brDate(item.deliveryDate) }}</td>
            <td>
              <strong>{{ item.serviceTypeName }}</strong>
            </td>
            <td>{{ item.recipientName }}</td>
            <td>{{ item.quantity }}</td>
            <td>{{ money(item.agreedAmount) }}</td>
            <td>
              <strong>{{ money(item.totalAmount) }}</strong>
            </td>
            <td>{{ brDate(item.paymentDate) }}</td>
            <td>
              <span
                :class="[
                  'status-badge',
                  item.paymentStatus === 'paid'
                    ? 'ready'
                    : item.paymentStatus === 'cancelled'
                      ? 'cancelled'
                      : 'pending',
                ]"
                >{{ statusLabels[item.paymentStatus] }}</span
              >
            </td>
            <td class="actions">
              <button class="tiny-button" title="Editar" @click="edit(item)">
                <Icon name="lucide:pencil" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!items.length" class="empty">
        Nenhuma conta a pagar encontrada.
      </div>
    </div>
  </section>
</template>
