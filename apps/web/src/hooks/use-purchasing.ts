"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePurchaseOrderInput, CreateSupplierInput } from "@/lib/shared-types";
import { api } from "@/lib/api-client";

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

export interface PurchaseOrderLine {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  receivedQuantity: number;
  product?: { name: string; sku: string };
}

export interface PurchaseOrder {
  id: string;
  code: string;
  status: string;
  subtotal: number;
  total: number;
  createdAt: string;
  supplier: Supplier;
  lines: PurchaseOrderLine[];
}

export function useSuppliers() {
  return useQuery({ queryKey: ["suppliers"], queryFn: () => api.get<Supplier[]>("/suppliers") });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSupplierInput) => api.post<Supplier>("/suppliers", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function usePurchaseOrders(branchId?: string) {
  return useQuery({
    queryKey: ["purchase-orders", branchId],
    queryFn: () => api.get<PurchaseOrder[]>(`/purchase-orders${branchId ? `?branchId=${branchId}` : ""}`),
  });
}

export function usePurchaseOrder(id: string | null) {
  return useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => api.get<PurchaseOrder>(`/purchase-orders/${id}`),
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePurchaseOrderInput) => api.post<PurchaseOrder>("/purchase-orders", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}

export function useReceiveGoods() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      purchaseOrderId,
      lines,
      notes,
    }: {
      purchaseOrderId: string;
      lines: { purchaseOrderLineId: string; quantity: number }[];
      notes?: string;
    }) => api.post(`/purchase-orders/${purchaseOrderId}/receive`, { lines, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order"] });
      queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
    },
  });
}
