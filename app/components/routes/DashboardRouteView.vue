<script setup lang="ts">
defineProps([
  "canWriteOrders",
  "openNewOrder",
  "dashboardFilters",
  "serverTime",
  "openDatePicker",
  "loadDashboard",
  "dashboardFiltersChanged",
  "resetDashboardFilters",
  "dashboard",
  "brDate",
  "money",
  "dashboardServiceMax",
  "dashboardCustomerMax",
  "dashboardStatusMax",
  "statusLabels",
  "go",
  "openDashboardOrder",
]);
</script>
<template>
  <section class="content dashboard-page">
    <div class="hero">
      <div>
        <span class="eyebrow light">Resumo operacional</span>
        <h2>Dos produtos aos serviços entregues.</h2>
        <p>
          Controle produção, valores e responsabilidades com histórico completo.
        </p>
      </div>
      <button
        v-if="canWriteOrders"
        class="button light-button"
        @click="openNewOrder()"
      >
        <Icon name="lucide:plus" />Nova ordem de serviço
      </button>
    </div>
    <form class="panel period-filters" @submit.prevent="loadDashboard">
      <label
        >De<input
          v-model="dashboardFilters.from"
          type="date"
          :max="serverTime.slice(0, 10)"
          @click="openDatePicker"
          @change="loadDashboard"
      /></label>
      <label
        >Até<input
          v-model="dashboardFilters.to"
          type="date"
          :max="serverTime.slice(0, 10)"
          @click="openDatePicker"
          @change="loadDashboard"
      /></label>
      <button
        v-if="dashboardFiltersChanged"
        type="button"
        class="button ghost"
        @click="resetDashboardFilters"
      >
        Limpar filtros
      </button>
    </form>
    <div class="metrics">
      <article>
        <span class="metric-icon green"
          ><Icon name="lucide:clipboard-list"
        /></span>
        <div>
          <small>Serviços no período</small
          ><strong>{{ dashboard?.summary?.orders || 0 }}</strong
          ><em
            >{{ brDate(dashboardFilters.from) }} a
            {{ brDate(dashboardFilters.to) }}</em
          >
        </div>
      </article>
      <article>
        <span class="metric-icon ochre"
          ><Icon name="lucide:circle-dollar-sign"
        /></span>
        <div>
          <small>Valor em serviços</small
          ><strong>{{ money(dashboard?.summary?.totalValue || 0) }}</strong
          ><em>{{ money(dashboard?.summary?.paidValue || 0) }} recebidos</em>
        </div>
      </article>
      <article>
        <span class="metric-icon blue"
          ><Icon name="lucide:package-check"
        /></span>
        <div>
          <small>Prontos</small
          ><strong>{{ dashboard?.summary?.withdrawn || 0 }}</strong
          ><em>retirados ou entregues</em>
        </div>
      </article>
      <article>
        <span class="metric-icon coral"><Icon name="lucide:factory" /></span>
        <div>
          <small>Em produção</small
          ><strong>{{ dashboard?.summary?.inProduction || 0 }}</strong
          ><em>serviços em andamento</em>
        </div>
      </article>
    </div>
    <div class="dashboard-charts">
      <div class="panel chart-panel">
        <div class="panel-head">
          <div>
            <span class="eyebrow">Faturamento</span>
            <h3>Ganhos por tipo de serviço</h3>
          </div>
          <Icon
            name="lucide:chart-no-axes-column-increasing"
            class="panel-icon"
          />
        </div>
        <div class="bar-chart">
          <div
            v-for="item in dashboard?.byService || []"
            :key="item.name"
            class="bar-row"
          >
            <div>
              <strong>{{ item.name }}</strong><small
                >{{ item.orders }} serviço(s) ·
                {{ money(item.paid) }} recebidos</small
              >
            </div>
            <span
              ><i
                :style="{
                  width: `${(item.total / dashboardServiceMax) * 100}%`,
                }" /></span
            ><b>{{ money(item.total) }}</b>
          </div>
          <div v-if="!dashboard?.byService?.length" class="empty">
            Nenhum serviço no período.
          </div>
        </div>
      </div>
      <div class="panel chart-panel">
        <div class="panel-head">
          <div>
            <span class="eyebrow">Produção</span>
            <h3>Serviços por situação</h3>
          </div>
          <Icon name="lucide:chart-bar-big" class="panel-icon" />
        </div>
        <div class="bar-chart status-chart">
          <div
            v-for="item in dashboard?.statuses || []"
            :key="item.name"
            :class="['bar-row', 'status-row', item.name]"
          >
            <div>
              <strong>{{ statusLabels[item.name] || item.name }}</strong>
            </div>
            <span
              ><i
                :style="{
                  width: `${(item.total / dashboardStatusMax) * 100}%`,
                }" /></span
            ><b>{{ item.total }}</b>
          </div>
          <div v-if="!dashboard?.statuses?.length" class="empty">
            Nenhum serviço no período.
          </div>
        </div>
      </div>
      <div class="panel chart-panel">
        <div class="panel-head">
          <div>
            <span class="eyebrow">Clientes</span>
            <h3>Serviços por cliente</h3>
          </div>
          <Icon name="lucide:users-round" class="panel-icon" />
        </div>
        <div class="bar-chart">
          <div
            v-for="item in dashboard?.byCustomer || []"
            :key="item.id || item.name"
            class="bar-row"
          >
            <div>
              <strong>{{ item.name }}</strong><small
                >{{ item.orders }} serviço(s) ·
                {{ money(item.paid) }} recebidos</small
              >
            </div>
            <span
              ><i
                :style="{
                  width: `${(item.total / dashboardCustomerMax) * 100}%`,
                }" /></span
            ><b>{{ money(item.total) }}</b>
          </div>
          <div v-if="!dashboard?.byCustomer?.length" class="empty">
            Nenhum cliente com serviços no período.
          </div>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div>
          <span class="eyebrow">Últimos registros</span>
          <h3>Serviços recentes</h3>
        </div>
        <button class="text-button" @click="go('orders')">
          Ver todos <Icon name="lucide:arrow-right" />
        </button>
      </div>
      <div class="product-list">
        <div
          v-for="o in dashboard?.recentOrders || []"
          :key="o.id"
          class="product-row clickable-row"
          role="button"
          tabindex="0"
          :aria-label="`Abrir detalhes do pedido ${o.orderNumber}`"
          @click="openDashboardOrder(o)"
          @keydown.enter="openDashboardOrder(o)"
          @keydown.space.prevent="openDashboardOrder(o)"
        >
          <span class="product-avatar">{{ o.orderNumber.slice(-2) }}</span>
          <div class="grow">
            <strong>#{{ o.orderNumber }} · {{ o.customerName }}</strong
            ><small>{{ o.productDescription }}</small>
          </div>
          <div>
            <small>Quantidade</small><strong>{{ o.quantity }}</strong>
          </div>
          <div>
            <small>Total</small><strong>{{ money(o.total) }}</strong>
          </div>
          <span :class="['status-badge', o.status]">{{
            statusLabels[o.status]
          }}</span>
        </div>
        <div v-if="!dashboard?.recentOrders?.length" class="empty">
          Nenhum serviço cadastrado ainda.
        </div>
      </div>
    </div>
  </section>
</template>
