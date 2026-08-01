import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";

const userListSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  roles: { select: { role: { select: { id: true, name: true } } } },
  branches: { select: { branch: { select: { id: true, name: true } } } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  findAll(orgId: string) {
    return this.prisma.user.findMany({
      where: { orgId },
      select: userListSelect,
      orderBy: { fullName: "asc" },
    });
  }

  async findOne(orgId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, orgId },
      select: userListSelect,
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async create(orgId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({ where: { orgId, email: dto.email } });
    if (existing) throw new ConflictException("A user with this email already exists");

    const passwordHash = await bcrypt.hash(dto.password, this.config.get<number>("bcryptSaltRounds")!);

    return this.prisma.user.create({
      data: {
        orgId,
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        roles: { create: dto.roleIds.map((roleId) => ({ roleId })) },
        branches: { create: dto.branchIds.map((branchId) => ({ branchId })) },
      },
      select: userListSelect,
    });
  }

  async update(orgId: string, id: string, dto: UpdateUserDto) {
    await this.findOne(orgId, id);

    if (dto.roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
    }
    if (dto.branchIds) {
      await this.prisma.userBranch.deleteMany({ where: { userId: id } });
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        isActive: dto.isActive,
        roles: dto.roleIds ? { create: dto.roleIds.map((roleId) => ({ roleId })) } : undefined,
        branches: dto.branchIds ? { create: dto.branchIds.map((branchId) => ({ branchId })) } : undefined,
      },
      select: userListSelect,
    });
  }

  findRoles(orgId: string) {
    return this.prisma.role.findMany({ where: { orgId }, orderBy: { name: "asc" } });
  }
}
