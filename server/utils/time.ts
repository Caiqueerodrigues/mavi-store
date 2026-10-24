export const APP_TIME_ZONE = "America/Sao_Paulo";
export const SERVER_TIME_HEADER = "X-Server-Time";

export async function brasiliaNow() {
  const [row] =
    await db()`SELECT to_char(clock_timestamp() AT TIME ZONE ${APP_TIME_ZONE}, 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS value`;
  return `${row!.value}-03:00`;
}

export function formatBrasiliaDate(value?: string | Date | null) {
  if (!value) return "—";
  const dateOnly = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const [year, month, day] = dateOnly.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

export function formatBrasiliaDateTime(value?: string | null) {
  if (!value) return "—";
  const date = formatBrasiliaDate(value);
  const time = String(value).slice(11, 16);
  return time ? `${date} ${time}` : date;
}
