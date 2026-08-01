import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const KHALTI_BASE_URLS = {
  sandbox: "https://dev.khalti.com/api/v2",
  production: "https://khalti.com/api/v2",
} as const;

/**
 * Khalti ePayment (Checkout) API v2 integration — sandbox by default.
 * `initiate` opens a hosted payment session; `lookup` confirms the final
 * status server-side (never trust the client-side redirect alone).
 */
@Injectable()
export class KhaltiService {
  private readonly logger = new Logger(KhaltiService.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    const mode = this.config.get<string>("payments.khalti.mode") === "production" ? "production" : "sandbox";
    return KHALTI_BASE_URLS[mode];
  }

  async initiate(params: {
    amountRupees: number;
    purchaseOrderId: string;
    purchaseOrderName: string;
    returnUrl: string;
    websiteUrl: string;
  }): Promise<{ pidx: string; paymentUrl: string } | null> {
    const secretKey = this.config.get<string>("payments.khalti.secretKey")!;

    try {
      const res = await fetch(`${this.baseUrl}/epayment/initiate/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${secretKey}`,
        },
        body: JSON.stringify({
          return_url: params.returnUrl,
          website_url: params.websiteUrl,
          amount: Math.round(params.amountRupees * 100), // paisa
          purchase_order_id: params.purchaseOrderId,
          purchase_order_name: params.purchaseOrderName,
        }),
      });
      if (!res.ok) {
        this.logger.error(`Khalti initiate failed: ${res.status} ${await res.text()}`);
        return null;
      }
      const data = (await res.json()) as { pidx: string; payment_url: string };
      return { pidx: data.pidx, paymentUrl: data.payment_url };
    } catch (err) {
      this.logger.error(`Khalti initiate error: ${(err as Error).message}`);
      return null;
    }
  }

  async lookup(pidx: string): Promise<{ status: string; raw: unknown } | null> {
    const secretKey = this.config.get<string>("payments.khalti.secretKey")!;
    try {
      const res = await fetch(`${this.baseUrl}/epayment/lookup/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${secretKey}`,
        },
        body: JSON.stringify({ pidx }),
      });
      const data = (await res.json()) as { status: string };
      return { status: data.status, raw: data };
    } catch (err) {
      this.logger.error(`Khalti lookup error: ${(err as Error).message}`);
      return null;
    }
  }
}
