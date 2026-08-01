import { z } from "zod";
import { PAYMENT_METHODS, DISCOUNT_TYPES } from "./enums";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const moneySchema = z.coerce.number().nonnegative().finite();

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(64),
  barcode: z.string().max(64).optional().nullable(),
  categoryId: z.string().min(1),
  unitId: z.string().min(1),
  costPrice: moneySchema,
  sellingPrice: moneySchema,
  vatRateId: z.string().min(1),
  reorderLevel: z.coerce.number().int().nonnegative().default(10),
  isActive: z.boolean().default(true),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const cartLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: moneySchema,
  discountType: z.enum(DISCOUNT_TYPES).optional(),
  discountValue: z.coerce.number().nonnegative().optional(),
});
export type CartLineInput = z.infer<typeof cartLineSchema>;

export const createSaleSchema = z.object({
  branchId: z.string().min(1),
  customerId: z.string().min(1).optional().nullable(),
  registerSessionId: z.string().min(1),
  lines: z.array(cartLineSchema).min(1, "Add at least one item"),
  payments: z
    .array(
      z.object({
        method: z.enum(PAYMENT_METHODS),
        amount: moneySchema,
        reference: z.string().optional(),
      }),
    )
    .min(1, "Add at least one payment"),
  discountType: z.enum(DISCOUNT_TYPES).optional(),
  discountValue: z.coerce.number().nonnegative().optional(),
});
export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z
    .string()
    .regex(/^(97|98)\d{8}$/, "Enter a valid Nepali mobile number")
    .optional()
    .or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  panNumber: z.string().max(20).optional(),
  address: z.string().max(300).optional(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  panNumber: z.string().max(20).optional(),
  address: z.string().max(300).optional(),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const purchaseOrderLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitCost: moneySchema,
});

export const createPurchaseOrderSchema = z.object({
  branchId: z.string().min(1),
  supplierId: z.string().min(1),
  expectedDate: z.coerce.date().optional(),
  lines: z.array(purchaseOrderLineSchema).min(1, "Add at least one item"),
  notes: z.string().max(500).optional(),
});
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

export const stockAdjustmentSchema = z.object({
  branchId: z.string().min(1),
  productId: z.string().min(1),
  quantityDelta: z.coerce.number().refine((n) => n !== 0, "Quantity delta cannot be zero"),
  reason: z.string().min(1).max(300),
});
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  path?: string;
  timestamp?: string;
}
