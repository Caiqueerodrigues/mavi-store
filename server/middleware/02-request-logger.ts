import { randomUUID } from "node:crypto";

const STATIC_PREFIXES = ["/_nuxt/", "/assets/", "/favicon."];

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  if (STATIC_PREFIXES.some((prefix) => path.startsWith(prefix))) return;

  const startedAt = performance.now();
  const requestId = getHeader(event, "x-request-id")?.slice(0, 100) || randomUUID();
  (event.context as any).requestLog = { requestId, startedAt };
  setResponseHeader(event, "x-request-id", requestId);

  let logged = false;
  const logRequest = () => {
    if (logged) return;
    logged = true;

    const status = event.node.res.statusCode || 200;
    if (status < 400) return;
    const user = (event.context as any).user;
    const entry = {
      timestamp: new Date().toISOString(),
      level: status >= 500 ? "error" : "warn",
      event: "http_request",
      requestId,
      method: event.method,
      path,
      status,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      userId: user?.id || null,
      role: user?.role || null,
    };

    const line = `${JSON.stringify(entry)}\n`;
    process.stderr.write(line);
  };

  event.node.res.once("finish", logRequest);
  event.node.res.once("close", logRequest);
});
