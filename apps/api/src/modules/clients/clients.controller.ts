import {
  BadRequestException,
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

  private async resolveClientIdOrThrow(identifier: string): Promise<string> {
    const resolvedId = await this.clientsService.resolveClientId(identifier);
    if (!resolvedId) {
      throw new NotFoundException(`Client with ID ${identifier} not found`);
    }
    return resolvedId;
  }

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

  @Get('search')
  @ApiOperation({ summary: 'Search clients' })
  @ApiQuery({ name: 'q', required: true, type: String })
  async searchClients(@Query('q') query: string, @Query() filters: ClientFilters) {
    return this.clientsService.search(query, filters);
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
  async createClient(@Body() body: CreateClientDto & { templateIds?: string[] }): Promise<Client> {
    const { templateIds, ...createClientDto } = body || ({} as any);
    const client = await this.clientsService.create(createClientDto as CreateClientDto);
    if (Array.isArray(templateIds) && templateIds.length > 0) {
      await this.clientsService.attachDraftServicesFromTemplates(client.id, templateIds);
    }
    return client;
  }

  @Post('create-full')
  @ApiOperation({ summary: 'Create client with initial directors/services (draft services only)' })
  async createFullClient(@Body() payload: {
    client: CreateClientDto;
    templateIds?: string[];
    services?: Array<{
      templateId?: string;
      kind: string;
      frequency?: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
      fee?: number;
      status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
      nextDue?: string | Date;
      description?: string;
    }>;
    directors?: Array<{
      firstName?: string;
      lastName?: string;
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
      primaryContact?: boolean;
      appointedAt?: string | Date;
      ownershipPercent?: number;
    }>;
    generateTasks?: boolean;
  }) {
    return this.clientsService.createFull(payload);
  }

  @Get(':id/services')
  @ApiOperation({ summary: 'Get client services with nested tasks and compliance' })
  async getClientServices(@Param('id') id: string) {
    return this.clientsService.getClientServicesWithWork(id);
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
    const resolvedId = await this.resolveClientIdOrThrow(id);
    return this.clientsService.getProfile(resolvedId);
  }

  @Post(':id/profile')
  @ApiOperation({ summary: 'Create client profile' })
  async createClientProfile(@Param('id') id: string, @Body() body: CreateClientProfileDto) {
    const resolvedId = await this.resolveClientIdOrThrow(id);
    return this.clientsService.createProfile({ ...body, clientId: resolvedId });
  }

  @Put(':id/profile')
  @ApiOperation({ summary: 'Update (or create) client profile' })
  async updateClientProfile(@Param('id') id: string, @Body() body: UpdateClientProfileDto) {
    const resolvedId = await this.resolveClientIdOrThrow(id);
    const existing = await this.clientsService.getProfile(resolvedId);
    if (!existing) {
      return this.clientsService.createProfile({ ...body, clientId: resolvedId });
    }
    return this.clientsService.updateProfile(resolvedId, body);
  }

  @Get(':id/parties')
  @ApiOperation({ summary: 'Get client parties' })
  async getClientParties(@Param('id') id: string) {
    const resolvedId = await this.resolveClientIdOrThrow(id);
    return this.clientPartyService.findByClient(resolvedId);
  }

  @Post(':id/parties')
  @ApiOperation({ summary: 'Create client party' })
  async createClientParty(@Param('id') id: string, @Body() body: CreateClientPartyDto) {
    const resolvedId = await this.resolveClientIdOrThrow(id);
    return this.clientPartyService.create({ ...body, clientId: resolvedId });
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

  @Post('parties')
  @ApiOperation({ summary: 'Create client party (legacy route)' })
  async createClientPartyLegacy(@Body() body: CreateClientPartyDto) {
    if (!body?.clientId) {
      throw new BadRequestException('clientId is required');
    }
    const resolvedId = await this.resolveClientIdOrThrow(body.clientId);
    return this.clientPartyService.create({ ...body, clientId: resolvedId });
  }

  @Put('parties/:partyId')
  @ApiOperation({ summary: 'Update client party (legacy route)' })
  async updateClientPartyLegacy(@Param('partyId') partyId: string, @Body() body: UpdateClientPartyDto) {
    return this.clientPartyService.update(partyId, body);
  }

  @Put('parties/:partyId/resign')
  @ApiOperation({ summary: 'Resign client party (legacy route)' })
  async resignClientPartyLegacy(
    @Param('partyId') partyId: string,
    @Body() body: { resignationDate?: string; resignedAt?: string | Date },
  ) {
    const rawDate = body?.resignationDate || body?.resignedAt;
    const resignedAt = rawDate ? new Date(rawDate) : new Date();
    if (Number.isNaN(resignedAt.getTime())) {
      throw new BadRequestException('Invalid resignationDate');
    }
    return this.clientPartyService.update(partyId, { resignedAt });
  }

  @Delete('parties/:partyId')
  @ApiOperation({ summary: 'Delete client party (legacy route)' })
  async deleteClientPartyLegacy(@Param('partyId') partyId: string) {
    return this.clientPartyService.delete(partyId);
  }
}
