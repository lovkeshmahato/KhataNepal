"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useVatReport(branchId?: string) {
  return useQuery({
    queryKey: ["vat-report", branchId],
    queryFn: () =>
      api.get<{
        sales: { code: string; createdAt: string; subtotal: number; vatTotal: number; total: number }[];
        totalVatCollected: number;
        saleCount: number;
      }>(`/reports/vat${branchId ? `?branchId=${branchId}` : ""}`),
  });
}

export function useTopProducts(branchId?: string) {
  return useQuery({
    queryKey: ["top-products", branchId],
    queryFn: () =>
      api.get<{ product?: { name: string; sku: string }; quantitySold: number; revenue: number }[]>(
        `/reports/top-products${branchId ? `?branchId=${branchId}` : ""}`,
      ),
  });
}

export function useInventoryValuation(branchId?: string) {
  return useQuery({
    queryKey: ["inventory-valuation", branchId],
    queryFn: () =>
      api.get<{
        rows: { productId: string; productName: string; sku: string; quantity: number; costPrice: number; valuation: number }[];
        totalValuation: number;
      }>(`/reports/inventory-valuation${branchId ? `?branchId=${branchId}` : ""}`),
  });
}
