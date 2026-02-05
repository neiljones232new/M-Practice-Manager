import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CompaniesHouseService } from './companies-house.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CompanySearchResult,
  CompanyDetails,
  CompanyOfficer,
  PersonWithSignificantControl,
  FilingHistory,
  PSCList,
  ChargesList,
  CompaniesHouseSearchParams,
  CompaniesHouseImportData,
} from './interfaces/companies-house.interface';
import { Client, CreateClientResponse } from '../clients/interfaces/client.interface';

@ApiTags('Companies House')
@Controller('companies-house')
@UseGuards(JwtAuthGuard)
export class CompaniesHouseController {
  constructor(private readonly companiesHouseService: CompaniesHouseService) {}

  @Get('search')
  async searchCompanies(@Query() params: CompaniesHouseSearchParams): Promise<CompanySearchResult[]> {
    return this.companiesHouseService.searchCompanies(params);
  }

  @Get('company/:companyNumber')
  async getCompanyDetails(@Param('companyNumber') companyNumber: string): Promise<CompanyDetails> {
    return this.companiesHouseService.getCompanyDetails(companyNumber);
  }

  @Get('company/:companyNumber/officers')
  async getCompanyOfficers(@Param('companyNumber') companyNumber: string): Promise<CompanyOfficer[]> {
    return this.companiesHouseService.getCompanyOfficers(companyNumber);
  }

  @Get('company/:companyNumber/filing-history')
  async getFilingHistory(@Param('companyNumber') companyNumber: string): Promise<FilingHistory> {
    return this.companiesHouseService.getFilingHistory(companyNumber);
  }

  @Get('company/:companyNumber/persons-with-significant-control')
  async getPersonsWithSignificantControl(@Param('companyNumber') companyNumber: string) {
    return this.companiesHouseService.getPersonsWithSignificantControl(companyNumber);
  }

  @Get('company/:companyNumber/charges')
  async getCharges(@Param('companyNumber') companyNumber: string) {
    return this.companiesHouseService.getCharges(companyNumber);
  }

  /** Compare a client with live Companies House data (diffs) */
  @Get('compare/:clientId')
  async compareClient(@Param('clientId') clientId: string) {
    return this.companiesHouseService.compareClientWithCompany(clientId);
  }

  @Post('import')
  async importCompany(@Body() importData: CompaniesHouseImportData): Promise<any> {
    return this.companiesHouseService.importCompany(importData);
  }

  @Post('sync/:clientId')
  async syncCompanyData(@Param('clientId') clientId: string): Promise<{ message: string }> {
    await this.companiesHouseService.syncCompanyData(clientId);
    return { message: 'Company data synchronized successfully' };
  }
}
