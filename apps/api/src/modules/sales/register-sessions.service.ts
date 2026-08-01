import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class RegisterSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  findRegisters(orgId: string, branchId?: string) {
    return this.prisma.cashRegister.findMany({
      where: { branch: { orgId }, ...(branchId ? { branchId } : {}) },
    });
  }

  createRegister(branchId: string, name: string) {
    return this.prisma.cashRegister.create({ data: { branchId, name } });
  }

  findActive(branchId: string) {
    return this.prisma.registerSession.findFirst({
      where: { status: "OPEN", register: { branchId } },
      include: { register: true, openedBy: { select: { id: true, fullName: true } } },
    });
  }

  async open(userId: string, registerId: string, openingCash: number) {
    const existing = await this.prisma.registerSession.findFirst({
      where: { registerId, status: "OPEN" },
    });
    if (existing) throw new BadRequestException("This register already has an open session");

    return this.prisma.registerSession.create({
      data: { registerId, openedByUserId: userId, openingCash },
      include: { register: true },
    });
  }

  async close(userId: string, sessionId: string, closingCash: number) {
    const session = await this.prisma.registerSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException("Register session not found");
    if (session.status !== "OPEN") throw new BadRequestException("Session already closed");

    const cashPayments = await this.prisma.payment.aggregate({
      where: {
        method: "CASH",
        sale: { registerSessionId: sessionId, status: "COMPLETED" },
      },
      _sum: { amount: true },
    });

    const expectedCash = Number(session.openingCash) + Number(cashPayments._sum.amount ?? 0);
    const variance = closingCash - expectedCash;

    return this.prisma.registerSession.update({
      where: { id: sessionId },
      data: {
        status: "CLOSED",
        closedByUserId: userId,
        closedAt: new Date(),
        closingCash,
        expectedCash,
        variance,
      },
    });
  }
}
