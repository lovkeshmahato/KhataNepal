"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { LoadingState, EmptyState } from "@/components/common/data-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";
import { useStockLevels, useLowStock, useStockMovements, useAdjustStock } from "@/hooks/use-inventory";
import { useProducts } from "@/hooks/use-products";
import { formatDate } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";

export default function InventoryPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const { data: stock, isLoading } = useStockLevels(activeBranchId ?? undefined);
  const { data: lowStock } = useLowStock(activeBranchId ?? undefined);
  const { data: movements } = useStockMovements(activeBranchId ?? undefined);

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock levels, movements, and adjustments across your branches."
        actions={<AdjustStockDialog branchId={activeBranchId} />}
      />

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock levels</TabsTrigger>
          <TabsTrigger value="low">Low stock {lowStock && lowStock.length > 0 && <Badge variant="warning" className="ml-1.5">{lowStock.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          {isLoading && <LoadingState />}
          {stock && stock.length === 0 && <EmptyState title="No stock records yet" />}
          {stock && stock.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Reorder level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.product.sku}</TableCell>
                    <TableCell>{s.branch.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.quantity} {s.product.unit.abbreviation}
                      {s.quantity <= s.product.reorderLevel && (
                        <Badge variant="warning" className="ml-2">
                          Low
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{s.product.reorderLevel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="low">
          {lowStock && lowStock.length === 0 && <EmptyState title="All good" description="No products are below their reorder level." />}
          {lowStock && lowStock.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Reorder level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.product.name}</TableCell>
                    <TableCell>{s.branch.name}</TableCell>
                    <TableCell className="text-right text-warning tabular-nums">{s.quantity}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{s.product.reorderLevel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="movements">
          {movements && movements.length === 0 && <EmptyState title="No stock movements recorded yet" />}
          {movements && movements.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Balance after</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
                    <TableCell className="font-medium">{m.product.name}</TableCell>
                    <TableCell>
                      <Badge variant={m.type.includes("IN") ? "success" : "secondary"}>{m.type.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{m.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.balanceAfter}</TableCell>
                    <TableCell className="text-muted-foreground">{m.note ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdjustStockDialog({ branchId }: { branchId: string | null }) {
  const [open, setOpen] = React.useState(false);
  const [productId, setProductId] = React.useState("");
  const [delta, setDelta] = React.useState("0");
  const [reason, setReason] = React.useState("");
  const [search, setSearch] = React.useState("");
  const { data: products } = useProducts(search);
  const adjustStock = useAdjustStock();

  async function handleSubmit() {
    if (!branchId || !productId || !reason) {
      toast.error("Select a branch, product, and reason");
      return;
    }
    try {
      await adjustStock.mutateAsync({ branchId, productId, quantityDelta: Number(delta), reason });
      toast.success("Stock adjusted");
      setOpen(false);
      setProductId("");
      setDelta("0");
      setReason("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not adjust stock");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Adjust stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Search & select product" />
              </SelectTrigger>
              <SelectContent>
                <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-1" />
                {products?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Quantity change (negative to remove)</Label>
            <Input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Damaged goods, stock count correction" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={adjustStock.isPending}>
            {adjustStock.isPending ? "Saving…" : "Save adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
