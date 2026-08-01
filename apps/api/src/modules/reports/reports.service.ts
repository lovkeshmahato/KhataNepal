import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";

interface DateRange {
  from?: Date;
  to?: Date;
  branchId?: string;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async salesSummary(orgId: string, range: DateRange) {
    const cacheKey = `reports:sales-summary:${orgId}:${range.branchId ?? "all"}:${range.from?.toISOString()}:${range.to?.toISOString()}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const where = {
      orgId,
      status: "COMPLETED" as const,
      ...(range.branchId ? { branchId: range.branchId } : {}),
      createdAt: { gte: range.from, lte: range.to },
    };

    const [aggregate, byMethod] = await Promise.all([
      this.prisma.sale.aggregate({
        where,
        _sum: { subtotal: true, discountTotal: true, vatTotal: true, total: true },
        _count: true,
      }),
      this.prisma.payment.groupBy({
        by: ["method"],
        where: { sale: where },
        _sum: { amount: true },
      }),
    ]);

    const result = {
      saleCount: aggregate._count,
      subtotal: aggregate._sum.subtotal ?? 0,
      discountTotal: aggregate._sum.discountTotal ?? 0,
      vatTotal: aggregate._sum.vatTotal ?? 0,
      total: aggregate._sum.total ?? 0,
      byPaymentMethod: byMethod.map((m) => ({ method: m.method, amount: m._sum.amount ?? 0 })),
    };

    await this.redis.setJson(cacheKey, result, 60);
    return result;
  }

  async vatReport(orgId: string, range: DateRange) {
    const sales = await this.prisma.sale.findMany({
      where: {
        orgId,
        status: "COMPLETED",
        ...(range.branchId ? { branchId: range.branchId } : {}),
        createdAt: { gte: range.from, lte: range.to },
      },
      select: { code: true, createdAt: true, subtotal: true, discountTotal: true, vatTotal: true, total: true },
      orderBy: { createdAt: "asc" },
    });

    const totalVatCollected = sales.reduce((sum, s) => sum + Number(s.vatTotal), 0);
    return { sales, totalVatCollected, saleCount: sales.length };
  }

  async topProducts(orgId: string, range: DateRange, limit = 10) {
    const lines = await this.prisma.saleLine.groupBy({
      by: ["productId"],
      where: {
        sale: {
          orgId,
          status: "COMPLETED",
          ...(range.branchId ? { branchId: range.branchId } : {}),
          createdAt: { gte: range.from, lte: range.to },
        },
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: limit,
    });

    const products = await this.prisma.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) } },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    return lines.map((l) => ({
      product: productById.get(l.productId),
      quantitySold: l._sum.quantity ?? 0,
      revenue: l._sum.lineTotal ?? 0,
    }));
  }

  async inventoryValuation(orgId: string, branchId?: string) {
    const stockItems = await this.prisma.stockItem.findMany({
      where: { branch: { orgId }, ...(branchId ? { branchId } : {}) },
      include: { product: true },
    });

    const rows = stockItems.map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity,
      costPrice: item.product.costPrice,
      valuation: Number(item.quantity) * Number(item.product.costPrice),
    }));

    return {
      rows,
      totalValuation: rows.reduce((sum, r) => sum + r.valuation, 0),
    };
  }

  async dashboardOverview(orgId: string, branchId?: string) {
    const cacheKey = `reports:dashboard:${orgId}:${branchId ?? "all"}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todaySummary, monthSummary, lowStockCount, activeCustomers, recentSales] = await Promise.all([
      this.salesSummary(orgId, { from: today, to: new Date(), branchId }),
      this.salesSummary(orgId, { from: startOfMonth, to: new Date(), branchId }),
      this.prisma.stockItem
        .findMany({ where: { branch: { orgId }, ...(branchId ? { branchId } : {}) }, include: { product: true } })
        .then((items) => items.filter((i) => Number(i.quantity) <= i.product.reorderLevel).length),
      this.prisma.customer.count({ where: { orgId } }),
      this.prisma.sale.findMany({
        where: { orgId, status: "COMPLETED", ...(branchId ? { branchId } : {}) },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { customer: true },
      }),
    ]);

    const result = { today: todaySummary, month: monthSummary, lowStockCount, activeCustomers, recentSales };
    await this.redis.setJson(cacheKey, result, 30);
    return result;
  }
}
