"use client";

import { PageHeader } from "@/components/common/page-header";
import { LoadingState, EmptyState } from "@/components/common/data-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { useVatReport, useTopProducts, useInventoryValuation } from "@/hooks/use-reports";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ReportsPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const { data: vat, isLoading: vatLoading } = useVatReport(activeBranchId ?? undefined);
  const { data: topProducts, isLoading: topLoading } = useTopProducts(activeBranchId ?? undefined);
  const { data: valuation, isLoading: valuationLoading } = useInventoryValuation(activeBranchId ?? undefined);

  return (
    <div>
      <PageHeader title="Reports" description="VAT summary, top-selling products, and inventory valuation." />

      <Tabs defaultValue="vat">
        <TabsList>
          <TabsTrigger value="vat">VAT report</TabsTrigger>
          <TabsTrigger value="top-products">Top products</TabsTrigger>
          <TabsTrigger value="valuation">Inventory valuation</TabsTrigger>
        </TabsList>

        <TabsContent value="vat">
          {vatLoading && <LoadingState />}
          {vat && (
            <>
              <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Total VAT collected</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-2xl font-semibold">{formatCurrency(vat.totalVatCollected)}</CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Sales count</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-2xl font-semibold">{vat.saleCount}</CardContent>
                </Card>
              </div>
              {vat.sales.length === 0 ? (
                <EmptyState title="No sales in this period" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vat.sales.map((s) => (
                      <TableRow key={s.code}>
                        <TableCell className="font-medium">{s.code}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(s.createdAt)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(s.subtotal)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(s.vatTotal)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(s.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="top-products">
          {topLoading && <LoadingState />}
          {topProducts && topProducts.length === 0 && <EmptyState title="No sales data yet" />}
          {topProducts && topProducts.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.product?.name ?? "Unknown product"}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.quantitySold}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(row.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="valuation">
          {valuationLoading && <LoadingState />}
          {valuation && (
            <>
              <Card className="mb-4 max-w-xs">
                <CardHeader>
                  <CardTitle>Total inventory value</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-2xl font-semibold">{formatCurrency(valuation.totalValuation)}</CardContent>
              </Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Cost price</TableHead>
                    <TableHead className="text-right">Valuation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {valuation.rows.map((row) => (
                    <TableRow key={row.productId}>
                      <TableCell className="font-medium">{row.productName}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(row.costPrice)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(row.valuation)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
