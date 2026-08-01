"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export interface Branch {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export function useBranches() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
    enabled: status === "authenticated",
  });
}
