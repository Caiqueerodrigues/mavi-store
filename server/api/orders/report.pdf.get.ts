import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";

const money = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;
const date = (value: string | null) => formatBrasiliaDate(value);
const clean = (value: unknown) =>
  String(value ?? "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = clean(text).split(" "),
    lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export default defineEventHandler(async (event) => {
  requirePermission(event, "pdf:generate");
  const generatedAt = String(
    (event.context as any).serverTime || (await brasiliaNow()),
  );
  const query = getQuery(event),
    ids = String(query.ids || "")
      .split(",")
      .map(Number)
      .filter(Number.isFinite),
    sql = db();
  const filter = ids.length ? sql`AND id IN ${sql(ids)}` : sql``;
  const orders =
    await sql`SELECT * FROM orders WHERE deleted_at IS NULL ${filter} ORDER BY customer_name, order_date, id`;
  if (!orders.length)
    throw createError({
      statusCode: 404,
      statusMessage: "Nenhum pedido para gerar o relatório",
    });

  const pdf = await PDFDocument.create(),
    regular = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let logo: Awaited<ReturnType<typeof pdf.embedPng>> | undefined;
  for (const path of [
    join(process.cwd(), ".output/public/assets/logo-mavi.png"),
    join(process.cwd(), "public/assets/logo-mavi.png"),
  ]) {
    try {
      logo = await pdf.embedPng(await readFile(path));
      break;
    } catch {
      /* tenta o próximo caminho */
    }
  }
  const red = rgb(0.67, 0, 0.12),
    charcoal = rgb(0.18, 0.18, 0.18),
    green = rgb(0.16, 0.61, 0.1),
    light = rgb(0.98, 0.94, 0.95);
  let page: PDFPage,
    y = 0;
  const newPage = () => {
    page = pdf.addPage([595.28, 841.89]);
    y = 805;
    page.drawRectangle({
      x: 0,
      y: 0,
      width: 595.28,
      height: 841.89,
      color: rgb(1, 1, 1),
    });
    page.drawRectangle({ x: 0, y: 818, width: 595.28, height: 24, color: red });
    if (logo) {
      const scaled = logo.scaleToFit(78, 54);
      page.drawImage(logo, {
        x: 42,
        y: 744,
        width: scaled.width,
        height: scaled.height,
      });
    }
    page.drawText("RELATÓRIO DE PEDIDOS", {
      x: 178,
      y: 784,
      size: 17,
      font: bold,
      color: red,
    });
    page.drawText(`Gerado em ${formatBrasiliaDateTime(generatedAt)}`, {
      x: 196,
      y: 766,
      size: 8,
      font: regular,
      color: charcoal,
    });
    page.drawLine({
      start: { x: 38, y: 735 },
      end: { x: 557, y: 735 },
      thickness: 1.2,
      color: red,
    });
    y = 714;
  };
  newPage();
  const total = orders.reduce(
    (sum, row) => sum + Number(row.quantity) * Number(row.unitPrice),
    0,
  );
  const paid = orders.reduce((sum, row) => sum + Number(row.paidAmount), 0);
  page!.drawRectangle({
    x: 38,
    y: y - 42,
    width: 519,
    height: 48,
    color: light,
    borderColor: red,
    borderWidth: 0.6,
  });
  page!.drawText(
    `${orders.length} pedido(s)  |  ${orders.reduce((s, r) => s + Number(r.quantity), 0)} pares/metros`,
    { x: 50, y: y - 13, size: 10, font: bold, color: charcoal },
  );
  page!.drawText(
    `Total ${money(total)}   •   Pago ${money(paid)}   •   Devido ${money(total - paid)}`,
    {
      x: 50,
      y: y - 31,
      size: 10,
      font: bold,
      color: total - paid > 0 ? red : green,
    },
  );
  y -= 62;

  for (const row of orders) {
    const description = wrap(row.productDescription, bold, 10, 485),
      sizes = Array.isArray(row.sizes) ? row.sizes : [];
    const height =
      102 +
      (description.length - 1) * 12 +
      (sizes.length ? 30 : 0) +
      (row.notes ? 18 : 0);
    if (y - height < 42) newPage();
    page!.drawRectangle({
      x: 38,
      y: y - height,
      width: 519,
      height,
      borderColor: charcoal,
      borderWidth: 0.7,
    });
    page!.drawRectangle({
      x: 38,
      y: y - 25,
      width: 519,
      height: 25,
      color: red,
    });
    page!.drawText(clean(row.orderType).toUpperCase(), {
      x: 48,
      y: y - 17,
      size: 11,
      font: bold,
      color: rgb(1, 1, 1),
    });
    page!.drawText(
      `#${clean(row.orderNumber)}  •  ${clean(row.customerName)}`,
      { x: 155, y: y - 17, size: 10, font: bold, color: rgb(1, 1, 1) },
    );
    let innerY = y - 43;
    page!.drawText(
      `Pedido: ${date(row.orderDate)}    Entrega: ${date(row.dueDate)}    Status: ${clean(row.status)}`,
      { x: 48, y: innerY, size: 8.5, font: regular, color: charcoal },
    );
    innerY -= 16;
    description.forEach((line) => {
      page!.drawText(line, {
        x: 48,
        y: innerY,
        size: 10,
        font: bold,
        color: charcoal,
      });
      innerY -= 12;
    });
    page!.drawText(
      `${clean(row.material || "Material não informado")}  •  ${clean(row.color || "Cor não informada")}`,
      { x: 48, y: innerY, size: 8.5, font: regular, color: charcoal },
    );
    innerY -= 17;
    page!.drawText(
      `${Number(row.quantity)} pares/metros  •  ${money(Number(row.unitPrice))} por unidade  •  Total ${money(Number(row.quantity) * Number(row.unitPrice))}`,
      { x: 48, y: innerY, size: 9, font: bold, color: red },
    );
    innerY -= 18;
    if (sizes.length) {
      const sizeText = sizes
        .map((item: any) => `${clean(item.size)}: ${Number(item.quantity)}`)
        .join("    ");
      wrap(sizeText, regular, 8.5, 485).forEach((line) => {
        page!.drawText(line, {
          x: 48,
          y: innerY,
          size: 8.5,
          font: regular,
          color: charcoal,
        });
        innerY -= 11;
      });
    }
    if (row.withdrawalDate || row.withdrawnBy)
      page!.drawText(
        `Retirada: ${date(row.withdrawalDate)}  •  Por: ${clean(row.withdrawnBy || "não informado")}`,
        { x: 48, y: innerY, size: 8, font: regular, color: charcoal },
      );
    y -= height + 12;
  }
  const pages = pdf.getPages();
  pages.forEach((item, index) =>
    item.drawText(`Mavi Store  •  Página ${index + 1} de ${pages.length}`, {
      x: 225,
      y: 18,
      size: 7,
      font: regular,
      color: charcoal,
    }),
  );
  await audit(event, "PDF_GENERATED", "order_report", undefined, {
    orderIds: orders.map((row) => row.id),
    count: orders.length,
  });
  setResponseHeader(event, "content-type", "application/pdf");
  setResponseHeader(
    event,
    "content-disposition",
    `inline; filename="relatorio-pedidos-${generatedAt.slice(0, 10)}.pdf"`,
  );
  setResponseHeader(event, "cache-control", "no-store");
  return new Uint8Array(await pdf.save());
});
