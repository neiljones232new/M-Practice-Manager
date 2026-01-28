import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { PersonService } from './services/person.service';
import { ClientPartyService } from './services/client-party.service';
import { DemoUserGuard } from '../../common/guards/demo-user.guard';
import { AllowDemoUser } from '../../common/decorators/allow-demo-user.decorator';
import { 
  Client, 
  ClientParty,
  CreateClientDto, 
  UpdateClientDto,
  CreatePersonDto,
  UpdatePersonDto,
  CreateClientPartyDto,
  UpdateClientPartyDto,
  ClientFilters,
  CreateFullClientDto,
} from './interfaces/client.interface';

@ApiTags('Clients')
@Controller('clients')
@UseGuards(DemoUserGuard)
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly personService: PersonService,
    private readonly clientPartyService: ClientPartyService
  ) {}

  // Client endpoints
  @Get()
  @ApiOperation({ summary: 'Get all clients with optional filters' })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'] })
  @ApiQuery({ name: 'type', required: false, enum: ['COMPANY', 'INDIVIDUAL', 'SOLE_TRADER', 'PARTNERSHIP', 'LLP'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'includeContext', required: false, type: Boolean })
  async findAllClients(@Query() filters: ClientFilters, @Query('includeContext') includeContext?: string) {
    const include = includeContext === 'true' || includeContext === '1';
    if (include) {
      return this.clientsService.findAllWithContext(filters);
    }
    return this.clientsService.findAll(filters);
  }

  @Get('portfolio/:portfolioCode')
  @ApiOperation({ summary: 'Get clients by portfolio' })
  async findByPortfolio(@Param('portfolioCode') portfolioCode: string) {
    return this.clientsService.findByPortfolio(parseInt(portfolioCode));
  }

  @Get('search')
  @ApiOperation({ summary: 'Search clients' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'portfolioCode', required: false, type: Number })
  async searchClients(
    @Query('q') query: string,
    @Query('portfolioCode') portfolioCode?: string
  ) {
    const portfolio = portfolioCode ? parseInt(portfolioCode) : undefined;
    return this.clientsService.search(query, portfolio);
  }

  @Get('stats/portfolios')
  @ApiOperation({ summary: 'Get portfolio statistics' })
  async getPortfolioStats() {
    return this.clientsService.getPortfolioStats();
  }

  // Simple import/export helpers
  @Post('import/simple')
  @ApiOperation({ summary: 'Import clients (simple JSON array template)' })
  async importClients(@Body() payload: Array<CreateClientDto>) {
    return this.clientsService.importMany(payload || []);
  }

  @Get('export.csv')
  @ApiOperation({ summary: 'Export clients as CSV' })
  async exportClientsCsv(@Query() filters: ClientFilters) {
    const csv = await this.clientsService.exportCsv(filters);
    // Return as plain text CSV
    return csv;
  }

  @Get('import/template.csv')
  @ApiOperation({ summary: 'Download CSV template for client import' })
  @AllowDemoUser()
  async getImportTemplate(): Promise<string> {
    const headers = [
      'Company Name',
      'Type',
      'Portfolio Code',
      'Status',
      'Company Number',
      'Email',
      'Phone',
      'Address Line 1',
      'Address Line 2',
      'City',
      'County',
      'Postcode',
      'Country',
    ];
    return headers.join(',') + '\n';
  }

  @Post('import/csv')
  @ApiOperation({ summary: 'Import clients from CSV (body.csv as string)' })
  async importClientsCsv(@Body() body: { csv: string }) {
    const csv = body?.csv || '';
    return this.clientsService.importFromCsv(csv);
  }

  // Unified creation (wizard): client + services + directors + tasks
  @Post('create-full')
  @ApiOperation({ summary: 'Create a client with services, directors and optional task generation' })
  @ApiResponse({ status: 201, description: 'Client and related records created successfully' })
  async createFull(@Body() dto: CreateFullClientDto) {
    return this.clientsService.createFull(dto);
  }

  @Post('import/csv/preview')
  @ApiOperation({ summary: 'Preview clients to be imported from CSV with suggested refs' })
  async previewClientsCsv(@Body() body: { csv: string }) {
    const csv = body?.csv || '';
    return this.clientsService.previewImportCsv(csv);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID or reference' })
  async findOneClient(@Param('id') id: string, @Query('includeContext') includeContext?: string) {
    const include = includeContext === 'true' || includeContext === '1';
    if (include) {
      return this.clientsService.getClientWithContext(id);
    }
    return this.clientsService.findOne(id);
  }

  @Get(':id/with-parties')
  @ApiOperation({ summary: 'Get client with party details' })
  async getClientWithParties(@Param('id') id: string) {
    return this.clientsService.getClientWithParties(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new client' })
  @ApiResponse({ status: 201, description: 'Client created successfully' })
  async createClient(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update client' })
  async updateClient(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Put(':id/ref')
  @ApiOperation({ summary: 'Update client reference (ref)' })
  async updateClientRef(@Param('id') id: string, @Body() body: { ref: string }) {
    return this.clientsService.updateRef(id, body.ref);
  }

  @Put(':id/portfolio')
  @ApiOperation({ summary: 'Move client to another portfolio and regenerate reference automatically' })
  async moveClientPortfolio(@Param('id') id: string, @Body() body: { portfolioCode: number }) {
    return this.clientsService.movePortfolio(id, Number(body.portfolioCode));
  }

  @Post('refs/regenerate')
  @ApiOperation({ summary: 'Regenerate all client references to {portfolio}{alpha-from-name}{seq}' })
  async regenerateRefs(@Body() body: { dryRun?: boolean }) {
    const dry = body?.dryRun !== false; // default true
    return this.clientsService.regenerateAllRefs(dry);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete client (use ?force=1 to remove related records)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClient(@Param('id') id: string, @Query('force') force?: string) {
    const deleted = force === '1' || force === 'true'
      ? await this.clientsService.deleteCascade(id)
      : await this.clientsService.delete(id);
    return { deleted };
  }

  // Person endpoints
  @Get('people/all')
  @ApiOperation({ summary: 'Get all people' })
  async findAllPeople() {
    return this.personService.findAll();
  }

  @Get('people/search')
  @ApiOperation({ summary: 'Search people' })
  @ApiQuery({ name: 'q', required: true, type: String })
  async searchPeople(@Query('q') query: string) {
    return this.personService.search(query);
  }

  @Get('people/:id')
  @ApiOperation({ summary: 'Get person by ID or reference' })
  async findOnePerson(@Param('id') id: string) {
    return this.personService.findOne(id);
  }

  @Post('people')
  @ApiOperation({ summary: 'Create new person' })
  @ApiResponse({ status: 201, description: 'Person created successfully' })
  async createPerson(@Body() createPersonDto: CreatePersonDto) {
    return this.personService.create(createPersonDto);
  }

  @Put('people/:id')
  @ApiOperation({ summary: 'Update person' })
  async updatePerson(@Param('id') id: string, @Body() updatePersonDto: UpdatePersonDto) {
    return this.personService.update(id, updatePersonDto);
  }

  @Delete('people/:id')
  @ApiOperation({ summary: 'Delete person' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePerson(@Param('id') id: string) {
    const deleted = await this.personService.delete(id);
    return { deleted };
  }

  // Client-Party relationship endpoints
  @Get('parties/all')
  @ApiOperation({ summary: 'Get all client-party relationships' })
  async findAllClientParties() {
    return this.clientPartyService.findAll();
  }

  @Get('parties/client/:clientId')
  @ApiOperation({ summary: 'Get parties for a client' })
  async findPartiesByClient(@Param('clientId') clientId: string) {
    return this.clientPartyService.findByClient(clientId);
  }

  @Get('parties/person/:personId')
  @ApiOperation({ summary: 'Get client relationships for a person' })
  async findPartiesByPerson(@Param('personId') personId: string) {
    return this.clientPartyService.findByPerson(personId);
  }

  @Get('parties/:id')
  @ApiOperation({ summary: 'Get client-party relationship by ID' })
  async findOneClientParty(@Param('id') id: string) {
    return this.clientPartyService.findOne(id);
  }

  @Get(':clientId/primary-contact')
  @ApiOperation({ summary: 'Get primary contact for a client' })
  async getPrimaryContact(@Param('clientId') clientId: string) {
    return this.clientPartyService.findPrimaryContact(clientId);
  }

  @Get(':clientId/ownership-summary')
  @ApiOperation({ summary: 'Get ownership summary for a client' })
  async getOwnershipSummary(@Param('clientId') clientId: string) {
    return this.clientPartyService.getOwnershipSummary(clientId);
  }

  @Post('parties')
  @ApiOperation({ summary: 'Create client-party relationship' })
  @ApiResponse({ status: 201, description: 'Client-party relationship created successfully' })
  async createClientParty(@Body() createClientPartyDto: CreateClientPartyDto) {
    return this.clientPartyService.create(createClientPartyDto);
  }

  @Put('parties/:id')
  @ApiOperation({ summary: 'Update client-party relationship' })
  async updateClientParty(@Param('id') id: string, @Body() updateClientPartyDto: UpdateClientPartyDto) {
    return this.clientPartyService.update(id, updateClientPartyDto);
  }

  @Put('parties/:id/resign')
  @ApiOperation({ summary: 'Resign client-party relationship' })
  async resignClientParty(@Param('id') id: string, @Body() body: { resignationDate?: string }) {
    const resignationDate = body.resignationDate ? new Date(body.resignationDate) : undefined;
    return this.clientPartyService.resign(id, resignationDate);
  }

  @Delete('parties/:id')
  @ApiOperation({ summary: 'Delete client-party relationship' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClientParty(@Param('id') id: string) {
    const deleted = await this.clientPartyService.delete(id);
    return { deleted };
  }
}
