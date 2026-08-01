"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav-config";
import { useAuthStore } from "@/stores/auth-store";
import { useBranches } from "@/hooks/use-branches";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store } from "lucide-react";

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const setActiveBranch = useAuthStore((s) => s.setActiveBranch);
  const { data: branches } = useBranches();

  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <aside className={cn("flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar", className)}>
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          K
        </div>
        <span className="text-sm font-semibold text-sidebar-foreground">KhataNepal</span>
      </div>

      {branches && branches.length > 0 && (
        <div className="border-b border-sidebar-border p-3">
          <Select value={activeBranchId ?? undefined} onValueChange={setActiveBranch}>
            <SelectTrigger className="h-9 bg-background">
              <div className="flex items-center gap-2 overflow-hidden">
                <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Select branch" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground/80 hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.shortcut && (
                <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground group-hover:inline-block">
                  {item.shortcut}
                </kbd>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
