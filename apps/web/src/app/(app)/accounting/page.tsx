"use client";

import * as React from "react";
import { PageHeader } from "@/components/common/page-header";
import { LoadingState, EmptyState } from "@/components/common/data-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAccounts, useJournalEntries, useLedger } from "@/hooks/use-accounting";
import { formatCurrency, formatDate } from "@/lib/utils";

const TYPE_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  ASSET: "default",
  LIABILITY: "warning",
  EQUITY: "secondary",
  REVENUE: "success",
  EXPENSE: "destructive",
};

export default function AccountingPage() {
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: journalEntries, isLoading: journalLoading } = useJournalEntries();
  const [selectedAccount, setSelectedAccount] = React.useState<string | null>(null);

  return (
    <div>
      <PageHeader title="Accounting" description="Chart of accounts and the general journal, auto-posted from sales & purchases." />

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Chart of accounts</TabsTrigger>
          <TabsTrigger value="journal">Journal entries</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          {accountsLoading && <LoadingState />}
          {accounts && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => setSelectedAccount(a.id)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{a.code}</TableCell>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>
                      <Badge variant={TYPE_VARIANT[a.type] ?? "default"}>{a.type}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="journal">
          {journalLoading && <LoadingState />}
          {journalEntries && journalEntries.length === 0 && <EmptyState title="No journal entries yet" />}
          <div className="space-y-3">
            {journalEntries?.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">{entry.memo}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{entry.sourceType}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {entry.lines.map((line) => (
                    <div key={line.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {line.account.code} · {line.account.name}
                      </span>
                      <span className="tabular-nums">
                        {Number(line.debit) > 0 ? `Dr ${formatCurrency(line.debit)}` : `Cr ${formatCurrency(line.credit)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedAccount} onOpenChange={(v) => !v && setSelectedAccount(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Ledger</SheetTitle>
          </SheetHeader>
          <LedgerView accountId={selectedAccount} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LedgerView({ accountId }: { accountId: string | null }) {
  const { data, isLoading } = useLedger(accountId);
  if (isLoading) return <LoadingState rows={4} />;
  if (!data) return null;
  return (
    <div className="mt-4">
      <p className="mb-3 text-sm font-medium">
        {data.account.code} · {data.account.name}
      </p>
      <div className="space-y-2">
        {data.entries.length === 0 && <EmptyState title="No activity yet" />}
        {data.entries.map((e, i) => (
          <div key={i} className="flex items-center justify-between border-b border-border pb-1.5 text-xs">
            <div>
              <p className="text-muted-foreground">{formatDate(e.date)}</p>
              <p>{e.memo}</p>
            </div>
            <div className="text-right">
              <p className="tabular-nums">{Number(e.debit) > 0 ? `Dr ${formatCurrency(e.debit)}` : `Cr ${formatCurrency(e.credit)}`}</p>
              <p className="text-muted-foreground tabular-nums">Bal {formatCurrency(e.balance)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
