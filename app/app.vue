<script setup lang="ts">
import type { Material, Product, Channel } from "~~/shared/types";
type Role = "admin" | "manager" | "operator" | "viewer";
type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
};
type SizeItem = { size: string; quantity: number };
type Customer = {
  id: number;
  name: string;
  phone: string | null;
  nickname: string | null;
  active: boolean;
};
type ServiceType = {
  id: number;
  name: string;
  basePrice: number;
  active: boolean;
};
type Order = {
  id: number;
  orderNumber: string;
  customerId: number | null;
  customerName: string;
  serviceTypeId: number | null;
  orderType: string;
  productDescription: string;
  material: string | null;
  color: string | null;
  orderDate: string;
  dueDate: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  status: string;
  sizes: SizeItem[];
  withdrawalDate: string | null;
  withdrawnBy: string | null;
  notes: string | null;
};
const ready = ref(false),
  user = ref<User | null>(null),
  serverTime = ref(""),
  tab = ref("dashboard"),
  menuOpen = ref(false),
  busy = ref(false),
  notice = ref("");
const dashboard = ref<any>(null),
  orders = ref<Order[]>([]),
  customers = ref<Customer[]>([]),
  serviceTypes = ref<ServiceType[]>([]),
  products = ref<Product[]>([]),
  materials = ref<Material[]>([]),
  channels = ref<Channel[]>([]),
  settings = ref<any>(null),
  users = ref<User[]>([]),
  auditData = ref<any>({ items: [], total: 0 });
const productCategory = ref(""),
  parameterTab = ref<"services" | "pricing">("services"),
  productCategories = computed(() =>
    [
      ...new Set(
        products.value.map((product) => product.category).filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b, "pt-BR")),
  ),
  filteredProducts = computed(() =>
    productCategory.value
      ? products.value.filter(
          (product) => product.category === productCategory.value,
        )
      : products.value,
  );
const loginForm = reactive({ email: "admin@mavicustos.local", password: "" }),
  rememberLogin = ref(false),
  passwordVisible = reactive({
    login: false,
    user: false,
    current: false,
    newPassword: false,
    confirm: false,
  }),
  loginError = ref(""),
  changeModal = ref(false),
  changeForm = reactive({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
const roleLabels: Record<Role, string> = {
    admin: "Administrador",
    manager: "Gestor",
    operator: "Operador",
    viewer: "Consulta",
  },
  statusLabels: Record<string, string> = {
    pending: "Pendente",
    in_production: "Em produção",
    ready: "Pronto",
    delivered: "Entregue",
    completed: "Concluído",
    cancelled: "Cancelado",
  },
  paymentStatusLabels: Record<string, string> = {
    pending: "Pendente",
    partial: "Parcial",
    paid: "Pago",
    refunded: "Estornado",
  };
const money = (v = 0) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(v),
  brDate = (v?: string | null) => {
    if (!v) return "—";
    const [year, month, day] = String(v).slice(0, 10).split("-");
    return year && month && day ? `${day}/${month}/${year}` : "—";
  },
  brDateTime = (v?: string | null) =>
    v
      ? new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "America/Sao_Paulo",
        }).format(Date.parse(v))
      : "—";
function currencyInput(
  event: Event,
  target: Record<string, any>,
  field: string,
) {
  const input = event.target as HTMLInputElement;
  const digits = input.value.replace(/\D/g, "");
  target[field] = digits ? Number(digits) / 100 : 0;
  input.value = money(target[field]);
}
function phoneMask(value: string | null | undefined) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  const area = digits.slice(0, 2),
    rest = digits.slice(2);
  if (digits.length <= 10)
    return `(${area})${rest.slice(0, 4)}${rest.length > 4 ? `-${rest.slice(4)}` : ""}`;
  return `(${area})${rest.slice(0, 1)}${rest.length > 1 ? ` ${rest.slice(1, 5)}` : ""}${rest.length > 5 ? `-${rest.slice(5)}` : ""}`;
}
function phoneInput(event: Event) {
  const input = event.target as HTMLInputElement;
  customerForm.phone = phoneMask(input.value);
  input.value = customerForm.phone;
}
const canCosts = computed(() =>
    ["admin", "manager"].includes(user.value?.role || ""),
  ),
  canWriteOrders = computed(() =>
    ["admin", "manager", "operator"].includes(user.value?.role || ""),
  ),
  canAudit = computed(() =>
    ["admin", "manager", "viewer"].includes(user.value?.role || ""),
  );
const nav = computed(() =>
  [
    {
      id: "dashboard",
      label: "Visão geral",
      icon: "lucide:layout-dashboard",
      show: true,
    },
    {
      id: "orders",
      label: "Pedidos",
      icon: "lucide:clipboard-list",
      show: true,
    },
    {
      id: "customers",
      label: "Clientes",
      icon: "lucide:contact-round",
      show: true,
    },
    {
      id: "products",
      label: "Produtos",
      icon: "lucide:package-open",
      show: canCosts.value,
    },
    {
      id: "materials",
      label: "Insumos",
      icon: "lucide:layers-3",
      show: canCosts.value,
    },
    {
      id: "parameters",
      label: "Parametrização",
      icon: "lucide:settings-2",
      show: canCosts.value,
    },
    {
      id: "users",
      label: "Usuários",
      icon: "lucide:users",
      show: user.value?.role === "admin",
    },
    {
      id: "audit",
      label: "Auditoria",
      icon: "lucide:scroll-text",
      show: canAudit.value,
    },
  ].filter((i) => i.show),
);
const passwordRules = computed(() => ({
  length: changeForm.newPassword.length >= 12,
  upper: /[A-Z]/.test(changeForm.newPassword),
  lower: /[a-z]/.test(changeForm.newPassword),
  number: /\d/.test(changeForm.newPassword),
  special: /[^A-Za-z0-9]/.test(changeForm.newPassword),
  match:
    changeForm.newPassword.length > 0 &&
    changeForm.newPassword === changeForm.confirmPassword,
}));
const passwordValid = computed(() =>
  Object.values(passwordRules.value).every(Boolean),
);
useHead({
  title: computed(() =>
    user.value
      ? nav.value.find((item) => item.id === tab.value)?.label || "Gestão"
      : "Login",
  ),
  titleTemplate: "Mavi - %s",
});
function csrf() {
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((v) => v.startsWith("mavi_csrf="))
      ?.split("=")[1] || "",
  );
}
function syncServerTime(headers: Headers) {
  const value = headers.get("x-server-time");
  if (value) serverTime.value = value;
}
function forceLogin(message = "Sua sessão expirou. Entre novamente.") {
  user.value = null;
  changeModal.value = false;
  tab.value = "dashboard";
  loginForm.password = "";
  loginError.value = message;
}
async function api<T = any>(
  url: string,
  options: any = {},
  retry = true,
): Promise<T> {
  const method = String(options.method || "GET").toUpperCase(),
    headers = { ...(options.headers || {}) };
  if (!["GET", "HEAD"].includes(method)) headers["x-csrf-token"] = csrf();
  try {
    const response = await $fetch.raw<T>(url, {
      ...options,
      headers,
      credentials: "include",
    });
    syncServerTime(response.headers);
    return response._data as T;
  } catch (error: any) {
    const status = Number(error?.status || error?.statusCode);
    if ((status === 401 || status === 403) && retry && csrf()) {
      try {
        const refresh = await $fetch.raw("/api/auth/refresh", {
          method: "POST",
          headers: { "x-csrf-token": csrf() },
          credentials: "include",
        });
        syncServerTime(refresh.headers);
        return await api<T>(url, options, false);
      } catch {
        forceLogin();
        throw error;
      }
    }
    if (status === 401 || status === 403) forceLogin();
    throw error;
  }
}
function toast(message: string) {
  notice.value = message;
  setTimeout(() => (notice.value = ""), 3200);
}
const rememberedLoginKey = "mavi_remembered_login",
  rememberedKeyDb = "mavi_secure_storage";
function bytesToBase64(bytes: Uint8Array) {
  let value = "";
  bytes.forEach((byte) => (value += String.fromCharCode(byte)));
  return btoa(value);
}
function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
async function credentialKey() {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(rememberedKeyDb, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("keys");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const stored = await new Promise<CryptoKey | undefined>((resolve, reject) => {
    const request = database
      .transaction("keys")
      .objectStore("keys")
      .get("credentials");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (stored) {
    database.close();
    return stored;
  }
  const key = (await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )) as CryptoKey;
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("keys", "readwrite");
    transaction.objectStore("keys").put(key, "credentials");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
  return key;
}
async function saveRememberedLogin() {
  if (!rememberLogin.value) {
    localStorage.removeItem(rememberedLoginKey);
    return;
  }
  const iv = crypto.getRandomValues(new Uint8Array(12)),
    key = await credentialKey(),
    plain = new TextEncoder().encode(
      JSON.stringify({ email: loginForm.email, password: loginForm.password }),
    ),
    encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      plain,
    );
  localStorage.setItem(
    rememberedLoginKey,
    JSON.stringify({
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(encrypted)),
    }),
  );
}
async function loadRememberedLogin() {
  const stored = localStorage.getItem(rememberedLoginKey);
  if (!stored) return;
  try {
    const payload = JSON.parse(stored),
      key = await credentialKey(),
      plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
        key,
        base64ToBytes(payload.data),
      ),
      credentials = JSON.parse(new TextDecoder().decode(plain));
    loginForm.email = credentials.email;
    loginForm.password = credentials.password;
    rememberLogin.value = true;
  } catch {
    localStorage.removeItem(rememberedLoginKey);
  }
}
async function loadAll() {
  const jobs: Promise<any>[] = [
    api("/api/dashboard").then((v) => (dashboard.value = v)),
    api<Order[]>("/api/orders").then((v) => (orders.value = v)),
    api<Customer[]>("/api/customers").then((v) => (customers.value = v)),
    api<ServiceType[]>("/api/service-types").then(
      (v) => (serviceTypes.value = v),
    ),
  ];
  if (canCosts.value)
    jobs.push(
      api<Product[]>("/api/products").then((v) => (products.value = v)),
      api<Material[]>("/api/materials").then((v) => (materials.value = v)),
      api<Channel[]>("/api/channels").then((v) => (channels.value = v)),
      api("/api/settings").then((v) => (settings.value = v)),
    );
  if (user.value?.role === "admin")
    jobs.push(api<User[]>("/api/users").then((v) => (users.value = v)));
  if (canAudit.value)
    jobs.push(api("/api/audit").then((v) => (auditData.value = v)));
  await Promise.all(jobs);
}
onMounted(async () => {
  try {
    const data = await api<{ user: User }>("/api/auth/me");
    user.value = data.user;
    changeModal.value = data.user.mustChangePassword;
    if (!data.user.mustChangePassword) await loadAll();
  } catch {
    await loadRememberedLogin();
  } finally {
    ready.value = true;
  }
});
async function login() {
  busy.value = true;
  loginError.value = "";
  try {
    const response = await $fetch.raw<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: loginForm,
      credentials: "include",
    });
    syncServerTime(response.headers);
    const data = response._data!;
    await saveRememberedLogin();
    user.value = data.user;
    changeModal.value = data.user.mustChangePassword;
    if (!data.user.mustChangePassword) await loadAll();
  } catch (e: any) {
    if (!user.value)
      loginError.value = e?.data?.statusMessage || "Não foi possível entrar";
  } finally {
    busy.value = false;
  }
}
async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
  } finally {
    forceLogin("Sessão encerrada.");
  }
}
async function changePassword() {
  if (!passwordValid.value) return;
  busy.value = true;
  try {
    const data = await api<{ user: User }>("/api/auth/change-password", {
      method: "POST",
      body: {
        currentPassword: changeForm.currentPassword,
        newPassword: changeForm.newPassword,
      },
    });
    localStorage.removeItem(rememberedLoginKey);
    rememberLogin.value = false;
    user.value = data.user;
    changeModal.value = false;
    Object.assign(changeForm, {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    await loadAll();
    toast("Senha alterada com sucesso.");
  } catch (e: any) {
    toast(e?.data?.statusMessage || "Revise os requisitos da senha");
  } finally {
    busy.value = false;
  }
}
function go(id: string) {
  tab.value = id;
  menuOpen.value = false;
  if (id === "audit") loadAudit();
}
const activeCustomers = computed(() =>
    customers.value.filter((item) => item.active),
  ),
  activeServiceTypes = computed(() =>
    serviceTypes.value.filter((item) => item.active),
  );
const selectedOrders = ref<number[]>([]),
  bulkAction = ref("");
const orderModal = ref(false),
  orderForm = reactive<any>({
    id: 0,
    orderNumber: "",
    customerId: null,
    customerName: "",
    serviceTypeId: null,
    orderType: "",
    productDescription: "",
    material: "",
    color: "",
    orderDate: serverTime.value.slice(0, 10),
    dueDate: null,
    quantity: 1,
    unitPrice: 0,
    paidAmount: 0,
    paymentStatus: "pending",
    status: "pending",
    sizes: [],
    withdrawalDate: null,
    withdrawnBy: "",
    notes: "",
  });
function editOrder(item?: Order) {
  const firstCustomer = activeCustomers.value[0],
    firstService = activeServiceTypes.value[0];
  Object.assign(
    orderForm,
    item
      ? JSON.parse(JSON.stringify(item))
      : {
          id: 0,
          orderNumber: "",
          customerId: firstCustomer?.id || null,
          customerName: firstCustomer?.name || "",
          serviceTypeId: firstService?.id || null,
          orderType: firstService?.name || "",
          productDescription: "",
          material: "",
          color: "",
          orderDate: serverTime.value.slice(0, 10),
          dueDate: null,
          quantity: 1,
          unitPrice: firstService?.basePrice || 0,
          paidAmount: 0,
          paymentStatus: "pending",
          status: "pending",
          sizes: [],
          withdrawalDate: null,
          withdrawnBy: "",
          notes: "",
        },
  );
  orderModal.value = true;
}
function selectServiceType() {
  const selected = activeServiceTypes.value.find(
    (item) => item.id === orderForm.serviceTypeId,
  );
  if (selected) orderForm.unitPrice = selected.basePrice;
}
function addSize() {
  orderForm.sizes.push({ size: "", quantity: 1 });
}
async function saveOrder() {
  busy.value = true;
  try {
    await api(orderForm.id ? `/api/orders/${orderForm.id}` : "/api/orders", {
      method: orderForm.id ? "PUT" : "POST",
      body: orderForm,
    });
    orderModal.value = false;
    orders.value = await api("/api/orders");
    await loadAudit();
    toast("Pedido salvo e auditado.");
  } catch (e: any) {
    toast(e?.data?.statusMessage || "Não foi possível salvar o pedido");
  } finally {
    busy.value = false;
  }
}
async function applyBulkAction() {
  if (!selectedOrders.value.length || !bulkAction.value) return;
  const [kind, value] = bulkAction.value.split(":");
  if (!value) return;
  busy.value = true;
  try {
    orders.value = await api("/api/orders/bulk-status", {
      method: "PUT",
      body:
        kind === "status"
          ? { ids: selectedOrders.value, status: value }
          : { ids: selectedOrders.value, paymentStatus: value },
    });
    selectedOrders.value = [];
    bulkAction.value = "";
    toast("Pedidos atualizados em lote.");
  } catch (e: any) {
    toast(e?.data?.statusMessage || "Não foi possível atualizar os pedidos");
  } finally {
    busy.value = false;
  }
}
async function cloneOrder(item: Order) {
  await api(`/api/orders/${item.id}/clone`, { method: "POST" });
  orders.value = await api("/api/orders");
  toast("Pedido clonado.");
}
async function deleteOrder(item: Order) {
  if (!confirm(`Excluir o pedido ${item.orderNumber}?`)) return;
  await api(`/api/orders/${item.id}`, { method: "DELETE" });
  orders.value = await api("/api/orders");
  toast("Pedido removido. O histórico foi preservado.");
}
async function pdf(item?: Order) {
  const url = item
    ? `/api/orders/report.pdf?ids=${item.id}`
    : "/api/orders/report.pdf";
  let response = await fetch(url, { credentials: "include" });
  if (response.status === 401 || response.status === 403) {
    try {
      await $fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "x-csrf-token": csrf() },
        credentials: "include",
      });
      response = await fetch(url, { credentials: "include" });
    } catch {
      forceLogin();
      return;
    }
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) forceLogin();
    else toast("Não foi possível gerar o PDF.");
    return;
  }
  const blob = await response.blob(),
    href = URL.createObjectURL(blob);
  window.open(href, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(href), 60000);
  await loadAudit();
}
const userModal = ref(false),
  userForm = reactive<any>({
    id: 0,
    name: "",
    email: "",
    role: "operator",
    active: true,
    password: "",
  });
function editUser(item?: User) {
  Object.assign(
    userForm,
    item
      ? { ...item, password: "" }
      : {
          id: 0,
          name: "",
          email: "",
          role: "operator",
          active: true,
          password: "",
        },
  );
  userModal.value = true;
}
const profileModal = ref(false),
  profileForm = reactive({ name: "", email: "" });
function editProfile() {
  if (!user.value) return;
  Object.assign(profileForm, {
    name: user.value.name,
    email: user.value.email,
  });
  profileModal.value = true;
}
async function saveProfile() {
  busy.value = true;
  try {
    const data = await api<{ user: User }>("/api/auth/profile", {
      method: "PUT",
      body: profileForm,
    });
    user.value = data.user;
    profileModal.value = false;
    toast("Perfil atualizado.");
  } catch (e: any) {
    toast(e?.data?.statusMessage || "Não foi possível atualizar o perfil");
  } finally {
    busy.value = false;
  }
}
async function saveUser() {
  busy.value = true;
  try {
    await api(userForm.id ? `/api/users/${userForm.id}` : "/api/users", {
      method: userForm.id ? "PUT" : "POST",
      body: userForm,
    });
    userModal.value = false;
    users.value = await api("/api/users");
    await loadAudit();
    toast("Usuário salvo.");
  } catch (e: any) {
    toast(e?.data?.statusMessage || "Não foi possível salvar o usuário");
  } finally {
    busy.value = false;
  }
}
async function deleteUser(item: User) {
  if (!confirm(`Excluir ${item.name}?`)) return;
  await api(`/api/users/${item.id}`, { method: "DELETE" });
  users.value = await api("/api/users");
  toast("Usuário removido.");
}
async function loadAudit() {
  if (canAudit.value) auditData.value = await api("/api/audit");
}
const materialModal = ref(false),
  materialForm = reactive<any>({
    id: 0,
    name: "",
    supplier: "",
    unit: "UN",
    purchasePrice: 0,
    purchaseQuantity: 1,
    active: true,
  });
function editMaterial(item?: Material) {
  Object.assign(
    materialForm,
    item
      ? { ...item, supplier: item.supplier || "" }
      : {
          id: 0,
          name: "",
          supplier: "",
          unit: "UN",
          purchasePrice: 0,
          purchaseQuantity: 1,
          active: true,
        },
  );
  materialModal.value = true;
}
async function saveMaterial() {
  await api(
    materialForm.id ? `/api/materials/${materialForm.id}` : "/api/materials",
    { method: materialForm.id ? "PUT" : "POST", body: materialForm },
  );
  materialModal.value = false;
  materials.value = await api("/api/materials");
  dashboard.value = await api("/api/dashboard");
  toast("Insumo salvo.");
}
async function saveSettings() {
  await api("/api/settings", { method: "PUT", body: settings.value });
  dashboard.value = await api("/api/dashboard");
  toast("Precificação atualizada.");
}
const customerModal = ref(false),
  customerForm = reactive<any>({
    id: 0,
    name: "",
    phone: "",
    nickname: "",
    active: true,
  });
function editCustomer(item?: Customer) {
  Object.assign(
    customerForm,
    item
      ? { ...item, phone: phoneMask(item.phone), nickname: item.nickname || "" }
      : { id: 0, name: "", phone: "", nickname: "", active: true },
  );
  customerModal.value = true;
}
async function saveCustomer() {
  busy.value = true;
  try {
    await api(
      customerForm.id ? `/api/customers/${customerForm.id}` : "/api/customers",
      { method: customerForm.id ? "PUT" : "POST", body: customerForm },
    );
    customerModal.value = false;
    customers.value = await api("/api/customers");
    toast("Cliente salvo.");
  } catch (e: any) {
    toast(e?.data?.statusMessage || "Não foi possível salvar o cliente");
  } finally {
    busy.value = false;
  }
}
const serviceTypeModal = ref(false),
  serviceTypeForm = reactive<any>({
    id: 0,
    name: "",
    basePrice: 0,
    active: true,
  });
function editServiceType(item?: ServiceType) {
  Object.assign(
    serviceTypeForm,
    item ? { ...item } : { id: 0, name: "", basePrice: 0, active: true },
  );
  serviceTypeModal.value = true;
}
async function saveServiceType() {
  busy.value = true;
  try {
    await api(
      serviceTypeForm.id
        ? `/api/service-types/${serviceTypeForm.id}`
        : "/api/service-types",
      { method: serviceTypeForm.id ? "PUT" : "POST", body: serviceTypeForm },
    );
    serviceTypeModal.value = false;
    serviceTypes.value = await api("/api/service-types");
    toast("Tipo de serviço salvo.");
  } catch (e: any) {
    toast(
      e?.data?.statusMessage || "Não foi possível salvar o tipo de serviço",
    );
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div v-if="!ready" class="splash">
    <img src="/assets/logo-mavi.png" alt="Mavi Store" /><span
      >Preparando seu ambiente…</span
    >
  </div>
  <main v-else-if="!user" class="login-page">
    <section class="login-brand">
      <img src="/assets/logo-mavi.png" alt="Mavi Store" />
      <div>
        <span class="eyebrow light">Gestão integrada</span>
        <h1>Produção organizada.<br />Margem protegida.</h1>
        <p>Custos, pedidos, relatórios e rastreabilidade em um único lugar.</p>
      </div>
    </section>
    <form class="login-card" @submit.prevent="login">
      <span class="eyebrow">Acesso seguro</span>
      <h2>Bem-vindo de volta</h2>
      <p>Use as credenciais fornecidas pelo administrador.</p>
      <label
        >E-mail<input
          v-model="loginForm.email"
          type="email"
          autocomplete="username"
          required /></label
      ><label
        >Senha<span class="password-field"
          ><input
            v-model="loginForm.password"
            :type="passwordVisible.login ? 'text' : 'password'"
            autocomplete="current-password"
            required /><button
            type="button"
            :aria-label="
              passwordVisible.login ? 'Ocultar senha' : 'Mostrar senha'
            "
            @click="passwordVisible.login = !passwordVisible.login"
          ></button></span></label
      ><label class="remember-login"
        ><input v-model="rememberLogin" type="checkbox" />Lembrar de mim neste
        dispositivo</label
      >
      <div v-if="loginError" class="form-error">{{ loginError }}</div>
      <button class="button" :disabled="busy">
        {{ busy ? "Entrando…" : "Entrar no sistema" }}
      </button>
    </form>
  </main>
  <div v-else class="shell">
    <aside :class="['sidebar', { open: menuOpen }]">
      <div class="brand">
        <img class="brand-logo" src="/assets/logo-mavi.png" alt="Mavi" />
        <div><strong>Mavi</strong><small>gestão & produção</small></div>
      </div>
      <nav>
        <button
          v-for="item in nav"
          :key="item.id"
          :class="{ active: tab === item.id }"
          @click="go(item.id)"
        >
          <Icon :name="item.icon" /><span>{{ item.label }}</span>
        </button>
      </nav>
      <div class="sidebar-note">
        <Icon name="lucide:shield-check" />
        <div>
          <strong>{{ roleLabels[user.role] }}</strong
          ><span>{{ user.name }}<br />{{ user.email }}</span>
        </div>
      </div>
    </aside>
    <main>
      <header class="topbar">
        <button class="menu" @click="menuOpen = !menuOpen">
          <Icon name="lucide:menu" />
        </button>
        <div>
          <span class="eyebrow">Mavi Store</span>
          <h1>{{ nav.find((i) => i.id === tab)?.label }}</h1>
        </div>
        <div class="top-actions">
          <span class="status"><i />Sessão protegida</span
          ><button
            class="icon-button"
            title="Editar perfil"
            @click="editProfile"
          >
            <Icon name="lucide:user-round-cog" /></button
          ><button class="icon-button" title="Sair" @click="logout">
            <Icon name="lucide:log-out" />
          </button>
        </div>
      </header>
      <section v-if="tab === 'dashboard'" class="content">
        <div class="hero">
          <div>
            <span class="eyebrow light">Resumo operacional</span>
            <h2>Da ficha técnica ao pedido entregue.</h2>
            <p>
              Controle produção, valores e responsabilidades com histórico
              completo.
            </p>
          </div>
          <button
            v-if="canWriteOrders"
            class="button light-button"
            @click="
              go('orders');
              editOrder();
            "
          >
            <Icon name="lucide:plus" />Novo pedido
          </button>
        </div>
        <div class="metrics">
          <article>
            <span class="metric-icon green"
              ><Icon name="lucide:clipboard-list"
            /></span>
            <div>
              <small>Pedidos ativos</small><strong>{{ orders.length }}</strong
              ><em>em acompanhamento</em>
            </div>
          </article>
          <article>
            <span class="metric-icon ochre"
              ><Icon name="lucide:circle-dollar-sign"
            /></span>
            <div>
              <small>Valor em pedidos</small
              ><strong>{{
                money(orders.reduce((s, o) => s + o.total, 0))
              }}</strong
              ><em>total cadastrado</em>
            </div>
          </article>
          <article>
            <span class="metric-icon blue"
              ><Icon name="lucide:package-check"
            /></span>
            <div>
              <small>Prontos</small
              ><strong>{{
                orders.filter((o) => o.status === "ready").length
              }}</strong
              ><em>aguardando retirada</em>
            </div>
          </article>
          <article>
            <span class="metric-icon coral"
              ><Icon name="lucide:factory"
            /></span>
            <div>
              <small>Em produção</small
              ><strong>{{
                orders.filter((o) => o.status === "in_production").length
              }}</strong
              ><em>pedidos em andamento</em>
            </div>
          </article>
        </div>
        <div class="panel">
          <div class="panel-head">
            <div>
              <span class="eyebrow">Últimos registros</span>
              <h3>Pedidos recentes</h3>
            </div>
            <button class="text-button" @click="go('orders')">
              Ver todos <Icon name="lucide:arrow-right" />
            </button>
          </div>
          <div class="product-list">
            <div
              v-for="o in orders.slice(0, 6)"
              :key="o.id"
              class="product-row"
            >
              <span class="product-avatar">{{ o.orderNumber.slice(-2) }}</span>
              <div class="grow">
                <strong>#{{ o.orderNumber }} · {{ o.customerName }}</strong
                ><small>{{ o.productDescription }}</small>
              </div>
              <div>
                <small>Quantidade</small><strong>{{ o.quantity }}</strong>
              </div>
              <div>
                <small>Total</small><strong>{{ money(o.total) }}</strong>
              </div>
              <span class="profit-pill">{{ statusLabels[o.status] }}</span>
            </div>
            <div v-if="!orders.length" class="empty">
              Nenhum pedido cadastrado ainda.
            </div>
          </div>
        </div>
      </section>
      <section v-else-if="tab === 'orders'" class="content">
        <div class="section-head">
          <div>
            <span class="eyebrow">Produção</span>
            <h2>Pedidos e fichas</h2>
            <p>Cadastre, clone, acompanhe e gere o relatório em PDF.</p>
          </div>
          <div class="head-actions">
            <button
              v-if="orders.length"
              class="button secondary"
              @click="pdf()"
            >
              <Icon name="lucide:file-down" />PDF geral</button
            ><button v-if="canWriteOrders" class="button" @click="editOrder()">
              <Icon name="lucide:plus" />Novo pedido
            </button>
          </div>
        </div>
        <div v-if="canWriteOrders" class="panel bulk-actions">
          <strong>{{ selectedOrders.length }} selecionado(s)</strong
          ><select v-model="bulkAction">
            <option value="">Ação em lote</option>
            <optgroup label="Pedido">
              <option value="status:in_production">Em produção</option>
              <option value="status:ready">Pronto</option>
              <option value="status:delivered">Entregue</option>
              <option value="status:completed">Concluído</option>
              <option value="status:cancelled">Cancelado</option>
            </optgroup>
            <optgroup label="Pagamento">
              <option value="paymentStatus:pending">Pagamento pendente</option>
              <option value="paymentStatus:partial">Pagamento parcial</option>
              <option value="paymentStatus:paid">Pago</option>
              <option value="paymentStatus:refunded">Estornado</option>
            </optgroup></select
          ><button
            class="button"
            :disabled="busy || !selectedOrders.length || !bulkAction"
            @click="applyBulkAction"
          >
            Aplicar
          </button>
        </div>
        <div class="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th v-if="canWriteOrders">
                  <input
                    type="checkbox"
                    :checked="
                      orders.length > 0 &&
                      selectedOrders.length === orders.length
                    "
                    aria-label="Selecionar todos"
                    @change="
                      selectedOrders = ($event.target as HTMLInputElement)
                        .checked
                        ? orders.map((o) => o.id)
                        : []
                    "
                  />
                </th>
                <th>Pedido</th>
                <th>Cliente / Produto</th>
                <th>Data</th>
                <th>Qtd.</th>
                <th>Total</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in orders" :key="o.id">
                <td v-if="canWriteOrders">
                  <input
                    v-model="selectedOrders"
                    type="checkbox"
                    :value="o.id"
                    :aria-label="`Selecionar pedido ${o.orderNumber}`"
                  />
                </td>
                <td>
                  <strong>#{{ o.orderNumber }}</strong
                  ><small>{{ o.orderType }}</small>
                </td>
                <td>
                  <strong>{{ o.customerName }}</strong
                  ><small>{{ o.productDescription }}</small>
                </td>
                <td>{{ brDate(o.orderDate) }}</td>
                <td>{{ o.quantity }}</td>
                <td>
                  <strong>{{ money(o.total) }}</strong>
                </td>
                <td>
                  <span
                    :class="[
                      'status-badge',
                      o.paymentStatus === 'paid'
                        ? 'ready'
                        : o.paymentStatus === 'refunded'
                          ? 'cancelled'
                          : 'pending',
                    ]"
                    >{{ paymentStatusLabels[o.paymentStatus] }}</span
                  >
                </td>
                <td>
                  <span :class="['status-badge', o.status]">{{
                    statusLabels[o.status]
                  }}</span>
                </td>
                <td class="actions">
                  <button class="tiny-button" title="PDF" @click="pdf(o)">
                    <Icon name="lucide:file-text" /></button
                  ><button
                    v-if="canWriteOrders"
                    class="tiny-button"
                    title="Editar"
                    @click="editOrder(o)"
                  >
                    <Icon name="lucide:pencil" /></button
                  ><button
                    v-if="canWriteOrders"
                    class="tiny-button"
                    title="Clonar"
                    @click="cloneOrder(o)"
                  >
                    <Icon name="lucide:copy" /></button
                  ><button
                    v-if="['admin', 'manager'].includes(user.role)"
                    class="tiny-button danger-text"
                    title="Excluir"
                    @click="deleteOrder(o)"
                  >
                    <Icon name="lucide:trash-2" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section v-else-if="tab === 'customers'" class="content">
        <div class="section-head">
          <div>
            <span class="eyebrow">Relacionamento</span>
            <h2>Clientes</h2>
            <p>Gerencie os clientes disponíveis para os pedidos.</p>
          </div>
          <button v-if="canWriteOrders" class="button" @click="editCustomer()">
            <Icon name="lucide:plus" />Novo cliente
          </button>
        </div>
        <div class="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Apelido</th>
                <th>Telefone</th>
                <th>Preço base/mínimo</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="customer in customers" :key="customer.id">
                <td>
                  <strong>{{ customer.name }}</strong>
                </td>
                <td>{{ customer.nickname || "—" }}</td>
                <td>{{ customer.phone || "—" }}</td>
                <td>
                  <span
                    :class="[
                      'status-badge',
                      customer.active ? 'ready' : 'cancelled',
                    ]"
                    >{{ customer.active ? "Ativo" : "Inativo" }}</span
                  >
                </td>
                <td>
                  <button
                    v-if="canWriteOrders"
                    class="tiny-button"
                    title="Editar"
                    @click="editCustomer(customer)"
                  >
                    <Icon name="lucide:pencil" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="!customers.length" class="empty">
            Nenhum cliente cadastrado.
          </div>
        </div>
      </section>
      <section v-else-if="tab === 'products'" class="content">
        <div class="section-head">
          <div>
            <span class="eyebrow">Fichas técnicas</span>
            <h2>Produtos e margens</h2>
            <p>Custos recalculados a partir dos insumos.</p>
          </div>
          <label class="category-filter"
            >Categoria<select v-model="productCategory">
              <option value="">Todas as categorias</option>
              <option
                v-for="category in productCategories"
                :key="category"
                :value="category"
              >
                {{ category }}
              </option>
            </select></label
          >
        </div>
        <div v-if="filteredProducts.length" class="cards-grid">
          <article
            v-for="p in filteredProducts"
            :key="p.id"
            class="product-card"
          >
            <div class="card-top">
              <span class="category">{{ p.category }}</span>
            </div>
            <h3>{{ p.name }}</h3>
            <p>{{ p.color || "Sem cor" }} · {{ p.sku || "Sem SKU" }}</p>
            <div class="cost-line">
              <span>Custo de produção</span
              ><strong>{{ money(p.productionCost) }}</strong>
            </div>
            <div class="card-prices">
              <div>
                <small>Preço mínimo</small
                ><strong>{{ money(p.minimumPrice) }}</strong>
              </div>
              <div>
                <small>Preço atual</small
                ><strong>{{ money(p.currentPrice) }}</strong>
              </div>
            </div>
            <div
              :class="[
                'margin-bar',
                { low: p.currentProfit < p.expectedProfit },
              ]"
            >
              <Icon name="lucide:trending-up" /><span>Lucro atual</span
              ><strong>{{ money(p.currentProfit) }}</strong>
            </div>
          </article>
        </div>
        <div v-else class="panel empty">
          Nenhum produto encontrado nesta categoria.
        </div>
      </section>
      <section v-else-if="tab === 'materials'" class="content">
        <div class="section-head">
          <div>
            <span class="eyebrow">Base de custos</span>
            <h2>Insumos e fornecedores</h2>
            <p>Preço da compra, rendimento e custo unitário.</p>
          </div>
          <button class="button" @click="editMaterial()">
            <Icon name="lucide:plus" />Novo insumo
          </button>
        </div>
        <div class="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Fornecedor</th>
                <th>Compra</th>
                <th>Rendimento</th>
                <th>Custo unitário</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in materials" :key="m.id">
                <td>
                  <strong>{{ m.name }}</strong>
                </td>
                <td>{{ m.supplier || "—" }}</td>
                <td>{{ money(m.purchasePrice) }}</td>
                <td>{{ m.purchaseQuantity }} {{ m.unit }}</td>
                <td>
                  <strong>{{ money(m.unitCost) }} / {{ m.unit }}</strong>
                </td>
                <td>
                  <button class="tiny-button" @click="editMaterial(m)">
                    <Icon name="lucide:pencil" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section v-else-if="tab === 'parameters'" class="content">
        <div class="section-head">
          <div>
            <span class="eyebrow">Cadastros auxiliares</span>
            <h2>Parametrização</h2>
            <p>
              Central para tipos de serviço e futuras configurações
              operacionais.
            </p>
          </div>
          <button
            v-if="parameterTab === 'services'"
            class="button"
            @click="editServiceType()"
          >
            <Icon name="lucide:plus" />Novo tipo de serviço
          </button>
        </div>
        <div
          class="parameter-tabs"
          role="tablist"
          aria-label="Seções de parametrização"
        >
          <button
            :class="{ active: parameterTab === 'services' }"
            @click="parameterTab = 'services'"
          >
            <Icon name="lucide:wrench" />Tipos de serviço
          </button>
          <button
            :class="{ active: parameterTab === 'pricing' }"
            @click="parameterTab = 'pricing'"
          >
            <Icon name="lucide:calculator" />Precificação
          </button>
        </div>
        <div v-if="parameterTab === 'services'" class="panel table-wrap">
          <div class="panel-head">
            <div>
              <span class="eyebrow">Pedidos</span>
              <h3>Tipos de serviço</h3>
            </div>
            <Icon name="lucide:wrench" class="panel-icon" />
          </div>
          <table>
            <thead>
              <tr>
                <th>Tipo de serviço</th>
                <th>Preço base/mínimo</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="serviceType in serviceTypes" :key="serviceType.id">
                <td>
                  <strong>{{ serviceType.name }}</strong>
                </td>
                <td>
                  <strong>{{ money(serviceType.basePrice) }}</strong>
                </td>
                <td>
                  <span
                    :class="[
                      'status-badge',
                      serviceType.active ? 'ready' : 'cancelled',
                    ]"
                    >{{ serviceType.active ? "Ativo" : "Inativo" }}</span
                  >
                </td>
                <td>
                  <button
                    class="tiny-button"
                    title="Editar"
                    @click="editServiceType(serviceType)"
                  >
                    <Icon name="lucide:pencil" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="!serviceTypes.length" class="empty">
            Nenhum tipo de serviço cadastrado.
          </div>
        </div>
        <form
          v-else-if="settings"
          class="panel form-panel settings-single"
          @submit.prevent="saveSettings"
        >
          <div class="panel-head">
            <div>
              <span class="eyebrow">Precificação</span>
              <h3>Canal e lucro alvo</h3>
            </div>
            <Icon name="lucide:calculator" class="panel-icon" />
          </div>
          <label
            >Canal padrão<select v-model.number="settings.defaultChannelId">
              <option v-for="c in channels" :key="c.id" :value="c.id">
                {{ c.name }} — {{ (c.percentageFee * 100).toFixed(0) }}% +
                {{ money(c.fixedFee) }}
              </option>
            </select></label
          >
          <label
            >Lucro desejado<input
              :value="money(settings.targetProfit)"
              type="text"
              inputmode="numeric"
              @input="currencyInput($event, settings, 'targetProfit')"
          /></label>
          <button class="button">Salvar regra</button>
        </form>
      </section>
      <section v-else-if="tab === 'users'" class="content">
        <div class="section-head">
          <div>
            <span class="eyebrow">Acesso e permissões</span>
            <h2>Usuários e perfis</h2>
            <p>Somente administradores podem conceder acesso.</p>
          </div>
          <button class="button" @click="editUser()">
            <Icon name="lucide:user-plus" />Novo usuário
          </button>
        </div>
        <div class="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Último acesso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td>
                  <strong>{{ u.name }}</strong
                  ><small>{{ u.email }}</small>
                </td>
                <td>{{ roleLabels[u.role] }}</td>
                <td>
                  <span
                    :class="['status-badge', u.active ? 'ready' : 'cancelled']"
                    >{{ u.active ? "Ativo" : "Inativo" }}</span
                  >
                </td>
                <td>{{ u.lastLoginAt ? brDate(u.lastLoginAt) : "Nunca" }}</td>
                <td class="actions">
                  <button class="tiny-button" @click="editUser(u)">
                    <Icon name="lucide:pencil" /></button
                  ><button
                    v-if="u.id !== user.id"
                    class="tiny-button danger-text"
                    @click="deleteUser(u)"
                  >
                    <Icon name="lucide:trash-2" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="permissions panel">
          <h3>Permissões por perfil</h3>
          <div>
            <strong>Administrador</strong
            ><span>Acesso total, usuários e auditoria.</span
            ><strong>Gestor</strong
            ><span>Custos, pedidos, PDFs e auditoria.</span
            ><strong>Operador</strong
            ><span>Cria e atualiza pedidos e PDFs.</span
            ><strong>Consulta</strong
            ><span>Visualização de pedidos e auditoria.</span>
          </div>
        </div>
      </section>
      <section v-else-if="tab === 'audit'" class="content">
        <div class="section-head">
          <div>
            <span class="eyebrow">Rastreabilidade</span>
            <h2>Registros de auditoria</h2>
            <p>
              {{ auditData.total }} ações registradas. Logs são imutáveis pela
              interface.
            </p>
          </div>
          <button class="button secondary" @click="loadAudit">
            <Icon name="lucide:refresh-cw" />Atualizar
          </button>
        </div>
        <div class="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Entidade</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in auditData.items" :key="log.id">
                <td>{{ brDateTime(log.createdAt) }}</td>
                <td>
                  <strong>{{ log.userName || "Sistema" }}</strong>
                </td>
                <td>
                  <span class="audit-action">{{ log.action }}</span>
                </td>
                <td>
                  {{ log.entity }}
                  <small v-if="log.entityId">#{{ log.entityId }}</small>
                </td>
                <td>{{ log.ipAddress || "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
    <div
      v-if="
        orderModal ||
        customerModal ||
        serviceTypeModal ||
        userModal ||
        materialModal ||
        profileModal ||
        changeModal
      "
      class="modal-backdrop"
      @click.self="
        !changeModal &&
        (orderModal =
          customerModal =
          serviceTypeModal =
          userModal =
          materialModal =
          profileModal =
            false)
      "
    >
      <form v-if="orderModal" class="modal wide" @submit.prevent="saveOrder">
        <div class="modal-head">
          <div>
            <span class="eyebrow">Pedido</span>
            <h2>{{ orderForm.id ? "Editar pedido" : "Novo pedido" }}</h2>
          </div>
          <button type="button" class="tiny-button" @click="orderModal = false">
            <Icon name="lucide:x" />
          </button>
        </div>
        <div class="three-cols">
          <label>Número<input v-model="orderForm.orderNumber" required /></label
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
                v-for="serviceType in activeServiceTypes"
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
              required /></label
          ><label>Prazo<input v-model="orderForm.dueDate" type="date" /></label
          ><label
            >Status<select v-model="orderForm.status">
              <option
                v-for="(label, key) in statusLabels"
                :key="key"
                :value="key"
              >
                {{ label }}
              </option>
            </select></label
          >
        </div>
        <div class="three-cols">
          <label
            >Quantidade<input
              v-model.number="orderForm.quantity"
              type="number"
              min=".01"
              step=".01"
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
              @input="currencyInput($event, orderForm, 'paidAmount')"
          /></label>
        </div>
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
        <div class="components-head">
          <div>
            <span class="eyebrow">Grade</span>
            <h3>Tamanhos e quantidades</h3>
          </div>
          <button type="button" class="text-button" @click="addSize">
            <Icon name="lucide:plus" />Adicionar
          </button>
        </div>
        <div v-if="orderForm.sizes.length" class="size-grid">
          <div v-for="(s, i) in orderForm.sizes" :key="i">
            <input v-model="s.size" placeholder="Tamanho" /><input
              v-model.number="s.quantity"
              type="number"
              min="1"
              placeholder="Qtd."
            /><button
              type="button"
              class="tiny-button danger-text"
              @click="orderForm.sizes.splice(i, 1)"
            >
              <Icon name="lucide:x" />
            </button>
          </div>
        </div>
        <div class="two-cols">
          <label
            >Data da retirada<input
              v-model="orderForm.withdrawalDate"
              type="date" /></label
          ><label>Quem retirou<input v-model="orderForm.withdrawnBy" /></label>
        </div>
        <label
          >Observações<textarea v-model="orderForm.notes" rows="3"></textarea>
        </label>
        <div class="product-total">
          <span>Total do pedido</span
          ><strong>{{
            money(orderForm.quantity * orderForm.unitPrice)
          }}</strong>
        </div>
        <div class="modal-actions">
          <button
            type="button"
            class="button ghost"
            @click="orderModal = false"
          >
            Cancelar</button
          ><button
            class="button"
            :disabled="
              busy || !activeCustomers.length || !activeServiceTypes.length
            "
          >
            Salvar pedido
          </button>
        </div>
      </form>
      <form
        v-else-if="customerModal"
        class="modal"
        @submit.prevent="saveCustomer"
      >
        <div class="modal-head">
          <div>
            <span class="eyebrow">Clientes</span>
            <h2>{{ customerForm.id ? "Editar cliente" : "Novo cliente" }}</h2>
          </div>
          <button
            type="button"
            class="tiny-button"
            @click="customerModal = false"
          >
            <Icon name="lucide:x" />
          </button>
        </div>
        <label
          >Nome<input
            v-model="customerForm.name"
            maxlength="160"
            required /></label
        ><label
          >Apelido<input
            v-model="customerForm.nickname"
            maxlength="100" /></label
        ><label
          >Telefone<input
            :value="customerForm.phone"
            type="tel"
            inputmode="numeric"
            maxlength="15"
            placeholder="(11)9 1234-5678"
            @input="phoneInput" /></label
        ><label class="check"
          ><input v-model="customerForm.active" type="checkbox" />Cliente
          ativo</label
        >
        <div class="modal-actions">
          <button
            type="button"
            class="button ghost"
            @click="customerModal = false"
          >
            Cancelar</button
          ><button class="button" :disabled="busy">Salvar cliente</button>
        </div>
      </form>
      <form
        v-else-if="serviceTypeModal"
        class="modal"
        @submit.prevent="saveServiceType"
      >
        <div class="modal-head">
          <div>
            <span class="eyebrow">Parametrização</span>
            <h2>
              {{ serviceTypeForm.id ? "Editar tipo" : "Novo tipo de serviço" }}
            </h2>
          </div>
          <button
            type="button"
            class="tiny-button"
            @click="serviceTypeModal = false"
          >
            <Icon name="lucide:x" />
          </button>
        </div>
        <label
          >Nome<input
            v-model="serviceTypeForm.name"
            maxlength="100"
            required /></label
        ><label
          >Preço base/mínimo<input
            :value="money(serviceTypeForm.basePrice)"
            type="text"
            inputmode="numeric"
            required
            @input="
              currencyInput($event, serviceTypeForm, 'basePrice')
            " /></label
        ><label class="check"
          ><input v-model="serviceTypeForm.active" type="checkbox" />Tipo de
          serviço ativo</label
        >
        <div class="modal-actions">
          <button
            type="button"
            class="button ghost"
            @click="serviceTypeModal = false"
          >
            Cancelar</button
          ><button class="button" :disabled="busy">Salvar tipo</button>
        </div>
      </form>
      <form v-else-if="userModal" class="modal" @submit.prevent="saveUser">
        <div class="modal-head">
          <div>
            <span class="eyebrow">Acesso</span>
            <h2>{{ userForm.id ? "Editar usuário" : "Novo usuário" }}</h2>
          </div>
          <button type="button" class="tiny-button" @click="userModal = false">
            <Icon name="lucide:x" />
          </button>
        </div>
        <label>Nome<input v-model="userForm.name" required /></label
        ><label
          >E-mail<input v-model="userForm.email" type="email" required /></label
        ><label
          >Perfil<select v-model="userForm.role">
            <option v-for="(label, key) in roleLabels" :key="key" :value="key">
              {{ label }}
            </option>
          </select></label
        ><label
          >{{ userForm.id ? "Nova senha (opcional)" : "Senha temporária"
          }}<span class="password-field"
            ><input
              v-model="userForm.password"
              :type="passwordVisible.user ? 'text' : 'password'"
              :required="!userForm.id"
              minlength="12" /><button
              type="button"
              :aria-label="
                passwordVisible.user ? 'Ocultar senha' : 'Mostrar senha'
              "
              @click="passwordVisible.user = !passwordVisible.user"
            ></button></span
          ><small
            >Mínimo de 12 caracteres. O usuário deverá trocá-la no primeiro
            acesso.</small
          ></label
        ><label v-if="userForm.id" class="check"
          ><input v-model="userForm.active" type="checkbox" />Usuário
          ativo</label
        >
        <div class="modal-actions">
          <button type="button" class="button ghost" @click="userModal = false">
            Cancelar</button
          ><button class="button">Salvar usuário</button>
        </div>
      </form>
      <form
        v-else-if="profileModal"
        class="modal profile-modal"
        @submit.prevent="saveProfile"
      >
        <div class="modal-head">
          <div>
            <span class="eyebrow">Minha conta</span>
            <h2>Editar perfil</h2>
          </div>
          <button
            type="button"
            class="tiny-button"
            @click="profileModal = false"
          >
            <Icon name="lucide:x" />
          </button>
        </div>
        <label
          >Nome<input
            v-model="profileForm.name"
            minlength="2"
            maxlength="140"
            required /></label
        ><label
          >E-mail<input
            v-model="profileForm.email"
            type="email"
            maxlength="200"
            required
        /></label>
        <div class="profile-role">
          <span>Perfil de acesso</span
          ><strong>{{ roleLabels[user?.role || "viewer"] }}</strong>
        </div>
        <div class="modal-actions">
          <button
            type="button"
            class="button ghost"
            @click="profileModal = false"
          >
            Cancelar</button
          ><button class="button" :disabled="busy">Salvar perfil</button>
        </div>
      </form>
      <form
        v-else-if="materialModal"
        class="modal"
        @submit.prevent="saveMaterial"
      >
        <div class="modal-head">
          <div>
            <span class="eyebrow">Custos</span>
            <h2>{{ materialForm.id ? "Editar insumo" : "Novo insumo" }}</h2>
          </div>
          <button
            type="button"
            class="tiny-button"
            @click="materialModal = false"
          >
            <Icon name="lucide:x" />
          </button>
        </div>
        <label>Nome<input v-model="materialForm.name" required /></label
        ><label>Fornecedor<input v-model="materialForm.supplier" /></label>
        <div class="three-cols">
          <label
            >Preço<input
              :value="money(materialForm.purchasePrice)"
              type="text"
              inputmode="numeric"
              @input="
                currencyInput($event, materialForm, 'purchasePrice')
              " /></label
          ><label
            >Rendimento<input
              v-model.number="materialForm.purchaseQuantity"
              type="number"
              min=".0001"
              step=".0001" /></label
          ><label
            >Unidade<select v-model="materialForm.unit">
              <option>UN</option>
              <option>PAR</option>
              <option>MT</option>
              <option>KG</option>
              <option>PCT</option>
            </select></label
          >
        </div>
        <div class="modal-actions">
          <button
            type="button"
            class="button ghost"
            @click="materialModal = false"
          >
            Cancelar</button
          ><button class="button">Salvar</button>
        </div>
      </form>
      <form v-else class="modal secure-modal" @submit.prevent="changePassword">
        <img src="/assets/logo-mavi.png" alt="Mavi" /><span
          class="eyebrow first-access-label"
          >Primeiro acesso</span
        >
        <h2>Defina sua senha pessoal</h2>
        <p>Por segurança, a senha temporária precisa ser substituída.</p>
        <label
          >Senha atual<span class="password-field"
            ><input
              v-model="changeForm.currentPassword"
              :type="passwordVisible.current ? 'text' : 'password'"
              required /><button
              type="button"
              :aria-label="
                passwordVisible.current ? 'Ocultar senha' : 'Mostrar senha'
              "
              @click="passwordVisible.current = !passwordVisible.current"
            ></button></span></label
        ><label
          >Nova senha<span class="password-field"
            ><input
              v-model="changeForm.newPassword"
              :type="passwordVisible.newPassword ? 'text' : 'password'"
              minlength="12"
              required /><button
              type="button"
              :aria-label="
                passwordVisible.newPassword ? 'Ocultar senha' : 'Mostrar senha'
              "
              @click="
                passwordVisible.newPassword = !passwordVisible.newPassword
              "
            ></button></span></label
        ><label
          >Confirme a nova senha<span class="password-field"
            ><input
              v-model="changeForm.confirmPassword"
              :type="passwordVisible.confirm ? 'text' : 'password'"
              minlength="12"
              required /><button
              type="button"
              :aria-label="
                passwordVisible.confirm ? 'Ocultar senha' : 'Mostrar senha'
              "
              @click="passwordVisible.confirm = !passwordVisible.confirm"
            ></button></span
        ></label>
        <div class="password-rules" aria-live="polite">
          <span :class="{ valid: passwordRules.length }"
            ><i />12 caracteres ou mais</span
          ><span :class="{ valid: passwordRules.upper }"
            ><i />Uma letra maiúscula</span
          ><span :class="{ valid: passwordRules.lower }"
            ><i />Uma letra minúscula</span
          ><span :class="{ valid: passwordRules.number }"><i />Um número</span
          ><span :class="{ valid: passwordRules.special }"
            ><i />Um caractere especial</span
          ><span :class="{ valid: passwordRules.match }"
            ><i />As senhas são iguais</span
          >
        </div>
        <button class="button" :disabled="busy || !passwordValid">
          Salvar senha
        </button>
      </form>
    </div>
    <Transition name="toast"
      ><div v-if="notice" class="toast">
        <Icon name="lucide:info" />{{ notice }}
      </div></Transition
    >
  </div>
</template>
