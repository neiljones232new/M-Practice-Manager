import { Injectable } from '@nestjs/common';
import { PersonService } from '../clients/services/person.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';

@Injectable()
export class PeopleService {
  constructor(private readonly personService: PersonService) {}

  create(createPersonDto: CreatePersonDto) {
    return this.personService.create(createPersonDto);
  }

  findAll() {
    return this.personService.findAll();
  }

  findOne(id: string) {
    return this.personService.findOne(id);
  }

  update(id: string, updatePersonDto: UpdatePersonDto) {
    return this.personService.update(id, updatePersonDto);
  }

  remove(id: string) {
    return this.personService.delete(id);
  }
}
