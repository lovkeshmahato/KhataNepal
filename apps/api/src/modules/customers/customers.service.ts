import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateCustomerInput } from "@khatanepal/types";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(orgId: string, search?: string) {
    return this.prisma.customer.findMany({
      where: {
        orgId,
        ...(search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] }
          : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  async findOne(orgId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, orgId } });
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }

  async findPurchaseHistory(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.sale.findMany({
      where: { orgId, customerId: id, status: "COMPLETED" },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  create(orgId: string, dto: CreateCustomerInput) {
    return this.prisma.customer.create({
      data: { ...dto, phone: dto.phone || undefined, email: dto.email || undefined, orgId },
    });
  }

  async update(orgId: string, id: string, dto: Partial<CreateCustomerInput>) {
    await this.findOne(orgId, id);
    return this.prisma.customer.update({
      where: { id },
      data: { ...dto, phone: dto.phone || undefined, email: dto.email || undefined },
    });
  }
}
