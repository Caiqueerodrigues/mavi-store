<script setup lang="ts">
defineProps<{
  items: Array<{ id: string; label: string; icon: string }>;
  selected: string;
  menuOpen: boolean;
  roleLabels: Record<string, string>;
  user: { role: string; name: string; email: string };
}>();

defineEmits<{ select: [tab: string] }>();
</script>

<template>
  <aside :class="['sidebar', { open: menuOpen }]">
    <div class="brand">
      <img class="brand-logo" src="/assets/logo-mavi.png" alt="Mavi" />
      <div><strong>Mavi</strong><small>gestão & produção</small></div>
    </div>
    <nav>
      <button
        v-for="item in items"
        :key="item.id"
        :class="{ active: selected === item.id }"
        @click="$emit('select', item.id)"
      >
        <Icon :name="item.icon" /><span>{{ item.label }}</span>
      </button>
    </nav>
    <div class="sidebar-note">
      <Icon name="lucide:shield-check" />
      <div>
        <strong>{{ roleLabels[user.role] }}</strong>
        <span>{{ user.name }}<br />{{ user.email }}</span>
      </div>
    </div>
  </aside>
</template>
