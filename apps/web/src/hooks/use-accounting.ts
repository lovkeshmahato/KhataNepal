"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

export interface JournalLine {
  id: string;
  debit: number;
  credit: number;
  account: Account;
}

export interface JournalEntry {
  id: string;
  date: string;
  memo: string | null;
  sourceType: string;
  lines: JournalLine[];
}

export function useAccounts() {
  return useQuery({ queryKey: ["accounts"], queryFn: () => api.get<Account[]>("/accounting/accounts") });
}

export function useJournalEntries(branchId?: string) {
  return useQuery({
    queryKey: ["journal-entries", branchId],
    queryFn: () => api.get<JournalEntry[]>(`/accounting/journal-entries${branchId ? `?branchId=${branchId}` : ""}`),
  });
}

export function useLedger(accountId: string | null) {
  return useQuery({
    queryKey: ["ledger", accountId],
    queryFn: () =>
      api.get<{ account: Account; entries: { date: string; memo: string | null; debit: number; credit: number; balance: number }[] }>(
        `/accounting/accounts/${accountId}/ledger`,
      ),
    enabled: !!accountId,
  });
}
