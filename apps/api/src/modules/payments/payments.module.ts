import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { EsewaService } from "./esewa.service";
import { KhaltiService } from "./khalti.service";

@Module({
  controllers: [PaymentsController],
  providers: [EsewaService, KhaltiService],
  exports: [EsewaService, KhaltiService],
})
export class PaymentsModule {}
