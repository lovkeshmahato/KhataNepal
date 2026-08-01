"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, History } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { LoadingState, EmptyState } from "@/components/common/data-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCustomers, useCreateCustomer, useCustomerPurchaseHistory } from "@/hooks/use-customers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";

export default function CustomersPage() {
  const [search, setSearch] = React.useState("");
  const { data: customers, isLoading } = useCustomers(search);
  const [historyId, setHistoryId] = React.useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="CRM profiles, loyalty points, and purchase history."
        actions={<NewCustomerDialog />}
      />

      <Input placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-sm" />

      {isLoading && <LoadingState />}
      {customers && customers.length === 0 && <EmptyState title="No customers yet" />}
      {customers && customers.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Loyalty points</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.phone ?? "—"}</TableCell>
                <TableCell>{c.email ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">{c.loyaltyPoints} pts</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setHistoryId(c.id)}>
                    <History className="h-3.5 w-3.5" /> History
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Sheet open={!!historyId} onOpenChange={(v) => !v && setHistoryId(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Purchase history</SheetTitle>
          </SheetHeader>
          <PurchaseHistoryList customerId={historyId} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PurchaseHistoryList({ customerId }: { customerId: string | null }) {
  const { data, isLoading } = useCustomerPurchaseHistory(customerId);
  if (isLoading) return <LoadingState rows={4} />;
  if (!data || data.length === 0) return <EmptyState title="No purchases yet" />;
  return (
    <div className="mt-4 space-y-2">
      {data.map((sale) => (
        <div key={sale.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
          <div>
            <p className="font-medium">{sale.code}</p>
            <p className="text-xs text-muted-foreground">{formatDate(sale.createdAt)}</p>
          </div>
          <span className="font-medium">{formatCurrency(sale.total)}</span>
        </div>
      ))}
    </div>
  );
}

function NewCustomerDialog() {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const createCustomer = useCreateCustomer();

  async function handleSubmit() {
    if (!name) return toast.error("Name is required");
    try {
      await createCustomer.mutateAsync({ name, phone });
      toast.success("Customer added");
      setOpen(false);
      setName("");
      setPhone("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add customer");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> New customer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98XXXXXXXX" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={createCustomer.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
