/*
  Warnings:

  - A unique constraint covering the columns `[clientRef]` on the table `companies_house_data` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TaxCalculationType" AS ENUM ('SALARY_OPTIMIZATION', 'SCENARIO_COMPARISON', 'CORPORATION_TAX', 'DIVIDEND_TAX', 'INCOME_TAX', 'SOLE_TRADER');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'HTML');

-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN     "clientRef" TEXT;

-- AlterTable
ALTER TABLE "client_parties" ADD COLUMN     "clientRef" TEXT,
ADD COLUMN     "personRef" TEXT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "accountLastFour" TEXT,
ADD COLUMN     "accountingPeriodEnd" TEXT,
ADD COLUMN     "accountsOfficeReference" TEXT,
ADD COLUMN     "amlCompleted" BOOLEAN,
ADD COLUMN     "annualFee" DECIMAL(12,2),
ADD COLUMN     "authenticationCode" TEXT,
ADD COLUMN     "businessBankName" TEXT,
ADD COLUMN     "ceasedAt" TEXT,
ADD COLUMN     "cisRegistered" BOOLEAN,
ADD COLUMN     "cisUtr" TEXT,
ADD COLUMN     "clientManager" TEXT,
ADD COLUMN     "clientRiskRating" TEXT,
ADD COLUMN     "clientType" TEXT,
ADD COLUMN     "contactPosition" TEXT,
ADD COLUMN     "corporationTaxUtr" TEXT,
ADD COLUMN     "correspondenceAddress" TEXT,
ADD COLUMN     "dateOfBirth" TEXT,
ADD COLUMN     "directDebitInPlace" BOOLEAN,
ADD COLUMN     "directorRole" TEXT,
ADD COLUMN     "disengagementDate" TEXT,
ADD COLUMN     "doNotContact" BOOLEAN,
ADD COLUMN     "dormant" BOOLEAN,
ADD COLUMN     "dormantSince" TEXT,
ADD COLUMN     "email" VARCHAR(320),
ADD COLUMN     "employeeCount" INTEGER,
ADD COLUMN     "engagementLetterSigned" BOOLEAN,
ADD COLUMN     "engagementType" TEXT,
ADD COLUMN     "feeArrangement" TEXT,
ADD COLUMN     "lifecycleStatus" TEXT,
ADD COLUMN     "linkedCompanyNumber" TEXT,
ADD COLUMN     "mainContactName" TEXT,
ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "monthlyFee" DECIMAL(12,2),
ADD COLUMN     "nationalInsuranceNumber" TEXT,
ADD COLUMN     "nextAccountsDueDate" TEXT,
ADD COLUMN     "nextCorporationTaxDueDate" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "onboardingDate" TEXT,
ADD COLUMN     "onboardingStartedAt" TEXT,
ADD COLUMN     "partnerResponsible" TEXT,
ADD COLUMN     "payeAccountsOfficeReference" TEXT,
ADD COLUMN     "payeReference" TEXT,
ADD COLUMN     "paymentIssues" TEXT,
ADD COLUMN     "payrollFrequency" TEXT,
ADD COLUMN     "payrollPayDay" INTEGER,
ADD COLUMN     "payrollPeriodEndDay" INTEGER,
ADD COLUMN     "payrollRtiRequired" BOOLEAN,
ADD COLUMN     "personalAddress" TEXT,
ADD COLUMN     "personalTaxYear" TEXT,
ADD COLUMN     "personalUtr" TEXT,
ADD COLUMN     "preferredContactMethod" TEXT,
ADD COLUMN     "registeredAddress" TEXT,
ADD COLUMN     "seasonalBusiness" BOOLEAN,
ADD COLUMN     "selfAssessmentFiled" BOOLEAN,
ADD COLUMN     "selfAssessmentRequired" BOOLEAN,
ADD COLUMN     "selfAssessmentTaxYear" TEXT,
ADD COLUMN     "specialCircumstances" TEXT,
ADD COLUMN     "statutoryYearEnd" TEXT,
ADD COLUMN     "telephone" TEXT,
ADD COLUMN     "tradingName" TEXT,
ADD COLUMN     "utrNumber" TEXT,
ADD COLUMN     "vatNumber" TEXT,
ADD COLUMN     "vatPeriodEnd" TEXT,
ADD COLUMN     "vatPeriodStart" TEXT,
ADD COLUMN     "vatQuarter" TEXT,
ADD COLUMN     "vatRegistrationDate" TEXT,
ADD COLUMN     "vatReturnFrequency" TEXT,
ADD COLUMN     "vatScheme" TEXT,
ADD COLUMN     "vatStagger" TEXT,
ADD COLUMN     "wentLiveAt" TEXT;

-- AlterTable
ALTER TABLE "companies_house_data" ADD COLUMN     "clientRef" TEXT;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "clientRef" TEXT;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "entityRef" TEXT;

-- AlterTable
ALTER TABLE "filings" ADD COLUMN     "clientRef" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "clientRef" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "clientRef" TEXT;

-- CreateTable
CREATE TABLE "tax_calculations" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "clientRef" TEXT,
    "companyId" TEXT,
    "calculationType" "TaxCalculationType" NOT NULL,
    "taxYear" TEXT NOT NULL,
    "parameters" JSONB,
    "optimizedSalary" DECIMAL(12,2),
    "optimizedDividend" DECIMAL(12,2),
    "totalTakeHome" DECIMAL(12,2),
    "totalTaxLiability" DECIMAL(12,2),
    "estimatedSavings" DECIMAL(12,2),
    "recommendations" JSONB,
    "calculatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "calculatedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_scenarios" (
    "id" TEXT NOT NULL,
    "calculationId" TEXT NOT NULL,
    "scenarioName" TEXT,
    "salary" DECIMAL(12,2),
    "dividend" DECIMAL(12,2),
    "incomeTax" DECIMAL(12,2),
    "employeeNi" DECIMAL(12,2),
    "employerNi" DECIMAL(12,2),
    "dividendTax" DECIMAL(12,2),
    "corporationTax" DECIMAL(12,2),
    "totalTax" DECIMAL(12,2),
    "takeHome" DECIMAL(12,2),
    "effectiveRate" DECIMAL(8,4),

    CONSTRAINT "tax_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_reports" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "clientRef" TEXT,
    "calculationId" TEXT,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "content" JSONB,
    "format" "ReportFormat" NOT NULL,
    "filePath" TEXT,
    "generatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tax_calculations_clientId_idx" ON "tax_calculations"("clientId");

-- CreateIndex
CREATE INDEX "tax_calculations_clientRef_idx" ON "tax_calculations"("clientRef");

-- CreateIndex
CREATE INDEX "tax_calculations_calculatedAt_idx" ON "tax_calculations"("calculatedAt");

-- CreateIndex
CREATE INDEX "tax_calculations_calculationType_idx" ON "tax_calculations"("calculationType");

-- CreateIndex
CREATE INDEX "tax_calculations_taxYear_idx" ON "tax_calculations"("taxYear");

-- CreateIndex
CREATE INDEX "tax_scenarios_calculationId_idx" ON "tax_scenarios"("calculationId");

-- CreateIndex
CREATE INDEX "generated_reports_clientId_idx" ON "generated_reports"("clientId");

-- CreateIndex
CREATE INDEX "generated_reports_clientRef_idx" ON "generated_reports"("clientRef");

-- CreateIndex
CREATE INDEX "generated_reports_generatedAt_idx" ON "generated_reports"("generatedAt");

-- CreateIndex
CREATE INDEX "calendar_events_clientRef_idx" ON "calendar_events"("clientRef");

-- CreateIndex
CREATE INDEX "client_parties_clientRef_idx" ON "client_parties"("clientRef");

-- CreateIndex
CREATE INDEX "client_parties_personRef_idx" ON "client_parties"("personRef");

-- CreateIndex
CREATE UNIQUE INDEX "companies_house_data_clientRef_key" ON "companies_house_data"("clientRef");

-- CreateIndex
CREATE INDEX "companies_house_data_clientRef_idx" ON "companies_house_data"("clientRef");

-- CreateIndex
CREATE INDEX "documents_clientRef_idx" ON "documents"("clientRef");

-- CreateIndex
CREATE INDEX "events_entityRef_idx" ON "events"("entityRef");

-- CreateIndex
CREATE INDEX "filings_clientRef_idx" ON "filings"("clientRef");

-- CreateIndex
CREATE INDEX "services_clientRef_idx" ON "services"("clientRef");

-- CreateIndex
CREATE INDEX "tasks_clientRef_idx" ON "tasks"("clientRef");

-- AddForeignKey
ALTER TABLE "tax_calculations" ADD CONSTRAINT "tax_calculations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_scenarios" ADD CONSTRAINT "tax_scenarios_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "tax_calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "tax_calculations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
