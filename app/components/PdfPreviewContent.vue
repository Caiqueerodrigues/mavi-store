<script setup lang="ts">
const props = defineProps<{
  loading: boolean;
  previewUrl: string;
  file: File | null;
  fileName: string;
}>();

const emit = defineEmits<{ dismiss: []; share: [] }>();
</script>

<template>
  <section class="modal pdf-modal" role="dialog" aria-modal="true" aria-labelledby="pdf-modal-title">
    <div class="modal-head">
      <div><span class="eyebrow">Serviços terceirizados</span><h2 id="pdf-modal-title">Ficha em PDF</h2></div>
      <button type="button" class="tiny-button" aria-label="Fechar PDF" @click="emit('dismiss')"><Icon name="lucide:x" /></button>
    </div>
    <div v-if="loading" class="pdf-loading" role="status" aria-live="polite">
      <div class="pdf-typewriter"><Icon name="lucide:file-text" /><span class="pdf-typewriter-line"><span class="pdf-typewriter-text">Gerando PDF...</span></span></div>
      <p>Preparando a ficha para visualização</p>
    </div>
    <iframe v-else-if="previewUrl" class="pdf-preview" :src="previewUrl" :title="fileName" />
    <div class="modal-actions pdf-modal-actions">
      <button v-if="file" type="button" class="button secondary" @click="$emit('share')"><Icon name="lucide:share-2" />Compartilhar</button>
      <button type="button" class="button ghost" @click="emit('dismiss')">Fechar</button>
    </div>
  </section>
</template>

<style scoped>
.modal.pdf-modal {
  display: flex;
  flex-direction: column;
  width: min(1100px, 100%);
  max-height: 94dvh;
}

.pdf-preview {
  width: 100%;
  height: min(68dvh, 760px);
  min-height: 280px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #f2f5f3;
}

.pdf-loading {
  min-height: min(68dvh, 760px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--green-2);
}

.pdf-loading p {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}

.pdf-typewriter {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--green-2);
  font-size: clamp(1.1rem, 3vw, 1.45rem);
  font-weight: 750;
}

.pdf-typewriter :deep(svg) {
  color: var(--green-1);
  filter: drop-shadow(0 3px 8px rgb(32 112 65 / 22%));
}

.pdf-typewriter-line {
  display: inline-block;
  overflow: hidden;
  border-right: 3px solid var(--green-1);
  white-space: nowrap;
  animation: pdf-caret 0.75s step-end infinite;
}

.pdf-typewriter-text {
  display: inline-block;
  width: 0;
  overflow: hidden;
  background: linear-gradient(90deg, var(--green-1), #8cbb43, #c7a83d);
  background-clip: text;
  -webkit-background-clip: text;
  color: var(--green-2);
  -webkit-text-fill-color: transparent;
  animation: pdf-typing 0.9s steps(14, end) forwards;
}

.pdf-modal-actions {
  flex-wrap: wrap;
  margin-top: 14px;
}

@keyframes pdf-typing {
  from { width: 0; }
  to { width: 14ch; }
}

@keyframes pdf-caret {
  50% { border-color: transparent; }
}

@media (max-width: 680px) {
  .modal.pdf-modal { width: 100%; max-height: 94dvh; }
  .pdf-preview, .pdf-loading { height: 66dvh; min-height: 220px; }
  .pdf-modal-actions { justify-content: stretch; }
  .pdf-modal-actions .button { flex: 1 1 130px; }
}
</style>
