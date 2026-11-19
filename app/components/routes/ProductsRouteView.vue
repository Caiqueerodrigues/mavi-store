<script setup lang="ts">
defineProps<{
  categories: string[];
  items: any[];
  busy: boolean;
  load: () => unknown;
  edit: (item?: any) => unknown;
  toggle: (item: any) => unknown;
  money: (value?: number) => string;
}>();
const category = defineModel<string>("category", { required: true });
const status = defineModel<string>("status", { required: true });
</script>
<template>
  <section class="content">
    <div class="section-head">
      <div>
        <span class="eyebrow">Fichas técnicas</span>
        <h2>Produtos e margens</h2>
        <p>Custos recalculados a partir dos insumos.</p>
      </div>
      <div class="head-actions">
        <label class="category-filter"
          >Categoria<select v-model="category" @change="load">
            <option value="">Todas as categorias</option>
            <option v-for="item in categories" :key="item" :value="item">
              {{ item }}
            </option>
          </select></label
        ><label class="category-filter"
          >Situação<select v-model="status" @change="load">
            <option value="all">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select></label
        ><button class="button" @click="edit()">
          <Icon name="lucide:plus" />Novo produto
        </button>
      </div>
    </div>
    <div v-if="items.length" class="cards-grid">
      <article
        v-for="item in items"
        :key="item.id"
        :class="['product-card', { inactive: !item.active }]"
      >
        <div class="card-top">
          <div class="product-labels">
            <span class="category">{{ item.category }}</span><span
              :class="['status-badge', item.active ? 'ready' : 'cancelled']"
              >{{ item.active ? "Ativo" : "Inativo" }}</span
            >
          </div>
          <div class="product-actions">
            <button
              class="edit-button"
              title="Editar produto"
              @click="edit(item)"
            >
              <Icon name="lucide:pencil" /><span>Editar</span></button
            ><button
              class="product-toggle"
              :class="{ activate: !item.active }"
              :disabled="busy"
              @click="toggle(item)"
            >
              {{ item.active ? "Inativar" : "Ativar" }}
            </button>
          </div>
        </div>
        <h3>{{ item.name }}</h3>
        <p>{{ item.color || "Sem cor" }} · {{ item.sku || "Sem SKU" }}</p>
        <div class="cost-line">
          <span>Custo de produção</span
          ><strong>{{ money(item.productionCost) }}</strong>
        </div>
        <div class="card-prices">
          <div>
            <small>Preço mínimo</small
            ><strong>{{ money(item.minimumPrice) }}</strong>
          </div>
          <div>
            <small>Preço atual</small
            ><strong>{{ money(item.currentPrice) }}</strong>
          </div>
        </div>
        <div
          :class="[
            'margin-bar',
            { low: item.currentProfit < item.expectedProfit },
          ]"
        >
          <Icon name="lucide:trending-up" /><span>Lucro atual</span
          ><strong>{{ money(item.currentProfit) }}</strong>
        </div>
      </article>
    </div>
    <div v-else class="panel empty">
      Nenhum produto encontrado com esses filtros.
    </div>
  </section>
</template>
