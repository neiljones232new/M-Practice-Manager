import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Portfolio[]> {
    let portfolios = await (this.prisma as any).portfolio.findMany({
      orderBy: { code: 'asc' },
    });

    if (!portfolios.length) {
      await (this.prisma as any).portfolio.create({
        data: {
          code: 1,
          name: 'Main Portfolio',
          description: 'Default client portfolio',
        },
      });
      portfolios = await (this.prisma as any).portfolio.findMany({
        orderBy: { code: 'asc' },
      });
    }

    const counts = await (this.prisma as any).client.groupBy({
      by: ['portfolioCode'],
      _count: { _all: true },
    });
    const countMap = new Map<number, number>(
      counts.map((c: any) => [c.portfolioCode, c._count._all])
    );

    return portfolios.map((p: any) => ({
      ...p,
      enabled: true,
      clientCount: countMap.get(p.code) ?? 0,
    }));
  }

  async findOne(code: number): Promise<Portfolio> {
    const portfolio = await (this.prisma as any).portfolio.findUnique({ where: { code } });
    if (!portfolio) throw new NotFoundException(`Portfolio with code ${code} not found`);

    const clientCount = await (this.prisma as any).client.count({
      where: { portfolioCode: code },
    });

    return { ...portfolio, enabled: true, clientCount };
  }

  async create(createPortfolioDto: CreatePortfolioDto): Promise<Portfolio> {
    if (createPortfolioDto.code) {
      const existing = await (this.prisma as any).portfolio.findUnique({
        where: { code: createPortfolioDto.code },
      });
      if (existing) {
        throw new BadRequestException(`Portfolio with code ${createPortfolioDto.code} already exists`);
      }
    }

    let code = createPortfolioDto.code;
    if (!code) {
      const latest = await (this.prisma as any).portfolio.findFirst({
        orderBy: { code: 'desc' },
      });
      code = (latest?.code ?? 0) + 1;
    }

    const created = await (this.prisma as any).portfolio.create({
      data: {
        code,
        name: createPortfolioDto.name,
        description: createPortfolioDto.description,
      },
    });

    return { ...created, enabled: true, clientCount: 0 };
  }

  async update(code: number, updatePortfolioDto: UpdatePortfolioDto): Promise<Portfolio> {
    const existing = await (this.prisma as any).portfolio.findUnique({ where: { code } });
    if (!existing) {
      throw new NotFoundException(`Portfolio with code ${code} not found`);
    }

    const updated = await (this.prisma as any).portfolio.update({
      where: { code },
      data: {
        name: updatePortfolioDto.name ?? existing.name,
        description: updatePortfolioDto.description ?? existing.description,
      },
    });

    const clientCount = await (this.prisma as any).client.count({
      where: { portfolioCode: code },
    });

    return { ...updated, enabled: true, clientCount };
  }

  async remove(code: number): Promise<void> {
    const existing = await (this.prisma as any).portfolio.findUnique({ where: { code } });
    if (!existing) {
      throw new NotFoundException(`Portfolio with code ${code} not found`);
    }

    const clientCount = await (this.prisma as any).client.count({
      where: { portfolioCode: code },
    });
    if (clientCount > 0) {
      throw new BadRequestException('Cannot delete portfolio with existing clients');
    }

    await (this.prisma as any).portfolio.delete({ where: { code } });
  }

  async getStats(): Promise<{
    totalPortfolios: number;
    totalClients: number;
    avgClientsPerPortfolio: number;
  }> {
    const [totalPortfolios, totalClients] = await Promise.all([
      (this.prisma as any).portfolio.count(),
      (this.prisma as any).client.count(),
    ]);

    return {
      totalPortfolios,
      totalClients,
      avgClientsPerPortfolio:
        totalPortfolios > 0 ? Math.round(totalClients / totalPortfolios) : 0,
    };
  }

  async merge(mergeDto: MergePortfoliosDto): Promise<Portfolio> {
    const sourceCodes = mergeDto.sourcePortfolioCodes;
    const sourcePortfolios = await (this.prisma as any).portfolio.findMany({
      where: { code: { in: sourceCodes } },
    });
    if (sourcePortfolios.length !== sourceCodes.length) {
      throw new BadRequestException('One or more source portfolios not found');
    }

    let targetPortfolio: any;

    if (mergeDto.targetPortfolioCode) {
      targetPortfolio = await (this.prisma as any).portfolio.findUnique({
        where: { code: mergeDto.targetPortfolioCode },
      });
      if (!targetPortfolio) {
        throw new NotFoundException(`Target portfolio with code ${mergeDto.targetPortfolioCode} not found`);
      }
    } else if (mergeDto.newPortfolioName) {
      const latest = await (this.prisma as any).portfolio.findFirst({
        orderBy: { code: 'desc' },
      });
      const newCode = (latest?.code ?? 0) + 1;
      targetPortfolio = await (this.prisma as any).portfolio.create({
        data: {
          code: newCode,
          name: mergeDto.newPortfolioName,
          description: 'Merged portfolio',
        },
      });
    } else {
      throw new BadRequestException('Either targetPortfolioCode or newPortfolioName must be provided');
    }

    await (this.prisma as any).$transaction([
      (this.prisma as any).client.updateMany({
        where: { portfolioCode: { in: sourceCodes } },
        data: { portfolioCode: targetPortfolio.code },
      }),
      (this.prisma as any).portfolio.deleteMany({
        where: { code: { in: sourceCodes, not: targetPortfolio.code } },
      }),
    ]);

    const clientCount = await (this.prisma as any).client.count({
      where: { portfolioCode: targetPortfolio.code },
    });

    return { ...targetPortfolio, enabled: true, clientCount };
  }

  async getClientsInPortfolio(code: number, page: number, limit: number) {
    const total = await (this.prisma as any).client.count({
      where: { portfolioCode: code },
    });
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
    const clients = await (this.prisma as any).client.findMany({
      where: { portfolioCode: code },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return { clients, total, page, limit, totalPages };
  }
}
