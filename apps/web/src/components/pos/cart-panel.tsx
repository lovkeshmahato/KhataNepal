"use client";

import * as React from "react";
import { Minus, Plus, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useCartStore, type CartLine } from "@/stores/cart-store";
import { useCustomers } from "@/hooks/use-customers";
import { formatCurrency, cn } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/shared-types";
import { calculateSaleTotalsPreview } from "@/lib/pos-calculations";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "ESEWA", label: "eSewa" },
  { value: "KHALTI", label: "Khalti" },
  { value: "FONEPAY", label: "Fonepay" },
  { value: "CREDIT", label: "Store Credit" },
];

export interface PaymentRow {
  method: PaymentMethod;
  amount: number;
}

export function CartPanel({
  payments,
  setPayments,
  onCheckout,
  isSubmitting,
}: {
  payments: PaymentRow[];
  setPayments: React.Dispatch<React.SetStateAction<PaymentRow[]>>;
  onCheckout: () => void;
  isSubmitting: boolean;
}) {
  const { lines, customerId, updateQuantity, removeLine, setCustomer } = useCartStore();
  const [customerSearch, setCustomerSearch] = React.useState("");
  const { data: customers } = useCustomers(customerSearch);

  const totals = calculateSaleTotalsPreview(lines);
  const paymentsTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.round((totals.total - paymentsTotal) * 100) / 100;

  React.useEffect(() => {
    if (payments.length === 1) {
      setPayments([{ ...payments[0], amount: totals.total }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.total]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2 text-sm">
              <User className="h-3.5 w-3.5" />
              {customers?.find((c) => c.id === customerId)?.name ?? "Walk-in customer"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <Input placeholder="Search customer by name/phone…" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="mb-2" />
            <div className="max-h-48 space-y-0.5 overflow-y-auto">
              <button
                onClick={() => setCustomer(null)}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                Walk-in customer
              </button>
              {customers?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCustomer(c.id)}
                  className={cn("w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent", customerId === c.id && "bg-accent")}
                >
                  {c.name} {c.phone ? `· ${c.phone}` : ""}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {lines.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            Cart is empty.
            <br />
            Scan a barcode or search for a product to begin.
          </div>
        ) : (
          <div className="space-y-2">
            {lines.map((line) => (
              <CartLineRow
                key={line.productId}
                line={line}
                onQuantityChange={(qty) => updateQuantity(line.productId, qty)}
                onRemove={() => removeLine(line.productId)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-border p-4">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Discount</span>
            <span>-{formatCurrency(totals.discountTotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>VAT</span>
            <span>{formatCurrency(totals.vatTotal)}</span>
          </div>
          <Separator className="my-1.5" />
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>

        <div className="space-y-2">
          {payments.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Select value={p.method} onValueChange={(v) => setPayments((prev) => prev.map((row, i) => (i === idx ? { ...row, method: v as PaymentMethod } : row)))}>
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                className="h-9 w-28"
                value={p.amount}
                onChange={(e) =>
                  setPayments((prev) => prev.map((row, i) => (i === idx ? { ...row, amount: Number(e.target.value) || 0 } : row)))
                }
              />
              {payments.length > 1 && (
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setPayments((prev) => prev.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setPayments((prev) => [...prev, { method: "CASH", amount: Math.max(balance, 0) }])}>
              + Split payment
            </Button>
            {balance !== 0 && (
              <span className={cn("text-xs font-medium", balance > 0 ? "text-warning" : "text-destructive")}>
                {balance > 0 ? `${formatCurrency(balance)} remaining` : `${formatCurrency(Math.abs(balance))} overpaid`}
              </span>
            )}
          </div>
        </div>

        <Button
          className="h-11 w-full text-base"
          disabled={lines.length === 0 || balance !== 0 || isSubmitting}
          onClick={onCheckout}
        >
          {isSubmitting ? "Processing…" : `Charge ${formatCurrency(totals.total)}`}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">Ctrl/⌘ + Enter to charge</p>
      </div>
    </div>
  );
}

function CartLineRow({
  line,
  onQuantityChange,
  onRemove,
}: {
  line: CartLine;
  onQuantityChange: (qty: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border p-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{line.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(line.unitPrice)} · VAT {line.vatRatePercent}%
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onQuantityChange(line.quantity - 1)}>
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center text-sm tabular-nums">{line.quantity}</span>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onQuantityChange(line.quantity + 1)}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <span className="w-20 shrink-0 text-right text-sm font-medium tabular-nums">
        {formatCurrency(line.unitPrice * line.quantity)}
      </span>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
