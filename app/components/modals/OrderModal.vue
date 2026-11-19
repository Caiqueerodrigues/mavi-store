<script setup lang="ts">
defineProps([
  "orderForm",
  "saveOrder",
  "close",
  "activeCustomers",
  "orderServiceTypes",
  "selectServiceType",
  "serverTime",
  "openDatePicker",
  "statusLabels",
  "money",
  "currencyInput",
  "paymentStatusLabels",
  "addSize",
  "gradeMatchesQuantity",
  "gradeQuantity",
  "busy",
]);
</script>
<template>
  <form class="modal wide" @submit.prevent="saveOrder">
    <div class="modal-head">
      <div>
        <span class="eyebrow">Pedido</span>
        <h2>{{ orderForm.id ? "Editar pedido" : "Novo pedido" }}</h2>
      </div>
      <button type="button" class="tiny-button" @click="close()">
        <span aria-hidden="true">×</span>
      </button>
    </div>
    <div class="three-cols">
      <label
        >Número<input
          v-model="orderForm.orderNumber"
          disabled
          placeholder="Gerado automaticamente" /></label
      ><label
        >Cliente<select v-model.number="orderForm.customerId" required>
          <option :value="null" disabled>Selecione</option>
          <option
            v-for="customer in activeCustomers"
            :key="customer.id"
            :value="customer.id"
          >
            {{ customer.nickname ? `${customer.nickname} — ` : ""
            }}{{ customer.name }}
          </option>
        </select></label
      ><label
        >Tipo<select
          v-model.number="orderForm.serviceTypeId"
          required
          @change="selectServiceType"
        >
          <option :value="null" disabled>Selecione</option>
          <option
            v-for="serviceType in orderServiceTypes"
            :key="serviceType.id"
            :value="serviceType.id"
          >
            {{ serviceType.name }}
          </option>
        </select></label
      >
    </div>
    <label
      >Descrição do produto<input
        v-model="orderForm.productDescription"
        required
    /></label>
    <div class="two-cols">
      <label>Material<input v-model="orderForm.material" /></label
      ><label>Cor<input v-model="orderForm.color" /></label>
    </div>
    <div class="three-cols">
      <label
        >Data do pedido<input
          v-model="orderForm.orderDate"
          type="date"
          :max="serverTime.slice(0, 10)"
          @click="openDatePicker"
          required /></label
      ><label
        >Prazo<input
          v-model="orderForm.dueDate"
          type="date"
          @click="openDatePicker" /></label
      ><label
        >Status<select v-model="orderForm.status">
          <option v-for="(label, key) in statusLabels" :key="key" :value="key">
            {{ label }}
          </option>
        </select></label
      >
    </div>
    <div class="order-values">
      <label
        >Quantidade<input
          v-model.number="orderForm.quantity"
          type="number"
          min=".01"
          step=".01"
          placeholder="1"
          required /></label
      ><label
        >Valor unitário<input
          :value="money(orderForm.unitPrice)"
          type="text"
          inputmode="numeric"
          @input="currencyInput($event, orderForm, 'unitPrice')"
          required /></label
      ><label
        >Valor pago<input
          :value="money(orderForm.paidAmount)"
          type="text"
          inputmode="numeric"
          disabled /></label
      ><label
        >Valor total<input
          :value="
            money(
              Number(orderForm.quantity || 0) *
                Number(orderForm.unitPrice || 0),
            )
          "
          type="text"
          disabled
      /></label>
    </div>
    <div class="two-cols">
      <label
        >Status do pagamento<select v-model="orderForm.paymentStatus">
          <option
            v-for="(label, key) in paymentStatusLabels"
            :key="key"
            :value="key"
          >
            {{ label }}
          </option>
        </select></label
      >
      <label
        >Data do pagamento<input
          v-model="orderForm.paymentDate"
          type="date"
          :max="serverTime.slice(0, 10)"
          :required="orderForm.paymentStatus === 'paid'"
          @click="openDatePicker"
        />
        <small v-if="orderForm.paymentStatus === 'paid'"
          >Obrigatória para pagamento pago.</small
        >
      </label>
    </div>
    <div class="components-head order-grade-head">
      <div>
        <span class="eyebrow">Grade</span>
        <h3>Tamanhos, cores e quantidades</h3>
      </div>
      <button type="button" class="text-button" @click="addSize">
        <Icon name="lucide:plus" />Adicionar
      </button>
    </div>
    <div v-if="orderForm.sizes.length" class="size-grid">
      <div v-for="(s, i) in orderForm.sizes" :key="i">
        <input v-model="s.size" placeholder="Tamanho" required /><input
          v-model.number="s.quantity"
          type="number"
          min="1"
          placeholder="1"
        /><input
          v-model="s.color"
          maxlength="120"
          placeholder="Cor (opcional)"
        /><button
          type="button"
          class="tiny-button danger-text"
          @click="orderForm.sizes.splice(i, 1)"
        >
          <Icon name="lucide:x" />
        </button>
      </div>
    </div>
    <div :class="['grade-summary', { invalid: !gradeMatchesQuantity }]">
      <span
        >Quantidade na grade: <strong>{{ gradeQuantity }}</strong> de
        <strong>{{ orderForm.quantity || 0 }}</strong></span
      >
      <small>{{
        gradeMatchesQuantity
          ? "Grade conferida"
          : "A soma da grade deve ser igual à quantidade do pedido"
      }}</small>
    </div>
    <div class="two-cols">
      <label
        >Data da retirada<input
          v-model="orderForm.withdrawalDate"
          type="date"
          :max="serverTime.slice(0, 10)"
          @click="openDatePicker" /></label
      ><label>Quem retirou<input v-model="orderForm.withdrawnBy" /></label>
    </div>
    <label
      >Observações<textarea v-model="orderForm.notes" rows="3"></textarea>
    </label>
    <div class="product-total">
      <span>Total do pedido</span
      ><strong>{{ money(orderForm.quantity * orderForm.unitPrice) }}</strong>
    </div>
    <div class="modal-actions">
      <button type="button" class="button ghost" @click="close()">
        Cancelar</button
      ><button
        class="button"
        :disabled="
          busy ||
          !activeCustomers.length ||
          !orderServiceTypes.length ||
          !gradeMatchesQuantity
        "
      >
        Salvar pedido
      </button>
    </div>
  </form>
</template>
