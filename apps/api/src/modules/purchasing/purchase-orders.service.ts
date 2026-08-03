import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreatePurchaseOrderInput } from "../../shared-types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { AccountingService } from "../accounting/accounting.service";
import { AuditService } from "../../common/audit/audit.service";
import { SYSTEM_ACCOUNT_CODES } from "../accounting/accounting.constants";

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly accountingService: AccountingService,
    private readonly auditService: AuditService,
  ) {}

  findAll(orgId: string, branchId?: string, status?: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { orgId, ...(branchId ? { branchId } : {}), ...(status ? { status: status as never } : {}) },
      include: { supplier: true, lines: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(orgId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, orgId },
      include: { supplier: true, lines: { include: { product: true } }, goodsReceipts: { include: { lines: true } } },
    });
    if (!po) throw new NotFoundException("Purchase order not found");
    return po;
  }

  async create(orgId: string, userId: string, dto: CreatePurchaseOrderInput) {
    const subtotal = dto.lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
    const code = await this.generateCode(orgId);

    const po = await this.prisma.purchaseOrder.create({
      data: {
        orgId,
        branchId: dto.branchId,
        supplierId: dto.supplierId,
        code,
        status: "ORDERED",
        expectedDate: dto.expectedDate,
        notes: dto.notes,
        subtotal,
        vatTotal: 0,
        total: subtotal,
        createdByUserId: userId,
        lines: {
          create: dto.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitCost: l.unitCost,
          })),
        },
      },
      include: { lines: true, supplier: true },
    });

    await this.auditService.record({
      orgId,
      userId,
      action: "purchase_order.create",
      entityType: "PurchaseOrder",
      entityId: po.id,
      after: { code, total: subtotal },
    });

    return po;
  }

  async receiveGoods(
    orgId: string,
    userId: string,
    purchaseOrderId: string,
    lines: { purchaseOrderLineId: string; quantity: number }[],
    notes?: string,
  ) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, orgId },
      include: { lines: true },
    });
    if (!po) throw new NotFoundException("Purchase order not found");
    if (po.status === "RECEIVED" || po.status === "CANCELLED") {
      throw new BadRequestException(`Cannot receive goods for a ${po.status.toLowerCase()} purchase order`);
    }

    const poLineById = new Map(po.lines.map((l) => [l.id, l]));
    let receiptValue = 0;

    const receipt = await this.prisma.$transaction(async (tx) => {
      const createdReceipt = await tx.goodsReceipt.create({
        data: {
          purchaseOrderId: po.id,
          branchId: po.branchId,
          receivedByUserId: userId,
          notes,
          lines: {
            create: lines.map((l) => {
              const poLine = poLineById.get(l.purchaseOrderLineId);
              if (!poLine) throw new BadRequestException("Purchase order line not found");
              const remaining = Number(poLine.quantity) - Number(poLine.receivedQuantity);
              if (l.quantity > remaining) {
                throw new BadRequestException(
                  `Cannot receive ${l.quantity} — only ${remaining} remaining on this line`,
                );
              }
              receiptValue += l.quantity * Number(poLine.unitCost);
              return {
                purchaseOrderLineId: poLine.id,
                productId: poLine.productId,
                quantity: l.quantity,
                unitCost: poLine.unitCost,
              };
            }),
          },
        },
        include: { lines: true },
      });

      for (const line of createdReceipt.lines) {
        await this.inventoryService.applyMovement(tx, {
          branchId: po.branchId,
          productId: line.productId,
          type: "PURCHASE_IN",
          quantity: line.quantity,
          referenceType: "goods_receipt",
          referenceId: createdReceipt.id,
          createdByUserId: userId,
        });

        await tx.purchaseOrderLine.update({
          where: { id: line.purchaseOrderLineId },
          data: { receivedQuantity: { increment: line.quantity } },
        });
      }

      const refreshedLines = await tx.purchaseOrderLine.findMany({ where: { purchaseOrderId: po.id } });
      const fullyReceived = refreshedLines.every((l) => Number(l.receivedQuantity) >= Number(l.quantity));
      const partiallyReceived = refreshedLines.some((l) => Number(l.receivedQuantity) > 0);

      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: fullyReceived ? "RECEIVED" : partiallyReceived ? "PARTIALLY_RECEIVED" : po.status },
      });

      await this.accountingService.postJournalEntry(tx, {
        orgId,
        branchId: po.branchId,
        memo: `Goods receipt for PO ${po.code}`,
        sourceType: "PURCHASE",
        sourceId: po.id,
        createdByUserId: userId,
        lines: [
          { accountCode: SYSTEM_ACCOUNT_CODES.INVENTORY, debit: receiptValue },
          { accountCode: SYSTEM_ACCOUNT_CODES.ACCOUNTS_PAYABLE, credit: receiptValue },
        ],
      });

      return createdReceipt;
    });

    await this.auditService.record({
      orgId,
      userId,
      action: "purchase_order.receive_goods",
      entityType: "PurchaseOrder",
      entityId: po.id,
      after: { receiptId: receipt.id, receiptValue },
    });

    return receipt;
  }

  private async generateCode(orgId: string): Promise<string> {
    const count = await this.prisma.purchaseOrder.count({ where: { orgId } });
    return `PO-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  }
}
