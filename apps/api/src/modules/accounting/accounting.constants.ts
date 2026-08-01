/**
 * Standard chart-of-accounts codes used by auto-posting logic in the
 * Sales and Purchasing modules. Seeded by prisma/seed.ts — if an
 * organization deletes/renames these accounts, auto-posting will fail
 * loudly (NotFoundException) rather than silently miscategorize entries.
 */
export const SYSTEM_ACCOUNT_CODES = {
  CASH: "1000",
  BANK: "1010",
  ACCOUNTS_RECEIVABLE: "1100",
  INVENTORY: "1200",
  ACCOUNTS_PAYABLE: "2000",
  VAT_PAYABLE: "2100",
  VAT_RECEIVABLE: "1300",
  SALES_REVENUE: "4000",
  SALES_DISCOUNT: "4100",
  COST_OF_GOODS_SOLD: "5000",
} as const;
