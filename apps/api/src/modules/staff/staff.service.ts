import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto, StaffRole } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { FileStorageService } from '../file-storage/file-storage.service';

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
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorageService: FileStorageService,
  ) {}

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

  private mapToDbRole(role: StaffRole): 'ADMIN' | 'MANAGER' | 'STAFF' {
    if (role === StaffRole.PARTNER_DIRECTOR) return 'ADMIN';
    if (role === StaffRole.MANAGER) return 'MANAGER';
    return 'STAFF';
  }

  private mapFromDbRole(role?: string): StaffRole {
    if (role === 'ADMIN') return StaffRole.PARTNER_DIRECTOR;
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

  private async generateStaffRefFromStorage(): Promise<string> {
    const ids = await this.fileStorageService.listFiles('staff');
    const indices = (ids || [])
      .map((ref) => String(ref || '').trim())
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

  private isDatabaseUnavailableError(error: unknown): boolean {
    const message = String((error as any)?.message || error || '').toLowerCase();
    return (
      message.includes("can't reach database server")
      || message.includes('prismaclientinitializationerror')
      || message.includes('connection refused')
      || message.includes('timed out')
      || message.includes('database connection failed')
      || message.includes('denied access on the database')
      || message.includes('authentication failed')
      || message.includes('p1010')
    );
  }

  private async readStaffFromStorage(ref: string): Promise<Staff | null> {
    const data = await this.fileStorageService.readJson<Staff>('staff', ref);
    if (!data || !/^S\d{3}$/.test(String(data.ref || ref))) return null;
    return {
      ref: String(data.ref || ref),
      firstName: String(data.firstName || '').trim(),
      lastName: String(data.lastName || '').trim(),
      fullName: this.buildFullName(String(data.firstName || ''), String(data.lastName || '')),
      role: (Object.values(StaffRole) as string[]).includes(String(data.role))
        ? (data.role as StaffRole)
        : StaffRole.STAFF,
      email: this.normalizeEmail(data.email),
      phone: data.phone || undefined,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    };
  }

  async create(dto: CreateStaffDto): Promise<Staff> {
    try {
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
    } catch (error) {
      if (!this.isDatabaseUnavailableError(error)) throw error;

      this.logger.warn('Database unavailable while creating staff; writing to file storage');
      const now = new Date();
      const ref = await this.generateStaffRefFromStorage();
      const staff: Staff = {
        ref,
        firstName: String(dto.firstName || '').trim(),
        lastName: String(dto.lastName || '').trim(),
        fullName: this.buildFullName(dto.firstName, dto.lastName),
        role: dto.role || StaffRole.STAFF,
        email: this.normalizeEmail(dto.email) || `${ref.toLowerCase()}@staff.local`,
        phone: dto.phone || undefined,
        createdAt: now,
        updatedAt: now,
      };
      await this.fileStorageService.writeJson('staff', ref, staff);
      return staff;
    }
  }

  async findAll(): Promise<Staff[]> {
    try {
      const users = await (this.prisma as any).user.findMany({
        where: {
          id: { startsWith: 'S' },
        },
        orderBy: { createdAt: 'asc' },
      });
      return users.map((u: any) => this.toStaff(u));
    } catch (error) {
      if (!this.isDatabaseUnavailableError(error)) throw error;

      this.logger.warn('Database unavailable while loading staff; reading file storage');
      const refs = await this.fileStorageService.listFiles('staff');
      const list = await Promise.all(refs.map((ref) => this.readStaffFromStorage(ref)));
      return list.filter((row): row is Staff => Boolean(row)).sort((a, b) => a.ref.localeCompare(b.ref));
    }
  }

  async findOne(ref: string): Promise<Staff> {
    try {
      const staff = await (this.prisma as any).user.findUnique({ where: { id: ref } });
      if (!staff || !/^S\d{3}$/.test(staff.id)) {
        throw new NotFoundException(`Staff member ${ref} not found`);
      }
      return this.toStaff(staff);
    } catch (error) {
      if (!this.isDatabaseUnavailableError(error)) throw error;
      const staff = await this.readStaffFromStorage(ref);
      if (!staff) throw new NotFoundException(`Staff member ${ref} not found`);
      return staff;
    }
  }

  async update(ref: string, dto: UpdateStaffDto): Promise<Staff> {
    const existing = await this.findOne(ref);
    const nextFirst = dto.firstName !== undefined ? dto.firstName : existing.firstName;
    const nextLast = dto.lastName !== undefined ? dto.lastName : existing.lastName;
    const nextEmail = dto.email !== undefined ? this.normalizeEmail(dto.email) : existing.email;

    try {
      const updated = await (this.prisma as any).user.update({
        where: { id: existing.ref },
        data: {
          name: this.buildFullName(nextFirst, nextLast),
          role: this.mapToDbRole(dto.role ?? existing.role),
          ...(nextEmail ? { email: nextEmail } : {}),
        },
      });
      return this.toStaff(updated);
    } catch (error) {
      if (!this.isDatabaseUnavailableError(error)) throw error;
      const now = new Date();
      const updated: Staff = {
        ...existing,
        firstName: String(nextFirst || '').trim(),
        lastName: String(nextLast || '').trim(),
        fullName: this.buildFullName(nextFirst, nextLast),
        role: dto.role ?? existing.role,
        email: nextEmail || undefined,
        phone: dto.phone !== undefined ? dto.phone : existing.phone,
        updatedAt: now,
      };
      await this.fileStorageService.writeJson('staff', existing.ref, updated);
      return updated;
    }
  }

  async remove(ref: string): Promise<boolean> {
    await this.findOne(ref);
    try {
      await (this.prisma as any).user.delete({ where: { id: ref } });
      return true;
    } catch (error) {
      if (!this.isDatabaseUnavailableError(error)) throw error;
      await this.fileStorageService.deleteJson('staff', ref);
      return true;
    }
  }
}
