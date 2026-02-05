import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { ClientPartyService } from './services/client-party.service';
import { DemoUserGuard } from '../../common/guards/demo-user.guard';
import {
  Client,
  ClientFilters,
  CreateClientDto,
  UpdateClientDto,
  CreateClientProfileDto,
  UpdateClientProfileDto,
  CreateClientPartyDto,
  UpdateClientPartyDto,
} from './interfaces/client.interface';

@ApiTags('Clients')
@Controller('clients')
@UseGuards(DemoUserGuard)
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly clientPartyService: ClientPartyService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all clients with optional filters' })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'] })
  @ApiQuery({ name: 'type', required: false, enum: ['COMPANY', 'INDIVIDUAL', 'SOLE_TRADER', 'PARTNERSHIP', 'LLP'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAllClients(@Query() filters: ClientFilters) {
    return this.clientsService.findAllContexts(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID or identifier' })
  async findOneClient(@Param('id') id: string) {
    return this.clientsService.findByIdentifier(id);
  }

  @Get(':id/with-parties')
  @ApiOperation({ summary: 'Get client context with profile and parties' })
  async getClientWithParties(@Param('id') id: string) {
    const context = await this.clientsService.getContextWithParties(id);
    if (!context) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }
    return context;
  }

  @Post()
  @ApiOperation({ summary: 'Create new client' })
  @ApiResponse({ status: 201, description: 'Client created successfully' })
  async createClient(@Body() createClientDto: CreateClientDto): Promise<Client> {
    return this.clientsService.create(createClientDto);
  }

  @Post(':id/enroll-director')
  @ApiOperation({ summary: 'Enroll a Companies House director as an individual client' })
  @ApiResponse({ status: 201, description: 'Director enrolled as client' })
  async enrollDirector(
    @Param('id') id: string,
    @Body() body: { name: string; email?: string; phone?: string },
  ) {
    return this.clientsService.enrollDirector(id, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update client' })
  async updateClient(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete client' })
  async deleteClient(@Param('id') id: string) {
    return this.clientsService.delete(id);
  }

  @Get(':id/profile')
  @ApiOperation({ summary: 'Get client profile by client ID' })
  async getClientProfile(@Param('id') id: string) {
    return this.clientsService.getProfile(id);
  }

  @Post(':id/profile')
  @ApiOperation({ summary: 'Create client profile' })
  async createClientProfile(@Param('id') id: string, @Body() body: CreateClientProfileDto) {
    return this.clientsService.createProfile({ ...body, clientId: id });
  }

  @Put(':id/profile')
  @ApiOperation({ summary: 'Update client profile' })
  async updateClientProfile(@Param('id') id: string, @Body() body: UpdateClientProfileDto) {
    return this.clientsService.updateProfile(id, body);
  }

  @Get(':id/parties')
  @ApiOperation({ summary: 'Get client parties' })
  async getClientParties(@Param('id') id: string) {
    return this.clientPartyService.findByClient(id);
  }

  @Post(':id/parties')
  @ApiOperation({ summary: 'Create client party' })
  async createClientParty(@Param('id') id: string, @Body() body: CreateClientPartyDto) {
    return this.clientPartyService.create({ ...body, clientId: id });
  }

  @Put(':id/parties/:partyId')
  @ApiOperation({ summary: 'Update client party' })
  async updateClientParty(@Param('partyId') partyId: string, @Body() body: UpdateClientPartyDto) {
    return this.clientPartyService.update(partyId, body);
  }

  @Delete(':id/parties/:partyId')
  @ApiOperation({ summary: 'Delete client party' })
  async deleteClientParty(@Param('partyId') partyId: string) {
    return this.clientPartyService.delete(partyId);
  }
}
