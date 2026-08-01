"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface CashRegister {
  id: string;
  branchId: string;
  name: string;
}

export interface RegisterSession {
  id: string;
  registerId: string;
  openingCash: number;
  status: "OPEN" | "CLOSED";
  register: CashRegister;
}

export function useRegisters(branchId?: string) {
  return useQuery({
    queryKey: ["registers", branchId],
    queryFn: () => api.get<CashRegister[]>(`/registers${branchId ? `?branchId=${branchId}` : ""}`),
    enabled: !!branchId,
  });
}

export function useActiveRegisterSession(branchId?: string) {
  return useQuery({
    queryKey: ["register-session-active", branchId],
    queryFn: () => api.get<RegisterSession | null>(`/register-sessions/active?branchId=${branchId}`),
    enabled: !!branchId,
    retry: false,
  });
}

export function useOpenRegisterSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { registerId: string; openingCash: number }) =>
      api.post<RegisterSession>("/register-sessions/open", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["register-session-active"] }),
  });
}

export function useCloseRegisterSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, closingCash }: { id: string; closingCash: number }) =>
      api.post(`/register-sessions/${id}/close`, { closingCash }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["register-session-active"] }),
  });
}
