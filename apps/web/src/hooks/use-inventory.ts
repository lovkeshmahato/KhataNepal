"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StockAdjustmentInput } from "@/lib/shared-types";
import { api } from "@/lib/api-client";

export interface StockItem {
  id: string;
  branchId: string;
  productId: string;
  quantity: number;
  product: { id: string; name: string; sku: string; reorderLevel: number; unit: { abbreviation: string } };
  branch: { id: string; name: string };
}

export interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
  product: { name: string; sku: string };
  branch: { name: string };
}

export function useStockLevels(branchId?: string) {
  return useQuery({
    queryKey: ["stock-levels", branchId],
    queryFn: () => api.get<StockItem[]>(`/inventory/stock${branchId ? `?branchId=${branchId}` : ""}`),
  });
}

export function useLowStock(branchId?: string) {
  return useQuery({
    queryKey: ["stock-low", branchId],
    queryFn: () => api.get<StockItem[]>(`/inventory/stock/low${branchId ? `?branchId=${branchId}` : ""}`),
  });
}

export function useStockMovements(branchId?: string) {
  return useQuery({
    queryKey: ["stock-movements", branchId],
    queryFn: () => api.get<StockMovement[]>(`/inventory/movements${branchId ? `?branchId=${branchId}` : ""}`),
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StockAdjustmentInput) => api.post("/inventory/adjust", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
      queryClient.invalidateQueries({ queryKey: ["stock-low"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}
