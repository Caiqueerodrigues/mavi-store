<script setup lang="ts">
import AppShell from "~/components/AppShell.vue";

const route = useRoute();
const paths = [
  "/login",
  "/visao-geral",
  "/servicos",
  "/pedidos",
  "/clientes",
  "/produtos",
  "/insumos",
  "/parametrizacao/servicos",
  "/parametrizacao/precificacao",
  "/usuarios",
  "/auditoria",
];

if (!paths.includes(route.path)) {
  throw createError({ statusCode: 404, statusMessage: "Página não encontrada" });
}
</script>

<template><AppShell /></template>
