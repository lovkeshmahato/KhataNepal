import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsNumber, IsString, Min } from "class-validator";
import { PERMISSIONS } from "../../shared-types";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { EsewaService } from "./esewa.service";
import { KhaltiService } from "./khalti.service";

class InitiateGatewayPaymentDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  referenceId!: string;

  @IsString()
  returnUrl!: string;

  @IsString()
  websiteUrl!: string;
}

@ApiTags("payments")
@Controller("payments")
@RequirePermissions(PERMISSIONS.SALE_CREATE)
export class PaymentsController {
  constructor(
    private readonly esewaService: EsewaService,
    private readonly khaltiService: KhaltiService,
  ) {}

  @Post("esewa/initiate")
  initiateEsewa(@Body() dto: InitiateGatewayPaymentDto) {
    return this.esewaService.buildPaymentForm({
      amount: dto.amount,
      transactionUuid: dto.referenceId,
      successUrl: dto.returnUrl,
      failureUrl: dto.returnUrl,
    });
  }

  @Post("khalti/initiate")
  initiateKhalti(@Body() dto: InitiateGatewayPaymentDto) {
    return this.khaltiService.initiate({
      amountRupees: dto.amount,
      purchaseOrderId: dto.referenceId,
      purchaseOrderName: `KhataNepal Sale ${dto.referenceId}`,
      returnUrl: dto.returnUrl,
      websiteUrl: dto.websiteUrl,
    });
  }
}
