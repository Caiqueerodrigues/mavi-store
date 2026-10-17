import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
const date = (value: string | null) => formatBrasiliaDate(value);
const pdfStatusLabels: Record<string, string> = {
  pending: "Pendente",
  in_production: "Em produção",
  ready: "Pronto",
  delivered: "Entregue",
  completed: "Concluído",
  cancelled: "Cancelado",
  partial: "Parcial",
  paid: "Pago",
  refunded: "Estornado",
};
const clean = (value: unknown) =>
  String(value ?? "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /^(pending|in_production|ready|delivered|completed|cancelled|partial|paid|refunded)$/,
      (status) => pdfStatusLabels[status] || status,
    );

const productionStatusLabels: Record<string, string> = {
  pending: "Pendente",
  in_production: "Em produção",
  ready: "Pronto",
  delivered: "Entregue",
  completed: "Concluído",
  cancelled: "Cancelado",
};
const paymentStatusLabels: Record<string, string> = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
  refunded: "Estornado",
};

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
    idsParam = String(query.ids || "").trim(),
    sql = db();
  let ids: number[] = [];
  if (idsParam) {
    const parsedIds = idsParam.split(",").map(Number);
    if (
      parsedIds.length > 500 ||
      parsedIds.some((id) => !Number.isSafeInteger(id) || id <= 0)
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "Informe até 500 IDs de pedidos válidos",
      });
    }
    ids = [...new Set(parsedIds)];
  }
  const filter = idsParam ? sql`AND o.id IN ${sql(ids)}` : sql``;
  const orders =
    await sql`SELECT o.*, c.phone AS customer_phone, c.nickname AS customer_nickname
      FROM orders o LEFT JOIN customers c ON c.id=o.customer_id
      WHERE o.deleted_at IS NULL ${filter} ORDER BY o.customer_name, o.order_date, o.id`;
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
      sizes = Array.isArray(row.sizes) ? row.sizes : [],
      sizeText = sizes
        .map((item: any) => `${clean(item.size)}: ${Number(item.quantity)}`)
        .join("    "),
      sizeLines = sizeText ? wrap(sizeText, regular, 8.5, 485) : [],
      customerName = clean(row.customerName),
      customerDisplay = row.customerNickname
        ? `${customerName} (${clean(row.customerNickname)})`
        : customerName,
      customerLines = wrap(
        `Cliente: ${customerDisplay} | Telefone: ${clean(row.customerPhone || "Não informado")}`,
        regular,
        8.5,
        485,
      ),
      orderTotal = Number(row.quantity) * Number(row.unitPrice),
      paidAmount = Number(row.paidAmount),
      paymentLines = wrap(
        `Pagamento: ${paymentStatusLabels[row.paymentStatus] || "Não informado"} | Pago: ${money(paidAmount)} | Saldo: ${money(orderTotal - paidAmount)}`,
        regular,
        8.5,
        485,
      ),
      notesLines = row.notes
        ? wrap(`Observações: ${row.notes}`, regular, 8, 485)
        : [];
    const height =
      132 +
      (description.length - 1) * 12 +
      (customerLines.length - 1) * 11 +
      (paymentLines.length - 1) * 11 +
      sizeLines.length * 11 +
      notesLines.length * 11 +
      (row.withdrawalDate || row.withdrawnBy ? 14 : 0);
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
    customerLines.forEach((line) => {
      page!.drawText(line, {
        x: 48,
        y: innerY,
        size: 8.5,
        font: regular,
        color: charcoal,
      });
      innerY -= 11;
    });
    innerY -= 5;
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
    innerY -= 15;
    const paymentColor = row.paymentStatus === "paid"
      ? green
      : row.paymentStatus === "refunded"
        ? charcoal
        : row.paymentStatus === "partial"
          ? rgb(0.66, 0.39, 0.05)
          : red;
    page!.drawRectangle({
      x: 44,
      y: innerY - paymentLines.length * 11 + 3,
      width: 507,
      height: paymentLines.length * 11 + 7,
      color: row.paymentStatus === "paid"
        ? rgb(0.91, 0.96, 0.92)
        : row.paymentStatus === "partial"
          ? rgb(1, 0.97, 0.88)
          : row.paymentStatus === "refunded"
            ? rgb(0.95, 0.95, 0.95)
            : rgb(1, 0.93, 0.93),
    });
    paymentLines.forEach((line) => {
      page!.drawText(line, {
        x: 48,
        y: innerY,
        size: 8.5,
        font: regular,
        color: paymentColor,
      });
      innerY -= 11;
    });
    sizeLines.forEach((line) => {
      page!.drawText(line, {
        x: 48,
        y: innerY,
        size: 8.5,
        font: regular,
        color: charcoal,
      });
      innerY -= 11;
    });
    if (row.withdrawalDate || row.withdrawnBy)
      page!.drawText(
        `Retirada: ${date(row.withdrawalDate)}  •  Por: ${clean(row.withdrawnBy || "não informado")}`,
        { x: 48, y: innerY, size: 8, font: regular, color: charcoal },
      );
    if (row.withdrawalDate || row.withdrawnBy) innerY -= 12;
    notesLines.forEach((line) => {
      page!.drawText(line, {
        x: 48,
        y: innerY,
        size: 8,
        font: regular,
        color: charcoal,
      });
      innerY -= 11;
    });
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
