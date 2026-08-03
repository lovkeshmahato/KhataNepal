"use client";

import * as React from "react";
import { toast } from "sonner";
import { ScanBarcode, WifiOff, CloudUpload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { ProductGrid } from "@/components/pos/product-grid";
import { CartPanel, type PaymentRow } from "@/components/pos/cart-panel";
import { OpenRegisterDialog } from "@/components/pos/open-register-dialog";
import { useAuthStore } from "@/stores/auth-store";
import { useActiveRegisterSession } from "@/hooks/use-register-session";
import { useCartStore } from "@/stores/cart-store";
import { useCreateSale, useOfflineSync } from "@/hooks/use-sales";
import { api, ApiError } from "@/lib/api-client";
import type { Product } from "@/hooks/use-products";
import type { CreateSaleInput } from "@/lib/shared-types";

export default function PosPage() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const { data: session, isLoading: sessionLoading } = useActiveRegisterSession(activeBranchId ?? undefined);
  const cart = useCartStore();
  const [search, setSearch] = React.useState("");
  const [barcodeMode, setBarcodeMode] = React.useState(false);
  const [payments, setPayments] = React.useState<PaymentRow[]>([{ method: "CASH", amount: 0 }]);
  const createSale = useCreateSale();
  const { isOnline, pendingCount } = useOfflineSync();
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleCheckout();
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.lines, payments, session]);

  async function handleBarcodeSubmit(code: string) {
    if (!code) return;
    try {
      const product = await api.get<Product>(`/products/barcode/${encodeURIComponent(code)}`);
      cart.addLine({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice: Number(product.sellingPrice),
        vatRatePercent: Number(product.vatRate.rate),
      });
      toast.success(`Added ${product.name}`);
    } catch {
      toast.error(`No product matches barcode "${code}"`);
    }
    setSearch("");
  }

  async function handleCheckout() {
    if (!session || !activeBranchId || cart.lines.length === 0) return;

    const payload: CreateSaleInput = {
      branchId: activeBranchId,
      registerSessionId: session.id,
      customerId: cart.customerId ?? undefined,
      lines: cart.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountType: l.discountType,
        discountValue: l.discountValue,
      })),
      payments: payments.filter((p) => p.amount > 0),
    };

    try {
      const result = await createSale.mutateAsync(payload);
      if ("queued" in result) {
        toast.warning("Offline — sale saved locally and will sync automatically.");
      } else {
        toast.success(`Sale ${result.code} completed`);
      }
      cart.clear();
      setPayments([{ method: "CASH", amount: 0 }]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not complete sale");
    }
  }

  if (!activeBranchId) {
    return <PageHeader title="Point of Sale" description="Select a branch from the sidebar to begin." />;
  }

  if (sessionLoading) return null;

  if (!session) {
    return <OpenRegisterDialog branchId={activeBranchId} />;
  }

  return (
    <div className="flex h-[calc(100vh-6.5rem)] flex-col">
      <PageHeader
        title="Point of Sale"
        description={`Register: ${session.register.name}`}
        actions={
          <div className="flex items-center gap-2">
            {!isOnline && (
              <Badge variant="warning" className="gap-1">
                <WifiOff className="h-3 w-3" /> Offline
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <CloudUpload className="h-3 w-3" /> {pendingCount} pending sync
              </Badge>
            )}
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex min-h-0 flex-col lg:col-span-2">
          <div className="relative mb-4">
            <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              autoFocus
              placeholder="Scan barcode or search products by name / SKU… (press / to focus)"
              className="h-11 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && barcodeMode) handleBarcodeSubmit(search);
              }}
              onFocus={() => setBarcodeMode(true)}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            <ProductGrid search={search} />
          </div>
        </div>

        <div className="min-h-0 rounded-xl border border-border bg-card">
          <CartPanel payments={payments} setPayments={setPayments} onCheckout={handleCheckout} isSubmitting={createSale.isPending} />
        </div>
      </div>
    </div>
  );
}
