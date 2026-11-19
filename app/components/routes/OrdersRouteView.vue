<script setup lang="ts">
defineProps([
  "canWriteOrders",
  "openNewOrder",
  "orderFilters",
  "scheduleOrderFilter",
  "serverTime",
  "openDatePicker",
  "loadOrders",
  "statusLabels",
  "paymentStatusLabels",
  "orderFiltersChanged",
  "resetOrderFilters",
  "busy",
  "applyBulkAction",
  "pdf",
  "tableScroll",
  "loadNextTable",
  "orders",
  "sortTable",
  "sortIcon",
  "brDate",
  "money",
  "editOrder",
  "cloneOrder",
  "deleteOrder",
  "user",
]);
const selectedOrders = defineModel<number[]>("selectedOrders", {
  required: true,
});
const bulkAction = defineModel<string>("bulkAction", { required: true });
</script>
<template>
  <section class="content">
    <div class="section-head">
      <div>
        <span class="eyebrow">Prestação de serviços</span>
        <h2>Serviços terceirizados</h2>
        <p>Registre o cliente, o tipo de serviço, a produção e o pagamento.</p>
      </div>
      <div class="head-actions">
        <button v-if="orders.length" class="button secondary" @click="pdf()">
          <Icon name="lucide:file-down" />PDF geral</button
        ><button v-if="canWriteOrders" class="button" @click="editOrder()">
          <Icon name="lucide:plus" />Nova ordem de serviço
        </button>
      </div>
    </div>
    <form class="panel order-filters" @submit.prevent="loadOrders">
      <label
        >Buscar<input
          v-model.trim="orderFilters.search"
          type="search"
          placeholder="Cliente, serviço ou observação"
          @input="scheduleOrderFilter"
      /></label>
      <label
        >De<input
          v-model="orderFilters.from"
          type="date"
          :max="serverTime.slice(0, 10)"
          @click="openDatePicker"
          @change="loadOrders"
      /></label>
      <label
        >Até<input
          v-model="orderFilters.to"
          type="date"
          :max="serverTime.slice(0, 10)"
          @click="openDatePicker"
          @change="loadOrders"
      /></label>
      <label
        >Situação da produção<select
          v-model="orderFilters.status"
          @change="loadOrders"
        >
          <option value="">Todas</option>
          <option v-for="(label, key) in statusLabels" :key="key" :value="key">
            {{ label }}
          </option>
        </select></label
      >
      <label
        >Situação do pagamento<select
          v-model="orderFilters.paymentStatus"
          @change="loadOrders"
        >
          <option value="">Todas</option>
          <option
            v-for="(label, key) in paymentStatusLabels"
            :key="key"
            :value="key"
          >
            {{ label }}
          </option>
        </select></label
      >
      <button
        v-if="orderFiltersChanged"
        type="button"
        class="button ghost"
        @click="resetOrderFilters"
      >
        Limpar filtros
      </button>
    </form>
    <div v-if="selectedOrders.length" class="panel bulk-actions">
      <strong>{{ selectedOrders.length }} selecionado(s)</strong
      ><button
        type="button"
        class="button secondary"
        :disabled="busy"
        @click="pdf(undefined, [...selectedOrders])"
      >
        <Icon name="lucide:file-down" />PDF dos selecionados
      </button>
      <template v-if="canWriteOrders">
        <select v-model="bulkAction">
          <option value="">Ação em lote</option>
          <optgroup label="Pedido">
            <option value="status:in_production">Em produção</option>
            <option value="status:ready">Pronto</option>
            <option value="status:delivered">Entregue</option>
            <option value="status:completed">Concluído</option>
            <option value="status:cancelled">Cancelado</option>
          </optgroup>
          <optgroup label="Pagamento">
            <option value="paymentStatus:pending">Pagamento pendente</option>
            <option value="paymentStatus:partial">Pagamento parcial</option>
            <option value="paymentStatus:paid">Pago</option>
            <option value="paymentStatus:refunded">Estornado</option>
          </optgroup></select
        ><button
          class="button"
          :disabled="busy || !selectedOrders.length || !bulkAction"
          @click="applyBulkAction"
        >
          Aplicar
        </button>
      </template>
    </div>
    <div
      class="panel table-wrap"
      @scroll="tableScroll('orders', $event, () => loadNextTable('orders'))"
    >
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                :checked="
                  orders.length > 0 && selectedOrders.length === orders.length
                "
                aria-label="Selecionar todos"
                @change="
                  selectedOrders = ($event.target as HTMLInputElement).checked
                    ? orders.map((o: any) => o.id)
                    : []
                "
              />
            </th>
            <th>
              <button
                class="sort-button"
                @click="sortTable('orders', 'orderNumber')"
              >
                Pedido<Icon :name="sortIcon(orderFilters, 'orderNumber')" />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sortTable('orders', 'customerName')"
              >
                Cliente / Produto<Icon
                  :name="sortIcon(orderFilters, 'customerName')"
                />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sortTable('orders', 'orderDate')"
              >
                Data<Icon :name="sortIcon(orderFilters, 'orderDate')" />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sortTable('orders', 'totalQuantity')"
              >
                Qtd.<Icon :name="sortIcon(orderFilters, 'totalQuantity')" />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sortTable('orders', 'totalValue')"
              >
                Total<Icon :name="sortIcon(orderFilters, 'totalValue')" />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sortTable('orders', 'paymentStatus')"
              >
                Pagamento<Icon
                  :name="sortIcon(orderFilters, 'paymentStatus')"
                />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sortTable('orders', 'status')"
              >
                Status<Icon :name="sortIcon(orderFilters, 'status')" />
              </button>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td>
              <input
                v-model="selectedOrders"
                type="checkbox"
                :value="o.id"
                :aria-label="`Selecionar pedido ${o.orderNumber}`"
              />
            </td>
            <td>
              <strong>#{{ o.orderNumber }}</strong
              ><small>{{ o.orderType }}</small>
            </td>
            <td>
              <strong>{{ o.customerName }}</strong><small>{{
                o.productDescription
              }}</small>
            </td>
            <td>{{ brDate(o.orderDate) }}</td>
            <td>{{ o.quantity }}</td>
            <td>
              <strong>{{ money(o.total) }}</strong>
            </td>
            <td>
              <span
                :class="[
                  'status-badge',
                  o.paymentStatus === 'paid'
                    ? 'ready'
                    : o.paymentStatus === 'refunded'
                      ? 'cancelled'
                      : 'pending',
                ]"
                >{{ paymentStatusLabels[o.paymentStatus] }}</span
              >
            </td>
            <td>
              <span :class="['status-badge', o.status]">{{
                statusLabels[o.status]
              }}</span>
            </td>
            <td class="actions">
              <button class="tiny-button" title="PDF" @click="pdf(o)">
                <Icon name="lucide:file-text" /></button
              ><button
                v-if="canWriteOrders"
                class="tiny-button"
                title="Editar"
                @click="editOrder(o)"
              >
                <Icon name="lucide:pencil" /></button
              ><button
                v-if="canWriteOrders"
                class="tiny-button"
                title="Clonar"
                @click="cloneOrder(o)"
              >
                <Icon name="lucide:copy" /></button
              ><button
                v-if="['admin', 'manager'].includes(user.role)"
                class="tiny-button danger-text"
                title="Excluir"
                @click="deleteOrder(o)"
              >
                <Icon name="lucide:trash-2" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
