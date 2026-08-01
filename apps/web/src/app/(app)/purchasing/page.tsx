"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Trash2, PackageCheck } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { LoadingState, EmptyState } from "@/components/common/data-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";
import {
  useSuppliers,
  useCreateSupplier,
  usePurchaseOrders,
  useCreatePurchaseOrder,
  usePurchaseOrder,
  useReceiveGoods,
} from "@/hooks/use-purchasing";
import { useProducts } from "@/hooks/use-products";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning"> = {
  DRAFT: "secondary",
  ORDERED: "warning",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  CANCELLED: "secondary",
};

export default function PurchasingPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const { data: purchaseOrders, isLoading } = usePurchaseOrders(activeBranchId ?? undefined);
  const { data: suppliers } = useSuppliers();
  const [receivingId, setReceivingId] = React.useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="Purchasing"
        description="Purchase orders, suppliers, and goods receipts."
        actions={<NewPurchaseOrderDialog branchId={activeBranchId} />}
      />

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Purchase orders</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          {isLoading && <LoadingState />}
          {purchaseOrders && purchaseOrders.length === 0 && <EmptyState title="No purchase orders yet" />}
          {purchaseOrders && purchaseOrders.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.code}</TableCell>
                    <TableCell>{po.supplier.name}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[po.status] ?? "default"}>{po.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(po.total)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(po.createdAt)}</TableCell>
                    <TableCell>
                      {po.status !== "RECEIVED" && po.status !== "CANCELLED" && (
                        <Button variant="outline" size="sm" onClick={() => setReceivingId(po.id)}>
                          <PackageCheck /> Receive
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="suppliers">
          <div className="mb-4 flex justify-end">
            <NewSupplierDialog />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.phone ?? "—"}</TableCell>
                  <TableCell>{s.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? "success" : "secondary"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {receivingId && <ReceiveGoodsDialog purchaseOrderId={receivingId} onClose={() => setReceivingId(null)} />}
    </div>
  );
}

function NewSupplierDialog() {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const createSupplier = useCreateSupplier();

  async function handleSubmit() {
    if (!name) return toast.error("Supplier name is required");
    try {
      await createSupplier.mutateAsync({ name, phone });
      toast.success("Supplier added");
      setOpen(false);
      setName("");
      setPhone("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add supplier");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> New supplier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New supplier</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={createSupplier.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DraftLine {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
}

function NewPurchaseOrderDialog({ branchId }: { branchId: string | null }) {
  const [open, setOpen] = React.useState(false);
  const [supplierId, setSupplierId] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [lines, setLines] = React.useState<DraftLine[]>([]);
  const { data: suppliers } = useSuppliers();
  const { data: products } = useProducts(search);
  const createPO = useCreatePurchaseOrder();

  function addLine(productId: string) {
    const product = products?.find((p) => p.id === productId);
    if (!product || lines.some((l) => l.productId === productId)) return;
    setLines((prev) => [...prev, { productId, productName: product.name, quantity: 1, unitCost: Number(product.costPrice) }]);
  }

  async function handleSubmit() {
    if (!branchId || !supplierId || lines.length === 0) {
      toast.error("Select a branch, supplier, and at least one line item");
      return;
    }
    try {
      const po = await createPO.mutateAsync({
        branchId,
        supplierId,
        lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost })),
      });
      toast.success(`Purchase order ${po.code} created`);
      setOpen(false);
      setLines([]);
      setSupplierId("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create purchase order");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> New purchase order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New purchase order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Add product</Label>
            <Input placeholder="Search product…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <div className="max-h-32 overflow-y-auto rounded-md border border-border">
                {products?.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      addLine(p.id);
                      setSearch("");
                    }}
                    className="block w-full px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    {p.name} ({p.sku})
                  </button>
                ))}
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <div className="space-y-2 rounded-md border border-border p-2">
              {lines.map((line, idx) => (
                <div key={line.productId} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{line.productName}</span>
                  <Input
                    type="number"
                    className="h-8 w-20"
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity: Number(e.target.value) || 0 } : l)))
                    }
                  />
                  <Input
                    type="number"
                    className="h-8 w-24"
                    value={line.unitCost}
                    onChange={(e) =>
                      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, unitCost: Number(e.target.value) || 0 } : l)))
                    }
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={createPO.isPending}>
            {createPO.isPending ? "Creating…" : "Create purchase order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReceiveGoodsDialog({ purchaseOrderId, onClose }: { purchaseOrderId: string; onClose: () => void }) {
  const { data: po } = usePurchaseOrder(purchaseOrderId);
  const receiveGoods = useReceiveGoods();
  const [quantities, setQuantities] = React.useState<Record<string, number>>({});

  async function handleSubmit() {
    if (!po) return;
    const lines = po.lines
      .filter((l) => (quantities[l.id] ?? 0) > 0)
      .map((l) => ({ purchaseOrderLineId: l.id, quantity: quantities[l.id] }));
    if (lines.length === 0) return toast.error("Enter a quantity to receive for at least one line");
    try {
      await receiveGoods.mutateAsync({ purchaseOrderId, lines });
      toast.success("Goods received and stock updated");
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not receive goods");
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Receive goods — {po?.code}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {po?.lines.map((line) => {
            const remaining = line.quantity - line.receivedQuantity;
            return (
              <div key={line.id} className="flex items-center gap-3 rounded-md border border-border p-2 text-sm">
                <div className="flex-1">
                  <p className="font-medium">{line.product?.name}</p>
                  <p className="text-xs text-muted-foreground">Remaining: {remaining}</p>
                </div>
                <Input
                  type="number"
                  className="h-8 w-24"
                  max={remaining}
                  min={0}
                  value={quantities[line.id] ?? 0}
                  onChange={(e) => setQuantities((prev) => ({ ...prev, [line.id]: Number(e.target.value) || 0 }))}
                />
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={receiveGoods.isPending}>
            {receiveGoods.isPending ? "Saving…" : "Confirm receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
