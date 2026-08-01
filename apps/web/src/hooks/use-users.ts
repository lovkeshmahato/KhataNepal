"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  roles: { role: { id: string; name: string } }[];
  branches: { branch: { id: string; name: string } }[];
}

export interface RoleOption {
  id: string;
  name: string;
  permissions: string[];
}

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: () => api.get<UserSummary[]>("/users") });
}

export function useRoles() {
  return useQuery({ queryKey: ["roles"], queryFn: () => api.get<RoleOption[]>("/users/roles") });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      email: string;
      password: string;
      fullName: string;
      roleIds: string[];
      branchIds: string[];
    }) => api.post<UserSummary>("/users", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}
