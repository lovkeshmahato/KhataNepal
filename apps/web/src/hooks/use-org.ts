"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Organization {
  id: string;
  name: string;
  legalName: string | null;
  panNumber: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  defaultVatRate: number;
  currency: string;
}

export function useOrganization() {
  return useQuery({ queryKey: ["organization"], queryFn: () => api.get<Organization>("/organization") });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Organization>) => api.patch<Organization>("/organization", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organization"] }),
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; code: string; address?: string; phone?: string }) =>
      api.post("/branches", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches"] }),
  });
}
