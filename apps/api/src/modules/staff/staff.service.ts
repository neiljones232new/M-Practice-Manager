import { Injectable, NotFoundException } from '@nestjs/common';
import { FileStorageService } from '../file-storage/file-storage.service';
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
  constructor(private readonly fileStorage: FileStorageService) {}

  private splitName(fullName: string): { firstName: string; lastName: string } {
    const trimmed = String(fullName || '').trim();
    if (!trimmed) return { firstName: 'Unknown', lastName: ' ' };
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return { firstName: parts[0], lastName: ' ' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  private async ensureFirstStaffSeeded(): Promise<void> {
    const existing = await this.fileStorage.listFiles('staff');
    if (Array.isArray(existing) && existing.length > 0) return;

    const practiceSettings = await this.fileStorage.readJson<any>('config', 'practice-settings').catch(() => null);
    const primaryContact = practiceSettings?.primaryContact;
    const name = String(primaryContact?.name || '').trim();
    const email = String(primaryContact?.email || '').trim();
    const phone = String(primaryContact?.phone || '').trim();
    if (!name) return;

    const seedRef = 'S001';
    const already = await this.fileStorage.readJson<Staff>('staff', seedRef).catch(() => null);
    if (already) return;

    const now = new Date();
    const { firstName, lastName } = this.splitName(name);

    const staff: Staff = {
      ref: seedRef,
      firstName,
      lastName,
      fullName: this.buildFullName(firstName, lastName),
      role: StaffRole.PARTNER_DIRECTOR,
      email: email || undefined,
      phone: phone || undefined,
      createdAt: now,
      updatedAt: now,
    };

    await this.fileStorage.writeJson('staff', seedRef, staff);
  }

  private normalizeEmail(value?: string): string | undefined {
    const v = value?.trim();
    return v ? v : undefined;
  }

  private normalizePhone(value?: string): string | undefined {
    const v = value?.trim();
    return v ? v : undefined;
  }

  private buildFullName(firstName: string, lastName: string): string {
    return `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim();
  }

  private async generateStaffRef(): Promise<string> {
    await this.ensureFirstStaffSeeded();
    const existing = await this.fileStorage.listFiles('staff');
    const indices = (existing || [])
      .map((id) => String(id || '').trim())
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
    await this.ensureFirstStaffSeeded();
    const ref = await this.generateStaffRef();
    const now = new Date();

    const staff: Staff = {
      ref,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      fullName: this.buildFullName(dto.firstName, dto.lastName),
      role: dto.role,
      email: this.normalizeEmail(dto.email),
      phone: this.normalizePhone(dto.phone),
      createdAt: now,
      updatedAt: now,
    };

    await this.fileStorage.writeJson('staff', ref, staff);
    return staff;
  }

  async findAll(): Promise<Staff[]> {
    await this.ensureFirstStaffSeeded();
    return this.fileStorage.searchFiles<Staff>('staff', () => true);
  }

  async findOne(ref: string): Promise<Staff> {
    await this.ensureFirstStaffSeeded();
    const staff = await this.fileStorage.readJson<Staff>('staff', ref);
    if (!staff) {
      throw new NotFoundException(`Staff member ${ref} not found`);
    }
    return staff;
  }

  async update(ref: string, dto: UpdateStaffDto): Promise<Staff> {
    const existing = await this.findOne(ref);

    const nextFirst = dto.firstName !== undefined ? dto.firstName : existing.firstName;
    const nextLast = dto.lastName !== undefined ? dto.lastName : existing.lastName;

    const updated: Staff = {
      ...existing,
      firstName: nextFirst,
      lastName: nextLast,
      fullName: this.buildFullName(nextFirst, nextLast),
      role: dto.role ?? existing.role,
      email: dto.email !== undefined ? this.normalizeEmail(dto.email) : existing.email,
      phone: dto.phone !== undefined ? this.normalizePhone(dto.phone) : existing.phone,
      ref: existing.ref,
      updatedAt: new Date(),
    };

    await this.fileStorage.writeJson('staff', existing.ref, updated);
    return updated;
  }

  async remove(ref: string): Promise<boolean> {
    await this.findOne(ref);
    await this.fileStorage.deleteJson('staff', ref);
    return true;
  }
}
