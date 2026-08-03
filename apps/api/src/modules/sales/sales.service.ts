import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateSaleInput } from "../../shared-types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { AccountingService } from "../accounting/accounting.service";
import { AuditService } from "../../common/audit/audit.service";
import { SYSTEM_ACCOUNT_CODES } from "../accounting/accounting.constants";
import { calculateSaleTotals, paymentAccountCodeFor } from "./sales.utils";

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly accountingService: AccountingService,
    private readonly auditService: AuditService,
  ) {}

  findAll(orgId: string, filters: { branchId?: string; status?: string; page?: number; pageSize?: number }) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 25;
    return this.paginate(orgId, filters, page, pageSize);
  }

  private async paginate(
    orgId: string,
    filters: { branchId?: string; status?: string },
    page: number,
    pageSize: number,
  ) {
    const where = {
      orgId,
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: { lines: true, payments: true, customer: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.sale.count({ where }),
    ]);
    return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOne(orgId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, orgId },
      include: {
        lines: { include: { product: true } },
        payments: true,
        customer: true,
        branch: true,
        createdBy: { select: { id: true, fullName: true } },
      },
    });
    if (!sale) throw new NotFoundException("Sale not found");
    return sale;
  }

  async createSale(orgId: string, userId: string, dto: CreateSaleInput) {
    const session = await this.prisma.registerSession.findFirst({
      where: { id: dto.registerSessionId, status: "OPEN" },
      include: { register: true },
    });
    if (!session) throw new BadRequestException("No open register session found");
    if (session.register.branchId !== dto.branchId) {
      throw new BadRequestException("Register session does not belong to this branch");
    }

    const productIds = dto.lines.map((l) => l.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, orgId },
      include: { vatRate: true },
    });
    const productById = new Map(products.map((p) => [p.id, p]));
    if (productById.size !== new Set(productIds).size) {
      throw new BadRequestException("One or more products were not found");
    }

    const totals = calculateSaleTotals(
      dto.lines.map((l) => {
        const product = productById.get(l.productId)!;
        return {
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          costPrice: Number(product.costPrice),
          vatRatePercent: Number(product.vatRate.rate),
          discountType: l.discountType,
          discountValue: l.discountValue,
        };
      }),
      dto.discountType && dto.discountValue !== undefined
        ? { type: dto.discountType, value: dto.discountValue }
        : undefined,
    );

    const paymentsTotal = dto.payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(paymentsTotal - totals.total) > 0.5) {
      throw new BadRequestException(
        `Payments (${paymentsTotal}) do not cover the sale total (${totals.total})`,
      );
    }

    const code = await this.generateSaleCode(orgId, dto.branchId);

    const sale = await this.prisma.$transaction(async (tx) => {
      const createdSale = await tx.sale.create({
        data: {
          orgId,
          branchId: dto.branchId,
          registerSessionId: dto.registerSessionId,
          customerId: dto.customerId ?? undefined,
          code,
          status: "COMPLETED",
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          vatTotal: totals.vatTotal,
          total: totals.total,
          createdByUserId: userId,
          lines: {
            create: totals.lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discountType: l.discountType,
              discountValue: l.discountValue,
              vatRate: l.vatRatePercent,
              lineSubtotal: l.lineSubtotal,
              lineVat: l.lineVat,
              lineTotal: l.lineTotal,
            })),
          },
          payments: {
            create: dto.payments.map((p) => ({
              method: p.method,
              amount: p.amount,
              reference: p.reference,
              status: "COMPLETED",
            })),
          },
        },
        include: { lines: true, payments: true },
      });

      for (const line of totals.lines) {
        await this.inventoryService.applyMovement(tx, {
          branchId: dto.branchId,
          productId: line.productId,
          type: "SALE_OUT",
          quantity: line.quantity,
          referenceType: "sale",
          referenceId: createdSale.id,
          createdByUserId: userId,
        });
      }

      const paymentLines = Object.entries(
        dto.payments.reduce<Record<string, number>>((acc, p) => {
          const code = paymentAccountCodeFor(p.method);
          acc[code] = (acc[code] ?? 0) + p.amount;
          return acc;
        }, {}),
      ).map(([accountCode, amount]) => ({ accountCode, debit: amount }));

      await this.accountingService.postJournalEntry(tx, {
        orgId,
        branchId: dto.branchId,
        memo: `Sale ${code}`,
        sourceType: "SALE",
        sourceId: createdSale.id,
        createdByUserId: userId,
        lines: [
          ...paymentLines,
          { accountCode: SYSTEM_ACCOUNT_CODES.SALES_DISCOUNT, debit: totals.discountTotal || undefined },
          {
            accountCode: SYSTEM_ACCOUNT_CODES.SALES_REVENUE,
            credit: totals.subtotal - totals.discountTotal,
          },
          { accountCode: SYSTEM_ACCOUNT_CODES.VAT_PAYABLE, credit: totals.vatTotal },
        ].filter((l) => (l.debit ?? l.credit ?? 0) > 0),
      });

      await this.accountingService.postJournalEntry(tx, {
        orgId,
        branchId: dto.branchId,
        memo: `COGS for sale ${code}`,
        sourceType: "SALE",
        sourceId: createdSale.id,
        createdByUserId: userId,
        lines: [
          { accountCode: SYSTEM_ACCOUNT_CODES.COST_OF_GOODS_SOLD, debit: totals.totalCost },
          { accountCode: SYSTEM_ACCOUNT_CODES.INVENTORY, credit: totals.totalCost },
        ],
      });

      if (dto.customerId) {
        const loyaltyEarned = Math.floor(totals.total / 100);
        if (loyaltyEarned > 0) {
          await tx.customer.update({
            where: { id: dto.customerId },
            data: { loyaltyPoints: { increment: loyaltyEarned } },
          });
        }
      }

      return createdSale;
    });

    await this.auditService.record({
      orgId,
      userId,
      action: "sale.create",
      entityType: "Sale",
      entityId: sale.id,
      after: { code, total: totals.total },
    });

    return sale;
  }

  async voidSale(orgId: string, userId: string, id: string, reason: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, orgId },
      include: { lines: true, payments: true },
    });
    if (!sale) throw new NotFoundException("Sale not found");
    if (sale.status !== "COMPLETED") {
      throw new BadRequestException("Only completed sales can be voided");
    }

    await this.prisma.$transaction(async (tx) => {
      for (const line of sale.lines) {
        await this.inventoryService.applyMovement(tx, {
          branchId: sale.branchId,
          productId: line.productId,
          type: "RETURN_IN",
          quantity: Number(line.quantity),
          referenceType: "sale_void",
          referenceId: sale.id,
          createdByUserId: userId,
        });
      }

      const original = await tx.journalEntry.findMany({
        where: { sourceType: "SALE", sourceId: sale.id },
        include: { lines: true },
      });
      for (const entry of original) {
        await tx.journalEntry.create({
          data: {
            orgId,
            branchId: sale.branchId,
            memo: `Reversal: ${entry.memo}`,
            sourceType: "SALE",
            sourceId: sale.id,
            createdByUserId: userId,
            lines: {
              create: entry.lines.map((l) => ({
                accountId: l.accountId,
                debit: l.credit,
                credit: l.debit,
              })),
            },
          },
        });
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: { status: "VOIDED", voidedByUserId: userId, voidedAt: new Date(), voidReason: reason },
      });
    });

    await this.auditService.record({
      orgId,
      userId,
      action: "sale.void",
      entityType: "Sale",
      entityId: sale.id,
      before: { status: sale.status },
      after: { status: "VOIDED", reason },
    });

    return this.findOne(orgId, id);
  }

  private async generateSaleCode(orgId: string, branchId: string): Promise<string> {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    const count = await this.prisma.sale.count({ where: { orgId, branchId } });
    const fiscalYear = new Date().getFullYear();
    return `${branch?.code ?? "POS"}-${fiscalYear}-${String(count + 1).padStart(6, "0")}`;
  }
}
