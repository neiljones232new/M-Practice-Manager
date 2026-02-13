import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto, StaffRole } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

export type Staff = {
  ref: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: StaffRole;
  email?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  private splitName(fullName: string): { firstName: string; lastName: string } {
    const trimmed = String(fullName || '').trim();
    if (!trimmed) return { firstName: 'Unknown', lastName: ' ' };
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return { firstName: parts[0], lastName: ' ' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  private normalizeEmail(value?: string): string | undefined {
    const v = value?.trim();
    return v ? v : undefined;
  }

  private buildFullName(firstName: string, lastName: string): string {
    return `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim();
  }

  private mapToDbRole(role: StaffRole): 'PARTNER' | 'MANAGER' | 'STAFF' {
    if (role === StaffRole.PARTNER_DIRECTOR) return 'PARTNER';
    if (role === StaffRole.MANAGER) return 'MANAGER';
    return 'STAFF';
  }

  private mapFromDbRole(role?: string): StaffRole {
    if (role === 'PARTNER') return StaffRole.PARTNER_DIRECTOR;
    if (role === 'MANAGER') return StaffRole.MANAGER;
    return StaffRole.STAFF;
  }

  private toStaff(user: any): Staff {
    const { firstName, lastName } = this.splitName(user.name || '');
    return {
      ref: user.id,
      firstName,
      lastName,
      fullName: this.buildFullName(firstName, lastName),
      role: this.mapFromDbRole(user.role),
      email: user.email || undefined,
      phone: undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async generateStaffRef(): Promise<string> {
    const existing = await (this.prisma as any).user.findMany({
      where: {
        id: { startsWith: 'S' },
      },
      select: { id: true },
    });
    const indices = (existing || [])
      .map((u: any) => String(u?.id || '').trim())
      .filter((ref) => /^S\d{3}$/.test(ref))
      .map((ref) => parseInt(ref.slice(1), 10))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);

    let next = 1;
    for (const n of indices) {
      if (n === next) next++;
      else break;
    }

    return `S${String(next).padStart(3, '0')}`;
  }

  async create(dto: CreateStaffDto): Promise<Staff> {
    const ref = await this.generateStaffRef();
    const email = this.normalizeEmail(dto.email) || `${ref.toLowerCase()}@staff.local`;
    const created = await (this.prisma as any).user.create({
      data: {
        id: ref,
        email,
        name: this.buildFullName(dto.firstName, dto.lastName),
        role: this.mapToDbRole(dto.role),
        isActive: true,
      },
    });
    return this.toStaff(created);
  }

  async findAll(): Promise<Staff[]> {
    const users = await (this.prisma as any).user.findMany({
      where: {
        id: { startsWith: 'S' },
      },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u: any) => this.toStaff(u));
  }

  async findOne(ref: string): Promise<Staff> {
    const staff = await (this.prisma as any).user.findUnique({ where: { id: ref } });
    if (!staff || !/^S\d{3}$/.test(staff.id)) {
      throw new NotFoundException(`Staff member ${ref} not found`);
    }
    return this.toStaff(staff);
  }

  async update(ref: string, dto: UpdateStaffDto): Promise<Staff> {
    const existing = await this.findOne(ref);

    const nextFirst = dto.firstName !== undefined ? dto.firstName : existing.firstName;
    const nextLast = dto.lastName !== undefined ? dto.lastName : existing.lastName;

    const nextEmail = dto.email !== undefined ? this.normalizeEmail(dto.email) : existing.email;
    const updated = await (this.prisma as any).user.update({
      where: { id: existing.ref },
      data: {
        name: this.buildFullName(nextFirst, nextLast),
        role: this.mapToDbRole(dto.role ?? existing.role),
        ...(nextEmail ? { email: nextEmail } : {}),
      },
    });
    return this.toStaff(updated);
  }

  async remove(ref: string): Promise<boolean> {
    await this.findOne(ref);
    await (this.prisma as any).user.delete({ where: { id: ref } });
    return true;
  }
}
