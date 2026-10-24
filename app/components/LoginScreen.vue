<script setup lang="ts">
defineProps<{
  form: { email: string; password: string };
  passwordVisible: boolean;
  rememberLogin: boolean;
  loginError: string;
  busy: boolean;
}>();

defineEmits<{
  login: [];
  togglePassword: [];
  updateRememberLogin: [value: boolean];
}>();
</script>

<template>
  <main class="login-page">
    <section class="login-brand">
      <img src="/assets/logo-mavi.png" alt="Mavi Store" />
      <div>
        <span class="eyebrow light">Gestão integrada</span>
        <h1>Produção organizada.<br />Margem protegida.</h1>
        <p>Custos, pedidos, relatórios e rastreabilidade em um único lugar.</p>
      </div>
    </section>
    <form class="login-card" @submit.prevent="$emit('login')">
      <span class="eyebrow">Acesso seguro</span>
      <h2>Bem-vindo de volta</h2>
      <p>Use as credenciais fornecidas pelo administrador.</p>
      <label>E-mail<input v-model="form.email" type="email" autocomplete="username" required /></label>
      <label>Senha<span class="password-field">
        <input v-model="form.password" :type="passwordVisible ? 'text' : 'password'" autocomplete="current-password" required />
        <button type="button" :aria-label="passwordVisible ? 'Ocultar senha' : 'Mostrar senha'" @click="$emit('togglePassword')"></button>
      </span></label>
      <label class="remember-login"><input :checked="rememberLogin" type="checkbox" @change="$emit('updateRememberLogin', ($event.target as HTMLInputElement).checked)" />Lembrar de mim neste dispositivo</label>
      <div v-if="loginError" class="form-error">{{ loginError }}</div>
      <button class="button" :disabled="busy">{{ busy ? "Entrando…" : "Entrar no sistema" }}</button>
    </form>
  </main>
</template>
