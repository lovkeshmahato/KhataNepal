/**
 * Central RBAC vocabulary shared by the API (guards) and the web app
 * (conditional UI rendering). Keep this the single source of truth —
 * both sides import from here instead of redefining role/permission strings.
 */

export const SYSTEM_ROLES = [
  "OWNER",
  "ADMIN",
  "BRANCH_MANAGER",
  "CASHIER",
  "INVENTORY_CLERK",
  "ACCOUNTANT",
  "AUDITOR",
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const PERMISSIONS = {
  // Organization & branches
  ORG_MANAGE: "org:manage",
  BRANCH_MANAGE: "branch:manage",
  USER_MANAGE: "user:manage",
  ROLE_MANAGE: "role:manage",

  // Catalog & inventory
  PRODUCT_READ: "product:read",
  PRODUCT_WRITE: "product:write",
  INVENTORY_READ: "inventory:read",
  INVENTORY_ADJUST: "inventory:adjust",

  // Purchasing
  SUPPLIER_MANAGE: "supplier:manage",
  PURCHASE_ORDER_READ: "purchase_order:read",
  PURCHASE_ORDER_WRITE: "purchase_order:write",
  GOODS_RECEIPT_WRITE: "goods_receipt:write",

  // Sales / POS
  SALE_CREATE: "sale:create",
  SALE_READ: "sale:read",
  SALE_VOID: "sale:void",
  REGISTER_MANAGE: "register:manage",
  DISCOUNT_APPLY: "discount:apply",

  // CRM
  CUSTOMER_READ: "customer:read",
  CUSTOMER_WRITE: "customer:write",

  // Accounting
  ACCOUNTING_READ: "accounting:read",
  ACCOUNTING_WRITE: "accounting:write",

  // Reporting & audit
  REPORT_READ: "report:read",
  AUDIT_LOG_READ: "audit_log:read",
  AI_INSIGHTS_READ: "ai_insights:read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Default permission grants per system role — used by the seed script. */
export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  OWNER: Object.values(PERMISSIONS),
  ADMIN: Object.values(PERMISSIONS).filter((p) => p !== PERMISSIONS.ORG_MANAGE),
  BRANCH_MANAGER: [
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_WRITE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.SUPPLIER_MANAGE,
    PERMISSIONS.PURCHASE_ORDER_READ,
    PERMISSIONS.PURCHASE_ORDER_WRITE,
    PERMISSIONS.GOODS_RECEIPT_WRITE,
    PERMISSIONS.SALE_CREATE,
    PERMISSIONS.SALE_READ,
    PERMISSIONS.SALE_VOID,
    PERMISSIONS.REGISTER_MANAGE,
    PERMISSIONS.DISCOUNT_APPLY,
    PERMISSIONS.CUSTOMER_READ,
    PERMISSIONS.CUSTOMER_WRITE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.AI_INSIGHTS_READ,
    PERMISSIONS.USER_MANAGE,
  ],
  CASHIER: [
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.SALE_CREATE,
    PERMISSIONS.SALE_READ,
    PERMISSIONS.CUSTOMER_READ,
    PERMISSIONS.CUSTOMER_WRITE,
    PERMISSIONS.DISCOUNT_APPLY,
    PERMISSIONS.REGISTER_MANAGE,
  ],
  INVENTORY_CLERK: [
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_WRITE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.SUPPLIER_MANAGE,
    PERMISSIONS.PURCHASE_ORDER_READ,
    PERMISSIONS.PURCHASE_ORDER_WRITE,
    PERMISSIONS.GOODS_RECEIPT_WRITE,
  ],
  ACCOUNTANT: [
    PERMISSIONS.ACCOUNTING_READ,
    PERMISSIONS.ACCOUNTING_WRITE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.SALE_READ,
    PERMISSIONS.PURCHASE_ORDER_READ,
  ],
  AUDITOR: [
    PERMISSIONS.AUDIT_LOG_READ,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.SALE_READ,
    PERMISSIONS.ACCOUNTING_READ,
    PERMISSIONS.INVENTORY_READ,
  ],
};
