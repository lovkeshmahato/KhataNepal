"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { useProducts } from "@/hooks/use-products";
import { useCartStore } from "@/stores/cart-store";
import { formatCurrency } from "@/lib/utils";
import { LoadingState, EmptyState } from "@/components/common/data-state";

export function ProductGrid({ search }: { search: string }) {
  const { data: products, isLoading } = useProducts(search);
  const addLine = useCartStore((s) => s.addLine);

  if (isLoading) return <LoadingState rows={6} />;
  if (!products || products.length === 0) {
    return <EmptyState title="No products found" description="Try a different search term or check the SKU/barcode." />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {products.map((product, i) => (
        <motion.button
          key={product.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.02, 0.3) }}
          onClick={() =>
            addLine({
              productId: product.id,
              name: product.name,
              sku: product.sku,
              unitPrice: Number(product.sellingPrice),
              vatRatePercent: Number(product.vatRate.rate),
            })
          }
          className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="h-4 w-4" />
          </div>
          <div className="min-w-0 w-full">
            <p className="truncate text-sm font-medium">{product.name}</p>
            <p className="truncate text-xs text-muted-foreground">{product.sku}</p>
          </div>
          <p className="text-sm font-semibold text-primary">{formatCurrency(product.sellingPrice)}</p>
        </motion.button>
      ))}
    </div>
  );
}
