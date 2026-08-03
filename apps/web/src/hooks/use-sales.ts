"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateSaleInput } from "@/lib/shared-types";
import { api, ApiError } from "@/lib/api-client";
import { flushOfflineQueue, queuedSaleCount, queueOfflineSale } from "@/lib/offline-queue";

export interface Sale {
  id: string;
  code: string;
  status: string;
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  total: number;
  createdAt: string;
  lines: { productId: string; quantity: number; unitPrice: number; lineTotal: number }[];
  payments: { method: string; amount: number }[];
}

async function submitSale(payload: CreateSaleInput) {
  return api.post<Sale>("/sales", payload);
}

export function useCreateSale() {
  return useMutation({
    mutationFn: async (payload: CreateSaleInput) => {
      try {
        return await submitSale(payload);
      } catch (err) {
        if (err instanceof ApiError) throw err; // real validation/business error — surface it
        await queueOfflineSale(payload); // network failure — queue for later sync
        return { queued: true } as const;
      }
    },
  });
}

export function useSales(params: { branchId?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params.branchId) query.set("branchId", params.branchId);
  if (params.page) query.set("page", String(params.page));
  return useQuery({
    queryKey: ["sales", params],
    queryFn: () => api.get<{ data: Sale[]; meta: { total: number; totalPages: number } }>(`/sales?${query}`),
  });
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = React.useState(true);
  const [pendingCount, setPendingCount] = React.useState(0);
  const queryClient = useQueryClient();

  const refreshPendingCount = React.useCallback(() => {
    queuedSaleCount().then(setPendingCount);
  }, []);

  React.useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshPendingCount();

    async function handleOnline() {
      setIsOnline(true);
      const synced = await flushOfflineQueue(submitSale);
      if (synced > 0) {
        queryClient.invalidateQueries({ queryKey: ["sales"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }
      refreshPendingCount();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [queryClient, refreshPendingCount]);

  return { isOnline, pendingCount, refreshPendingCount };
}
