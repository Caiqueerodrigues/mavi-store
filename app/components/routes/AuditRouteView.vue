<script setup lang="ts">
defineProps<{
  filters: any;
  data: any;
  detailLoading: Record<number, boolean>;
  detailCache: Record<number, any>;
  load: (reset?: boolean) => unknown;
  scheduleFilter: () => unknown;
  tableScroll: (
    key: string,
    event: Event,
    load: () => Promise<void>,
  ) => unknown;
  loadNext: (key: string) => Promise<void>;
  sort: (key: any, column: string) => unknown;
  sortIcon: (filters: any, column: string) => string;
  brDateTime: (value: any) => string;
  hasDetails: (id: number) => boolean;
  loadDetails: (log: any) => unknown;
  formatDetails: (value: any) => string;
  copyDetails: (value: any) => unknown;
}>();
</script>
<template>
  <section class="content">
    <div class="section-head">
      <div>
        <span class="eyebrow">Rastreabilidade</span>
        <h2>Registros de auditoria</h2>
        <p>
          {{ data.total }} ações registradas. Logs são imutáveis pela interface.
        </p>
      </div>
      <button class="button secondary" @click="load()">
        <Icon name="lucide:refresh-cw" />Atualizar
      </button>
    </div>
    <form class="panel data-table-filters" @submit.prevent="load()">
      <label
        >Buscar<input
          v-model.trim="filters.search"
          type="search"
          placeholder="Usuário, ação ou entidade"
          @input="scheduleFilter" /></label
      ><button
        v-if="filters.search"
        type="button"
        class="button ghost"
        @click="
          filters.search = '';
          load();
        "
      >
        Limpar filtros</button
      ><span class="table-count">{{ data.total || 0 }} registro(s)</span>
    </form>
    <div
      class="panel table-wrap"
      @scroll="tableScroll('audit', $event, () => loadNext('audit'))"
    >
      <table>
        <thead>
          <tr>
            <th>
              <button class="sort-button" @click="sort('audit', 'createdAt')">
                Data e hora<Icon :name="sortIcon(filters, 'createdAt')" />
              </button>
            </th>
            <th>
              <button class="sort-button" @click="sort('audit', 'userName')">
                Usuário<Icon :name="sortIcon(filters, 'userName')" />
              </button>
            </th>
            <th>
              <button class="sort-button" @click="sort('audit', 'action')">
                Ação<Icon :name="sortIcon(filters, 'action')" />
              </button>
            </th>
            <th>
              <button class="sort-button" @click="sort('audit', 'entity')">
                Entidade<Icon :name="sortIcon(filters, 'entity')" />
              </button>
            </th>
            <th>Detalhes</th>
            <th class="audit-ip-column">
              <button class="sort-button" @click="sort('audit', 'ipAddress')">
                IP<Icon :name="sortIcon(filters, 'ipAddress')" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in data.items" :key="log.id">
            <td>{{ brDateTime(log.createdAt) }}</td>
            <td>
              <strong>{{ log.userName || "Sistema" }}</strong>
            </td>
            <td>
              <span class="audit-action">{{ log.action }}</span>
            </td>
            <td>
              {{ log.entity
              }}<small v-if="log.entityId">#{{ log.entityId }}</small>
            </td>
            <td class="audit-detail-cell">
              <button
                v-if="!hasDetails(log.id)"
                type="button"
                class="text-button"
                :disabled="detailLoading[log.id]"
                @click="loadDetails(log)"
              >
                {{
                  detailLoading[log.id] ? "Carregando…" : "Ver detalhes"
                }}</button><template v-else>
                <pre class="audit-details">{{
                  formatDetails(detailCache[log.id])
                }}</pre>
                <button
                  type="button"
                  class="tiny-button"
                  title="Copiar detalhes"
                  @click="copyDetails(detailCache[log.id])"
                >
                  <Icon name="lucide:copy" /></button
              ></template>
            </td>
            <td class="audit-ip-column">{{ log.ipAddress || "—" }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
