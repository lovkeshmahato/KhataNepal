import type { DiscountType } from "@khatanepal/types";

export interface SaleTotalLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  vatRatePercent: number;
  discountType?: DiscountType;
  discountValue?: number;
}

export interface SaleTotalLineOutput extends SaleTotalLineInput {
  lineDiscount: number;
  lineSubtotal: number;
  lineVat: number;
  lineTotal: number;
  lineCost: number;
}

export interface SaleTotals {
  lines: SaleTotalLineOutput[];
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  total: number;
  totalCost: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Computes per-line and order totals for a sale. Line-level discounts are
 * applied first; an order-level discount (if any) is then prorated across
 * lines by their post-discount value so VAT stays accurate per line even
 * when a cart mixes VAT rates (e.g. VAT-exempt staples + 13% VAT goods).
 */
export function calculateSaleTotals(
  lines: SaleTotalLineInput[],
  orderDiscount?: { type: DiscountType; value: number },
): SaleTotals {
  const stage1 = lines.map((line) => {
    const rawAmount = round2(line.quantity * line.unitPrice);
    const lineDiscount =
      line.discountType === "PERCENTAGE"
        ? round2(rawAmount * ((line.discountValue ?? 0) / 100))
        : round2(Math.min(line.discountValue ?? 0, rawAmount));
    const postDiscount = round2(Math.max(rawAmount - lineDiscount, 0));
    return { ...line, rawAmount, lineDiscount, postDiscount };
  });

  const subtotalAfterLineDiscounts = round2(stage1.reduce((sum, l) => sum + l.postDiscount, 0));

  const orderDiscountAmount = orderDiscount
    ? round2(
        Math.min(
          orderDiscount.type === "PERCENTAGE"
            ? subtotalAfterLineDiscounts * (orderDiscount.value / 100)
            : orderDiscount.value,
          subtotalAfterLineDiscounts,
        ),
      )
    : 0;

  const outputLines: SaleTotalLineOutput[] = stage1.map((l) => {
    const proportion = subtotalAfterLineDiscounts > 0 ? l.postDiscount / subtotalAfterLineDiscounts : 0;
    const orderShare = round2(orderDiscountAmount * proportion);
    const finalBase = round2(Math.max(l.postDiscount - orderShare, 0));
    const lineVat = round2(finalBase * (l.vatRatePercent / 100));
    return {
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      costPrice: l.costPrice,
      vatRatePercent: l.vatRatePercent,
      discountType: l.discountType,
      discountValue: l.discountValue,
      lineDiscount: round2(l.lineDiscount + orderShare),
      lineSubtotal: finalBase,
      lineVat,
      lineTotal: round2(finalBase + lineVat),
      lineCost: round2(l.quantity * l.costPrice),
    };
  });

  return {
    lines: outputLines,
    subtotal: round2(stage1.reduce((sum, l) => sum + l.rawAmount, 0)),
    discountTotal: round2(outputLines.reduce((sum, l) => sum + l.lineDiscount, 0)),
    vatTotal: round2(outputLines.reduce((sum, l) => sum + l.lineVat, 0)),
    total: round2(outputLines.reduce((sum, l) => sum + l.lineTotal, 0)),
    totalCost: round2(outputLines.reduce((sum, l) => sum + l.lineCost, 0)),
  };
}

export function paymentAccountCodeFor(method: string): string {
  switch (method) {
    case "CASH":
      return "1000";
    case "CREDIT":
      return "1100";
    default:
      return "1010"; // card / eSewa / Khalti / Fonepay / bank transfer settle to bank
  }
}
