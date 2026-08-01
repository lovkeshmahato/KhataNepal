import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "node:crypto";

const ESEWA_URLS = {
  sandbox: {
    form: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    statusCheck: "https://rc.esewa.com.np/api/epay/transaction/status/",
  },
  production: {
    form: "https://epay.esewa.com.np/api/epay/main/v2/form",
    statusCheck: "https://epay.esewa.com.np/api/epay/transaction/status/",
  },
} as const;

export interface EsewaFormPayload {
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
}

/**
 * eSewa ePay v2 integration (sandbox by default — see ESEWA_MODE).
 * Builds the signed form payload the client redirects/POSTs to eSewa with;
 * `verifyTransaction` re-checks the outcome server-side via the status API
 * rather than trusting the redirect query params.
 */
@Injectable()
export class EsewaService {
  private readonly logger = new Logger(EsewaService.name);

  constructor(private readonly config: ConfigService) {}

  private get mode(): "sandbox" | "production" {
    return this.config.get<string>("payments.esewa.mode") === "production" ? "production" : "sandbox";
  }

  buildPaymentForm(params: {
    amount: number;
    transactionUuid: string;
    successUrl: string;
    failureUrl: string;
  }): { action: string; fields: EsewaFormPayload } {
    const merchantCode = this.config.get<string>("payments.esewa.merchantCode")!;
    const secretKey = this.config.get<string>("payments.esewa.secretKey")!;

    const fields: EsewaFormPayload = {
      amount: params.amount.toFixed(2),
      tax_amount: "0",
      total_amount: params.amount.toFixed(2),
      transaction_uuid: params.transactionUuid,
      product_code: merchantCode,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: params.successUrl,
      failure_url: params.failureUrl,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature: "",
    };

    const message = `total_amount=${fields.total_amount},transaction_uuid=${fields.transaction_uuid},product_code=${fields.product_code}`;
    fields.signature = createHmac("sha256", secretKey).update(message).digest("base64");

    return { action: ESEWA_URLS[this.mode].form, fields };
  }

  /** Server-side verification against eSewa's transaction status endpoint. */
  async verifyTransaction(params: { productCode: string; totalAmount: number; transactionUuid: string }) {
    const url = new URL(ESEWA_URLS[this.mode].statusCheck);
    url.searchParams.set("product_code", params.productCode);
    url.searchParams.set("total_amount", params.totalAmount.toFixed(2));
    url.searchParams.set("transaction_uuid", params.transactionUuid);

    try {
      const res = await fetch(url.toString());
      const data = (await res.json()) as { status?: string };
      return { verified: data.status === "COMPLETE", raw: data };
    } catch (err) {
      this.logger.error(`eSewa verification failed: ${(err as Error).message}`);
      return { verified: false, raw: null };
    }
  }
}
