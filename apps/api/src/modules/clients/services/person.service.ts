import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Person, CreatePersonDto, UpdatePersonDto } from '../interfaces/client.interface';

@Injectable()
export class PersonService {
  private readonly logger = new Logger(PersonService.name);

  constructor(private prisma: PrismaService) {}

  async create(createPersonDto: CreatePersonDto): Promise<Person> {
    const person = await (this.prisma as any).person.create({
      data: {
        fullName: createPersonDto.fullName,
        email: createPersonDto.email,
        phone: createPersonDto.phone,
      },
    });
    this.logger.log(`Created person: ${person.fullName || person.id}`);
    return person;
  }

  async findAll(): Promise<Person[]> {
    return (this.prisma as any).person.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string): Promise<Person | null> {
    return (this.prisma as any).person.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<Person | null> {
    return (this.prisma as any).person.findUnique({ where: { email } });
  }

  async search(query: string): Promise<Person[]> {
    const q = query.trim();
    if (!q) return [];
    return (this.prisma as any).person.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async update(id: string, updatePersonDto: UpdatePersonDto): Promise<Person> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Person with ID ${id} not found`);
    }

    const updated = await (this.prisma as any).person.update({
      where: { id },
      data: {
        fullName: updatePersonDto.fullName,
        email: updatePersonDto.email,
        phone: updatePersonDto.phone,
      },
    });

    this.logger.log(`Updated person: ${updated.fullName || updated.id}`);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findOne(id);
    if (!existing) return false;
    const associations = await (this.prisma as any).clientParty.count({ where: { personId: id } });
    if (associations > 0) {
      throw new Error(`Cannot delete person ${existing.fullName || existing.id} - associated with ${associations} client(s)`);
    }
    await (this.prisma as any).person.delete({ where: { id } });
    this.logger.log(`Deleted person: ${existing.fullName || existing.id}`);
    return true;
  }

  async findAssociatedClients(personId: string): Promise<string[]> {
    const parties = await (this.prisma as any).clientParty.findMany({
      where: { personId },
      select: { clientId: true },
    });
    return parties.map((p: any) => p.clientId);
  }
}
