"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateCustomerInput } from "@/lib/shared-types";
import { api } from "@/lib/api-client";

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  loyaltyPoints: number;
  createdAt?: string;
}

export function useCustomers(search = "") {
  return useQuery({
    queryKey: ["customers", search],
    queryFn: () => api.get<Customer[]>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomerInput) => api.post<Customer>("/customers", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useCustomerPurchaseHistory(customerId: string | null) {
  return useQuery({
    queryKey: ["customer-purchase-history", customerId],
    queryFn: () => api.get<{ id: string; code: string; total: number; createdAt: string }[]>(`/customers/${customerId}/purchase-history`),
    enabled: !!customerId,
  });
}
