import type { CartLine } from "@/stores/cart-store";

/**
 * Client-side mirror of the API's `calculateSaleTotals` (apps/api/src/modules/sales/sales.utils.ts)
 * used only to render a live-updating cart total. The API recomputes
 * authoritatively from server-side product/VAT data at checkout time, so
 * this preview never needs to be byte-for-byte identical — just close
 * enough for a responsive UI.
 */
export function calculateSaleTotalsPreview(lines: CartLine[]) {
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  let subtotal = 0;
  let discountTotal = 0;
  let vatTotal = 0;

  for (const line of lines) {
    const rawAmount = line.unitPrice * line.quantity;
    const discount =
      line.discountType === "PERCENTAGE"
        ? rawAmount * ((line.discountValue ?? 0) / 100)
        : Math.min(line.discountValue ?? 0, rawAmount);
    const base = Math.max(rawAmount - discount, 0);
    const vat = base * (line.vatRatePercent / 100);

    subtotal += rawAmount;
    discountTotal += discount;
    vatTotal += vat;
  }

  const total = subtotal - discountTotal + vatTotal;

  return {
    subtotal: round2(subtotal),
    discountTotal: round2(discountTotal),
    vatTotal: round2(vatTotal),
    total: round2(total),
  };
}
