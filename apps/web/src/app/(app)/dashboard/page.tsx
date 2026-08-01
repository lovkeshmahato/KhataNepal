"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Package, Users, Receipt } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { PageHeader } from "@/components/common/page-header";
import { LoadingState, ErrorState } from "@/components/common/data-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatAdAsBs } from "@khatanepal/types";

interface DashboardData {
  today: { saleCount: number; total: number };
  month: { saleCount: number; total: number };
  lowStockCount: number;
  activeCustomers: number;
  recentSales: {
    id: string;
    code: string;
    total: number;
    createdAt: string;
    customer?: { name: string } | null;
  }[];
}

interface SalesForecastPoint {
  date: string;
  actual: number | null;
  forecast: number;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", activeBranchId],
    queryFn: () => api.get<DashboardData>(`/reports/dashboard${activeBranchId ? `?branchId=${activeBranchId}` : ""}`),
  });

  const { data: forecast } = useQuery({
    queryKey: ["sales-forecast", activeBranchId],
    queryFn: () =>
      api.get<SalesForecastPoint[]>(`/ai-insights/sales-forecast${activeBranchId ? `?branchId=${activeBranchId}` : ""}`),
  });

  const today = new Date();

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.fullName.split(" ")[0] ?? ""}`}
        description={`${formatDate(today)} · BS ${formatAdAsBs(today, true)}`}
      />

      {isLoading && <LoadingState rows={4} />}
      {isError && <ErrorState message="Could not load dashboard data." />}

      {data && (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div variants={item}>
              <StatCard
                icon={Receipt}
                label="Sales today"
                value={formatCurrency(data.today.total)}
                sub={`${data.today.saleCount} transactions`}
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard
                icon={TrendingUp}
                label="Sales this month"
                value={formatCurrency(data.month.total)}
                sub={`${data.month.saleCount} transactions`}
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard
                icon={Package}
                label="Low stock items"
                value={String(data.lowStockCount)}
                sub="Need reordering"
                tone={data.lowStockCount > 0 ? "warning" : "default"}
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard icon={Users} label="Customers" value={String(data.activeCustomers)} sub="In CRM" />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <motion.div variants={item} className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Sales trend & 7-day forecast</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  {forecast && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecast}>
                        <defs>
                          <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(d: string) => d.slice(5)}
                          stroke="currentColor"
                          className="text-muted-foreground"
                        />
                        <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" width={60} />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value ?? 0))}
                          contentStyle={{
                            background: "var(--color-popover)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="actual"
                          stroke="var(--color-primary)"
                          fill="url(#actualFill)"
                          strokeWidth={2}
                          connectNulls
                        />
                        <Area
                          type="monotone"
                          dataKey="forecast"
                          stroke="var(--color-muted-foreground)"
                          strokeDasharray="4 4"
                          fill="transparent"
                          strokeWidth={1.5}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Recent sales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.recentSales.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">No sales yet.</p>
                  )}
                  {data.recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{sale.code}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {sale.customer?.name ?? "Walk-in"} · {formatDate(sale.createdAt)}
                        </p>
                      </div>
                      <Badge variant="secondary">{formatCurrency(sale.total)}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
            <p className={`mt-1 text-xs ${tone === "warning" ? "text-warning" : "text-muted-foreground"}`}>{sub}</p>
          </div>
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone === "warning" ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary"}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
