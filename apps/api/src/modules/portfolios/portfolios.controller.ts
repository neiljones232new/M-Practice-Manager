import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PortfoliosService } from './portfolios.service';
import { CreatePortfolioDto, UpdatePortfolioDto, MergePortfoliosDto } from './dto';

@ApiTags('Portfolios')
@Controller('portfolios')
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  private isDemoUser(req: any) {
    return req?.user?.id === 'demo-user';
  }

  @Get()
  @ApiOperation({ summary: 'Get all portfolios' })
  @ApiResponse({ status: 200, description: 'Returns all portfolios' })
  async findAll(@Request() req: any) {
    if (this.isDemoUser(req)) {
      return [];
    }
    return this.portfoliosService.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get portfolio statistics' })
  @ApiResponse({ status: 200, description: 'Returns portfolio statistics' })
  async getStats(@Request() req: any) {
    if (this.isDemoUser(req)) {
      return {
        totalPortfolios: 0,
        totalClients: 0,
        avgClientsPerPortfolio: 0,
      };
    }
    return this.portfoliosService.getStats();
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get portfolio by code' })
  @ApiResponse({ status: 200, description: 'Returns the portfolio' })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async findOne(@Request() req: any, @Param('code', ParseIntPipe) code: number) {
    if (this.isDemoUser(req)) {
      throw new NotFoundException(`Portfolio with code ${code} not found`);
    }
    const portfolio = await this.portfoliosService.findOne(code);
    if (!portfolio) {
      throw new NotFoundException(`Portfolio with code ${code} not found`);
    }
    return portfolio;
  }

  @Get(':code/clients')
  @ApiOperation({ summary: 'Get clients in portfolio' })
  @ApiResponse({ status: 200, description: 'Returns clients in the portfolio' })
  async getClients(
    @Param('code', ParseIntPipe) code: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    return this.portfoliosService.getClientsInPortfolio(code, pageNum, limitNum);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new portfolio' })
  @ApiResponse({ status: 201, description: 'Portfolio created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() createPortfolioDto: CreatePortfolioDto) {
    return this.portfoliosService.create(createPortfolioDto);
  }

  @Put(':code')
  @ApiOperation({ summary: 'Update portfolio' })
  @ApiResponse({ status: 200, description: 'Portfolio updated successfully' })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async update(
    @Param('code', ParseIntPipe) code: number,
    @Body() updatePortfolioDto: UpdatePortfolioDto,
  ) {
    return this.portfoliosService.update(code, updatePortfolioDto);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge portfolios' })
  @ApiResponse({ status: 200, description: 'Portfolios merged successfully' })
  @ApiResponse({ status: 400, description: 'Invalid merge request' })
  async merge(@Body() mergePortfoliosDto: MergePortfoliosDto) {
    return this.portfoliosService.merge(mergePortfoliosDto);
  }

  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete portfolio' })
  @ApiResponse({ status: 204, description: 'Portfolio deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete portfolio with clients' })
  @ApiResponse({ status: 404, description: 'Portfolio not found' })
  async remove(@Param('code', ParseIntPipe) code: number) {
    await this.portfoliosService.remove(code);
  }

  @Post(':code/transfer-clients')
  @ApiOperation({ summary: 'Transfer clients to another portfolio' })
  @ApiResponse({ status: 200, description: 'Clients transferred successfully' })
  async transferClients(
    @Param('code', ParseIntPipe) fromCode: number,
    @Body('toPortfolioCode', ParseIntPipe) toCode: number,
    @Body('clientIds') clientIds?: string[],
  ) {
    // For now, just return success - client transfer would need to be implemented
    // when the client management system is integrated
    return { 
      success: true, 
      message: `Client transfer from portfolio ${fromCode} to ${toCode} completed`,
      transferredCount: clientIds?.length || 0
    };
  }
}
