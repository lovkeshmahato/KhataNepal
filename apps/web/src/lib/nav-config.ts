import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Receipt,
  Users,
  Calculator,
  BarChart3,
  Settings,
  Sparkles,
} from "lucide-react";
import { PERMISSIONS, type Permission } from "@/lib/shared-types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  shortcut?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Point of Sale", href: "/pos", icon: ShoppingCart, permission: PERMISSIONS.SALE_CREATE, shortcut: "P" },
  { label: "Sales History", href: "/sales", icon: Receipt, permission: PERMISSIONS.SALE_READ },
  { label: "Inventory", href: "/inventory", icon: Package, permission: PERMISSIONS.INVENTORY_READ },
  { label: "Purchasing", href: "/purchasing", icon: Truck, permission: PERMISSIONS.PURCHASE_ORDER_READ },
  { label: "Customers", href: "/customers", icon: Users, permission: PERMISSIONS.CUSTOMER_READ },
  { label: "Accounting", href: "/accounting", icon: Calculator, permission: PERMISSIONS.ACCOUNTING_READ },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: PERMISSIONS.REPORT_READ },
  { label: "AI Insights", href: "/insights", icon: Sparkles, permission: PERMISSIONS.AI_INSIGHTS_READ },
  { label: "Settings", href: "/settings", icon: Settings, permission: PERMISSIONS.USER_MANAGE },
];
