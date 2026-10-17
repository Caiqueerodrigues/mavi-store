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
  route = useRoute(),
  router = useRouter(),
  routeTabs: Record<string, string> = {
    "/visao-geral": "dashboard",
    "/pedidos": "orders",
    "/clientes": "customers",
    "/produtos": "products",
    "/insumos": "materials",
    "/parametrizacao/servicos": "parameters",
    "/parametrizacao/precificacao": "parameters",
    "/usuarios": "users",
    "/auditoria": "audit",
  },
  tab = ref(routeTabs[route.path] || "dashboard"),
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
const tablePages = reactive<Record<string, { offset: number; total: number; loading: boolean }>>({});
const tablePageSize = 50;
async function fetchTablePage<T>(key: string, url: string, getRows: () => T[], setRows: (rows: T[]) => void, reset = false) {
  const state = tablePages[key] ||= { offset: 0, total: 0, loading: false };
  if (state.loading || (!reset && state.offset >= state.total && state.total > 0)) return;
  if (reset) { state.offset = 0; state.total = 0; }
  state.loading = true;
  try {
    const params = new URLSearchParams(url.includes("?") ? url.slice(url.indexOf("?") + 1) : "");
    params.set("limit", String(tablePageSize));
    params.set("offset", String(state.offset));
    const path = url.split("?")[0];
    const page = await api<{ items: T[]; total: number; offset: number }>(`${path}?${params}`);
    setRows(reset ? page.items : [...getRows(), ...page.items]);
    state.offset = page.offset + page.items.length;
    state.total = page.total;
  } finally { state.loading = false; }
}
function tableScroll(key: string, event: Event, load: () => Promise<void>) {
  const el = event.currentTarget as HTMLElement;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 240) void load();
}
function loadNextTable(key: string) {
  const requests: Record<string, () => Promise<void>> = {
    orders: () => fetchTablePage("orders", `/api/orders?${new URLSearchParams(orderFilters)}`, () => orders.value, (v) => (orders.value = v)),
    customers: () => fetchTablePage("customers", "/api/customers", () => customers.value, (v) => (customers.value = v)),
    materials: () => fetchTablePage("materials", "/api/materials", () => materials.value, (v) => (materials.value = v)),
    serviceTypes: () => fetchTablePage("serviceTypes", "/api/service-types", () => serviceTypes.value, (v) => (serviceTypes.value = v)),
    channels: () => fetchTablePage("channels", "/api/channels", () => channels.value, (v) => (channels.value = v)),
    users: () => fetchTablePage("users", "/api/users", () => users.value, (v) => (users.value = v)),
    audit: () => loadAuditPage(false),
  };
  return requests[key]?.() || Promise.resolve();
}
const dashboardFilters = reactive({ from: "", to: "" }),
  orderFilters = reactive({ from: "", to: "", status: "", paymentStatus: "" });
const productCategory = ref(""),
  parameterTab = ref<"services" | "pricing">(
    route.path.endsWith("/precificacao") ? "pricing" : "services",
  ),
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
  if (value) {
    serverTime.value = value;
    const today = value.slice(0, 10);
    if (!dashboardFilters.from) dashboardFilters.from = `${today.slice(0, 7)}-01`;
    if (!dashboardFilters.to) dashboardFilters.to = today;
    if (!orderFilters.from) orderFilters.from = today;
    if (!orderFilters.to) orderFilters.to = today;
  }
}
function openDatePicker(event: Event) {
  (event.currentTarget as HTMLInputElement).showPicker?.();
}
function forceLogin(message = "Sua sessão expirou. Entre novamente.") {
  user.value = null;
  changeModal.value = false;
  tab.value = "dashboard";
  router.replace("/login");
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
type ConfirmationRequest = {
  title: string;
  message: string;
  confirmLabel: string;
};
const confirmation = ref<ConfirmationRequest | null>(null);
let resolveConfirmation: ((confirmed: boolean) => void) | null = null;
function confirmInModal(message: string, title: string, confirmLabel = "Confirmar") {
  return new Promise<boolean>((resolve) => {
    resolveConfirmation = resolve;
    confirmation.value = { title, message, confirmLabel };
  });
}
function settleConfirmation(confirmed: boolean) {
  const resolve = resolveConfirmation;
  resolveConfirmation = null;
  confirmation.value = null;
  resolve?.(confirmed);
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
    loadDashboard(),
    loadOrders(),
    fetchTablePage("customers", "/api/customers", () => customers.value, (v) => (customers.value = v), true),
    fetchTablePage("serviceTypes", "/api/service-types", () => serviceTypes.value, (v) => (serviceTypes.value = v), true),
  ];
  if (canCosts.value)
    jobs.push(
      api<Product[]>("/api/products").then((v) => (products.value = v)),
      fetchTablePage("materials", "/api/materials", () => materials.value, (v) => (materials.value = v), true),
      fetchTablePage("channels", "/api/channels", () => channels.value, (v) => (channels.value = v), true),
      api("/api/settings").then((v) => (settings.value = v)),
    );
  if (user.value?.role === "admin")
    jobs.push(fetchTablePage("users", "/api/users", () => users.value, (v) => (users.value = v), true));
  if (canAudit.value)
    jobs.push(loadAudit(true));
  await Promise.all(jobs);
}
async function loadDashboard() {
  dashboard.value = await api(`/api/dashboard?${new URLSearchParams(dashboardFilters).toString()}`);
}
async function loadOrders() {
  await fetchTablePage("orders", `/api/orders?${new URLSearchParams(orderFilters).toString()}`, () => orders.value, (v) => (orders.value = v), true);
  selectedOrders.value = [];
}
async function resetOrderFilters() {
  const today = serverTime.value.slice(0, 10);
  Object.assign(orderFilters, { from: today, to: today, status: "", paymentStatus: "" });
  await loadOrders();
}
onMounted(async () => {
  try {
    const data = await api<{ user: User }>("/api/auth/me");
    user.value = data.user;
    ensureAccessibleRoute();
    changeModal.value = data.user.mustChangePassword;
    if (!data.user.mustChangePassword) await loadAll();
  } catch {
    await loadRememberedLogin();
    if (route.path !== "/login") router.replace("/login");
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
    ensureAccessibleRoute();
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
    await loadRememberedLogin();
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
    if (rememberLogin.value) {
      loginForm.password = changeForm.newPassword;
      await saveRememberedLogin();
    }
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
  const path = Object.entries(routeTabs).find(([, section]) => section === id)?.[0];
  if (path && path !== route.path) router.push(path);
  menuOpen.value = false;
  if (id === "audit") loadAudit();
}
function goParameterTab(section: "services" | "pricing") {
  parameterTab.value = section;
  router.push(
    section === "pricing"
      ? "/parametrizacao/precificacao"
      : "/parametrizacao/servicos",
  );
}
function ensureAccessibleRoute() {
  if (route.path === "/login") {
    tab.value = "dashboard";
    router.replace("/visao-geral");
    return;
  }
  const section = routeTabs[route.path] || "dashboard";
  if (!nav.value.some((item) => item.id === section)) {
    tab.value = "dashboard";
    router.replace("/visao-geral");
  }
}
watch(
  () => route.path,
  (path) => {
    if (path === "/login") {
      if (user.value) router.replace("/visao-geral");
      return;
    }
    const section = routeTabs[path];
    if (!section) return;
    if (user.value && !nav.value.some((item) => item.id === section)) {
      tab.value = "dashboard";
      router.replace("/visao-geral");
      return;
    }
    tab.value = section;
    if (path === "/parametrizacao/precificacao") parameterTab.value = "pricing";
    if (path === "/parametrizacao/servicos") parameterTab.value = "services";
  },
);
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
const gradeQuantity = computed(() =>
    orderForm.sizes.reduce((sum: number, item: SizeItem) => sum + Number(item.quantity || 0), 0),
  ),
  gradeMatchesQuantity = computed(
    () => Math.abs(gradeQuantity.value - Number(orderForm.quantity || 0)) < 0.0001,
  ),
  dashboardServiceMax = computed(() =>
    Math.max(1, ...(dashboard.value?.byService || []).map((item: any) => Number(item.total))),
  ),
  dashboardStatusMax = computed(() =>
    Math.max(1, ...(dashboard.value?.statuses || []).map((item: any) => Number(item.total))),
  );
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
    if (route.path !== "/pedidos") await router.push("/pedidos");
    tab.value = "orders";
    await Promise.all([loadOrders(), loadDashboard()]);
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
    await api("/api/orders/bulk-status", {
      method: "PUT",
      body:
        kind === "status"
          ? { ids: selectedOrders.value, status: value }
          : { ids: selectedOrders.value, paymentStatus: value },
    });
    selectedOrders.value = [];
    bulkAction.value = "";
    await Promise.all([loadOrders(), loadDashboard()]);
    toast("Pedidos atualizados em lote.");
  } catch (e: any) {
    toast(e?.data?.statusMessage || "Não foi possível atualizar os pedidos");
  } finally {
    busy.value = false;
  }
}
async function cloneOrder(item: Order) {
  if (!(await confirmInModal(`Deseja criar uma cópia do pedido ${item.orderNumber} para ${item.customerName}?`, "Clonar pedido", "Clonar pedido"))) return;
  busy.value = true;
  try {
    await api(`/api/orders/${item.id}/clone`, { method: "POST" });
    if (route.path !== "/pedidos") await router.push("/pedidos");
    tab.value = "orders";
    await Promise.all([loadOrders(), loadDashboard()]);
    toast("Pedido clonado.");
  } catch (e: any) {
    toast(e?.data?.statusMessage || "Não foi possível clonar o pedido.");
  } finally {
    busy.value = false;
  }
}
async function deleteOrder(item: Order) {
  if (!(await confirmInModal(`Deseja excluir o pedido ${item.orderNumber} (ID ${item.id}) do cliente ${item.customerName}? O histórico será preservado.`, "Excluir pedido", "Excluir pedido"))) return;
  await api(`/api/orders/${item.id}`, { method: "DELETE" });
  await Promise.all([loadOrders(), loadDashboard()]);
  toast("Pedido removido. O histórico foi preservado.");
}
async function pdf(item?: Order, selectedIds: number[] = []) {
  const ids = selectedIds.length ? selectedIds : item ? [item.id] : [];
  if (ids.length > 500) {
    toast("Selecione no máximo 500 pedidos por PDF.");
    return;
  }
  const url = ids.length
    ? `/api/orders/report.pdf?ids=${ids.join(",")}`
    : "/api/orders/report.pdf";
  const pdfWindow = window.open("about:blank", "_blank");
  if (!pdfWindow) {
    toast("Permita a abertura de uma nova aba para gerar o PDF.");
    return;
  }
  pdfWindow.opener = null;
  let response: Response;
  try {
    response = await fetch(url, { credentials: "include" });
  } catch {
    pdfWindow.close();
    toast("Não foi possível gerar o PDF.");
    return;
  }
  if (response.status === 401 || response.status === 403) {
    try {
      await $fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "x-csrf-token": csrf() },
        credentials: "include",
      });
      response = await fetch(url, { credentials: "include" });
    } catch {
      pdfWindow.close();
      forceLogin();
      return;
    }
  }
  if (!response.ok) {
    pdfWindow.close();
    if (response.status === 401 || response.status === 403) forceLogin();
    else toast("Não foi possível gerar o PDF.");
    return;
  }
  const blob = await response.blob(),
    href = URL.createObjectURL(blob);
  pdfWindow.location.href = href;
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
    await fetchTablePage("users", "/api/users", () => users.value, (v) => (users.value = v), true);
    await loadAudit();
    toast("Usuário salvo.");
  } catch (e: any) {
    toast(e?.data?.statusMessage || "Não foi possível salvar o usuário");
  } finally {
    busy.value = false;
  }
}
async function deleteUser(item: User) {
  if (!(await confirmInModal(`Excluir ${item.name}?`, "Excluir usuário", "Excluir usuário"))) return;
  await api(`/api/users/${item.id}`, { method: "DELETE" });
  await fetchTablePage("users", "/api/users", () => users.value, (v) => (users.value = v), true);
  toast("Usuário removido.");
}
async function loadAudit(reset = true) {
  if (!canAudit.value) return;
  if (!reset) return loadAuditPage(false);
  const state = tablePages.audit ||= { offset: 0, total: 0, loading: false };
  state.offset = 0;
  state.total = 0;
  auditData.value = { items: [], total: 0 };
  await loadAuditPage(true);
}
async function loadAuditPage(reset = false) {
  if (!canAudit.value) return;
  const state = tablePages.audit ||= { offset: 0, total: 0, loading: false };
  if (state.loading || (!reset && state.offset >= state.total && state.total > 0)) return;
  state.loading = true;
  try {
    const pageNumber = Math.floor(state.offset / tablePageSize) + 1;
    const page = await api<any>(`/api/audit?page=${pageNumber}`);
    auditData.value = { ...page, items: reset ? page.items : [...auditData.value.items, ...page.items] };
    state.offset = pageNumber * page.limit;
    state.total = page.total;
  } finally { state.loading = false; }
}
function auditDetails(details: unknown) {
  if (!details || (typeof details === "object" && !Object.keys(details).length)) return "—";
  return JSON.stringify(details, null, 2);
}
async function copyAuditDetails(details: unknown) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(details ?? {}, null, 2));
    toast("Detalhes copiados.");
  } catch {
    toast("Não foi possível copiar os detalhes.");
  }
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
  await fetchTablePage("materials", "/api/materials", () => materials.value, (v) => (materials.value = v), true);
  dashboard.value = await api("/api/dashboard");
  toast("Insumo salvo.");
}
const productModal = ref(false),
  productForm = reactive<any>({
    id: 0,
    name: "",
    sku: "",
    category: "",
    color: "",
    currentPrice: 0,
    components: [],
  });
const productCostPreview = computed(() =>
  productForm.components.reduce((total: number, component: any) => {
    const material = materials.value.find((item) => item.id === component.materialId);
    return total + (material?.unitCost || 0) * component.quantity * (1 + component.wastePercent / 100);
  }, 0),
);
function addProductComponent() {
  productForm.components.push({ materialId: null, quantity: 1, wastePercent: 0 });
}
function editProduct(item?: Product) {
  Object.assign(
    productForm,
    item
      ? {
          id: item.id,
          name: item.name,
          sku: item.sku || "",
          category: item.category,
          color: item.color || "",
          currentPrice: item.currentPrice,
          components: item.components.map((component) => ({
            materialId: component.materialId,
            quantity: component.quantity,
            wastePercent: component.wastePercent * 100,
          })),
        }
      : {
          id: 0,
          name: "",
          sku: "",
          category: "",
          color: "",
          currentPrice: 0,
          components: [{ materialId: null, quantity: 1, wastePercent: 0 }],
        },
  );
  productModal.value = true;
}
async function saveProduct() {
  busy.value = true;
  try {
    await api(productForm.id ? `/api/products/${productForm.id}` : "/api/products", {
      method: productForm.id ? "PUT" : "POST",
      body: {
        ...productForm,
        components: productForm.components.map((component: any) => ({
          ...component,
          wastePercent: component.wastePercent / 100,
        })),
      },
    });
    productModal.value = false;
    products.value = await api("/api/products");
    dashboard.value = await api("/api/dashboard");
    toast("Produto salvo.");
  } catch (e: any) {
    toast(e?.data?.statusMessage || "Não foi possível salvar o produto");
  } finally {
    busy.value = false;
  }
}
async function saveSettings() {
  await api("/api/settings", { method: "PUT", body: settings.value });
  dashboard.value = await api("/api/dashboard");
  toast("Precificação atualizada.");
}
const channelModal = ref(false),
  channelForm = reactive({ id: 0, name: "", percentageFee: 0, fixedFee: 0, active: true });
const selectableChannels = computed(() =>
  channels.value.filter(
    (channel) => channel.active || channel.id === settings.value?.defaultChannelId,
  ),
);
function editChannel(item?: Channel) {
  Object.assign(
    channelForm,
    item
      ? { ...item, percentageFee: item.percentageFee * 100 }
      : { id: 0, name: "", percentageFee: 0, fixedFee: 0, active: true },
  );
  channelModal.value = true;
}
async function saveChannel() {
  busy.value = true;
  try {
    await api(channelForm.id ? `/api/channels/${channelForm.id}` : "/api/channels", {
      method: channelForm.id ? "PUT" : "POST",
      body: {
        name: channelForm.name,
        percentageFee: channelForm.percentageFee / 100,
        fixedFee: channelForm.fixedFee,
        active: channelForm.active,
      },
    });
    channelModal.value = false;
    await fetchTablePage("channels", "/api/channels", () => channels.value, (v) => (channels.value = v), true);
    products.value = await api("/api/products");
    dashboard.value = await api("/api/dashboard");
    toast("Canal de venda salvo.");
  } catch (e: any) {
    toast(e?.data?.statusMessage || "Não foi possível salvar o canal");
  } finally {
    busy.value = false;
  }
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
    await fetchTablePage("customers", "/api/customers", () => customers.value, (v) => (customers.value = v), true);
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
    await fetchTablePage("serviceTypes", "/api/service-types", () => serviceTypes.value, (v) => (serviceTypes.value = v), true);
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
        <form class="panel period-filters" @submit.prevent="loadDashboard">
          <label>De<input v-model="dashboardFilters.from" type="date" :max="serverTime.slice(0, 10)" @click="openDatePicker" /></label>
          <label>Até<input v-model="dashboardFilters.to" type="date" :max="serverTime.slice(0, 10)" @click="openDatePicker" /></label>
          <button class="button"><Icon name="lucide:filter" />Atualizar período</button>
        </form>
        <div class="metrics">
          <article>
            <span class="metric-icon green"
              ><Icon name="lucide:clipboard-list"
            /></span>
            <div>
              <small>Pedidos no período</small><strong>{{ dashboard?.summary?.orders || 0 }}</strong
              ><em>{{ brDate(dashboardFilters.from) }} a {{ brDate(dashboardFilters.to) }}</em>
            </div>
          </article>
          <article>
            <span class="metric-icon ochre"
              ><Icon name="lucide:circle-dollar-sign"
            /></span>
            <div>
              <small>Valor em pedidos</small
              ><strong>{{
                money(dashboard?.summary?.totalValue || 0)
              }}</strong
              ><em>{{ money(dashboard?.summary?.paidValue || 0) }} recebidos</em>
            </div>
          </article>
          <article>
            <span class="metric-icon blue"
              ><Icon name="lucide:package-check"
            /></span>
            <div>
              <small>Prontos</small
              ><strong>{{
                dashboard?.summary?.withdrawn || 0
              }}</strong
              ><em>retirados ou entregues</em>
            </div>
          </article>
          <article>
            <span class="metric-icon coral"
              ><Icon name="lucide:factory"
            /></span>
            <div>
              <small>Em produção</small
              ><strong>{{
                dashboard?.summary?.inProduction || 0
              }}</strong
              ><em>pedidos em andamento</em>
            </div>
          </article>
        </div>
        <div class="dashboard-charts">
          <div class="panel chart-panel">
            <div class="panel-head"><div><span class="eyebrow">Faturamento</span><h3>Ganhos por tipo de serviço</h3></div><Icon name="lucide:chart-no-axes-column-increasing" class="panel-icon" /></div>
            <div class="bar-chart">
              <div v-for="item in dashboard?.byService || []" :key="item.name" class="bar-row">
                <div><strong>{{ item.name }}</strong><small>{{ item.orders }} pedido(s) · {{ money(item.paid) }} pagos</small></div>
                <span><i :style="{ width: `${(item.total / dashboardServiceMax) * 100}%` }" /></span><b>{{ money(item.total) }}</b>
              </div>
              <div v-if="!dashboard?.byService?.length" class="empty">Nenhum pedido no período.</div>
            </div>
          </div>
          <div class="panel chart-panel">
            <div class="panel-head"><div><span class="eyebrow">Produção</span><h3>Pedidos por situação</h3></div><Icon name="lucide:chart-bar-big" class="panel-icon" /></div>
            <div class="bar-chart status-chart">
              <div v-for="item in dashboard?.statuses || []" :key="item.name" class="bar-row">
                <div><strong>{{ statusLabels[item.name] || item.name }}</strong></div>
                <span><i :style="{ width: `${(item.total / dashboardStatusMax) * 100}%` }" /></span><b>{{ item.total }}</b>
              </div>
              <div v-if="!dashboard?.statuses?.length" class="empty">Nenhum pedido no período.</div>
            </div>
          </div>
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
        <form class="panel order-filters" @submit.prevent="loadOrders">
          <label>De<input v-model="orderFilters.from" type="date" :max="serverTime.slice(0, 10)" @click="openDatePicker" /></label>
          <label>Até<input v-model="orderFilters.to" type="date" :max="serverTime.slice(0, 10)" @click="openDatePicker" /></label>
          <label>Situação da produção<select v-model="orderFilters.status"><option value="">Todas</option><option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option></select></label>
          <label>Situação do pagamento<select v-model="orderFilters.paymentStatus"><option value="">Todas</option><option v-for="(label, key) in paymentStatusLabels" :key="key" :value="key">{{ label }}</option></select></label>
          <button class="button"><Icon name="lucide:search" />Filtrar</button>
          <button type="button" class="button ghost" @click="resetOrderFilters">Hoje</button>
        </form>
        <div v-if="selectedOrders.length" class="panel bulk-actions">
          <strong>{{ selectedOrders.length }} selecionado(s)</strong
          ><button
            type="button"
            class="button secondary"
            :disabled="busy"
            @click="pdf(undefined, [...selectedOrders])"
          ><Icon name="lucide:file-down" />PDF dos selecionados</button>
          <template v-if="canWriteOrders">
          <select v-model="bulkAction">
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
          </template>
        </div>
        <div class="panel table-wrap" @scroll="tableScroll('orders', $event, () => loadNextTable('orders'))">
          <table>
            <thead>
              <tr>
                <th>
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
                <td>
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
        <div class="panel table-wrap" @scroll="tableScroll('customers', $event, () => loadNextTable('customers'))">
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
          <div class="head-actions">
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
            </select></label>
          <button class="button" @click="editProduct()"><Icon name="lucide:plus" />Novo produto</button>
          </div>
        </div>
        <div v-if="filteredProducts.length" class="cards-grid">
          <article
            v-for="p in filteredProducts"
            :key="p.id"
            class="product-card"
          >
            <div class="card-top">
              <span class="category">{{ p.category }}</span>
              <button class="edit-button" title="Editar produto" @click="editProduct(p)">
                <Icon name="lucide:pencil" /><span>Editar</span>
              </button>
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
        <div class="panel table-wrap" @scroll="tableScroll('materials', $event, () => loadNextTable('materials'))">
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
                  <button class="edit-button" title="Editar insumo" @click="editMaterial(m)">
                    <Icon name="lucide:pencil" /><span>Editar</span>
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
            @click="goParameterTab('services')"
          >
            <Icon name="lucide:wrench" />Tipos de serviço
          </button>
          <button
            :class="{ active: parameterTab === 'pricing' }"
            @click="goParameterTab('pricing')"
          >
            <Icon name="lucide:calculator" />Precificação
          </button>
        </div>
        <div v-if="parameterTab === 'services'" class="panel table-wrap" @scroll="tableScroll('serviceTypes', $event, () => loadNextTable('serviceTypes'))">
          <div class="panel-head">
            <div>
              <span class="eyebrow">Pedidos</span>
              <h3>Tipos de serviço</h3>
            </div>
            <Icon name="lucide:wrench" class="panel-icon" />
          </div>
          <table v-if="serviceTypes.length" class="service-types-table">
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
                <td data-label="Tipo de serviço">
                  <strong>{{ serviceType.name }}</strong>
                </td>
                <td data-label="Preço base/mínimo">
                  <strong>{{ money(serviceType.basePrice) }}</strong>
                </td>
                <td data-label="Situação">
                  <span
                    :class="[
                      'status-badge',
                      serviceType.active ? 'ready' : 'cancelled',
                    ]"
                    >{{ serviceType.active ? "Ativo" : "Inativo" }}</span
                  >
                </td>
                <td class="service-row-action">
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
        <div v-else-if="settings" class="pricing-layout">
        <form class="panel form-panel settings-single" @submit.prevent="saveSettings">
          <div class="panel-head">
            <div>
              <span class="eyebrow">Precificação</span>
              <h3>Regra padrão</h3>
            </div>
            <Icon name="lucide:calculator" class="panel-icon" />
          </div>
          <label
            >Canal padrão<select v-model.number="settings.defaultChannelId">
              <option v-for="c in selectableChannels" :key="c.id" :value="c.id">
                {{ c.name }} — {{ (c.percentageFee * 100).toFixed(2) }}% +
                {{ money(c.fixedFee) }} por unidade
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
        <div class="panel channels-panel">
          <div class="panel-head">
            <div><span class="eyebrow">Canais de venda</span><h3>Marketplaces e taxas</h3></div>
            <button class="button" @click="editChannel()"><Icon name="lucide:plus" />Novo canal</button>
          </div>
          <p class="panel-description">Configure a comissão percentual e a tarifa fixa cobrada por unidade.</p>
          <div class="table-wrap" @scroll="tableScroll('channels', $event, () => loadNextTable('channels'))"><table class="channels-table">
            <thead><tr><th>Canal</th><th>Comissão</th><th>Tarifa por unidade</th><th>Status</th><th></th></tr></thead>
            <tbody><tr v-for="channel in channels" :key="channel.id">
              <td data-label="Canal"><strong>{{ channel.name }}</strong></td>
              <td data-label="Comissão">{{ (channel.percentageFee * 100).toFixed(2) }}%</td>
              <td data-label="Tarifa por unidade">{{ money(channel.fixedFee) }}</td>
              <td data-label="Status"><span :class="['status-badge', channel.active ? 'ready' : 'cancelled']">{{ channel.active ? "Ativo" : "Inativo" }}</span></td>
              <td class="channel-row-action"><button class="edit-button" @click="editChannel(channel)"><Icon name="lucide:pencil" /><span>Editar</span></button></td>
            </tr></tbody>
          </table></div>
        </div>
        </div>
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
        <div class="panel table-wrap" @scroll="tableScroll('users', $event, () => loadNextTable('users'))">
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
          <button class="button secondary" @click="() => loadAudit()">
            <Icon name="lucide:refresh-cw" />Atualizar
          </button>
        </div>
        <div class="panel table-wrap" @scroll="tableScroll('audit', $event, () => loadNextTable('audit'))">
          <table>
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Entidade</th>
                <th>Detalhes</th>
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
                <td class="audit-detail-cell"><pre class="audit-details">{{ auditDetails(log.details) }}</pre><button type="button" class="tiny-button" title="Copiar detalhes" aria-label="Copiar detalhes" @click="copyAuditDetails(log.details)"><Icon name="lucide:copy" /></button></td>
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
        channelModal ||
        productModal ||
        userModal ||
        materialModal ||
        profileModal ||
        changeModal ||
        confirmation
      "
      class="modal-backdrop"
      @click.self="
        confirmation
          ? settleConfirmation(false)
          : !changeModal &&
        !orderModal &&
        (orderModal =
          customerModal =
          serviceTypeModal =
          channelModal =
          productModal =
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
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div class="three-cols">
          <label>Número<input v-model="orderForm.orderNumber" disabled placeholder="Gerado automaticamente" /></label
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
              :max="serverTime.slice(0, 10)"
              @click="openDatePicker"
              required /></label
          ><label>Prazo<input v-model="orderForm.dueDate" type="date" @click="openDatePicker" /></label
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
        <div class="order-values">
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
          /></label
          ><label
            >Valor total<input
              :value="money(Number(orderForm.quantity || 0) * Number(orderForm.unitPrice || 0))"
              type="text"
              disabled
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
        <div :class="['grade-summary', { invalid: !gradeMatchesQuantity }]">
          <span>Quantidade na grade: <strong>{{ gradeQuantity }}</strong> de <strong>{{ orderForm.quantity || 0 }}</strong></span>
          <small>{{ gradeMatchesQuantity ? "Grade conferida" : "A soma da grade deve ser igual à quantidade do pedido" }}</small>
        </div>
        <div class="two-cols">
          <label
            >Data da retirada<input
              v-model="orderForm.withdrawalDate"
              type="date"
              :max="serverTime.slice(0, 10)"
              @click="openDatePicker" /></label
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
              busy || !activeCustomers.length || !activeServiceTypes.length || !gradeMatchesQuantity
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
          {{ userForm.active ? "ativo" : "inativo" }}</label
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
      <form v-else-if="productModal" class="modal wide" @submit.prevent="saveProduct">
        <div class="modal-head">
          <div><span class="eyebrow">Ficha técnica</span><h2>{{ productForm.id ? "Editar produto" : "Novo produto" }}</h2></div>
          <button type="button" class="tiny-button" @click="productModal = false"><Icon name="lucide:x" /></button>
        </div>
        <div class="two-cols">
          <label>Nome<input v-model="productForm.name" required maxlength="160" /></label>
          <label>SKU<input v-model="productForm.sku" maxlength="80" /></label>
          <label>Categoria<input v-model="productForm.category" required maxlength="60" list="product-categories" /><datalist id="product-categories"><option v-for="category in productCategories" :key="category" :value="category" /></datalist></label>
          <label>Cor<input v-model="productForm.color" maxlength="120" /></label>
        </div>
        <label>Preço atual<input :value="money(productForm.currentPrice)" type="text" inputmode="numeric" @input="currencyInput($event, productForm, 'currentPrice')" /></label>
        <div class="components-head"><div><span class="eyebrow">Composição</span><h3>Insumos do produto</h3></div><button type="button" class="button secondary" @click="addProductComponent"><Icon name="lucide:plus" />Adicionar insumo</button></div>
        <div class="components">
          <div v-for="(component, index) in productForm.components" :key="index" class="component-row">
            <label>Insumo<select v-model.number="component.materialId" required><option :value="null" disabled>Selecione</option><option v-for="material in materials.filter((item) => item.active || item.id === component.materialId)" :key="material.id" :value="material.id">{{ material.name }} ({{ material.unit }})</option></select></label>
            <label>Quantidade<input v-model.number="component.quantity" type="number" min="0.0001" step="0.0001" required /></label>
            <label>Perda (%)<input v-model.number="component.wastePercent" type="number" min="0" max="500" step="0.01" required /></label>
            <strong>{{ money((materials.find((item) => item.id === component.materialId)?.unitCost || 0) * component.quantity * (1 + component.wastePercent / 100)) }}</strong>
            <button type="button" class="tiny-button danger-text" title="Remover insumo" :disabled="productForm.components.length === 1" @click="productForm.components.splice(index, 1)"><Icon name="lucide:trash-2" /></button>
          </div>
        </div>
        <div class="product-total"><span>Custo estimado de produção</span><strong>{{ money(productCostPreview) }}</strong></div>
        <div class="modal-actions"><button type="button" class="button ghost" @click="productModal = false">Cancelar</button><button class="button" :disabled="busy">Salvar produto</button></div>
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
      <form v-else-if="channelModal" class="modal" @submit.prevent="saveChannel">
        <div class="modal-head">
          <div><span class="eyebrow">Precificação</span><h2>{{ channelForm.id ? "Editar canal" : "Novo canal" }}</h2></div>
          <button type="button" class="tiny-button" @click="channelModal = false"><Icon name="lucide:x" /></button>
        </div>
        <label>Nome<input v-model="channelForm.name" required maxlength="100" /></label>
        <div class="two-cols">
          <label>Comissão (%)<input v-model.number="channelForm.percentageFee" type="number" min="0" max="99.99" step="0.01" required /></label>
          <label>Tarifa por unidade<input :value="money(channelForm.fixedFee)" type="text" inputmode="numeric" @input="currencyInput($event, channelForm, 'fixedFee')" /></label>
        </div>
        <label class="check"><input v-model="channelForm.active" type="checkbox" />Canal ativo</label>
        <div class="modal-actions"><button type="button" class="button ghost" @click="channelModal = false">Cancelar</button><button class="button" :disabled="busy">Salvar canal</button></div>
      </form>
      <section
        v-else-if="confirmation"
        class="modal confirmation-modal"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="'confirmation-title'"
      >
        <div class="modal-head">
          <div>
            <span class="eyebrow">Confirmação</span>
            <h2 id="confirmation-title">{{ confirmation.title }}</h2>
          </div>
          <button
            type="button"
            class="tiny-button"
            aria-label="Fechar confirmação"
            @click="settleConfirmation(false)"
          >
            <Icon name="lucide:x" />
          </button>
        </div>
        <p>{{ confirmation.message }}</p>
        <div class="modal-actions">
          <button
            type="button"
            class="button ghost"
            @click="settleConfirmation(false)"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="button danger"
            @click="settleConfirmation(true)"
          >
            {{ confirmation.confirmLabel }}
          </button>
        </div>
      </section>
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
