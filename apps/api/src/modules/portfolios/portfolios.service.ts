import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { FileStorageService } from '../file-storage/file-storage.service';
import { CreatePortfolioDto, UpdatePortfolioDto, MergePortfoliosDto } from './dto';

export interface Portfolio {
  code: number;
  name: string;
  description?: string;
  enabled: boolean;
  clientCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PortfoliosService {
  constructor(private fileStorage: FileStorageService) {}

  async findAll(): Promise<Portfolio[]> {
    try {
      const portfolios = await this.fileStorage.readJson<Portfolio[]>('config', 'portfolios');
      return portfolios || [];
    } catch (error) {
      if (error.message.includes('not found')) {
        return this.initializeDefaultPortfolios();
      }
      throw error;
    }
  }

  async findOne(code: number): Promise<Portfolio> {
    const portfolios = await this.findAll();
    const portfolio = portfolios.find(p => p.code === code);
    
    if (!portfolio) {
      throw new NotFoundException(`Portfolio with code ${code} not found`);
    }
    
    return portfolio;
  }

  async create(createPortfolioDto: CreatePortfolioDto): Promise<Portfolio> {
    const portfolios = await this.findAll();
    
    // Check if code already exists
    if (createPortfolioDto.code && portfolios.some(p => p.code === createPortfolioDto.code)) {
      throw new BadRequestException(`Portfolio with code ${createPortfolioDto.code} already exists`);
    }
    
    // Generate next code if not provided
    const code = createPortfolioDto.code || Math.max(...portfolios.map(p => p.code), 0) + 1;
    
    const newPortfolio: Portfolio = {
      code,
      name: createPortfolioDto.name,
      description: createPortfolioDto.description,
      enabled: true,
      clientCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    portfolios.push(newPortfolio);
    await this.fileStorage.writeJson('config', 'portfolios', portfolios);
    
    return newPortfolio;
  }

  async update(code: number, updatePortfolioDto: UpdatePortfolioDto): Promise<Portfolio> {
    const portfolios = await this.findAll();
    const index = portfolios.findIndex(p => p.code === code);
    
    if (index === -1) {
      throw new NotFoundException(`Portfolio with code ${code} not found`);
    }
    
    portfolios[index] = {
      ...portfolios[index],
      ...updatePortfolioDto,
      updatedAt: new Date(),
    };
    
    await this.fileStorage.writeJson('config', 'portfolios', portfolios);
    return portfolios[index];
  }

  async remove(code: number): Promise<void> {
    const portfolios = await this.findAll();
    const portfolio = portfolios.find(p => p.code === code);
    
    if (!portfolio) {
      throw new NotFoundException(`Portfolio with code ${code} not found`);
    }
    
    if (portfolio.clientCount > 0) {
      throw new BadRequestException('Cannot delete portfolio with existing clients');
    }
    
    const filteredPortfolios = portfolios.filter(p => p.code !== code);
    await this.fileStorage.writeJson('config', 'portfolios', filteredPortfolios);
  }

  async getStats(): Promise<{
    totalPortfolios: number;
    totalClients: number;
    avgClientsPerPortfolio: number;
  }> {
    const portfolios = await this.findAll();
    const totalClients = portfolios.reduce((sum, p) => sum + p.clientCount, 0);
    
    return {
      totalPortfolios: portfolios.length,
      totalClients,
      avgClientsPerPortfolio: portfolios.length > 0 ? Math.round(totalClients / portfolios.length) : 0,
    };
  }

  async merge(mergeDto: MergePortfoliosDto): Promise<Portfolio> {
    const portfolios = await this.findAll();
    
    // Validate source portfolios exist
    const sourcePortfolios = portfolios.filter(p => mergeDto.sourcePortfolioCodes.includes(p.code));
    if (sourcePortfolios.length !== mergeDto.sourcePortfolioCodes.length) {
      throw new BadRequestException('One or more source portfolios not found');
    }
    
    let targetPortfolio: Portfolio;
    
    if (mergeDto.targetPortfolioCode) {
      // Merge into existing portfolio
      targetPortfolio = portfolios.find(p => p.code === mergeDto.targetPortfolioCode);
      if (!targetPortfolio) {
        throw new NotFoundException(`Target portfolio with code ${mergeDto.targetPortfolioCode} not found`);
      }
    } else if (mergeDto.newPortfolioName) {
      // Create new portfolio
      const newCode = Math.max(...portfolios.map(p => p.code), 0) + 1;
      targetPortfolio = {
        code: newCode,
        name: mergeDto.newPortfolioName,
        description: 'Merged portfolio',
        enabled: true,
        clientCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      portfolios.push(targetPortfolio);
    } else {
      throw new BadRequestException('Either targetPortfolioCode or newPortfolioName must be provided');
    }
    
    // Calculate total client count
    const totalClients = sourcePortfolios.reduce((sum, p) => sum + p.clientCount, 0);
    targetPortfolio.clientCount += totalClients;
    targetPortfolio.updatedAt = new Date();
    
    // Remove source portfolios
    const remainingPortfolios = portfolios.filter(p => !mergeDto.sourcePortfolioCodes.includes(p.code));
    
    await this.fileStorage.writeJson('config', 'portfolios', remainingPortfolios);
    return targetPortfolio;
  }

  private async initializeDefaultPortfolios(): Promise<Portfolio[]> {
    const defaultPortfolios: Portfolio[] = [
      {
        code: 1,
        name: 'Main Portfolio',
        description: 'Default client portfolio',
        enabled: true,
        clientCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    await this.fileStorage.writeJson('config', 'portfolios', defaultPortfolios);
    return defaultPortfolios;
  }
}