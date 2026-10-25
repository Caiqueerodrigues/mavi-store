<script setup lang="ts">
import workerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";

const mobilePreviewQuery = import.meta.client ? window.matchMedia("(max-width: 680px)") : null;
const isMobilePreview = ref(mobilePreviewQuery?.matches ?? false);
const mobilePdfPages = ref<number[]>([]);
const mobilePdfCanvases = ref<HTMLCanvasElement[]>([]);
const mobilePdfReader = ref<HTMLElement | null>(null);
const mobilePdfLoading = ref(false);
const mobilePdfError = ref(false);
let mobileLoadVersion = 0;
const props = defineProps<{
  loading: boolean;
  previewUrl: string;
  file: File | null;
  fileName: string;
}>();

const emit = defineEmits<{ dismiss: []; share: [] }>();

onMounted(() => mobilePreviewQuery?.addEventListener("change", onMobilePreviewChange));
onBeforeUnmount(() => {
  mobilePreviewQuery?.removeEventListener("change", onMobilePreviewChange);
  mobileLoadVersion += 1;
});
function onMobilePreviewChange(event: MediaQueryListEvent) {
  isMobilePreview.value = event.matches;
}

watch([() => props.previewUrl, isMobilePreview, () => props.loading], async ([url, isMobile, isLoading]) => {
  const version = ++mobileLoadVersion;
  mobilePdfPages.value = [];
  mobilePdfError.value = false;
  if (!url || !isMobile || isLoading) {
    mobilePdfLoading.value = false;
    return;
  }
  mobilePdfLoading.value = true;
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.js");
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const document = await pdfjs.getDocument(url).promise;
    if (version !== mobileLoadVersion) return;
    mobilePdfPages.value = Array.from({ length: document.numPages }, (_, index) => index + 1);
    await nextTick();
    const readerWidth = Math.max(180, (mobilePdfReader.value?.clientWidth ?? 320) - 16);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    for (const pageNumber of mobilePdfPages.value) {
      if (version !== mobileLoadVersion) return;
      const canvas = mobilePdfCanvases.value[pageNumber - 1];
      if (!canvas) continue;
      const page = await document.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = readerWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas 2D indisponível");
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      await page.render({ canvasContext: context, viewport }).promise;
    }
  } catch {
    if (version === mobileLoadVersion) mobilePdfError.value = true;
  } finally {
    if (version === mobileLoadVersion) mobilePdfLoading.value = false;
  }
}, { immediate: true });
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
    <div v-else-if="previewUrl" class="pdf-preview-area">
      <div v-if="isMobilePreview" ref="mobilePdfReader" class="mobile-pdf-reader" aria-label="Prévia do PDF">
        <p v-if="mobilePdfLoading" class="mobile-pdf-message" role="status">Carregando prévia...</p>
        <p v-else-if="mobilePdfError" class="mobile-pdf-message" role="alert">Não foi possível exibir o PDF neste dispositivo.</p>
        <div v-for="page in mobilePdfPages" :key="page" class="mobile-pdf-page">
          <canvas ref="mobilePdfCanvases" />
        </div>
      </div>
      <iframe v-else class="pdf-preview" :src="previewUrl" :title="fileName" />
    </div>
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

.pdf-preview-area { width: 100%; min-width: 0; }

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
  .pdf-loading { height: 66dvh; min-height: 220px; }
  .pdf-preview-area { min-height: 0; }
  .mobile-pdf-reader {
    width: 100%;
    height: min(66dvh, 760px);
    min-height: 220px;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 8px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: #f2f5f3;
    -webkit-overflow-scrolling: touch;
  }
  .mobile-pdf-message { margin: 0; padding: 18px 10px; color: var(--muted); text-align: center; }
  .mobile-pdf-page {
    display: block;
    width: 100%;
    max-width: 100%;
    margin: 0 auto 10px;
    overflow: hidden;
    background: white;
    box-shadow: 0 1px 5px rgb(0 0 0 / 16%);
  }
  .mobile-pdf-page canvas { display: block; max-width: 100%; height: auto; }
  .pdf-modal-actions { justify-content: stretch; }
  .pdf-modal-actions .button { flex: 1 1 130px; }
}
</style>
