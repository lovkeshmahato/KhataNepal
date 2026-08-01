"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { LoadingState, EmptyState } from "@/components/common/data-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api-client";

interface ReorderSuggestion {
  productId: string;
  productName: string;
  sku: string;
  branchName: string;
  currentStock: number;
  avgDailySales: number;
  daysOfStockLeft: number | null;
  suggestedOrderQuantity: number;
}

export default function InsightsPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const branchQuery = activeBranchId ? `?branchId=${activeBranchId}` : "";

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["ai-summary", activeBranchId],
    queryFn: () => api.get<{ summary: string }>(`/ai-insights/summary${branchQuery}`),
  });

  const { data: reorders, isLoading: reordersLoading } = useQuery({
    queryKey: ["ai-reorders", activeBranchId],
    queryFn: () => api.get<ReorderSuggestion[]>(`/ai-insights/reorder-suggestions${branchQuery}`),
  });

  return (
    <div>
      <PageHeader title="AI Insights" description="Reorder suggestions and demand signals derived from your sales data." />

      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-foreground">Business summary</CardTitle>
        </CardHeader>
        <CardContent>
          {summaryLoading ? <LoadingState rows={2} /> : <p className="text-sm leading-relaxed">{summary?.summary}</p>}
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-semibold">Reorder suggestions</h2>
      {reordersLoading && <LoadingState />}
      {reorders && reorders.length === 0 && <EmptyState title="Nothing needs reordering right now" />}
      {reorders && reorders.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="text-right">Current stock</TableHead>
              <TableHead className="text-right">Avg. daily sales</TableHead>
              <TableHead className="text-right">Days left</TableHead>
              <TableHead className="text-right">Suggested order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reorders.map((r) => (
              <TableRow key={`${r.productId}-${r.branchName}`}>
                <TableCell className="font-medium">{r.productName}</TableCell>
                <TableCell className="text-muted-foreground">{r.branchName}</TableCell>
                <TableCell className="text-right tabular-nums">{r.currentStock}</TableCell>
                <TableCell className="text-right tabular-nums">{r.avgDailySales}</TableCell>
                <TableCell className="text-right">
                  {r.daysOfStockLeft !== null ? (
                    <Badge variant={r.daysOfStockLeft <= 3 ? "destructive" : "warning"} className="gap-1">
                      {r.daysOfStockLeft <= 3 && <TriangleAlert className="h-3 w-3" />}
                      {r.daysOfStockLeft}d
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{r.suggestedOrderQuantity}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
