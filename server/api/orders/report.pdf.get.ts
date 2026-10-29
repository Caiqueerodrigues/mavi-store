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

function parseOrderSizes(value: unknown): Array<{ size: string; color: string; quantity: number }> {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({ size: String(item.size ?? ""), color: String(item.color ?? ""), quantity: Number(item.quantity) || 0 }));
}

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
    if (font.widthOfTextAtSize(word, size) > width) {
      if (line) lines.push(line);
      line = "";
      let chunk = "";
      for (const character of Array.from(word)) {
        const next = chunk + character;
        if (chunk && font.widthOfTextAtSize(next, size) > width) {
          lines.push(chunk);
          chunk = character;
        } else chunk = next;
      }
      line = chunk;
      continue;
    }
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function fittedFontSize(text: string, font: PDFFont, preferredSize: number, maxWidth: number) {
  let size = preferredSize;
  while (size > 7 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  return size;
}

function fitSingleLine(text: string, font: PDFFont, preferredSize: number, maxWidth: number) {
  const size = fittedFontSize(text, font, preferredSize, maxWidth);
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return { text, size };

  const suffix = "...";
  let fitted = text;
  while (fitted && font.widthOfTextAtSize(`${fitted}${suffix}`, size) > maxWidth) {
    fitted = fitted.slice(0, -1).trimEnd();
  }
  return { text: fitted ? `${fitted}${suffix}` : "", size };
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
      throw createApiError({
        statusCode: 400,
        message: "Informe até 500 IDs de pedidos válidos",
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
    throw createApiError({
      statusCode: 404,
      message: "Nenhum pedido para gerar o relatório",
    });

  const pdf = await PDFDocument.create(),
    regular = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let logo: Awaited<ReturnType<typeof pdf.embedPng>> | undefined;
  for (const path of [
    join(process.cwd(), ".output/public/assets/logo_sem_fundo.png"),
    join(process.cwd(), "public/assets/logo_sem_fundo.png"),
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
  const productionStatusStyles: Record<string, { label: string; background: ReturnType<typeof rgb>; foreground: ReturnType<typeof rgb> }> = {
    pending: { label: "Pendente", background: rgb(1, 0.96, 0.86), foreground: rgb(0.58, 0.35, 0.05) },
    in_production: { label: "Em produção", background: rgb(0.9, 0.94, 1), foreground: rgb(0.16, 0.34, 0.63) },
    ready: { label: "Pronto", background: rgb(0.89, 0.96, 0.91), foreground: rgb(0.12, 0.48, 0.29) },
    delivered: { label: "Entregue", background: rgb(0.87, 0.96, 0.94), foreground: rgb(0.08, 0.43, 0.39) },
    completed: { label: "Concluído", background: rgb(0.92, 0.91, 0.98), foreground: rgb(0.38, 0.29, 0.58) },
    cancelled: { label: "Cancelado", background: rgb(1, 0.91, 0.91), foreground: red },
  };
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
      const scaled = logo.scaleToFit(64, 64);
      page.drawImage(logo, {
        x: 38,
        y: 748,
        width: scaled.width,
        height: scaled.height,
      });
    }
    page.drawText("RELATÓRIO DE PEDIDOS", {
      x: 116,
      y: 785,
      size: 17,
      font: bold,
      color: red,
    });
    page.drawText(`Gerado em ${formatBrasiliaDateTime(generatedAt)}`, {
      x: 116,
      y: 767,
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
    const gradeColorColumnWidth = 321;
    const description = wrap(row.productDescription, bold, 10, 485),
      sizes = parseOrderSizes(row.sizes),
      gradeColorLines = sizes.map((size: any) => {
        const lines = wrap(size.color, regular, 7, gradeColorColumnWidth);
        return lines.length ? lines : [""];
      }),
      gradeRowHeights = gradeColorLines.map((lines: string[]) => Math.max(14, lines.length * 8 + 6)),
      gradeHeight = sizes.length ? 29 + gradeRowHeights.reduce((sum: number, value: number) => sum + value, 0) : 0,
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
      paymentDateLines = wrap(
        `Data do pagamento: ${date(row.paymentDate)}`,
        regular,
        8.5,
        485,
      ),
      notesLines = row.notes
        ? wrap(`Observações: ${row.notes}`, regular, 8, 485)
        : [];
    const height =
      132 + customerLines.length * 11 + description.length * 12 +
      paymentLines.length * 11 + paymentDateLines.length * 11 + gradeHeight + notesLines.length * 11;
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
      y: y - 29,
      width: 519,
      height: 29,
      color: red,
    });
    const headerStartX = 48,
      headerEndX = 547,
      headerGap = 14,
      orderReference = `#${clean(row.orderNumber)}  •  ${clean(row.customerName)}`,
      fittedOrderReference = fitSingleLine(orderReference, bold, 8.5, 235),
      orderReferenceWidth = bold.widthOfTextAtSize(
        fittedOrderReference.text,
        fittedOrderReference.size,
      ),
      orderReferenceX = headerEndX - orderReferenceWidth,
      orderType = fitSingleLine(
        clean(row.orderType).toUpperCase(),
        bold,
        11,
        orderReferenceX - headerGap - headerStartX,
      );
    page!.drawText(orderType.text, {
      x: headerStartX,
      y: y - 17,
      size: orderType.size,
      font: bold,
      color: rgb(1, 1, 1),
    });
    page!.drawText(fittedOrderReference.text, {
      x: orderReferenceX,
      y: y - 19,
      size: fittedOrderReference.size,
      font: bold,
      color: rgb(1, 1, 1),
    });
    let innerY = y - 47;
    const deliveryDetails = `Entrega: ${date(row.withdrawalDate)}${row.withdrawnBy ? `  •  Retirado por: ${clean(row.withdrawnBy)}` : ""}`;
    const orderDates = `Pedido: ${date(row.orderDate)}    ${deliveryDetails}`;
    page!.drawText(orderDates, {
      x: 48, y: innerY, size: fittedFontSize(orderDates, regular, 8.5, 485),
      font: regular, color: charcoal,
    });
    const statusStyle = productionStatusStyles[String(row.status)] || {
      label: clean(row.status) || "NÃ£o informado",
      background: rgb(0.95, 0.95, 0.95), foreground: charcoal,
    };
    const statusWidth = Math.min(150, bold.widthOfTextAtSize(statusStyle.label, 8) + 14);
    page!.drawRectangle({ x: 545 - statusWidth, y: innerY - 4, width: statusWidth, height: 15, color: statusStyle.background });
    page!.drawText(statusStyle.label, {
      x: 545 - statusWidth + 7, y: innerY, size: fittedFontSize(statusStyle.label, bold, 8, statusWidth - 14),
      font: bold, color: statusStyle.foreground,
    });
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
      y: innerY - (paymentLines.length + paymentDateLines.length) * 11 + 3,
      width: 507,
      height: (paymentLines.length + paymentDateLines.length) * 11 + 7,
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
    paymentDateLines.forEach((line) => {
      page!.drawText(line, {
        x: 48,
        y: innerY,
        size: 8.5,
        font: regular,
        color: paymentColor,
      });
      innerY -= 11;
    });
    if (sizes.length) {
      const gridX = 48, gridWidth = 499, sizeColumnEnd = gridX + 96,
        quantityColumnEnd = gridX + 162, colorX = gridX + 170;
      const gradeTotal = sizes.reduce((sum: number, size: any) => sum + Number(size.quantity || 0), 0);
      const titleY = innerY - 7, gridTop = titleY - 5, headerHeight = 14;
      const rowsHeight = gradeRowHeights.reduce((sum: number, value: number) => sum + value, 0);
      const gridHeight = headerHeight + rowsHeight;
      const subtleLine = rgb(0.82, 0.89, 0.84), gradeGreen = rgb(0.14, 0.45, 0.32);
      page!.drawText("GRADE DE TAMANHOS E CORES", { x: gridX, y: titleY, size: 7, font: bold, color: gradeGreen });
      const gradeTotalText = `${gradeTotal} pares`;
      page!.drawText(gradeTotalText, { x: gridX + gridWidth - bold.widthOfTextAtSize(gradeTotalText, 7), y: titleY, size: 7, font: bold, color: gradeGreen });
      page!.drawRectangle({ x: gridX, y: gridTop - headerHeight, width: gridWidth, height: headerHeight, color: rgb(0.91, 0.96, 0.92) });
      page!.drawRectangle({ x: gridX, y: gridTop - gridHeight, width: gridWidth, height: gridHeight, borderColor: subtleLine, borderWidth: 0.45 });
      page!.drawLine({ start: { x: sizeColumnEnd, y: gridTop }, end: { x: sizeColumnEnd, y: gridTop - gridHeight }, thickness: 0.35, color: subtleLine });
      page!.drawLine({ start: { x: quantityColumnEnd, y: gridTop }, end: { x: quantityColumnEnd, y: gridTop - gridHeight }, thickness: 0.35, color: subtleLine });
      page!.drawText("Tamanho", { x: gridX + 8, y: gridTop - 10, size: 7, font: bold, color: charcoal });
      page!.drawText("Qtd.", { x: sizeColumnEnd + 8, y: gridTop - 10, size: 7, font: bold, color: charcoal });
      page!.drawText("Cor", { x: colorX, y: gridTop - 10, size: 7, font: bold, color: charcoal });
      let rowTop = gridTop - headerHeight;
      sizes.forEach((size: any, index: number) => {
        const rowHeight = gradeRowHeights[index];
        page!.drawLine({ start: { x: gridX, y: rowTop }, end: { x: gridX + gridWidth, y: rowTop }, thickness: 0.3, color: subtleLine });
        page!.drawText(clean(size.size), { x: gridX + 8, y: rowTop - 10, size: 8, font: regular, color: charcoal });
        const quantity = String(size.quantity);
        const quantityWidth = regular.widthOfTextAtSize(quantity, 8);
        page!.drawText(quantity, { x: quantityColumnEnd - 8 - quantityWidth, y: rowTop - 10, size: 8, font: regular, color: charcoal });
        gradeColorLines[index].forEach((line: string, lineIndex: number) => {
          if (line) page!.drawText(line, { x: colorX, y: rowTop - 10 - lineIndex * 8, size: 7, font: regular, color: charcoal });
        });
        rowTop -= rowHeight;
      });
      innerY = gridTop - gridHeight - 3;
    }
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
