"use client";

import * as React from "react";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { LoadingState, EmptyState } from "@/components/common/data-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";
import { useSales } from "@/hooks/use-sales";
import { api, ApiError } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PERMISSIONS } from "@/lib/shared-types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  COMPLETED: "success",
  HELD: "warning",
  VOIDED: "destructive",
  REFUNDED: "secondary",
};

export default function SalesHistoryPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { data, isLoading } = useSales({ branchId: activeBranchId ?? undefined });
  const [voidingId, setVoidingId] = React.useState<string | null>(null);

  return (
    <div>
      <PageHeader title="Sales History" description="All transactions recorded at this branch." />

      {isLoading && <LoadingState />}
      {data?.data.length === 0 && <EmptyState title="No sales recorded yet" />}
      {data && data.data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">VAT</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium">{sale.code}</TableCell>
                <TableCell>Walk-in / Registered</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[sale.status] ?? "default"}>{sale.status}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(sale.vatTotal)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatCurrency(sale.total)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(sale.createdAt)}</TableCell>
                <TableCell>
                  {sale.status === "COMPLETED" && hasPermission(PERMISSIONS.SALE_VOID) && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setVoidingId(sale.id)}>
                      <Ban className="h-3.5 w-3.5" /> Void
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {voidingId && <VoidSaleDialog saleId={voidingId} onClose={() => setVoidingId(null)} />}
    </div>
  );
}

function VoidSaleDialog({ saleId, onClose }: { saleId: string; onClose: () => void }) {
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit() {
    if (reason.trim().length < 3) return toast.error("Enter a reason (min. 3 characters)");
    setSubmitting(true);
    try {
      await api.post(`/sales/${saleId}/void`, { reason });
      toast.success("Sale voided and stock restored");
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not void sale");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void sale</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer returned all items" />
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Voiding…" : "Void sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
