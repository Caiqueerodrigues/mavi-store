<script setup lang="ts">
defineProps([
  "parameterTab",
  "editServiceType",
  "goParameterTab",
  "tableFilters",
  "loadFilteredTable",
  "scheduleTableFilter",
  "resetTableFilters",
  "tablePages",
  "tableScroll",
  "loadNextTable",
  "serviceTypes",
  "sortTable",
  "sortIcon",
  "money",
  "settings",
  "saveSettings",
  "selectableChannels",
  "currencyInput",
  "editChannel",
  "channels",
]);
</script>
<template>
  <section class="content">
    <div class="section-head">
      <div>
        <span class="eyebrow">Cadastros auxiliares</span>
        <h2>Parametrização</h2>
        <p>
          Central para tipos de serviço e futuras configurações operacionais.
        </p>
      </div>
      <button
        v-if="parameterTab === 'services'"
        class="button"
        @click="editServiceType()"
      >
        <Icon name="lucide:plus" />Novo tipo de serviço
      </button>
    </div>
    <div
      class="parameter-tabs"
      role="tablist"
      aria-label="Seções de parametrização"
    >
      <button
        :class="{ active: parameterTab === 'services' }"
        @click="goParameterTab('services')"
      >
        <Icon name="lucide:wrench" />Tipos de serviço
      </button>
      <button
        :class="{ active: parameterTab === 'pricing' }"
        @click="goParameterTab('pricing')"
      >
        <Icon name="lucide:calculator" />Precificação
      </button>
    </div>
    <form
      v-if="parameterTab === 'services'"
      class="panel data-table-filters"
      @submit.prevent="loadFilteredTable('serviceTypes')"
    >
      <label
        >Buscar<input
          v-model.trim="tableFilters.serviceTypes.search"
          type="search"
          placeholder="Nome do serviço"
          @input="scheduleTableFilter('serviceTypes')"
      /></label>
      <label
        >Situação<select
          v-model="tableFilters.serviceTypes.active"
          @change="loadFilteredTable('serviceTypes')"
        >
          <option value="">Todas</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select></label
      >
      <button
        type="button"
        class="button ghost"
        @click="resetTableFilters('serviceTypes')"
      >
        Limpar
      </button>
      <span class="table-count"
        >{{ tablePages.serviceTypes?.total || 0 }} registro(s)</span
      >
    </form>
    <div
      v-if="parameterTab === 'services'"
      class="panel table-wrap"
      @scroll="
        tableScroll('serviceTypes', $event, () => loadNextTable('serviceTypes'))
      "
    >
      <div class="panel-head">
        <div>
          <span class="eyebrow">Serviços terceirizados</span>
          <h3>Tipos de serviço</h3>
        </div>
        <Icon name="lucide:wrench" class="panel-icon" />
      </div>
      <table v-if="serviceTypes.length" class="service-types-table">
        <thead>
          <tr>
            <th>
              <button
                class="sort-button"
                @click="sortTable('serviceTypes', 'name')"
              >
                Tipo de serviço<Icon
                  :name="sortIcon(tableFilters.serviceTypes, 'name')"
                />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sortTable('serviceTypes', 'basePrice')"
              >
                Preço base/mínimo<Icon
                  :name="sortIcon(tableFilters.serviceTypes, 'basePrice')"
                />
              </button>
            </th>
            <th>
              <button
                class="sort-button"
                @click="sortTable('serviceTypes', 'active')"
              >
                Situação<Icon
                  :name="sortIcon(tableFilters.serviceTypes, 'active')"
                />
              </button>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="serviceType in serviceTypes" :key="serviceType.id">
            <td data-label="Tipo de serviço">
              <strong>{{ serviceType.name }}</strong>
            </td>
            <td data-label="Preço base/mínimo">
              <strong>{{ money(serviceType.basePrice) }}</strong>
            </td>
            <td data-label="Situação">
              <span
                :class="[
                  'status-badge',
                  serviceType.active ? 'ready' : 'cancelled',
                ]"
                >{{ serviceType.active ? "Ativo" : "Inativo" }}</span
              >
            </td>
            <td class="service-row-action">
              <button
                class="tiny-button"
                title="Editar"
                @click="editServiceType(serviceType)"
              >
                <Icon name="lucide:pencil" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!serviceTypes.length" class="empty">
        Nenhum tipo de serviço cadastrado.
      </div>
    </div>
    <div v-else-if="settings" class="pricing-layout">
      <form
        class="panel form-panel settings-single"
        @submit.prevent="saveSettings"
      >
        <div class="panel-head">
          <div>
            <span class="eyebrow">Precificação</span>
            <h3>Regra padrão</h3>
          </div>
          <Icon name="lucide:calculator" class="panel-icon" />
        </div>
        <label
          >Canal padrão<select v-model.number="settings.defaultChannelId">
            <option v-for="c in selectableChannels" :key="c.id" :value="c.id">
              {{ c.name }} — {{ (c.percentageFee * 100).toFixed(2) }}% +
              {{ money(c.fixedFee) }} por unidade
            </option>
          </select></label
        >
        <label
          >Lucro desejado<input
            :value="money(settings.targetProfit)"
            type="text"
            inputmode="numeric"
            @input="currencyInput($event, settings, 'targetProfit')"
        /></label>
        <button class="button">Salvar regra</button>
      </form>
      <div class="panel channels-panel">
        <div class="panel-head">
          <div>
            <span class="eyebrow">Canais de venda</span>
            <h3>Marketplaces e taxas</h3>
          </div>
          <button class="button" @click="editChannel()">
            <Icon name="lucide:plus" />Novo canal
          </button>
        </div>
        <p class="panel-description">
          Configure a comissão percentual e a tarifa fixa cobrada por unidade.
        </p>
        <form
          class="data-table-filters inline-filters"
          @submit.prevent="loadFilteredTable('channels')"
        >
          <label
            >Buscar<input
              v-model.trim="tableFilters.channels.search"
              type="search"
              placeholder="Nome do canal"
              @input="scheduleTableFilter('channels')"
          /></label>
          <label
            >Situação<select
              v-model="tableFilters.channels.active"
              @change="loadFilteredTable('channels')"
            >
              <option value="">Todas</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select></label
          >
          <button
            type="button"
            class="button ghost"
            @click="resetTableFilters('channels')"
          >
            Limpar
          </button>
          <span class="table-count"
            >{{ tablePages.channels?.total || 0 }} registro(s)</span
          >
        </form>
        <div
          class="table-wrap"
          @scroll="
            tableScroll('channels', $event, () => loadNextTable('channels'))
          "
        >
          <table class="channels-table">
            <thead>
              <tr>
                <th>
                  <button
                    class="sort-button"
                    @click="sortTable('channels', 'name')"
                  >
                    Canal<Icon
                      :name="sortIcon(tableFilters.channels, 'name')"
                    />
                  </button>
                </th>
                <th>
                  <button
                    class="sort-button"
                    @click="sortTable('channels', 'percentageFee')"
                  >
                    Comissão<Icon
                      :name="sortIcon(tableFilters.channels, 'percentageFee')"
                    />
                  </button>
                </th>
                <th>
                  <button
                    class="sort-button"
                    @click="sortTable('channels', 'fixedFee')"
                  >
                    Tarifa por unidade<Icon
                      :name="sortIcon(tableFilters.channels, 'fixedFee')"
                    />
                  </button>
                </th>
                <th>
                  <button
                    class="sort-button"
                    @click="sortTable('channels', 'active')"
                  >
                    Status<Icon
                      :name="sortIcon(tableFilters.channels, 'active')"
                    />
                  </button>
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="channel in channels" :key="channel.id">
                <td data-label="Canal">
                  <strong>{{ channel.name }}</strong>
                </td>
                <td data-label="Comissão">
                  {{ (channel.percentageFee * 100).toFixed(2) }}%
                </td>
                <td data-label="Tarifa por unidade">
                  {{ money(channel.fixedFee) }}
                </td>
                <td data-label="Status">
                  <span
                    :class="[
                      'status-badge',
                      channel.active ? 'ready' : 'cancelled',
                    ]"
                    >{{ channel.active ? "Ativo" : "Inativo" }}</span
                  >
                </td>
                <td class="channel-row-action">
                  <button class="edit-button" @click="editChannel(channel)">
                    <Icon name="lucide:pencil" /><span>Editar</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>
