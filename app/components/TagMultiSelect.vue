<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string[];
  placeholder?: string;
}>(), {
  placeholder: "Digite uma opção e pressione Enter",
});

const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();
const draft = ref("");
const tagInput = ref<HTMLInputElement | null>(null);

function focusInput() {
  tagInput.value?.focus();
}

function addTag() {
  const value = draft.value.trim();
  if (!value) return;
  const exists = props.modelValue.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase());
  if (!exists) emit("update:modelValue", [...props.modelValue, value]);
  draft.value = "";
}

function removeTag(index: number) {
  emit("update:modelValue", props.modelValue.filter((_, currentIndex) => currentIndex !== index));
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" || event.key === ",") {
    event.preventDefault();
    addTag();
  } else if (event.key === "Backspace" && !draft.value && props.modelValue.length) {
    removeTag(props.modelValue.length - 1);
  }
}
</script>

<template>
  <div class="tag-multiselect" @click="focusInput">
    <span v-for="(tag, index) in modelValue" :key="`${tag}-${index}`" class="tag-chip">
      {{ tag }}
      <button type="button" :aria-label="`Remover ${tag}`" @click.stop="removeTag(index)">×</button>
    </span>
    <input
      ref="tagInput"
      v-model="draft"
      type="text"
      :placeholder="placeholder"
      @keydown="handleKeydown"
      @blur="addTag"
    />
  </div>
</template>

<style scoped>
.tag-multiselect {
  min-height: 44px;
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  padding: 7px 9px;
  border: 1px solid #d9dedb;
  border-radius: 9px;
  background: #fff;
  cursor: text;
}

.tag-multiselect:focus-within {
  border-color: #397a50;
  box-shadow: 0 0 0 3px rgb(57 122 80 / 12%);
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #eaf3ed;
  color: #285c3a;
  font-size: 0.82rem;
  line-height: 1.3;
}

.tag-chip button {
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.tag-chip button:hover {
  background: rgb(40 92 58 / 12%);
}

.tag-multiselect input {
  flex: 1 1 180px;
  min-width: 140px;
  padding: 5px 2px;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}
</style>
