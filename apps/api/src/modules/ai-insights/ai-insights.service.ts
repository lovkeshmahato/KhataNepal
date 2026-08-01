import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma/prisma.service";

export interface ReorderSuggestion {
  productId: string;
  productName: string;
  sku: string;
  branchId: string;
  branchName: string;
  currentStock: number;
  reorderLevel: number;
  avgDailySales: number;
  daysOfStockLeft: number | null;
  suggestedOrderQuantity: number;
}

export interface SalesForecastPoint {
  date: string;
  actual: number | null;
  forecast: number;
}

/**
 * Business-insights engine. Defaults to a transparent heuristic model
 * (moving averages + reorder-point math) so insights work out of the box
 * with zero external dependencies. When ANTHROPIC_API_KEY is configured,
 * the heuristic output is additionally summarized into plain-language
 * narrative via the Claude API — the numbers themselves always come from
 * real transaction data, never from the LLM.
 */
@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger(AiInsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async reorderSuggestions(orgId: string, branchId?: string): Promise<ReorderSuggestion[]> {
    const stockItems = await this.prisma.stockItem.findMany({
      where: { branch: { orgId }, ...(branchId ? { branchId } : {}) },
      include: { product: true, branch: true },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesVelocity = await this.prisma.saleLine.groupBy({
      by: ["productId"],
      where: {
        sale: { orgId, status: "COMPLETED", createdAt: { gte: thirtyDaysAgo } },
      },
      _sum: { quantity: true },
    });
    const velocityByProduct = new Map(salesVelocity.map((v) => [v.productId, Number(v._sum.quantity ?? 0) / 30]));

    return stockItems
      .filter((item) => Number(item.quantity) <= item.product.reorderLevel * 1.2)
      .map((item) => {
        const avgDailySales = velocityByProduct.get(item.productId) ?? 0;
        const currentStock = Number(item.quantity);
        const daysOfStockLeft = avgDailySales > 0 ? Math.round(currentStock / avgDailySales) : null;
        const targetStock = Math.max(item.product.reorderLevel * 2, Math.round(avgDailySales * 14));
        return {
          productId: item.productId,
          productName: item.product.name,
          sku: item.product.sku,
          branchId: item.branchId,
          branchName: item.branch.name,
          currentStock,
          reorderLevel: item.product.reorderLevel,
          avgDailySales: Math.round(avgDailySales * 100) / 100,
          daysOfStockLeft,
          suggestedOrderQuantity: Math.max(targetStock - currentStock, 0),
        };
      })
      .sort((a, b) => (a.daysOfStockLeft ?? 999) - (b.daysOfStockLeft ?? 999));
  }

  async salesForecast(orgId: string, branchId?: string, horizonDays = 7): Promise<SalesForecastPoint[]> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 30);

    const sales = await this.prisma.sale.findMany({
      where: { orgId, status: "COMPLETED", createdAt: { gte: sinceDate }, ...(branchId ? { branchId } : {}) },
      select: { createdAt: true, total: true },
    });

    const dailyTotals = new Map<string, number>();
    for (const sale of sales) {
      const key = sale.createdAt.toISOString().slice(0, 10);
      dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + Number(sale.total));
    }

    const sortedDays = Array.from(dailyTotals.entries()).sort(([a], [b]) => a.localeCompare(b));
    const recentValues = sortedDays.slice(-14).map(([, v]) => v);
    const movingAverage = recentValues.length
      ? recentValues.reduce((a, b) => a + b, 0) / recentValues.length
      : 0;

    // Simple linear trend over the trailing window, damped so forecasts don't run away.
    const trend =
      recentValues.length >= 2
        ? (recentValues[recentValues.length - 1] - recentValues[0]) / recentValues.length
        : 0;

    const history: SalesForecastPoint[] = sortedDays.map(([date, actual]) => ({
      date,
      actual,
      forecast: actual,
    }));

    const forecast: SalesForecastPoint[] = [];
    const lastDate = sortedDays.length ? new Date(sortedDays[sortedDays.length - 1][0]) : new Date();
    for (let i = 1; i <= horizonDays; i++) {
      const date = new Date(lastDate);
      date.setDate(date.getDate() + i);
      forecast.push({
        date: date.toISOString().slice(0, 10),
        actual: null,
        forecast: Math.max(0, Math.round(movingAverage + trend * i * 0.5)),
      });
    }

    return [...history, ...forecast];
  }

  async narrativeSummary(orgId: string, branchId?: string): Promise<string> {
    const [reorders, forecast] = await Promise.all([
      this.reorderSuggestions(orgId, branchId),
      this.salesForecast(orgId, branchId),
    ]);

    const heuristicSummary = this.buildHeuristicSummary(reorders, forecast);

    const apiKey = this.config.get<string>("aiInsights.anthropicApiKey");
    if (this.config.get<string>("aiInsights.provider") !== "anthropic" || !apiKey) {
      return heuristicSummary;
    }

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: `You are a retail operations analyst for a Nepali supermarket chain. Summarize the following computed data in 3-4 concise, actionable sentences for a store manager. Do not invent numbers not present in the data.\n\n${heuristicSummary}`,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic API returned ${res.status}`);
      const data = (await res.json()) as { content?: { text?: string }[] };
      return data.content?.[0]?.text ?? heuristicSummary;
    } catch (err) {
      this.logger.warn(`Falling back to heuristic summary: ${(err as Error).message}`);
      return heuristicSummary;
    }
  }

  private buildHeuristicSummary(reorders: ReorderSuggestion[], forecast: SalesForecastPoint[]): string {
    const urgent = reorders.filter((r) => r.daysOfStockLeft !== null && r.daysOfStockLeft <= 3);
    const forecastTotal = forecast.filter((f) => f.actual === null).reduce((sum, f) => sum + f.forecast, 0);

    const parts: string[] = [];
    if (urgent.length > 0) {
      parts.push(
        `${urgent.length} product(s) will stock out within 3 days: ${urgent
          .slice(0, 5)
          .map((r) => r.productName)
          .join(", ")}.`,
      );
    } else if (reorders.length > 0) {
      parts.push(`${reorders.length} product(s) are approaching their reorder point.`);
    } else {
      parts.push("No products are currently near their reorder point.");
    }
    parts.push(`Projected sales for the next 7 days: approximately NPR ${forecastTotal.toLocaleString()}.`);
    return parts.join(" ");
  }
}
