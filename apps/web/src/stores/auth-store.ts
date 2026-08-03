import { create } from "zustand";
import type { Permission } from "@/lib/shared-types";

export interface AuthUser {
  id: string;
  orgId: string;
  email: string;
  fullName: string;
  permissions: string[];
  branchIds: string[];
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  activeBranchId: string | null;
  status: "loading" | "authenticated" | "unauthenticated";
  setAuth: (user: AuthUser, accessToken: string) => void;
  setActiveBranch: (branchId: string) => void;
  clear: () => void;
  hasPermission: (permission: Permission) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  activeBranchId: null,
  status: "loading",
  setAuth: (user, accessToken) =>
    set({
      user,
      accessToken,
      status: "authenticated",
      activeBranchId: get().activeBranchId ?? user.branchIds[0] ?? null,
    }),
  setActiveBranch: (branchId) => set({ activeBranchId: branchId }),
  clear: () => set({ user: null, accessToken: null, status: "unauthenticated" }),
  hasPermission: (permission) => get().user?.permissions.includes(permission) ?? false,
}));
