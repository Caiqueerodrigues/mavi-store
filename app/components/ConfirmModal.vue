<script setup lang="ts">
defineProps<{
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}>()

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div class="modal-backdrop confirm-backdrop">
    <section class="modal confirm-modal" role="alertdialog" aria-modal="true" :aria-label="title">
      <div class="modal-head">
        <span class="eyebrow">Confirmação</span>
        <h2>{{ title }}</h2>
      </div>
      <p class="confirm-message">{{ message }}</p>
      <div class="modal-actions">
        <button class="button ghost" type="button" @click="$emit('cancel')">Cancelar</button>
        <button class="button" :class="{ 'confirm-danger': danger }" type="button" @click="$emit('confirm')">
          {{ confirmLabel || "Confirmar" }}
        </button>
      </div>
    </section>
  </div>
</template>
