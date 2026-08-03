/**
 * Canonical enum vocabularies. Mirrored 1:1 by the `enum` blocks in
 * `apps/api/prisma/schema.prisma` — Prisma enums can't be imported into a
 * plain TS package, so this file is the source of truth for the web app
 * and the Prisma schema is kept in sync by hand.
 */

export const PAYMENT_METHODS = [
  "CASH",
  "CARD",
  "ESEWA",
  "KHALTI",
  "FONEPAY",
  "BANK_TRANSFER",
  "CREDIT",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SALE_STATUSES = ["HELD", "COMPLETED", "VOIDED", "REFUNDED"] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const PURCHASE_ORDER_STATUSES = [
  "DRAFT",
  "ORDERED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const STOCK_MOVEMENT_TYPES = [
  "PURCHASE_IN",
  "SALE_OUT",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "RETURN_IN",
  "RETURN_OUT",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED_AMOUNT"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const JOURNAL_SOURCE_TYPES = [
  "SALE",
  "PURCHASE",
  "MANUAL",
  "STOCK_ADJUSTMENT",
  "PAYMENT",
] as const;
export type JournalSourceType = (typeof JOURNAL_SOURCE_TYPES)[number];
