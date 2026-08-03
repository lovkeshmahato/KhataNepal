import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma, StockMovementType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../../common/audit/audit.service";
import type { StockAdjustmentInput } from "../../shared-types";

type Tx = Prisma.TransactionClient;

const INBOUND_TYPES = new Set<StockMovementType>(["PURCHASE_IN", "ADJUSTMENT_IN", "TRANSFER_IN", "RETURN_IN"]);

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findStockLevels(orgId: string, branchId?: string) {
    return this.prisma.stockItem.findMany({
      where: { branch: { orgId }, ...(branchId ? { branchId } : {}) },
      include: { product: { include: { category: true, unit: true } }, branch: true },
      orderBy: { product: { name: "asc" } },
    });
  }

  async findLowStock(orgId: string, branchId?: string) {
    const stockItems = await this.prisma.stockItem.findMany({
      where: { branch: { orgId }, ...(branchId ? { branchId } : {}) },
      include: { product: true, branch: true },
    });
    return stockItems
      .filter((item) => Number(item.quantity) <= item.product.reorderLevel)
      .sort((a, b) => Number(a.quantity) - Number(b.quantity));
  }

  findMovements(orgId: string, branchId?: string, productId?: string) {
    return this.prisma.stockMovement.findMany({
      where: {
        branch: { orgId },
        ...(branchId ? { branchId } : {}),
        ...(productId ? { productId } : {}),
      },
      include: { product: true, branch: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  /**
   * Core stock-mutation primitive. Always called inside a transaction so
   * that stock movement + balance updates are atomic with the originating
   * document (sale, goods receipt, adjustment).
   */
  async applyMovement(
    tx: Tx,
    params: {
      branchId: string;
      productId: string;
      type: StockMovementType;
      quantity: number | Decimal;
      referenceType?: string;
      referenceId?: string;
      note?: string;
      createdByUserId?: string;
    },
  ) {
    const signedQuantity = new Decimal(params.quantity).abs();
    const isInbound = INBOUND_TYPES.has(params.type);
    const delta = isInbound ? signedQuantity : signedQuantity.negated();

    const stockItem = await tx.stockItem.upsert({
      where: { branchId_productId: { branchId: params.branchId, productId: params.productId } },
      create: { branchId: params.branchId, productId: params.productId, quantity: 0 },
      update: {},
    });

    const newBalance = new Decimal(stockItem.quantity).add(delta);
    if (newBalance.isNegative() && !isInbound) {
      throw new BadRequestException(
        `Insufficient stock for product ${params.productId}: available ${stockItem.quantity}, requested ${signedQuantity}`,
      );
    }

    await tx.stockItem.update({
      where: { id: stockItem.id },
      data: { quantity: newBalance },
    });

    await tx.stockMovement.create({
      data: {
        branchId: params.branchId,
        productId: params.productId,
        type: params.type,
        quantity: signedQuantity,
        balanceAfter: newBalance,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        note: params.note,
        createdByUserId: params.createdByUserId,
      },
    });

    return newBalance;
  }

  async adjustStock(orgId: string, userId: string, dto: StockAdjustmentInput) {
    const type: StockMovementType = dto.quantityDelta > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
    const balance = await this.prisma.$transaction((tx) =>
      this.applyMovement(tx, {
        branchId: dto.branchId,
        productId: dto.productId,
        type,
        quantity: Math.abs(dto.quantityDelta),
        note: dto.reason,
        createdByUserId: userId,
        referenceType: "manual_adjustment",
      }),
    );

    await this.auditService.record({
      orgId,
      userId,
      action: "inventory.adjust",
      entityType: "StockItem",
      entityId: dto.productId,
      after: { branchId: dto.branchId, quantityDelta: dto.quantityDelta, reason: dto.reason, balance },
    });

    return { balance };
  }
}
