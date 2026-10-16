export default defineEventHandler(async (event) => {
  if (!event.path.startsWith("/api/")) return;
  const current = await brasiliaNow();
  (event.context as any).serverTime = current;
  setResponseHeader(event, SERVER_TIME_HEADER, current);
});
