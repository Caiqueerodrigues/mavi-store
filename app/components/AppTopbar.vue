<script setup lang="ts">
defineProps<{ title: string }>();
defineEmits<{ toggleMenu: []; editProfile: []; logout: [] }>();
</script>

<template>
  <header class="topbar">
    <button class="menu" aria-label="Abrir menu" @click="$emit('toggleMenu')">
      <Icon name="lucide:menu" />
    </button>
    <div>
      <span class="eyebrow">Mavi Store</span>
      <h1>{{ title }}</h1>
    </div>
    <div class="top-actions">
      <span class="status"><i />Sessão protegida</span>
      <button class="icon-button" title="Editar perfil" @click="$emit('editProfile')">
        <Icon name="lucide:user-round-cog" />
      </button>
      <button class="icon-button" title="Sair" @click="$emit('logout')">
        <Icon name="lucide:log-out" />
      </button>
    </div>
  </header>
</template>
