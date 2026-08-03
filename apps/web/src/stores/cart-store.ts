import { create } from "zustand";
import type { DiscountType } from "@/lib/shared-types";

export interface CartLine {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  vatRatePercent: number;
  quantity: number;
  discountType?: DiscountType;
  discountValue?: number;
  availableStock?: number;
}

interface CartState {
  lines: CartLine[];
  customerId: string | null;
  orderDiscountType?: DiscountType;
  orderDiscountValue?: number;
  addLine: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateLineDiscount: (productId: string, type?: DiscountType, value?: number) => void;
  removeLine: (productId: string) => void;
  setCustomer: (customerId: string | null) => void;
  setOrderDiscount: (type?: DiscountType, value?: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  customerId: null,
  orderDiscountType: undefined,
  orderDiscountValue: undefined,

  addLine: (line, quantity = 1) => {
    const existing = get().lines.find((l) => l.productId === line.productId);
    if (existing) {
      set({
        lines: get().lines.map((l) =>
          l.productId === line.productId ? { ...l, quantity: l.quantity + quantity } : l,
        ),
      });
    } else {
      set({ lines: [...get().lines, { ...line, quantity }] });
    }
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      set({ lines: get().lines.filter((l) => l.productId !== productId) });
      return;
    }
    set({ lines: get().lines.map((l) => (l.productId === productId ? { ...l, quantity } : l)) });
  },

  updateLineDiscount: (productId, discountType, discountValue) => {
    set({
      lines: get().lines.map((l) => (l.productId === productId ? { ...l, discountType, discountValue } : l)),
    });
  },

  removeLine: (productId) => set({ lines: get().lines.filter((l) => l.productId !== productId) }),
  setCustomer: (customerId) => set({ customerId }),
  setOrderDiscount: (orderDiscountType, orderDiscountValue) => set({ orderDiscountType, orderDiscountValue }),
  clear: () => set({ lines: [], customerId: null, orderDiscountType: undefined, orderDiscountValue: undefined }),
}));
