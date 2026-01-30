import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FileStorageService } from '../../file-storage/file-storage.service';
import { Person, CreatePersonDto, UpdatePersonDto } from '../interfaces/client.interface';
import { ReferenceGeneratorService } from './reference-generator.service';

@Injectable()
export class PersonService {
  private readonly logger = new Logger(PersonService.name);

  constructor(
    private fileStorage: FileStorageService,
    private referenceGenerator: ReferenceGeneratorService
  ) {}

  async create(clientRef: string, createPersonDto: CreatePersonDto): Promise<Person> {
    const ref = await this.referenceGenerator.generateConnectedPersonRef(clientRef);
    const now = new Date();

    const person: Person = {
      id: ref,
      ref,
      firstName: createPersonDto.firstName,
      lastName: createPersonDto.lastName,
      fullName: `${createPersonDto.firstName} ${createPersonDto.lastName}`,
      email: createPersonDto.email,
      phone: createPersonDto.phone,
      dateOfBirth: createPersonDto.dateOfBirth,
      nationality: createPersonDto.nationality,
      address: createPersonDto.address,
      createdAt: now,
      updatedAt: now,
    };

    await this.fileStorage.writeJson('people', ref, person, undefined, clientRef);
    this.logger.log(`Created person: ${person.fullName} (${person.ref})`);

    return person;
  }

  async findAll(): Promise<Person[]> {
    return this.fileStorage.searchFiles<Person>('people', () => true);
  }

  async findOne(id: string): Promise<Person | null> {
    // Try to find by ID first
    let person = await this.fileStorage.readJson<Person>('people', id);
    
    if (!person) {
      // If not found by ID, try to find by reference
      const people = await this.fileStorage.searchFiles<Person>('people', 
        (p) => p.id === id || p.ref === id
      );
      person = people[0] || null;
    }

    return person;
  }

  async findByRef(ref: string): Promise<Person | null> {
    return this.fileStorage.readJson<Person>('people', ref);
  }

  async findByEmail(email: string): Promise<Person | null> {
    const people = await this.fileStorage.searchFiles<Person>('people', 
      (person) => person.email === email
    );
    return people[0] || null;
  }

  async search(query: string): Promise<Person[]> {
    return this.fileStorage.searchFiles<Person>('people', (person) => {
      const searchText = `${person.fullName} ${person.email || ''} ${person.ref}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
  }

  async update(id: string, updatePersonDto: UpdatePersonDto): Promise<Person> {
    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException(`Person with ID ${id} not found`);
    }

    const updatedPerson: Person = {
      ...existing,
      ...updatePersonDto,
      id: existing.id, // Ensure ID cannot be changed
      ref: existing.ref, // Ensure reference cannot be changed
      fullName: updatePersonDto.firstName || updatePersonDto.lastName 
        ? `${updatePersonDto.firstName || existing.firstName} ${updatePersonDto.lastName || existing.lastName}`
        : existing.fullName,
      updatedAt: new Date(),
    };

    await this.fileStorage.writeJson('people', existing.ref, updatedPerson);
    this.logger.log(`Updated person: ${updatedPerson.fullName} (${updatedPerson.ref})`);

    return updatedPerson;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findOne(id);
    if (!existing) {
      return false;
    }

    // Check if person is associated with any clients before deletion
    const associatedClients = await this.findAssociatedClients(existing.id);
    if (associatedClients.length > 0) {
      throw new Error(`Cannot delete person ${existing.fullName} - associated with ${associatedClients.length} client(s)`);
    }

    await this.fileStorage.deleteJson('people', existing.ref);
    this.logger.log(`Deleted person: ${existing.fullName} (${existing.ref})`);

    return true;
  }

  async findAssociatedClients(personId: string): Promise<string[]> {
    // This would typically query client-party relationships
    // For now, return empty array - will be implemented when client-party relationships are added
    return [];
  }
}