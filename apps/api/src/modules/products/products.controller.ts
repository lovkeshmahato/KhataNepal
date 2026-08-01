import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@khatanepal/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { CreateCategoryDto, CreateUnitDto, CreateVatRateDto } from "./dto/catalog.dto";

@ApiTags("products")
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get("products")
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  findAll(@CurrentUser("orgId") orgId: string, @Query("search") search?: string) {
    return this.productsService.findAll(orgId, search);
  }

  @Get("products/barcode/:barcode")
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  findByBarcode(@CurrentUser("orgId") orgId: string, @Param("barcode") barcode: string) {
    return this.productsService.findByBarcode(orgId, barcode);
  }

  @Get("products/:id")
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  findOne(@CurrentUser("orgId") orgId: string, @Param("id") id: string) {
    return this.productsService.findOne(orgId, id);
  }

  @Post("products")
  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  create(@CurrentUser("orgId") orgId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(orgId, dto);
  }

  @Patch("products/:id")
  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  update(@CurrentUser("orgId") orgId: string, @Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(orgId, id, dto);
  }

  @Get("categories")
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  findCategories(@CurrentUser("orgId") orgId: string) {
    return this.productsService.findCategories(orgId);
  }

  @Post("categories")
  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  createCategory(@CurrentUser("orgId") orgId: string, @Body() dto: CreateCategoryDto) {
    return this.productsService.createCategory(orgId, dto);
  }

  @Get("units")
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  findUnits(@CurrentUser("orgId") orgId: string) {
    return this.productsService.findUnits(orgId);
  }

  @Post("units")
  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  createUnit(@CurrentUser("orgId") orgId: string, @Body() dto: CreateUnitDto) {
    return this.productsService.createUnit(orgId, dto);
  }

  @Get("vat-rates")
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  findVatRates(@CurrentUser("orgId") orgId: string) {
    return this.productsService.findVatRates(orgId);
  }

  @Post("vat-rates")
  @RequirePermissions(PERMISSIONS.PRODUCT_WRITE)
  createVatRate(@CurrentUser("orgId") orgId: string, @Body() dto: CreateVatRateDto) {
    return this.productsService.createVatRate(orgId, dto);
  }
}
