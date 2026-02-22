-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PARTNER', 'MANAGER', 'STAFF', 'READONLY');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('COMPANY', 'INDIVIDUAL', 'SOLE_TRADER', 'PARTNERSHIP', 'LLP');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('PROSPECT', 'ONBOARDING', 'ACTIVE', 'DORMANT', 'CEASED');

-- CreateEnum
CREATE TYPE "VatStagger" AS ENUM ('A', 'B', 'C', 'NONE');

-- CreateEnum
CREATE TYPE "HMRCRegistrationStatus" AS ENUM ('NOT_REGISTERED', 'NOT_APPLICABLE', 'APPLIED_FOR', 'REGISTERED', 'DEREGISTERED', 'MISSING_DATA');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'AWAITING_FILING', 'READY_TO_CLOSE', 'COMPLETE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('NONE', 'STANDARD');

-- CreateEnum
CREATE TYPE "RecurrenceUnit" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "TriggerMode" AS ENUM ('COMPLETION', 'DATE_BASED');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('PENDING', 'FILED', 'OVERDUE', 'EXEMPT');

-- CreateEnum
CREATE TYPE "ComplianceSource" AS ENUM ('COMPANIES_HOUSE', 'HMRC', 'MANUAL');

-- CreateEnum
CREATE TYPE "ComplianceType" AS ENUM ('STATUTORY_ACCOUNTS', 'VAT_RETURN', 'PAYROLL_RTI', 'CIS_RETURN', 'SELF_ASSESSMENT', 'CORPORATION_TAX', 'CONFIRMATION_STATEMENT', 'ENGAGEMENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('TAX', 'ACCOUNTS', 'COMPLIANCE', 'REPORTS', 'INVOICES', 'BANK_STATEMENTS', 'OTHER');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('TAX', 'HMRC', 'VAT', 'COMPLIANCE', 'GENERAL', 'ENGAGEMENT', 'CLIENT_REPORTS');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('DOCUMENT', 'TASK', 'SERVICE', 'EMAIL');

-- CreateEnum
CREATE TYPE "AccountingFramework" AS ENUM ('MICRO_FRS105', 'SMALL_FRS102_1A', 'DORMANT', 'SOLE_TRADER', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "AccountsSetStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'READY', 'LOCKED');

-- CreateEnum
CREATE TYPE "TaxCalculationType" AS ENUM ('SALARY_OPTIMIZATION', 'SCENARIO_COMPARISON', 'CORPORATION_TAX', 'DIVIDEND_TAX');

-- CreateTable
CREATE TABLE "practices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalEntityName" TEXT,
    "tradingName" TEXT,
    "description" TEXT,
    "website" TEXT,
    "mainEmail" VARCHAR(320) NOT NULL,
    "mainPhone" TEXT,
    "fax" TEXT,
    "addressId" TEXT,
    "practicingCertificateNumber" TEXT,
    "professionalBody" TEXT,
    "membershipNumber" TEXT,
    "vatNumber" TEXT,
    "taxReference" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankSortCode" TEXT,
    "bankIban" TEXT,
    "bankSwift" TEXT,
    "piInsurer" TEXT,
    "piPolicyNumber" TEXT,
    "piExpiryDate" TIMESTAMP(3),
    "piCoverAmount" DECIMAL(12,2),
    "piExcess" DECIMAL(8,2),
    "moneyLaunderingSupervisor" TEXT,
    "amlSupervisorNumber" TEXT,
    "amlRegistrationDate" TIMESTAMP(3),
    "lastAmlCheckDate" TIMESTAMP(3),
    "nextAmlCheckDueDate" TIMESTAMP(3),
    "companiesHouseApiKey" TEXT,
    "companiesHouseWebhook" TEXT,
    "chLastSyncDate" TIMESTAMP(3),
    "hmrcClientId" TEXT,
    "hmrcClientSecret" TEXT,
    "hmrcEnvironment" TEXT,
    "mtdVatEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mtdPayeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mtdItsaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultHourlyRate" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/London',
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "workingDays" TEXT[],
    "primaryColor" TEXT DEFAULT '#2563eb',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_branches" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "addressId" TEXT,
    "phone" TEXT,
    "email" VARCHAR(320),

    CONSTRAINT "practice_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_settings" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "practice_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_access_profiles" (
    "userId" TEXT NOT NULL,
    "roleOverride" TEXT,
    "portfolioCodes" INTEGER[],
    "allPortfolios" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_access_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "auth_credentials" (
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "auth_credentials_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "clientRef" TEXT NOT NULL,
    "baseClientRef" TEXT,
    "name" TEXT NOT NULL,
    "tradingName" TEXT,
    "type" "ClientType" NOT NULL,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "practiceId" TEXT NOT NULL,
    "portfolioCode" INTEGER NOT NULL,
    "isConnectedParty" BOOLEAN NOT NULL DEFAULT false,
    "connectedOrder" INTEGER,
    "connectedPrincipalId" TEXT,
    "registeredNumber" TEXT,
    "utrNumber" TEXT,
    "vatNumber" TEXT,
    "payeReference" TEXT,
    "accountsOfficeReference" TEXT,
    "cisUtr" TEXT,
    "eoriNumber" TEXT,
    "nationalInsuranceNumber" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "mainEmail" TEXT,
    "mainPhone" TEXT,
    "addressId" TEXT,
    "hmrcCtStatus" "HMRCRegistrationStatus",
    "hmrcSaStatus" "HMRCRegistrationStatus",
    "hmrcVatStatus" "HMRCRegistrationStatus",
    "hmrcPayeStatus" "HMRCRegistrationStatus",
    "incorporationDate" TIMESTAMP(3),
    "yearEnd" TIMESTAMP(3),
    "accountsNextDue" TIMESTAMP(3),
    "confirmationNextDue" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_profiles" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "mainContactName" TEXT,
    "partnerResponsible" TEXT,
    "clientManager" TEXT,
    "lifecycleStatus" "LifecycleStatus" NOT NULL DEFAULT 'PROSPECT',
    "engagementType" TEXT,
    "engagementLetterSigned" BOOLEAN NOT NULL DEFAULT false,
    "onboardingDate" TIMESTAMP(3),
    "disengagementDate" TIMESTAMP(3),
    "onboardingStartedAt" TIMESTAMP(3),
    "wentLiveAt" TIMESTAMP(3),
    "ceasedAt" TIMESTAMP(3),
    "dormantSince" TIMESTAMP(3),
    "corporationTaxUtr" TEXT,
    "vatNumber" TEXT,
    "vatStagger" "VatStagger" NOT NULL DEFAULT 'NONE',
    "vatScheme" TEXT,
    "vatReturnFrequency" TEXT,
    "vatQuarter" TEXT,
    "vatRegistrationDate" TIMESTAMP(3),
    "payeReference" TEXT,
    "payeAccountsOfficeReference" TEXT,
    "cisRegistered" BOOLEAN NOT NULL DEFAULT false,
    "cisUtr" TEXT,
    "payrollRtiRequired" BOOLEAN NOT NULL DEFAULT false,
    "selfAssessmentRequired" BOOLEAN NOT NULL DEFAULT false,
    "selfAssessmentFiled" BOOLEAN NOT NULL DEFAULT false,
    "amlCompleted" BOOLEAN NOT NULL DEFAULT false,
    "clientRiskRating" TEXT,
    "annualFee" DECIMAL(12,2),
    "monthlyFee" DECIMAL(12,2),
    "feeArrangement" TEXT,
    "businessBankName" TEXT,
    "accountLastFour" TEXT,
    "directDebitInPlace" BOOLEAN NOT NULL DEFAULT false,
    "paymentIssues" TEXT,
    "contactPosition" TEXT,
    "telephone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "preferredContactMethod" TEXT,
    "correspondenceAddress" TEXT,
    "nationalInsuranceNumber" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "personalAddress" TEXT,
    "personalTaxYear" TEXT,
    "selfAssessmentTaxYear" TEXT,
    "seasonalBusiness" BOOLEAN NOT NULL DEFAULT false,
    "dormant" BOOLEAN NOT NULL DEFAULT false,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT,
    "postcode" TEXT NOT NULL,
    "country" TEXT NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "code" INTEGER NOT NULL,
    "practiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ref_buckets" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL DEFAULT 'default',
    "portfolioCode" INTEGER NOT NULL,
    "alpha" TEXT NOT NULL,
    "nextIndex" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ref_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "serviceRef" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "templateId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'DRAFT',
    "nextDue" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "serviceKind" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "complianceTemplateId" TEXT,
    "recurrenceType" "RecurrenceType" NOT NULL DEFAULT 'STANDARD',
    "recurrenceUnit" "RecurrenceUnit",
    "frequencyValue" INTEGER NOT NULL DEFAULT 1,
    "triggerMode" "TriggerMode" NOT NULL DEFAULT 'COMPLETION',
    "autoGenerateNext" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "service_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "complianceType" "ComplianceType" NOT NULL,
    "source" "ComplianceSource" NOT NULL DEFAULT 'MANUAL',
    "dueDaysAfterPeriodEnd" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_items" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "type" "ComplianceType" NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "ComplianceStatus" NOT NULL DEFAULT 'PENDING',
    "source" "ComplianceSource" NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "compliance_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "taskRef" TEXT,
    "serviceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "assigneeId" TEXT,
    "creatorId" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_template_tasks" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "daysBeforeDue" INTEGER NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',

    CONSTRAINT "service_template_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "type" "TemplateType" NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_sets" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "framework" "AccountingFramework" NOT NULL,
    "status" "AccountsSetStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filings" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "ComplianceType" NOT NULL,
    "periodEnd" TIMESTAMP(3),
    "status" TEXT NOT NULL,

    CONSTRAINT "filings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies_house_data" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "companyNumber" TEXT NOT NULL,
    "companyDetails" JSONB,
    "lastFetched" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_house_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies_house_company" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "companyNumber" TEXT NOT NULL,
    "companyStatus" TEXT,
    "companyType" TEXT,
    "jurisdiction" TEXT,
    "incorporationDate" TIMESTAMP(3),
    "registeredOfficeAddress" TEXT,
    "accountsLastMadeUpTo" TIMESTAMP(3),
    "accountsNextDue" TIMESTAMP(3),
    "confirmationLastMadeUpTo" TIMESTAMP(3),
    "confirmationNextDue" TIMESTAMP(3),
    "lastFetched" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_house_company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies_house_officers" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "officerRole" TEXT,
    "appointedOn" TIMESTAMP(3),
    "resignedOn" TIMESTAMP(3),
    "nationality" TEXT,
    "occupation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_house_officers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies_house_pscs" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "natureOfControl" TEXT,
    "notifiedOn" TIMESTAMP(3),
    "ceasedOn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_house_pscs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies_house_filings" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "transactionId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "actionDate" TIMESTAMP(3),
    "filedDate" TIMESTAMP(3),
    "barcode" TEXT,
    "pages" INTEGER,
    "paperFiled" BOOLEAN,
    "reference" TEXT,
    "madeUpTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_house_filings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies_house_charges" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "chargeCode" TEXT,
    "createdOn" TIMESTAMP(3),
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_house_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_calculations" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "calculationType" "TaxCalculationType" NOT NULL,
    "taxYear" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_reports" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "calculationId" TEXT,
    "title" TEXT NOT NULL,

    CONSTRAINT "generated_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_parties" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT,
    "primaryContact" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "client_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "clientId" TEXT,
    "taskId" TEXT,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityRef" TEXT,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "clientId" TEXT,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "practices_addressId_key" ON "practices"("addressId");

-- CreateIndex
CREATE INDEX "practice_branches_practiceId_idx" ON "practice_branches"("practiceId");

-- CreateIndex
CREATE UNIQUE INDEX "practice_settings_practiceId_category_key_key" ON "practice_settings"("practiceId", "category", "key");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_key" ON "auth_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refreshToken_key" ON "auth_sessions"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "clients_clientRef_key" ON "clients"("clientRef");

-- CreateIndex
CREATE UNIQUE INDEX "clients_registeredNumber_key" ON "clients"("registeredNumber");

-- CreateIndex
CREATE UNIQUE INDEX "clients_utrNumber_key" ON "clients"("utrNumber");

-- CreateIndex
CREATE UNIQUE INDEX "clients_vatNumber_key" ON "clients"("vatNumber");

-- CreateIndex
CREATE UNIQUE INDEX "clients_payeReference_key" ON "clients"("payeReference");

-- CreateIndex
CREATE UNIQUE INDEX "clients_cisUtr_key" ON "clients"("cisUtr");

-- CreateIndex
CREATE UNIQUE INDEX "clients_eoriNumber_key" ON "clients"("eoriNumber");

-- CreateIndex
CREATE UNIQUE INDEX "clients_nationalInsuranceNumber_key" ON "clients"("nationalInsuranceNumber");

-- CreateIndex
CREATE INDEX "clients_portfolioCode_idx" ON "clients"("portfolioCode");

-- CreateIndex
CREATE INDEX "clients_practiceId_idx" ON "clients"("practiceId");

-- CreateIndex
CREATE INDEX "clients_status_portfolioCode_idx" ON "clients"("status", "portfolioCode");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE INDEX "clients_registeredNumber_idx" ON "clients"("registeredNumber");

-- CreateIndex
CREATE INDEX "clients_clientRef_idx" ON "clients"("clientRef");

-- CreateIndex
CREATE INDEX "clients_practiceId_portfolioCode_baseClientRef_idx" ON "clients"("practiceId", "portfolioCode", "baseClientRef");

-- CreateIndex
CREATE INDEX "clients_connectedPrincipalId_idx" ON "clients"("connectedPrincipalId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_practiceId_portfolioCode_clientRef_key" ON "clients"("practiceId", "portfolioCode", "clientRef");

-- CreateIndex
CREATE UNIQUE INDEX "client_profiles_clientId_key" ON "client_profiles"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ref_buckets_practiceId_portfolioCode_alpha_key" ON "ref_buckets"("practiceId", "portfolioCode", "alpha");

-- CreateIndex
CREATE UNIQUE INDEX "services_serviceRef_key" ON "services"("serviceRef");

-- CreateIndex
CREATE INDEX "services_status_nextDue_idx" ON "services"("status", "nextDue");

-- CreateIndex
CREATE UNIQUE INDEX "services_clientId_templateId_periodStart_key" ON "services"("clientId", "templateId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "service_templates_code_key" ON "service_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_templates_code_key" ON "compliance_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_items_serviceId_key" ON "compliance_items"("serviceId");

-- CreateIndex
CREATE INDEX "compliance_items_status_dueDate_idx" ON "compliance_items"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_taskRef_key" ON "tasks"("taskRef");

-- CreateIndex
CREATE INDEX "tasks_serviceId_status_idx" ON "tasks"("serviceId", "status");

-- CreateIndex
CREATE INDEX "tasks_assigneeId_dueDate_status_idx" ON "tasks"("assigneeId", "dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "companies_house_data_clientId_key" ON "companies_house_data"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_house_data_companyNumber_key" ON "companies_house_data"("companyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "companies_house_company_clientId_key" ON "companies_house_company"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_house_company_companyNumber_key" ON "companies_house_company"("companyNumber");

-- CreateIndex
CREATE INDEX "companies_house_company_companyNumber_idx" ON "companies_house_company"("companyNumber");

-- CreateIndex
CREATE INDEX "companies_house_company_clientId_idx" ON "companies_house_company"("clientId");

-- CreateIndex
CREATE INDEX "companies_house_company_lastFetched_idx" ON "companies_house_company"("lastFetched");

-- CreateIndex
CREATE INDEX "companies_house_officers_clientId_idx" ON "companies_house_officers"("clientId");

-- CreateIndex
CREATE INDEX "companies_house_pscs_clientId_idx" ON "companies_house_pscs"("clientId");

-- CreateIndex
CREATE INDEX "companies_house_filings_clientId_idx" ON "companies_house_filings"("clientId");

-- CreateIndex
CREATE INDEX "companies_house_filings_type_idx" ON "companies_house_filings"("type");

-- CreateIndex
CREATE INDEX "companies_house_filings_actionDate_idx" ON "companies_house_filings"("actionDate");

-- CreateIndex
CREATE INDEX "companies_house_charges_clientId_idx" ON "companies_house_charges"("clientId");

-- CreateIndex
CREATE INDEX "calendar_events_startDate_idx" ON "calendar_events"("startDate");

-- CreateIndex
CREATE INDEX "events_entity_entityId_idx" ON "events"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "practices" ADD CONSTRAINT "practices_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_branches" ADD CONSTRAINT "practice_branches_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_branches" ADD CONSTRAINT "practice_branches_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_settings" ADD CONSTRAINT "practice_settings_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_access_profiles" ADD CONSTRAINT "user_access_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_credentials" ADD CONSTRAINT "auth_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_portfolioCode_fkey" FOREIGN KEY ("portfolioCode") REFERENCES "portfolios"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "practices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ref_buckets" ADD CONSTRAINT "ref_buckets_portfolioCode_fkey" FOREIGN KEY ("portfolioCode") REFERENCES "portfolios"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "service_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_templates" ADD CONSTRAINT "service_templates_complianceTemplateId_fkey" FOREIGN KEY ("complianceTemplateId") REFERENCES "compliance_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_template_tasks" ADD CONSTRAINT "service_template_tasks_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "service_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_sets" ADD CONSTRAINT "accounts_sets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_sets" ADD CONSTRAINT "accounts_sets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filings" ADD CONSTRAINT "filings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies_house_data" ADD CONSTRAINT "companies_house_data_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies_house_company" ADD CONSTRAINT "companies_house_company_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies_house_officers" ADD CONSTRAINT "companies_house_officers_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "companies_house_company"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies_house_pscs" ADD CONSTRAINT "companies_house_pscs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "companies_house_company"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies_house_filings" ADD CONSTRAINT "companies_house_filings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "companies_house_company"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies_house_charges" ADD CONSTRAINT "companies_house_charges_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "companies_house_company"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_calculations" ADD CONSTRAINT "tax_calculations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "tax_calculations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_parties" ADD CONSTRAINT "client_parties_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
