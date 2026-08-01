import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, JournalSourceType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../../common/prisma/prisma.service";

type Tx = Prisma.TransactionClient;

export interface JournalLineInput {
  accountCode: string;
  debit?: number;
  credit?: number;
}

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  findAccounts(orgId: string) {
    return this.prisma.account.findMany({ where: { orgId }, orderBy: { code: "asc" } });
  }

  findJournalEntries(orgId: string, branchId?: string) {
    return this.prisma.journalEntry.findMany({
      where: { orgId, ...(branchId ? { branchId } : {}) },
      include: { lines: { include: { account: true } } },
      orderBy: { date: "desc" },
      take: 200,
    });
  }

  async findLedger(orgId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({ where: { id: accountId, orgId } });
    if (!account) throw new NotFoundException("Account not found");

    const lines = await this.prisma.journalLine.findMany({
      where: { accountId },
      include: { journalEntry: true },
      orderBy: { journalEntry: { date: "asc" } },
    });

    let balance = new Decimal(0);
    const entries = lines.map((line) => {
      balance = balance.add(line.debit).sub(line.credit);
      return {
        date: line.journalEntry.date,
        memo: line.journalEntry.memo,
        sourceType: line.journalEntry.sourceType,
        debit: line.debit,
        credit: line.credit,
        balance,
      };
    });

    return { account, entries };
  }

  /**
   * Posts a balanced double-entry journal entry inside an existing
   * transaction. Callers (Sales/Purchasing services) pass account codes
   * from `SYSTEM_ACCOUNT_CODES` — resolved here so business logic never
   * hardcodes account IDs.
   */
  async postJournalEntry(
    tx: Tx,
    params: {
      orgId: string;
      branchId?: string;
      memo: string;
      sourceType: JournalSourceType;
      sourceId?: string;
      createdByUserId?: string;
      lines: JournalLineInput[];
    },
  ) {
    const totalDebit = params.lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
    const totalCredit = params.lines.reduce((sum, l) => sum + (l.credit ?? 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Journal entry is not balanced: debit ${totalDebit} != credit ${totalCredit}`,
      );
    }

    const accounts = await tx.account.findMany({
      where: { orgId: params.orgId, code: { in: params.lines.map((l) => l.accountCode) } },
    });
    const accountByCode = new Map(accounts.map((a) => [a.code, a]));

    for (const line of params.lines) {
      if (!accountByCode.has(line.accountCode)) {
        throw new NotFoundException(
          `Chart-of-accounts entry "${line.accountCode}" is missing for this organization`,
        );
      }
    }

    return tx.journalEntry.create({
      data: {
        orgId: params.orgId,
        branchId: params.branchId,
        memo: params.memo,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        createdByUserId: params.createdByUserId,
        lines: {
          create: params.lines.map((line) => ({
            accountId: accountByCode.get(line.accountCode)!.id,
            debit: line.debit ?? 0,
            credit: line.credit ?? 0,
          })),
        },
      },
      include: { lines: true },
    });
  }
}
