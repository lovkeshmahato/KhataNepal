import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { CreateSupplierInput } from "../../shared-types";

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(orgId: string) {
    return this.prisma.supplier.findMany({ where: { orgId }, orderBy: { name: "asc" } });
  }

  async findOne(orgId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, orgId } });
    if (!supplier) throw new NotFoundException("Supplier not found");
    return supplier;
  }

  create(orgId: string, dto: CreateSupplierInput) {
    return this.prisma.supplier.create({ data: { ...dto, orgId } });
  }

  async update(orgId: string, id: string, dto: Partial<CreateSupplierInput>) {
    await this.findOne(orgId, id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }
}
