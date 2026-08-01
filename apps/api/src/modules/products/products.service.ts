import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { CreateProductDto } from "./dto/create-product.dto";
import type { UpdateProductDto } from "./dto/update-product.dto";
import type { CreateCategoryDto, CreateUnitDto, CreateVatRateDto } from "./dto/catalog.dto";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(orgId: string, search?: string) {
    return this.prisma.product.findMany({
      where: {
        orgId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
                { barcode: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { category: true, unit: true, vatRate: true },
      orderBy: { name: "asc" },
    });
  }

  async findOne(orgId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, orgId },
      include: { category: true, unit: true, vatRate: true },
    });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async findByBarcode(orgId: string, barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { orgId, barcode },
      include: { category: true, unit: true, vatRate: true },
    });
    if (!product) throw new NotFoundException("No product matches this barcode");
    return product;
  }

  create(orgId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: { ...dto, orgId },
      include: { category: true, unit: true, vatRate: true },
    });
  }

  async update(orgId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(orgId, id);
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true, unit: true, vatRate: true },
    });
  }

  // ─── Catalog reference data ─────────────────────────────────────────────

  findCategories(orgId: string) {
    return this.prisma.category.findMany({ where: { orgId }, orderBy: { name: "asc" } });
  }

  createCategory(orgId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: { ...dto, orgId } });
  }

  findUnits(orgId: string) {
    return this.prisma.unit.findMany({ where: { orgId }, orderBy: { name: "asc" } });
  }

  createUnit(orgId: string, dto: CreateUnitDto) {
    return this.prisma.unit.create({ data: { ...dto, orgId } });
  }

  findVatRates(orgId: string) {
    return this.prisma.vatRate.findMany({ where: { orgId }, orderBy: { rate: "asc" } });
  }

  createVatRate(orgId: string, dto: CreateVatRateDto) {
    return this.prisma.vatRate.create({ data: { ...dto, orgId } });
  }
}
