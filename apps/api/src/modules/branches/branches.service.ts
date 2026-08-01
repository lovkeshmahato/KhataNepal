import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { CreateBranchDto } from "./dto/create-branch.dto";
import type { UpdateBranchDto } from "./dto/update-branch.dto";

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(orgId: string) {
    return this.prisma.branch.findMany({ where: { orgId }, orderBy: { name: "asc" } });
  }

  async findOne(orgId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({ where: { id, orgId } });
    if (!branch) throw new NotFoundException("Branch not found");
    return branch;
  }

  create(orgId: string, dto: CreateBranchDto) {
    return this.prisma.branch.create({ data: { ...dto, orgId } });
  }

  async update(orgId: string, id: string, dto: UpdateBranchDto) {
    await this.findOne(orgId, id);
    return this.prisma.branch.update({ where: { id }, data: dto });
  }
}
