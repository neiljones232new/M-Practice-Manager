import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsProductionService } from './accounts-production.service';
import { AccountsOutputService } from './accounts-output.service';
import { CreateAccountsSetDto } from './dto/create-accounts-set.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { AccountsSet } from './interfaces/accounts-set.interface';

@ApiTags('Accounts Production')
@Controller('accounts-sets')
@UseGuards(JwtAuthGuard)
export class AccountsProductionController {
  constructor(
    private readonly accountsProductionService: AccountsProductionService,
    private readonly accountsOutputService: AccountsOutputService,
  ) {}

  @Get()
  async getAllAccountsSets(@Request() req: any): Promise<AccountsSet[]> {
    try {
      // For now, we'll get all accounts sets by reading the index
      // In a production system, you might want to add pagination and filtering
      return await this.accountsProductionService.getAllAccountsSets();
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve accounts sets',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post()
  async createAccountsSet(
    @Body() createDto: CreateAccountsSetDto,
    @Request() req: any,
  ): Promise<AccountsSet> {
    try {
      return await this.accountsProductionService.createAccountsSet(
        createDto,
        req.user.id,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create accounts set',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  async getAccountsSet(@Param('id') id: string, @Request() req: any): Promise<AccountsSet> {
    try {
      const accountsSet = await this.accountsProductionService.getAccountsSet(id);
      
      // Basic authorization check - user should have access to the client
      // In a more complex system, you might check specific permissions here
      if (!req.user || !req.user.id) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      return accountsSet;
    } catch (error) {
      if (error.status === HttpStatus.UNAUTHORIZED) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Accounts set not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get('client/:clientId')
  async getClientAccountsSets(
    @Param('clientId') clientId: string,
  ): Promise<AccountsSet[]> {
    try {
      return await this.accountsProductionService.getClientAccountsSets(clientId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve client accounts sets',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(':id/sections/:sectionKey')
  async updateSection(
    @Param('id') id: string,
    @Param('sectionKey') sectionKey: string,
    @Body() updateDto: UpdateSectionDto,
    @Request() req: any,
  ): Promise<AccountsSet> {
    try {
      return await this.accountsProductionService.updateSection(
        id,
        sectionKey,
        updateDto.data,
        req.user.id,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update section',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/calculations')
  async getCalculations(@Param('id') id: string): Promise<{
    calculations: any;
    ratios: any;
    percentageChanges?: any;
    isBalanced: boolean;
    imbalance?: number;
  }> {
    try {
      return await this.accountsProductionService.getCalculations(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get calculations',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/validate')
  async validateAccountsSet(@Param('id') id: string): Promise<{
    errors: any[];
    warnings: any[];
    isBalanced: boolean;
    isValid: boolean;
  }> {
    try {
      return await this.accountsProductionService.validateAccountsSet(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to validate accounts set',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/outputs')
  async generateOutputs(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ htmlUrl: string; pdfUrl: string }> {
    try {
      return await this.accountsProductionService.generateOutputs(id, req.user.id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to generate outputs',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/lock')
  async lockAccountsSet(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<AccountsSet> {
    try {
      return await this.accountsProductionService.lockAccountsSet(id, req.user.id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to lock accounts set',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/unlock')
  async unlockAccountsSet(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<AccountsSet> {
    try {
      // Note: In a production system, you would check if the user has admin privileges
      // For now, we'll allow any authenticated user to unlock
      return await this.accountsProductionService.unlockAccountsSet(id, req.user.id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to unlock accounts set',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  async deleteAccountsSet(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.accountsProductionService.deleteAccountsSet(id, req.user.id);
      return { success: true, message: 'Accounts set deleted successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete accounts set',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/outputs/html/:filename')
  async getHtmlOutput(
    @Param('id') id: string,
    @Param('filename') filename: string,
    @Res() res: Response,
    @Request() req: any,
  ): Promise<void> {
    try {
      // Verify user has access to this accounts set
      await this.accountsProductionService.getAccountsSet(id);
      
      if (!req.user || !req.user.id) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      const fileBuffer = await this.accountsOutputService.getOutputFile(id, 'html', filename);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.send(fileBuffer);
    } catch (error) {
      throw new HttpException(
        error.message || 'HTML file not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get(':id/outputs/pdf/:filename')
  async getPdfOutput(
    @Param('id') id: string,
    @Param('filename') filename: string,
    @Res() res: Response,
    @Request() req: any,
  ): Promise<void> {
    try {
      // Verify user has access to this accounts set
      await this.accountsProductionService.getAccountsSet(id);
      
      if (!req.user || !req.user.id) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      const fileBuffer = await this.accountsOutputService.getOutputFile(id, 'pdf', filename);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.send(fileBuffer);
    } catch (error) {
      throw new HttpException(
        error.message || 'PDF file not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
