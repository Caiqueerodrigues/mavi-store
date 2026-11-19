<script setup lang="ts">
import OrderModal from "~/components/modals/OrderModal.vue";
import PayableModal from "~/components/modals/PayableModal.vue";
import AuditRouteView from "~/components/routes/AuditRouteView.vue";
import CustomersRouteView from "~/components/routes/CustomersRouteView.vue";
import DashboardRouteView from "~/components/routes/DashboardRouteView.vue";
import MaterialsRouteView from "~/components/routes/MaterialsRouteView.vue";
import OrdersRouteView from "~/components/routes/OrdersRouteView.vue";
import ParametersRouteView from "~/components/routes/ParametersRouteView.vue";
import PayablesRouteView from "~/components/routes/PayablesRouteView.vue";
import ProductsRouteView from "~/components/routes/ProductsRouteView.vue";
import UsersRouteView from "~/components/routes/UsersRouteView.vue";
import type { Material, Product, Channel } from "~~/shared/types";
import type { Role, User, UserListItem } from "~/types/auth";
import type { ProductListItem } from "~/types/catalog";
import type { Order, OrderListItem, SizeItem } from "~/types/orders";
import type { PayableService, PayableServiceListItem } from "~/types/payables";
import type { Customer, ServiceType } from "~/types/services";
import type { ConfirmationRequest } from "~/types/ui";
function normalizeOrderSizes(value: unknown): SizeItem[] {
  let sizes = value;
  if (typeof sizes === "string") {
    try {
      sizes = JSON.parse(sizes);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(sizes)) return [];
  return sizes
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object",
    )
    .map((item) => ({
      size: String(item.size ?? ""),
      quantity: Number(item.quantity) || 0,
      color: String(item.color ?? ""),
    }));
}
function dateInputValue(value: unknown): string {
  if (!value) return "";
  const date = value instanceof Date ? value.toISOString() : String(value);
  return /^\d{4}-\d{2}-\d{2}/.exec(date)?.[0] || "";
}
const ready = ref(false),
  user = ref<User | null>(null),
  serverTime = ref(""),
  route = useRoute(),
  router = useRouter(),
  routeTabs: Record<string, string> = {
    "/visao-geral": "dashboard",
    "/servicos": "orders",
    "/pedidos": "orders",
    "/contas-a-pagar": "payables",
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
  notice = ref(""),
  noticeType = ref<"success" | "error">("success");
const dashboard = ref<any>(null),
  orders = ref<OrderListItem[]>([]),
  payableServices = ref<PayableServiceListItem[]>([]),
  customers = ref<Customer[]>([]),
  serviceTypes = ref<ServiceType[]>([]),
  orderServiceTypes = ref<ServiceType[]>([]),
  products = ref<ProductListItem[]>([]),
  materials = ref<Material[]>([]),
  channels = ref<Channel[]>([]),
  settings = ref<any>(null),
  users = ref<UserListItem[]>([]),
  auditData = ref<any>({ items: [], total: 0 });
const auditDetailCache = reactive<Record<number, unknown>>({}),
  auditDetailLoading = reactive<Record<number, boolean>>({});
const tablePages = reactive<
  Record<string, { offset: number; total: number; loading: boolean }>
>({});
const tablePageSize = 50;
const filterDebounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const pendingTableReloads: Record<string, (() => void) | undefined> = {};
let productRequestId = 0;
let dashboardRequestId = 0;
let pendingAuditReload = false;
let dateFilterDefaultsInitialized = false;
const tableFilters = reactive({
  customers: { search: "", active: "", sort: "name", direction: "asc" },
  materials: {
    search: "",
    active: "",
    costType: "",
    sort: "name",
    direction: "asc",
  },
  serviceTypes: { search: "", active: "", sort: "name", direction: "asc" },
  channels: { search: "", active: "", sort: "name", direction: "asc" },
  users: { search: "", active: "", role: "", sort: "name", direction: "asc" },
  audit: { search: "", sort: "createdAt", direction: "desc" },
});
async function fetchTablePage<T>(
  key: string,
  url: string,
  getRows: () => T[],
  setRows: (rows: T[]) => void,
  reset = false,
) {
  const state = (tablePages[key] ||= { offset: 0, total: 0, loading: false });
  if (state.loading) {
    if (reset)
      pendingTableReloads[key] = () => {
        void fetchTablePage(key, url, getRows, setRows, true);
      };
    return;
  }
  if (!reset && state.offset >= state.total && state.total > 0) return;
  if (reset) {
    state.offset = 0;
    state.total = 0;
  }
  state.loading = true;
  try {
    const params = new URLSearchParams(
      url.includes("?") ? url.slice(url.indexOf("?") + 1) : "",
    );
    params.set("limit", String(tablePageSize));
    params.set("offset", String(state.offset));
    const path = url.split("?")[0];
    const page = await api<{ items: T[]; total: number; offset: number }>(
      `${path}?${params}`,
    );
    setRows(reset ? page.items : [...getRows(), ...page.items]);
    state.offset = page.offset + page.items.length;
    state.total = page.total;
  } finally {
    state.loading = false;
    const pendingReload = pendingTableReloads[key];
    delete pendingTableReloads[key];
    pendingReload?.();
  }
}
function debounceFilter(key: string, load: () => unknown) {
  clearTimeout(filterDebounceTimers[key]);
  filterDebounceTimers[key] = setTimeout(() => {
    delete filterDebounceTimers[key];
    void load();
  }, 500);
}
function cancelFilterDebounce(key: string) {
  clearTimeout(filterDebounceTimers[key]);
  delete filterDebounceTimers[key];
}
function scheduleTableFilter(
  key: "customers" | "materials" | "serviceTypes" | "channels" | "users",
) {
  debounceFilter(`table:${key}`, () => loadFilteredTable(key));
}
function scheduleOrderFilter() {
  debounceFilter("orders", loadOrders);
}
function schedulePayableFilter() {
  debounceFilter("payables", loadPayableServices);
}
function scheduleProductFilter() {
  debounceFilter("products", loadProducts);
}
function scheduleAuditFilter() {
  debounceFilter("audit", () => loadAudit(true));
}
function tableScroll(key: string, event: Event, load: () => Promise<void>) {
  const el = event.currentTarget as HTMLElement;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 240) void load();
}
function loadNextTable(key: string) {
  const requests: Record<string, () => Promise<void>> = {
    orders: () =>
      fetchTablePage(
        "orders",
        `/api/orders?${new URLSearchParams(orderFilters)}`,
        () => orders.value,
        (v) => (orders.value = v),
      ),
    payables: () =>
      fetchTablePage(
        "payables",
        `/api/payable-services?${new URLSearchParams(payableFilters)}`,
        () => payableServices.value,
        (v) => (payableServices.value = v),
      ),
    customers: () => loadFilteredTable("customers", false),
    materials: () => loadFilteredTable("materials", false),
    serviceTypes: () => loadFilteredTable("serviceTypes", false),
    channels: () => loadFilteredTable("channels", false),
    users: () => loadFilteredTable("users", false),
    audit: () => loadAuditPage(false),
  };
  return requests[key]?.() || Promise.resolve();
}
function loadFilteredTable(
  key: "customers" | "materials" | "serviceTypes" | "channels" | "users",
  reset = true,
) {
  cancelFilterDebounce(`table:${key}`);
  const config = {
    customers: { path: "/api/customers", rows: customers },
    materials: { path: "/api/materials", rows: materials },
    serviceTypes: { path: "/api/service-types", rows: serviceTypes },
    channels: { path: "/api/channels", rows: channels },
    users: { path: "/api/users", rows: users },
  }[key];
  const params = new URLSearchParams(tableFilters[key]);
  return fetchTablePage<any>(
    key,
    `${config.path}?${params}`,
    () => config.rows.value,
    (value) => (config.rows.value = value),
    reset,
  );
}
async function resetTableFilters(
  key: "customers" | "materials" | "serviceTypes" | "channels" | "users",
) {
  cancelFilterDebounce(`table:${key}`);
  Object.keys(tableFilters[key])
    .filter((field) => !["sort", "direction"].includes(field))
    .forEach((field) => ((tableFilters[key] as any)[field] = ""));
  await loadFilteredTable(key);
}
function sortIcon(
  filters: { sort: string; direction: string },
  column: string,
) {
  return filters.sort === column
    ? filters.direction === "asc"
      ? "lucide:arrow-up"
      : "lucide:arrow-down"
    : "lucide:arrow-up-down";
}
async function sortTable(
  key:
    | "orders"
    | "payables"
    | "customers"
    | "materials"
    | "serviceTypes"
    | "channels"
    | "users"
    | "audit",
  column: string,
) {
  const filters: any =
    key === "orders"
      ? orderFilters
      : key === "payables"
        ? payableFilters
        : tableFilters[key];
  filters.direction =
    filters.sort === column && filters.direction === "asc" ? "desc" : "asc";
  filters.sort = column;
  if (key === "orders") await loadOrders();
  else if (key === "payables") await loadPayableServices();
  else if (key === "audit") await loadAudit();
  else await loadFilteredTable(key);
}
const dashboardFilters = reactive({ from: "", to: "" }),
  orderFilters = reactive({
    search: "",
    from: "",
    to: "",
    status: "",
    paymentStatus: "",
    sort: "orderDate",
    direction: "desc",
  }),
  payableFilters = reactive({
    search: "",
    from: "",
    to: "",
    paymentStatus: "",
    sort: "orderDate",
    direction: "desc",
  });
const currentFilterDate = computed(() => serverTime.value.slice(0, 10));
const defaultYesterday = computed(() => {
  const [year = 0, month = 1, day = 1] = currentFilterDate.value
    .split("-")
    .map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1))
    .toISOString()
    .slice(0, 10);
});
const dashboardFiltersChanged = computed(
    () =>
      dashboardFilters.from !== `${currentFilterDate.value.slice(0, 7)}-01` ||
      dashboardFilters.to !== currentFilterDate.value,
  ),
  orderFiltersChanged = computed(
    () =>
      orderFilters.search !== "" ||
      orderFilters.from !== defaultYesterday.value ||
      orderFilters.to !== currentFilterDate.value ||
      orderFilters.status !== "" ||
      orderFilters.paymentStatus !== "",
  ),
  payableFiltersChanged = computed(
    () =>
      payableFilters.search !== "" ||
      payableFilters.from !== `${currentFilterDate.value.slice(0, 7)}-01` ||
      payableFilters.to !== currentFilterDate.value ||
      payableFilters.paymentStatus !== "",
  ),
  customerFiltersChanged = computed(
    () =>
      tableFilters.customers.search !== "" ||
      tableFilters.customers.active !== "",
  );
const productCategory = ref(""),
  productStatus = ref("all"),
  parameterTab = ref<"services" | "pricing">(
    route.path.endsWith("/precificacao") ? "pricing" : "services",
  ),
  productCategories = ref<string[]>([]);
const loginForm = reactive({ email: "", password: "" }),
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
  costTypeLabels: Record<string, string> = {
    material: "Matéria-prima",
    labor: "Mão de obra",
    service: "Serviço",
    packaging: "Embalagem",
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
  },
  payableStatusLabels: Record<string, string> = {
    pending: "Pendente",
    paid: "Pago",
    cancelled: "Cancelado",
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
  canAudit = computed(() => user.value?.role === "admin");
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
      label: "Serviços terceirizados",
      icon: "lucide:handshake",
      show: true,
    },
    {
      id: "customers",
      label: "Clientes",
      icon: "lucide:contact-round",
      show: true,
    },
    {
      id: "payables",
      label: "Contas a pagar",
      icon: "lucide:landmark",
      show: canCosts.value,
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
function markFormValidated(event: Event) {
  const form = (event.target as HTMLElement)?.closest?.("form");
  form?.classList.add("was-validated");
}
function syncServerTime(headers: Headers) {
  const value = headers.get("x-server-time");
  if (value) {
    serverTime.value = value;
    initializeDateFilterDefaults(value.slice(0, 10));
  }
}
function initializeDateFilterDefaults(today: string) {
  if (dateFilterDefaultsInitialized) return;
  const [year = 0, month = 1, day = 1] = today.split("-").map(Number);
  const yesterday = new Date(Date.UTC(year, month - 1, day - 1))
    .toISOString()
    .slice(0, 10);
  dashboardFilters.from = `${today.slice(0, 7)}-01`;
  dashboardFilters.to = today;
  orderFilters.from = yesterday;
  orderFilters.to = today;
  payableFilters.from = `${today.slice(0, 7)}-01`;
  payableFilters.to = today;
  dateFilterDefaultsInitialized = true;
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
    if (status === 401 && retry && csrf()) {
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
    if (status === 401) forceLogin();
    throw error;
  }
}
async function fetchListItemDetail<T>(
  resource: string,
  id: number,
): Promise<T | null> {
  try {
    return await api<T>(`/api/${resource}/${id}`);
  } catch (error: any) {
    toast(
      error?.data?.message ||
        error?.data?.statusMessage ||
        "Não foi possível carregar os dados completos.",
      "error",
    );
    return null;
  }
}
let toastTimer: ReturnType<typeof setTimeout> | undefined;
function toast(message: string, type: "success" | "error" = "success") {
  if (toastTimer) clearTimeout(toastTimer);
  notice.value = message;
  noticeType.value = type;
  toastTimer = setTimeout(() => {
    notice.value = "";
    toastTimer = undefined;
  }, 3200);
}
const confirmation = ref<ConfirmationRequest | null>(null);
let resolveConfirmation: ((confirmed: boolean) => void) | null = null;
function confirmInModal(
  message: string,
  title: string,
  confirmLabel = "Confirmar",
  danger = false,
) {
  return new Promise<boolean>((resolve) => {
    resolveConfirmation = resolve;
    confirmation.value = { title, message, confirmLabel, danger };
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
async function loadRouteData(path = route.path) {
  switch (path) {
    case "/visao-geral":
      await loadDashboard();
      break;
    case "/servicos":
    case "/pedidos":
      await Promise.all([
        loadOrders(),
        fetchTablePage(
          "customers",
          "/api/customers",
          () => customers.value,
          (v) => (customers.value = v),
          true,
        ),
        fetchTablePage(
          "serviceTypes",
          "/api/service-types",
          () => serviceTypes.value,
          (v) => (serviceTypes.value = v),
          true,
        ),
      ]);
      break;
    case "/clientes":
      await loadFilteredTable("customers");
      break;
    case "/contas-a-pagar":
      await loadPayableServices();
      break;
    case "/produtos":
      await Promise.all([
        loadProductOptions(),
        loadProducts(),
        fetchTablePage(
          "materials",
          "/api/materials",
          () => materials.value,
          (v) => (materials.value = v),
          true,
        ),
      ]);
      break;
    case "/insumos":
      await loadFilteredTable("materials");
      break;
    case "/parametrizacao/servicos":
      await loadFilteredTable("serviceTypes");
      break;
    case "/parametrizacao/precificacao":
      await Promise.all([
        loadFilteredTable("channels"),
        api("/api/settings").then((v) => (settings.value = v)),
      ]);
      break;
    case "/usuarios":
      await loadFilteredTable("users");
      break;
    case "/auditoria":
      await loadAudit(true);
      break;
  }
}
async function loadProductOptions() {
  productCategories.value = await api<string[]>("/api/products/categories");
}
async function loadProducts() {
  cancelFilterDebounce("products");
  const query = new URLSearchParams({ active: productStatus.value });
  if (productCategory.value) query.set("category", productCategory.value);
  const requestId = ++productRequestId;
  const result = await api<ProductListItem[]>(
    `/api/products?${query.toString()}`,
  );
  if (requestId === productRequestId) products.value = result;
}
async function loadDashboard() {
  if (!dateFilterDefaultsInitialized) {
    const now = new Date();
    const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    initializeDateFilterDefaults(serverTime.value.slice(0, 10) || localToday);
  }
  const requestId = ++dashboardRequestId;
  const result = await api(
    `/api/dashboard?${new URLSearchParams(dashboardFilters).toString()}`,
  );
  if (requestId === dashboardRequestId) dashboard.value = result;
}
async function resetDashboardFilters() {
  const today = currentFilterDate.value;
  Object.assign(dashboardFilters, {
    from: `${today.slice(0, 7)}-01`,
    to: today,
  });
  await loadDashboard();
}
async function loadOrders() {
  cancelFilterDebounce("orders");
  await fetchTablePage(
    "orders",
    `/api/orders?${new URLSearchParams(orderFilters).toString()}`,
    () => orders.value,
    (v) => (orders.value = v),
    true,
  );
  selectedOrders.value = [];
}
async function loadPayableServices() {
  cancelFilterDebounce("payables");
  await fetchTablePage(
    "payables",
    `/api/payable-services?${new URLSearchParams(payableFilters).toString()}`,
    () => payableServices.value,
    (value) => (payableServices.value = value),
    true,
  );
}
async function resetPayableFilters() {
  cancelFilterDebounce("payables");
  const today = serverTime.value.slice(0, 10);
  Object.assign(payableFilters, {
    search: "",
    from: `${today.slice(0, 7)}-01`,
    to: today,
    paymentStatus: "",
  });
  await loadPayableServices();
}
async function resetOrderFilters() {
  cancelFilterDebounce("orders");
  const today = serverTime.value.slice(0, 10);
  const [year = 0, month = 1, day = 1] = today.split("-").map(Number);
  const yesterday = new Date(Date.UTC(year, month - 1, day - 1))
    .toISOString()
    .slice(0, 10);
  Object.assign(orderFilters, {
    search: "",
    from: yesterday,
    to: today,
    status: "",
    paymentStatus: "",
  });
  await loadOrders();
}
onMounted(async () => {
  try {
    const data = await api<{ user: User }>("/api/auth/me");
    user.value = data.user;
    ensureAccessibleRoute();
    changeModal.value = data.user.mustChangePassword;
  } catch {
    await loadRememberedLogin();
    if (route.path !== "/login") router.replace("/login");
    ready.value = true;
    return;
  }
  ready.value = true;
  if (!user.value.mustChangePassword) {
    try {
      await loadRouteData();
    } catch (error: any) {
      toast(
        error?.data?.message ||
          error?.data?.statusMessage ||
          "Não foi possível carregar todos os dados. Tente novamente.",
        "error",
      );
    }
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
    if (!data.user.mustChangePassword) await loadRouteData();
  } catch (e: any) {
    if (!user.value)
      loginError.value =
        e?.data?.message || e?.data?.statusMessage || "Não foi possível entrar";
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
    await loadRouteData();
    toast("Senha alterada com sucesso.");
  } catch (e: any) {
    toast(
      e?.data?.message ||
        e?.data?.statusMessage ||
        "Revise os requisitos da senha",
      "error",
    );
  } finally {
    busy.value = false;
  }
}
function go(id: string) {
  const path = Object.entries(routeTabs).find(
    ([, section]) => section === id,
  )?.[0];
  if (path && path !== route.path) router.push(path);
  menuOpen.value = false;
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
  async (path) => {
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
    if (user.value && !user.value.mustChangePassword) {
      try {
        await loadRouteData(path);
      } catch (error: any) {
        toast(
          error?.data?.message ||
            error?.data?.statusMessage ||
            "Não foi possível carregar os dados desta página.",
          "error",
        );
      }
    }
  },
);
const activeCustomers = computed(() =>
  customers.value.filter((item) => item.active),
);
const selectedOrders = ref<number[]>([]),
  bulkAction = ref("");
const payableModal = ref(false),
  payableForm = reactive<any>({
    id: 0,
    orderDate: "",
    deliveryDate: null,
    agreedAmount: 0,
    quantity: null,
    serviceTypeName: "",
    recipientName: "",
    totalAmount: 0,
    paymentDate: null,
    paymentStatus: "pending",
  });
async function editPayableService(item?: Pick<PayableServiceListItem, "id">) {
  let details: PayableService | undefined;
  if (item) {
    const loaded = await fetchListItemDetail<PayableService>(
      "payable-services",
      item.id,
    );
    if (!loaded) return;
    details = loaded;
  }
  Object.assign(
    payableForm,
    details || {
      id: 0,
      orderDate: serverTime.value.slice(0, 10),
      deliveryDate: null,
      agreedAmount: 0,
      quantity: null,
      serviceTypeName: "",
      recipientName: "",
      totalAmount: 0,
      paymentDate: null,
      paymentStatus: "pending",
    },
  );
  payableForm.orderDate =
    dateInputValue(payableForm.orderDate) || serverTime.value.slice(0, 10);
  payableForm.deliveryDate = dateInputValue(payableForm.deliveryDate) || null;
  payableForm.paymentDate = dateInputValue(payableForm.paymentDate) || null;
  payableModal.value = true;
}
async function savePayableService() {
  busy.value = true;
  try {
    await api(
      payableForm.id
        ? `/api/payable-services/${payableForm.id}`
        : "/api/payable-services",
      {
        method: payableForm.id ? "PUT" : "POST",
        body: payableForm,
      },
    );
    payableModal.value = false;
    await loadPayableServices();
    toast("Conta a pagar salva e auditada.");
  } catch (error: any) {
    toast(
      error?.data?.message || "Não foi possível salvar a conta a pagar",
      "error",
    );
  } finally {
    busy.value = false;
  }
}
watch(
  () => payableForm.paymentStatus,
  (status) => {
    if (status !== "paid") payableForm.paymentDate = null;
  },
);
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
    paymentDate: null,
    quantity: null,
    unitPrice: 0,
    paidAmount: 0,
    paymentStatus: "pending",
    status: "pending",
    sizes: [],
    withdrawalDate: null,
    withdrawnBy: "",
    notes: "",
  });
function orderTotalAmount(
  quantity = orderForm.quantity,
  unitPrice = orderForm.unitPrice,
) {
  return (
    Math.round(
      (Number(quantity || 0) * Number(unitPrice || 0) + Number.EPSILON) * 100,
    ) / 100
  );
}
function syncPaidAmount() {
  if (orderForm.paymentStatus === "paid") {
    orderForm.paidAmount = orderTotalAmount();
  } else {
    orderForm.paidAmount = 0;
  }
}
watch(
  () => [orderForm.paymentStatus, orderForm.quantity, orderForm.unitPrice],
  syncPaidAmount,
);
const gradeQuantity = computed(() =>
    (Array.isArray(orderForm.sizes) ? orderForm.sizes : []).reduce(
      (sum: number, item: SizeItem) => sum + Number(item.quantity || 0),
      0,
    ),
  ),
  gradeMatchesQuantity = computed(
    () =>
      Math.abs(gradeQuantity.value - Number(orderForm.quantity || 0)) < 0.0001,
  ),
  dashboardServiceMax = computed(() =>
    Math.max(
      1,
      ...(dashboard.value?.byService || []).map((item: any) =>
        Number(item.total),
      ),
    ),
  ),
  dashboardCustomerMax = computed(() =>
    Math.max(
      1,
      ...(dashboard.value?.byCustomer || []).map((item: any) =>
        Number(item.total),
      ),
    ),
  ),
  dashboardStatusMax = computed(() =>
    Math.max(
      1,
      ...(dashboard.value?.statuses || []).map((item: any) =>
        Number(item.total),
      ),
    ),
  );
async function ensureOrderFormOptions() {
  if (!customers.value.length) {
    await fetchTablePage(
      "customers",
      "/api/customers?active=true&sort=name&direction=asc",
      () => customers.value,
      (value) => (customers.value = value),
      true,
    );
  }
}
async function openNewOrder() {
  await ensureOrderFormOptions();
  await editOrder();
}
async function openDashboardOrder(item: Pick<OrderListItem, "id">) {
  await ensureOrderFormOptions();
  await editOrder(item);
}
async function editOrder(item?: Pick<OrderListItem, "id">) {
  try {
    orderServiceTypes.value = await api<ServiceType[]>(
      "/api/service-types?active=true",
    );
  } catch (error: any) {
    toast(
      error?.data?.message ||
        error?.data?.statusMessage ||
        "Não foi possível carregar os tipos de serviço ativos.",
      "error",
    );
    return;
  }
  let orderDetails: Order | undefined;
  if (item) {
    const details = await fetchListItemDetail<Order>("orders", item.id);
    if (!details) return;
    orderDetails = details;
  }
  const firstCustomer = activeCustomers.value[0];
  Object.assign(
    orderForm,
    orderDetails
      ? JSON.parse(JSON.stringify(orderDetails))
      : {
          id: 0,
          orderNumber: "",
          customerId: firstCustomer?.id || null,
          customerName: firstCustomer?.name || "",
          serviceTypeId: null,
          orderType: "",
          productDescription: "",
          material: "",
          color: "",
          orderDate: serverTime.value.slice(0, 10),
          dueDate: null,
          paymentDate: null,
          quantity: null,
          unitPrice: 0,
          paidAmount: 0,
          paymentStatus: "pending",
          status: "pending",
          sizes: [],
          withdrawalDate: null,
          withdrawnBy: "",
          notes: "",
        },
  );
  orderForm.sizes = normalizeOrderSizes(orderForm.sizes);
  orderForm.orderDate =
    dateInputValue(orderForm.orderDate) || serverTime.value.slice(0, 10);
  orderForm.dueDate = dateInputValue(orderForm.dueDate) || null;
  orderForm.paymentDate = dateInputValue(orderForm.paymentDate) || null;
  orderForm.withdrawalDate = dateInputValue(orderForm.withdrawalDate) || null;
  syncPaidAmount();
  orderModal.value = true;
}
function selectServiceType() {
  const selected = orderServiceTypes.value.find(
    (item) => item.id === orderForm.serviceTypeId,
  );
  if (selected) {
    orderForm.orderType = selected.name;
    orderForm.unitPrice = selected.basePrice;
  }
}
function addSize() {
  orderForm.sizes.push({ size: "", quantity: null, color: "" });
}
async function saveOrder() {
  busy.value = true;
  try {
    await api(orderForm.id ? `/api/orders/${orderForm.id}` : "/api/orders", {
      method: orderForm.id ? "PUT" : "POST",
      body: orderForm,
    });
    orderModal.value = false;
    if (routeTabs[route.path] === "orders") tab.value = "orders";
    await Promise.all([loadOrders(), loadDashboard()]);
    await loadAudit();
    toast("Pedido salvo e auditado.");
  } catch (e: any) {
    toast(
      e?.data?.message ||
        e?.data?.statusMessage ||
        "Não foi possível salvar o pedido",
      "error",
    );
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
    toast(
      e?.data?.message ||
        e?.data?.statusMessage ||
        "Não foi possível atualizar os pedidos",
      "error",
    );
  } finally {
    busy.value = false;
  }
}
async function cloneOrder(item: OrderListItem) {
  if (
    !(await confirmInModal(
      `Deseja criar uma cópia do pedido ${item.orderNumber} para ${item.customerName}?`,
      "Clonar pedido",
      "Clonar pedido",
    ))
  )
    return;
  busy.value = true;
  try {
    await api(`/api/orders/${item.id}/clone`, { method: "POST" });
    if (route.path !== "/servicos") await router.push("/servicos");
    tab.value = "orders";
    await Promise.all([loadOrders(), loadDashboard()]);
    toast("Pedido clonado.");
  } catch (e: any) {
    toast(
      e?.data?.message ||
        e?.data?.statusMessage ||
        "Não foi possível clonar o pedido.",
      "error",
    );
  } finally {
    busy.value = false;
  }
}
async function deleteOrder(item: OrderListItem) {
  if (
    !(await confirmInModal(
      `Deseja excluir o pedido ${item.orderNumber} (ID ${item.id}) do cliente ${item.customerName}? O histórico será preservado.`,
      "Excluir pedido",
      "Excluir pedido",
    ))
  )
    return;
  await api(`/api/orders/${item.id}`, { method: "DELETE" });
  await Promise.all([loadOrders(), loadDashboard()]);
  toast("Pedido removido. O histórico foi preservado.");
}
async function pdf(
  item?: Pick<OrderListItem, "id">,
  selectedIds: number[] = [],
) {
  const ids = selectedIds.length ? selectedIds : item ? [item.id] : [];
  if (ids.length > 500) {
    toast("Selecione no máximo 500 pedidos por PDF.", "error");
    return;
  }
  const url = ids.length
    ? `/api/orders/report.pdf?ids=${ids.join(",")}`
    : "/api/orders/report.pdf";
  pdfFile.value = null;
  pdfModal.value = true;
  pdfLoading.value = true;
  const loadingStartedAt = Date.now();
  try {
    let response = await fetch(url, { credentials: "include" });
    if (response.status === 401 || response.status === 403) {
      try {
        await $fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "x-csrf-token": csrf() },
          credentials: "include",
        });
      } catch {
        closePdfModal();
        forceLogin();
        return;
      }
      response = await fetch(url, { credentials: "include" });
    }
    if (!response.ok) {
      closePdfModal();
      if (response.status === 401 || response.status === 403) forceLogin();
      else toast("Não foi possível gerar o PDF.", "error");
      return;
    }
    const blob = await response.blob();
    pdfFileName.value = `relatorio-pedidos-${serverTime.value.slice(0, 10) || "mavi"}.pdf`;
    pdfPreviewData.value = new Uint8Array(await blob.arrayBuffer());
    pdfPreviewUrl.value = URL.createObjectURL(blob);
    try {
      pdfFile.value = new File([blob], pdfFileName.value, {
        type: "application/pdf",
      });
    } catch {
      pdfFile.value = null;
    }
    void loadAudit();
  } catch (error: any) {
    closePdfModal();
    if (
      error?.status === 401 ||
      error?.status === 403 ||
      error?.statusCode === 401 ||
      error?.statusCode === 403
    )
      forceLogin();
    else toast("Não foi possível gerar o PDF.", "error");
  } finally {
    const remainingLoadingTime = 900 - (Date.now() - loadingStartedAt);
    if (remainingLoadingTime > 0) {
      await new Promise<void>((resolve) =>
        window.setTimeout(resolve, remainingLoadingTime),
      );
    }
    pdfLoading.value = false;
  }
}
const pdfModal = ref(false),
  pdfLoading = ref(false),
  pdfPreviewUrl = ref(""),
  pdfPreviewData = ref<Uint8Array | null>(null),
  pdfFileName = ref("relatorio-pedidos.pdf"),
  pdfFile = ref<File | null>(null);
function closePdfModal() {
  pdfModal.value = false;
  if (pdfPreviewUrl.value) URL.revokeObjectURL(pdfPreviewUrl.value);
  pdfPreviewUrl.value = "";
  pdfPreviewData.value = null;
  pdfFile.value = null;
}
async function sharePdf() {
  if (!pdfFile.value) return;
  const shareNavigator = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (
    !shareNavigator.share ||
    !shareNavigator.canShare?.({ files: [pdfFile.value] })
  ) {
    toast(
      "Este navegador não permite compartilhar o PDF. Tente em outro dispositivo.",
      "error",
    );
    return;
  }
  try {
    await shareNavigator.share({
      files: [pdfFile.value],
      title: "Relatório de serviços terceirizados",
    });
  } catch (error: any) {
    if (error?.name !== "AbortError")
      toast("Não foi possível compartilhar o PDF.", "error");
  }
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
async function editUser(item?: UserListItem) {
  const details = item
    ? await fetchListItemDetail<User>("users", item.id)
    : null;
  if (item && !details) return;
  Object.assign(
    userForm,
    details
      ? { ...details, password: "" }
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
    toast(
      e?.data?.message ||
        e?.data?.statusMessage ||
        "Não foi possível atualizar o perfil",
      "error",
    );
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
    await loadFilteredTable("users");
    await loadAudit();
    toast("Usuário salvo.");
  } catch (e: any) {
    toast(
      e?.data?.message ||
        e?.data?.statusMessage ||
        "Não foi possível salvar o usuário",
      "error",
    );
  } finally {
    busy.value = false;
  }
}
async function deleteUser(item: UserListItem) {
  if (
    !(await confirmInModal(
      `Excluir ${item.name}?`,
      "Excluir usuário",
      "Excluir usuário",
    ))
  )
    return;
  await api(`/api/users/${item.id}`, { method: "DELETE" });
  await loadFilteredTable("users");
  toast("Usuário removido.");
}
async function loadAudit(reset = true) {
  cancelFilterDebounce("audit");
  if (!canAudit.value) return;
  if (!reset) return loadAuditPage(false);
  const state = (tablePages.audit ||= { offset: 0, total: 0, loading: false });
  if (state.loading) {
    pendingAuditReload = true;
    return;
  }
  state.offset = 0;
  state.total = 0;
  auditData.value = { items: [], total: 0 };
  await loadAuditPage(true);
}
async function loadAuditPage(reset = false) {
  if (!canAudit.value) return;
  const state = (tablePages.audit ||= { offset: 0, total: 0, loading: false });
  if (
    state.loading ||
    (!reset && state.offset >= state.total && state.total > 0)
  )
    return;
  state.loading = true;
  try {
    const pageNumber = Math.floor(state.offset / tablePageSize) + 1;
    const params = new URLSearchParams({
      ...tableFilters.audit,
      page: String(pageNumber),
    });
    const page = await api<any>(`/api/audit?${params}`);
    auditData.value = {
      ...page,
      items: reset ? page.items : [...auditData.value.items, ...page.items],
    };
    state.offset = pageNumber * page.limit;
    state.total = page.total;
  } finally {
    state.loading = false;
    if (pendingAuditReload) {
      pendingAuditReload = false;
      void loadAudit(true);
    }
  }
}
function auditDetails(details: unknown) {
  if (!details || (typeof details === "object" && !Object.keys(details).length))
    return "—";
  return JSON.stringify(details, null, 2);
}
function hasAuditDetails(id: number) {
  return Object.prototype.hasOwnProperty.call(auditDetailCache, id);
}
async function loadAuditDetails(log: { id: number }) {
  if (hasAuditDetails(log.id) || auditDetailLoading[log.id]) return;
  auditDetailLoading[log.id] = true;
  try {
    const detail = await api<{ details?: unknown }>(`/api/audit/${log.id}`);
    auditDetailCache[log.id] = detail.details ?? {};
  } catch (error: any) {
    toast(
      error?.data?.message ||
        "Não foi possível carregar os detalhes da auditoria.",
      "error",
    );
  } finally {
    delete auditDetailLoading[log.id];
  }
}
async function copyAuditDetails(details: unknown) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(details ?? {}, null, 2));
    toast("Detalhes copiados.");
  } catch {
    toast("Não foi possível copiar os detalhes.", "error");
  }
}
const materialModal = ref(false),
  materialUsageQuantity = ref(1),
  materialForm = reactive<any>({
    id: 0,
    name: "",
    supplier: "",
    costType: "material",
    unit: "UN",
    purchasePrice: 0,
    yieldQuantity: 1,
    active: true,
  }),
  materialUnitCostPreview = computed(() =>
    Number(materialForm.yieldQuantity) > 0
      ? Number(materialForm.purchasePrice) / Number(materialForm.yieldQuantity)
      : 0,
  ),
  materialUsageCostPreview = computed(
    () =>
      materialUnitCostPreview.value * Number(materialUsageQuantity.value || 0),
  );
async function editMaterial(item?: Material) {
  const details = item
    ? await fetchListItemDetail<Material>("materials", item.id)
    : null;
  if (item && !details) return;
  Object.assign(
    materialForm,
    details
      ? { ...details, supplier: details.supplier || "" }
      : {
          id: 0,
          name: "",
          supplier: "",
          costType: "material",
          unit: "UN",
          purchasePrice: 0,
          yieldQuantity: 1,
          active: true,
        },
  );
  materialUsageQuantity.value =
    materialForm.unit?.toUpperCase() === "PAR" ? 2 : 1;
  materialModal.value = true;
}
function setMaterialUsageDefault() {
  materialUsageQuantity.value =
    materialForm.unit?.toUpperCase() === "PAR" ? 2 : 1;
}
async function saveMaterial() {
  await api(
    materialForm.id ? `/api/materials/${materialForm.id}` : "/api/materials",
    { method: materialForm.id ? "PUT" : "POST", body: materialForm },
  );
  materialModal.value = false;
  await loadFilteredTable("materials");
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
    variations: [],
    currentPrice: 0,
    components: [],
  });
const productCostPreview = computed(() =>
  productForm.components.reduce((total: number, component: any) => {
    const material = materials.value.find(
      (item) => item.id === component.materialId,
    );
    return (
      total +
      (material?.unitCost || 0) *
        component.quantity *
        (1 + component.wastePercent / 100)
    );
  }, 0),
);
function addProductComponent() {
  productForm.components.push({
    materialId: null,
    quantity: 1,
    wastePercent: 0,
  });
}
function selectProductMaterial(component: any, materialId: number) {
  const material = materials.value.find((item) => item.id === materialId);
  component.quantity = material?.unit?.toUpperCase() === "PAR" ? 2 : 1;
  component.wastePercent = 0;
}
async function editProduct(item?: ProductListItem) {
  const details = item
    ? await fetchListItemDetail<Product>("products", item.id)
    : null;
  if (item && !details) return;
  Object.assign(
    productForm,
    details
      ? {
          id: details.id,
          name: details.name,
          sku: details.sku || "",
          category: details.category,
          color: details.color || "",
          variations: details.variations || [],
          currentPrice: details.currentPrice,
          components: details.components.map((component) => ({
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
          variations: [],
          currentPrice: 0,
          components: [{ materialId: null, quantity: 1, wastePercent: 0 }],
        },
  );
  productModal.value = true;
}
async function saveProduct() {
  busy.value = true;
  try {
    await api(
      productForm.id ? `/api/products/${productForm.id}` : "/api/products",
      {
        method: productForm.id ? "PUT" : "POST",
        body: {
          ...productForm,
          components: productForm.components.map((component: any) => ({
            ...component,
            wastePercent: component.wastePercent / 100,
          })),
        },
      },
    );
    productModal.value = false;
    await loadProducts();
    dashboard.value = await api("/api/dashboard");
    toast("Produto salvo.");
  } catch (e: any) {
    toast(
      e?.data?.message ||
        e?.data?.statusMessage ||
        "Não foi possível salvar o produto",
      "error",
    );
  } finally {
    busy.value = false;
  }
}
async function toggleProductActive(item: ProductListItem) {
  const active = !item.active;
  const confirmed = await confirmInModal(
    active
      ? `O produto “${item.name}” ficará ativo novamente e voltará a aparecer entre os produtos disponíveis.`
      : `O produto “${item.name}” ficará inativo, mas o cadastro será mantido.`,
    active ? "Ativar produto" : "Inativar produto",
    active ? "Ativar produto" : "Inativar produto",
    !active,
  );
  if (!confirmed) return;

  busy.value = true;
  try {
    await api(`/api/products/${item.id}`, {
      method: "PATCH",
      body: { active },
    });
    await loadProducts();
    dashboard.value = await api("/api/dashboard");
    toast(active ? "Produto ativado." : "Produto inativado.");
  } catch (e: any) {
    toast(
      e?.data?.message ||
        e?.data?.statusMessage ||
        "Não foi possível alterar a situação do produto",
      "error",
    );
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
  channelForm = reactive({
    id: 0,
    name: "",
    percentageFee: 0,
    fixedFee: 0,
    active: true,
  });
const selectableChannels = computed(() =>
  channels.value.filter(
    (channel) =>
      channel.active || channel.id === settings.value?.defaultChannelId,
  ),
);
async function editChannel(item?: Channel) {
  const details = item
    ? await fetchListItemDetail<Channel>("channels", item.id)
    : null;
  if (item && !details) return;
  Object.assign(
    channelForm,
    details
      ? { ...details, percentageFee: details.percentageFee * 100 }
      : { id: 0, name: "", percentageFee: 0, fixedFee: 0, active: true },
  );
  channelModal.value = true;
}
async function saveChannel() {
  busy.value = true;
  try {
    await api(
      channelForm.id ? `/api/channels/${channelForm.id}` : "/api/channels",
      {
        method: channelForm.id ? "PUT" : "POST",
        body: {
          name: channelForm.name,
          percentageFee: channelForm.percentageFee / 100,
          fixedFee: channelForm.fixedFee,
          active: channelForm.active,
        },
      },
    );
    channelModal.value = false;
    await loadFilteredTable("channels");
    await loadProducts();
    dashboard.value = await api("/api/dashboard");
    toast("Canal de venda salvo.");
  } catch (e: any) {
    toast(
      e?.data?.message ||
        e?.data?.statusMessage ||
        "Não foi possível salvar o canal",
      "error",
    );
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
async function editCustomer(item?: Customer) {
  const details = item
    ? await fetchListItemDetail<Customer>("customers", item.id)
    : null;
  if (item && !details) return;
  Object.assign(
    customerForm,
    details
      ? {
          ...details,
          phone: phoneMask(details.phone),
          nickname: details.nickname || "",
        }
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
    await loadFilteredTable("customers");
    toast("Cliente salvo.");
  } catch (e: any) {
    toast(
      e?.data?.message ||
        e?.data?.statusMessage ||
        "Não foi possível salvar o cliente",
      "error",
    );
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
async function editServiceType(item?: ServiceType) {
  const details = item
    ? await fetchListItemDetail<ServiceType>("service-types", item.id)
    : null;
  if (item && !details) return;
  Object.assign(
    serviceTypeForm,
    details ? { ...details } : { id: 0, name: "", basePrice: 0, active: true },
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
    await loadFilteredTable("serviceTypes");
    toast("Tipo de serviço salvo.");
  } catch (e: any) {
    toast(
      e?.data?.message ||
        e?.data?.statusMessage ||
        "Não foi possível salvar o tipo de serviço",
      "error",
    );
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <AppLoadingScreen v-if="!ready" />
  <LoginScreen
    v-else-if="!user"
    :form="loginForm"
    :password-visible="passwordVisible.login"
    :remember-login="rememberLogin"
    :login-error="loginError"
    :busy="busy"
    @login="login"
    @toggle-password="passwordVisible.login = !passwordVisible.login"
    @update-remember-login="rememberLogin = $event"
  />
  <div
    v-else
    class="shell"
    @submit.capture="markFormValidated"
    @invalid.capture="markFormValidated"
  >
    <AppSidebar
      :items="nav"
      :selected="tab"
      :menu-open="menuOpen"
      :role-labels="roleLabels"
      :user="user"
      @select="go"
    />
    <main>
      <AppTopbar
        :title="nav.find((item) => item.id === tab)?.label || ''"
        @toggle-menu="menuOpen = !menuOpen"
        @edit-profile="editProfile"
        @logout="logout"
      />
      <DashboardRouteView
        v-if="tab === 'dashboard'"
        :can-write-orders="canWriteOrders"
        :open-new-order="openNewOrder"
        :dashboard-filters="dashboardFilters"
        :server-time="serverTime"
        :open-date-picker="openDatePicker"
        :load-dashboard="loadDashboard"
        :dashboard-filters-changed="dashboardFiltersChanged"
        :reset-dashboard-filters="resetDashboardFilters"
        :dashboard="dashboard"
        :br-date="brDate"
        :money="money"
        :dashboard-service-max="dashboardServiceMax"
        :dashboard-customer-max="dashboardCustomerMax"
        :dashboard-status-max="dashboardStatusMax"
        :status-labels="statusLabels"
        :go="go"
        :open-dashboard-order="openDashboardOrder"
      />
      <OrdersRouteView
        v-else-if="tab === 'orders'"
        :can-write-orders="canWriteOrders"
        :open-new-order="openNewOrder"
        :order-filters="orderFilters"
        :schedule-order-filter="scheduleOrderFilter"
        :server-time="serverTime"
        :open-date-picker="openDatePicker"
        :load-orders="loadOrders"
        :status-labels="statusLabels"
        :payment-status-labels="paymentStatusLabels"
        :order-filters-changed="orderFiltersChanged"
        :reset-order-filters="resetOrderFilters"
        v-model:selected-orders="selectedOrders"
        v-model:bulk-action="bulkAction"
        :busy="busy"
        :apply-bulk-action="applyBulkAction"
        :pdf="pdf"
        :table-scroll="tableScroll"
        :load-next-table="loadNextTable"
        :orders="orders"
        :sort-table="sortTable"
        :sort-icon="sortIcon"
        :br-date="brDate"
        :money="money"
        :edit-order="editOrder"
        :clone-order="cloneOrder"
        :delete-order="deleteOrder"
        :user="user"
      />
      <PayablesRouteView
        v-else-if="tab === 'payables'"
        :filters="payableFilters"
        :filters-changed="payableFiltersChanged"
        :items="payableServices"
        :status-labels="payableStatusLabels"
        :total="tablePages.payables?.total || 0"
        :edit="editPayableService"
        :load="loadPayableServices"
        :schedule-filter="schedulePayableFilter"
        :reset-filters="resetPayableFilters"
        :open-date-picker="openDatePicker"
        :table-scroll="tableScroll"
        :load-next="loadNextTable"
        :sort="sortTable"
        :sort-icon="sortIcon"
        :br-date="brDate"
        :money="money"
      />
      <CustomersRouteView
        v-else-if="tab === 'customers'"
        :can-write="canWriteOrders"
        :filters="tableFilters.customers"
        :filters-changed="customerFiltersChanged"
        :items="customers"
        :total="tablePages.customers?.total || 0"
        :edit="editCustomer"
        :load="loadFilteredTable"
        :schedule-filter="scheduleTableFilter"
        :reset-filters="resetTableFilters"
        :table-scroll="tableScroll"
        :load-next="loadNextTable"
        :sort="sortTable"
        :sort-icon="sortIcon"
      />
      <ProductsRouteView
        v-else-if="tab === 'products'"
        v-model:category="productCategory"
        v-model:status="productStatus"
        :categories="productCategories"
        :items="products"
        :busy="busy"
        :load="loadProducts"
        :edit="editProduct"
        :toggle="toggleProductActive"
        :money="money"
      />
      <MaterialsRouteView
        v-else-if="tab === 'materials'"
        :filters="tableFilters.materials"
        :items="materials"
        :labels="costTypeLabels"
        :total="tablePages.materials?.total || 0"
        :edit="editMaterial"
        :load="loadFilteredTable"
        :schedule-filter="scheduleTableFilter"
        :reset-filters="resetTableFilters"
        :table-scroll="tableScroll"
        :load-next="loadNextTable"
        :sort="sortTable"
        :sort-icon="sortIcon"
        :money="money"
      />
      <ParametersRouteView
        v-else-if="tab === 'parameters'"
        :parameter-tab="parameterTab"
        :edit-service-type="editServiceType"
        :go-parameter-tab="goParameterTab"
        :table-filters="tableFilters"
        :load-filtered-table="loadFilteredTable"
        :schedule-table-filter="scheduleTableFilter"
        :reset-table-filters="resetTableFilters"
        :table-pages="tablePages"
        :table-scroll="tableScroll"
        :load-next-table="loadNextTable"
        :service-types="serviceTypes"
        :sort-table="sortTable"
        :sort-icon="sortIcon"
        :money="money"
        :settings="settings"
        :save-settings="saveSettings"
        :selectable-channels="selectableChannels"
        :currency-input="currencyInput"
        :edit-channel="editChannel"
        :channels="channels"
      />
      <UsersRouteView
        v-else-if="tab === 'users'"
        :filters="tableFilters.users"
        :items="users"
        :current-user="user"
        :labels="roleLabels"
        :total="tablePages.users?.total || 0"
        :edit="editUser"
        :remove="deleteUser"
        :load="loadFilteredTable"
        :schedule-filter="scheduleTableFilter"
        :reset-filters="resetTableFilters"
        :table-scroll="tableScroll"
        :load-next="loadNextTable"
        :sort="sortTable"
        :sort-icon="sortIcon"
        :br-date="brDate"
      />
      <AuditRouteView
        v-else-if="tab === 'audit'"
        :filters="tableFilters.audit"
        :data="auditData"
        :detail-loading="auditDetailLoading"
        :detail-cache="auditDetailCache"
        :load="loadAudit"
        :schedule-filter="scheduleAuditFilter"
        :table-scroll="tableScroll"
        :load-next="loadNextTable"
        :sort="sortTable"
        :sort-icon="sortIcon"
        :br-date-time="brDateTime"
        :has-details="hasAuditDetails"
        :load-details="loadAuditDetails"
        :format-details="auditDetails"
        :copy-details="copyAuditDetails"
      />
    </main>
    <div
      v-if="
        orderModal ||
        payableModal ||
        customerModal ||
        serviceTypeModal ||
        channelModal ||
        productModal ||
        userModal ||
        materialModal ||
        profileModal ||
        changeModal ||
        pdfModal
      "
      class="modal-backdrop"
    >
      <PayableModal
        v-if="payableModal"
        :form="payableForm"
        :status-labels="payableStatusLabels"
        :busy="busy"
        :save="savePayableService"
        :close="() => (payableModal = false)"
        :open-date-picker="openDatePicker"
        :currency-input="currencyInput"
        :money="money"
      />
      <OrderModal
        v-else-if="orderModal"
        :order-form="orderForm"
        :save-order="saveOrder"
        :close="() => (orderModal = false)"
        :active-customers="activeCustomers"
        :order-service-types="orderServiceTypes"
        :select-service-type="selectServiceType"
        :server-time="serverTime"
        :open-date-picker="openDatePicker"
        :status-labels="statusLabels"
        :money="money"
        :currency-input="currencyInput"
        :payment-status-labels="paymentStatusLabels"
        :add-size="addSize"
        :grade-matches-quantity="gradeMatchesQuantity"
        :grade-quantity="gradeQuantity"
        :busy="busy"
      />
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
      <form
        v-else-if="productModal"
        class="modal wide"
        @submit.prevent="saveProduct"
      >
        <div class="modal-head">
          <div>
            <span class="eyebrow">Ficha técnica</span>
            <h2>{{ productForm.id ? "Editar produto" : "Novo produto" }}</h2>
          </div>
          <button
            type="button"
            class="tiny-button"
            @click="productModal = false"
          >
            <Icon name="lucide:x" />
          </button>
        </div>
        <div class="two-cols">
          <label
            >Nome<input v-model="productForm.name" required maxlength="160"
          /></label>
          <label
            >SKU<input
              v-model="productForm.sku"
              required
              minlength="1"
              maxlength="80"
          /></label>
          <label
            >Categoria<input
              v-model="productForm.category"
              required
              maxlength="60"
              list="product-categories" /><datalist id="product-categories">
              <option
                v-for="category in productCategories"
                :key="category"
                :value="category"
              /></datalist
          ></label>
          <label
            >Cor<input v-model="productForm.color" maxlength="120"
          /></label>
        </div>
        <label
          >Variações<TagMultiSelect
            v-model="productForm.variations"
            placeholder="Digite uma variação e pressione Enter"
        /></label>
        <label
          >Preço atual<input
            :value="money(productForm.currentPrice)"
            type="text"
            inputmode="numeric"
            @input="currencyInput($event, productForm, 'currentPrice')"
        /></label>
        <div class="components-head">
          <div>
            <span class="eyebrow">Composição</span>
            <h3>Insumos do produto</h3>
          </div>
          <button
            type="button"
            class="button secondary"
            @click="addProductComponent"
          >
            <Icon name="lucide:plus" />Adicionar insumo
          </button>
        </div>
        <p class="components-help">
          A quantidade usada inicia em 2 para insumos em PAR e em 1 para as
          demais unidades.
        </p>
        <div class="components">
          <div
            v-for="(component, index) in productForm.components"
            :key="index"
            class="component-row"
          >
            <label
              >Insumo ou custo<select
                v-model.number="component.materialId"
                required
                @change="
                  selectProductMaterial(
                    component,
                    Number(($event.target as HTMLSelectElement).value),
                  )
                "
              >
                <option :value="null" disabled>Selecione</option>
                <option
                  v-for="material in materials.filter(
                    (item) => item.active || item.id === component.materialId,
                  )"
                  :key="material.id"
                  :value="material.id"
                >
                  {{ material.name }} ·
                  {{ costTypeLabels[material.costType] || material.costType }}
                  ({{ material.unit }})
                </option>
              </select></label
            >
            <label
              >Quantidade usada<input
                v-model.number="component.quantity"
                type="number"
                min="0.0001"
                step="0.0001"
                required
            /></label>
            <label
              >Perda (%)<input
                v-model.number="component.wastePercent"
                type="number"
                min="0"
                max="500"
                step="0.01"
                required
            /></label>
            <strong>{{
              money(
                (materials.find((item) => item.id === component.materialId)
                  ?.unitCost || 0) *
                  component.quantity *
                  (1 + component.wastePercent / 100),
              )
            }}</strong>
            <button
              type="button"
              class="tiny-button danger-text"
              title="Remover insumo"
              :disabled="productForm.components.length === 1"
              @click="productForm.components.splice(index, 1)"
            >
              <Icon name="lucide:trash-2" />
            </button>
          </div>
        </div>
        <div class="product-total">
          <span>Custo estimado de produção</span
          ><strong>{{ money(productCostPreview) }}</strong>
        </div>
        <div class="modal-actions">
          <button
            type="button"
            class="button ghost"
            @click="productModal = false"
          >
            Cancelar</button
          ><button class="button" :disabled="busy">Salvar produto</button>
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
        <label>Nome<input v-model="materialForm.name" required /></label>
        <div class="two-cols">
          <label
            >Tipo de custo<select v-model="materialForm.costType" required>
              <option value="material">Matéria-prima</option>
              <option value="labor">Mão de obra</option>
              <option value="service">Serviço</option>
              <option value="packaging">Embalagem</option>
            </select></label
          >
          <label>Fornecedor<input v-model="materialForm.supplier" /></label>
        </div>
        <div class="three-cols">
          <label
            >Preço da compra<input
              :value="money(materialForm.purchasePrice)"
              type="text"
              inputmode="numeric"
              @input="
                currencyInput($event, materialForm, 'purchasePrice')
              " /></label
          ><label
            >Rendimento por compra<input
              v-model.number="materialForm.yieldQuantity"
              type="number"
              min=".0001"
              step=".0001"
              required /></label
          ><label
            >Unidade<select
              v-model="materialForm.unit"
              @change="setMaterialUsageDefault"
            >
              <option>UN</option>
              <option>PAR</option>
              <option>MT</option>
              <option>KG</option>
              <option>PCT</option>
              <option>CHAPA</option>
              <option>FOLHA</option>
              <option>ROLO</option>
              <option>LT</option>
              <option>ML</option>
              <option>CM</option>
              <option>CX</option>
            </select></label
          >
        </div>
        <div class="yield-calculator">
          <div class="components-head">
            <div>
              <span class="eyebrow">Calculadora de rendimento</span>
              <h3>Custo por produto ou par</h3>
            </div>
          </div>
          <label
            >Quantidade usada<input
              v-model.number="materialUsageQuantity"
              type="number"
              min="0"
              step=".0001"
            />
            <small
              >Informe quanto deste insumo é usado em um produto ou par.</small
            >
          </label>
          <div class="formula">
            Quantidade usada × preço da compra ÷ rendimento
          </div>
        </div>
        <div class="product-total">
          <span>
            Custo para {{ materialUsageQuantity || 0 }} {{ materialForm.unit }}
            <small>
              Custo unitário: {{ money(materialUnitCostPreview) }} por
              {{ materialForm.unit }}
            </small>
          </span>
          <strong>{{ money(materialUsageCostPreview) }}</strong>
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
      <form
        v-else-if="channelModal"
        class="modal"
        @submit.prevent="saveChannel"
      >
        <div class="modal-head">
          <div>
            <span class="eyebrow">Precificação</span>
            <h2>{{ channelForm.id ? "Editar canal" : "Novo canal" }}</h2>
          </div>
          <button
            type="button"
            class="tiny-button"
            @click="channelModal = false"
          >
            <Icon name="lucide:x" />
          </button>
        </div>
        <label
          >Nome<input v-model="channelForm.name" required maxlength="100"
        /></label>
        <div class="two-cols">
          <label
            >Comissão (%)<input
              v-model.number="channelForm.percentageFee"
              type="number"
              min="0"
              max="99.99"
              step="0.01"
              required
          /></label>
          <label
            >Tarifa por unidade<input
              :value="money(channelForm.fixedFee)"
              type="text"
              inputmode="numeric"
              @input="currencyInput($event, channelForm, 'fixedFee')"
          /></label>
        </div>
        <label class="check"
          ><input v-model="channelForm.active" type="checkbox" />Canal
          ativo</label
        >
        <div class="modal-actions">
          <button
            type="button"
            class="button ghost"
            @click="channelModal = false"
          >
            Cancelar</button
          ><button class="button" :disabled="busy">Salvar canal</button>
        </div>
      </form>
      <PdfPreviewContent
        v-else-if="pdfModal"
        :loading="pdfLoading"
        :preview-url="pdfPreviewUrl"
        :pdf-data="pdfPreviewData"
        :file="pdfFile"
        :file-name="pdfFileName"
        @dismiss="closePdfModal"
        @share="sharePdf"
      />
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
      ><div v-if="notice" class="toast" :class="`toast-${noticeType}`">
        <Icon
          :name="
            noticeType === 'success' ? 'lucide:circle-check' : 'lucide:circle-x'
          "
        />{{ notice }}
      </div></Transition
    >
    <ConfirmModal
      v-if="confirmation"
      :title="confirmation.title"
      :message="confirmation.message"
      :confirm-label="confirmation.confirmLabel"
      :danger="confirmation.danger"
      @confirm="settleConfirmation(true)"
      @cancel="settleConfirmation(false)"
    />
  </div>
</template>

<style scoped>
/* Component-specific styles live with their components. */
</style>
