<script setup lang="ts">
defineProps<{
  form: any;
  statusLabels: Record<string, string>;
  busy: boolean;
  save: () => unknown;
  close: () => unknown;
  openDatePicker: (event: Event) => unknown;
  currencyInput: (event: Event, target: any, key: string) => unknown;
  money: (value?: number) => string;
}>();
</script>
<template>
  <form class="modal" @submit.prevent="save">
    <div class="modal-head">
      <div>
        <span class="eyebrow">Financeiro</span>
        <h2>{{ form.id ? "Editar conta" : "Nova conta a pagar" }}</h2>
      </div>
      <button type="button" class="tiny-button" @click="close">
        <Icon name="lucide:x" />
      </button>
    </div>
    <div class="two-cols">
      <label
        >Data do pedido<input
          v-model="form.orderDate"
          type="date"
          required
          @click="openDatePicker" /></label
      ><label
        >Data de entrega<input
          v-model="form.deliveryDate"
          type="date"
          @click="openDatePicker"
      /></label>
    </div>
    <label
      >Tipo de serviço<input
        v-model.trim="form.serviceTypeName"
        type="text"
        maxlength="100"
        required /></label
    ><label
      >Nome do recebedor<input
        v-model.trim="form.recipientName"
        type="text"
        maxlength="160"
        required
    /></label>
    <div class="two-cols">
      <label
        >Quantidade de pares<input
          v-model.number="form.quantity"
          type="number"
          min="1"
          step="1"
          placeholder="1"
          required /></label
      ><label
        >Valor combinado<input
          :value="money(form.agreedAmount)"
          type="text"
          inputmode="numeric"
          required
          @input="currencyInput($event, form, 'agreedAmount')"
      /></label>
    </div>
    <label
      >Valor total<input
        :value="money(form.quantity * form.agreedAmount)"
        type="text"
        readonly
    /></label>
    <div class="two-cols">
      <label
        >Status do pagamento<select v-model="form.paymentStatus">
          <option v-for="(label, key) in statusLabels" :key="key" :value="key">
            {{ label }}
          </option>
        </select></label
      ><label
        >Data do pagamento<input
          v-model="form.paymentDate"
          type="date"
          :required="form.paymentStatus === 'paid'"
          :disabled="form.paymentStatus !== 'paid'"
          @click="openDatePicker"
        /><small v-if="form.paymentStatus === 'paid'"
          >Obrigatória para contas pagas.</small
        ></label
      >
    </div>
    <div class="modal-actions">
      <button type="button" class="button ghost" @click="close">Cancelar</button
      ><button class="button" :disabled="busy">Salvar conta</button>
    </div>
  </form>
</template>
