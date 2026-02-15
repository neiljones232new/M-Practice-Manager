-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PARTNER', 'MANAGER', 'STAFF', 'READONLY');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('PROSPECT', 'ONBOARDING', 'ACTIVE', 'DORMANT', 'CEASED');

-- CreateEnum
CREATE TYPE "VatStagger" AS ENUM ('A', 'B', 'C', 'NONE');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('PENDING', 'FILED', 'OVERDUE', 'EXEMPT');

-- CreateEnum
CREATE TYPE "ComplianceSource" AS ENUM ('COMPANIES_HOUSE', 'HMRC', 'MANUAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('TAX', 'ACCOUNTS', 'COMPLIANCE', 'REPORTS', 'INVOICES', 'RECEIPTS', 'BANK_STATEMENTS', 'OTHER');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('TAX', 'HMRC', 'VAT', 'COMPLIANCE', 'GENERAL', 'ENGAGEMENT', 'CLIENT', 'REPORTS', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('DOCUMENT', 'TASK', 'SERVICE', 'EMAIL');

-- CreateEnum
CREATE TYPE "AccountingFramework" AS ENUM ('MICRO_FRS105', 'SMALL_FRS102_1A', 'DORMANT', 'SOLE_TRADER', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "AccountsSetStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'READY', 'LOCKED');

-- DropForeignKey
ALTER TABLE "client_parties" DROP CONSTRAINT "client_parties_personId_fkey";

-- DropIndex
DROP INDEX "calendar_events_clientRef_idx";

-- DropIndex
DROP INDEX "client_parties_clientId_idx";

-- DropIndex
DROP INDEX "client_parties_clientId_suffixLetter_key";

-- DropIndex
DROP INDEX "client_parties_clientRef_idx";

-- DropIndex
DROP INDEX "client_parties_officerRole_idx";

-- DropIndex
DROP INDEX "client_parties_personId_idx";

-- DropIndex
DROP INDEX "client_parties_personRef_idx";

-- DropIndex
DROP INDEX "clients_companyNumber_idx";

-- DropIndex
DROP INDEX "clients_companyNumber_key";

-- DropIndex
DROP INDEX "clients_companyStatus_idx";

-- DropIndex
DROP INDEX "clients_ref_idx";

-- DropIndex
DROP INDEX "clients_ref_key";

-- DropIndex
DROP INDEX "companies_house_data_clientRef_idx";

-- DropIndex
DROP INDEX "companies_house_data_clientRef_key";

-- DropIndex
DROP INDEX "documents_clientId_idx";

-- DropIndex
DROP INDEX "documents_clientRef_idx";

-- DropIndex
DROP INDEX "documents_kind_idx";

-- DropIndex
DROP INDEX "filings_clientRef_idx";

-- DropIndex
DROP INDEX "generated_reports_clientRef_idx";

-- DropIndex
DROP INDEX "people_email_idx";

-- DropIndex
DROP INDEX "people_firstName_lastName_idx";

-- DropIndex
DROP INDEX "people_personNumber_idx";

-- DropIndex
DROP INDEX "people_ref_key";

-- DropIndex
DROP INDEX "ref_buckets_portfolio_alpha_key";

-- DropIndex
DROP INDEX "services_clientId_idx";

-- DropIndex
DROP INDEX "services_clientRef_idx";

-- DropIndex
DROP INDEX "services_status_idx";

-- DropIndex
DROP INDEX "tasks_assignee_idx";

-- DropIndex
DROP INDEX "tasks_clientId_idx";

-- DropIndex
DROP INDEX "tasks_clientRef_idx";

-- DropIndex
DROP INDEX "tasks_dueDate_idx";

-- DropIndex
DROP INDEX "tasks_status_idx";

-- DropIndex
DROP INDEX "tax_calculations_clientRef_idx";

-- AlterTable
ALTER TABLE "calendar_events" DROP COLUMN "clientRef";

-- AlterTable
ALTER TABLE "client_parties" DROP COLUMN "appointedOn",
DROP COLUMN "clientRef",
DROP COLUMN "isPre1992Appointment",
DROP COLUMN "officerRole",
DROP COLUMN "personRef",
DROP COLUMN "resignedOn",
ADD COLUMN     "partyRef" TEXT,
ALTER COLUMN "personId" DROP NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" TEXT,
ALTER COLUMN "ownershipPercent" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "suffixLetter" DROP NOT NULL;

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "accountLastFour",
DROP COLUMN "accountingPeriodEnd",
DROP COLUMN "accountsOverdue",
DROP COLUMN "amlCompleted",
DROP COLUMN "annualFee",
DROP COLUMN "authenticationCode",
DROP COLUMN "businessBankName",
DROP COLUMN "ceasedAt",
DROP COLUMN "cisRegistered",
DROP COLUMN "clientManager",
DROP COLUMN "clientRiskRating",
DROP COLUMN "clientType",
DROP COLUMN "companyName",
DROP COLUMN "companyNumber",
DROP COLUMN "companyStatus",
DROP COLUMN "companyType",
DROP COLUMN "confirmationStatementLastMadeUpTo",
DROP COLUMN "confirmationStatementNextDue",
DROP COLUMN "confirmationStatementOverdue",
DROP COLUMN "contactPosition",
DROP COLUMN "corporationTaxUtr",
DROP COLUMN "correspondenceAddress",
DROP COLUMN "dateOfBirth",
DROP COLUMN "dateOfCessation",
DROP COLUMN "dateOfCreation",
DROP COLUMN "directDebitInPlace",
DROP COLUMN "directorRole",
DROP COLUMN "disengagementDate",
DROP COLUMN "doNotContact",
DROP COLUMN "dormant",
DROP COLUMN "dormantSince",
DROP COLUMN "email",
DROP COLUMN "employeeCount",
DROP COLUMN "engagementLetterSigned",
DROP COLUMN "engagementType",
DROP COLUMN "etag",
DROP COLUMN "feeArrangement",
DROP COLUMN "jurisdiction",
DROP COLUMN "lifecycleStatus",
DROP COLUMN "linkedCompanyNumber",
DROP COLUMN "mainContactName",
DROP COLUMN "mobile",
DROP COLUMN "monthlyFee",
DROP COLUMN "nationalInsuranceNumber",
DROP COLUMN "nextAccountsDueDate",
DROP COLUMN "nextCorporationTaxDueDate",
DROP COLUMN "notes",
DROP COLUMN "onboardingDate",
DROP COLUMN "onboardingStartedAt",
DROP COLUMN "partnerResponsible",
DROP COLUMN "payeAccountsOfficeReference",
DROP COLUMN "paymentIssues",
DROP COLUMN "payrollFrequency",
DROP COLUMN "payrollPayDay",
DROP COLUMN "payrollPeriodEndDay",
DROP COLUMN "payrollRtiRequired",
DROP COLUMN "personalAddress",
DROP COLUMN "personalTaxYear",
DROP COLUMN "personalUtr",
DROP COLUMN "preferredContactMethod",
DROP COLUMN "ref",
DROP COLUMN "registeredAddress",
DROP COLUMN "registeredOfficeAddressLine1",
DROP COLUMN "registeredOfficeAddressLine2",
DROP COLUMN "registeredOfficeCountry",
DROP COLUMN "registeredOfficeLocality",
DROP COLUMN "registeredOfficePostalCode",
DROP COLUMN "registeredOfficeRegion",
DROP COLUMN "seasonalBusiness",
DROP COLUMN "selfAssessmentFiled",
DROP COLUMN "selfAssessmentRequired",
DROP COLUMN "selfAssessmentTaxYear",
DROP COLUMN "sicCodes",
DROP COLUMN "specialCircumstances",
DROP COLUMN "statutoryYearEnd",
DROP COLUMN "telephone",
DROP COLUMN "tradingName",
DROP COLUMN "vatPeriodEnd",
DROP COLUMN "vatPeriodStart",
DROP COLUMN "vatQuarter",
DROP COLUMN "vatRegistrationDate",
DROP COLUMN "vatReturnFrequency",
DROP COLUMN "vatScheme",
DROP COLUMN "vatStagger",
DROP COLUMN "wentLiveAt",
ADD COLUMN     "addressId" TEXT,
ADD COLUMN     "annualFees" DECIMAL(65,30),
ADD COLUMN     "baseClientRef" TEXT NOT NULL,
ADD COLUMN     "clientRef" TEXT NOT NULL,
ADD COLUMN     "confirmationLastMadeUpTo" TIMESTAMP(3),
ADD COLUMN     "confirmationNextDue" TIMESTAMP(3),
ADD COLUMN     "connectedOrder" INTEGER,
ADD COLUMN     "connectedPrincipalId" TEXT,
ADD COLUMN     "eoriNumber" TEXT,
ADD COLUMN     "incorporationDate" TIMESTAMP(3),
ADD COLUMN     "isConnectedParty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mtdItsaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mtdVatEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "practiceId" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "registeredNumber" TEXT,
ADD COLUMN     "tasksDueCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "yearEnd" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "mainEmail" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "companies_house_data" DROP COLUMN "clientRef";

-- AlterTable
ALTER TABLE "documents" DROP COLUMN "clientRef",
DROP COLUMN "kind",
DROP COLUMN "path",
DROP COLUMN "tags",
DROP COLUMN "title",
ADD COLUMN     "category" "DocumentCategory" NOT NULL,
ADD COLUMN     "filename" TEXT NOT NULL,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalName" TEXT NOT NULL,
ADD COLUMN     "uploadedById" TEXT,
ALTER COLUMN "clientId" DROP NOT NULL,
ALTER COLUMN "size" SET NOT NULL,
ALTER COLUMN "mimeType" SET NOT NULL;

-- AlterTable
ALTER TABLE "filings" DROP COLUMN "clientRef";

-- AlterTable
ALTER TABLE "generated_reports" DROP COLUMN "clientRef";

-- AlterTable
ALTER TABLE "people" DROP COLUMN "addressLine1",
DROP COLUMN "addressLine2",
DROP COLUMN "country",
DROP COLUMN "countryOfResidence",
DROP COLUMN "dateOfBirthMonth",
DROP COLUMN "dateOfBirthYear",
DROP COLUMN "etag",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "locality",
DROP COLUMN "nationality",
DROP COLUMN "occupation",
DROP COLUMN "personNumber",
DROP COLUMN "postalCode",
DROP COLUMN "premises",
DROP COLUMN "ref",
DROP COLUMN "region",
ADD COLUMN     "fullName" TEXT,
ALTER COLUMN "email" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ref_buckets" DROP COLUMN "portfolio",
ADD COLUMN     "portfolioCode" INTEGER NOT NULL,
ADD COLUMN     "practiceId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "services" DROP COLUMN "clientRef",
ADD COLUMN     "description" TEXT,
DROP COLUMN "frequency",
ADD COLUMN     "frequency" TEXT,
ALTER COLUMN "fee" DROP NOT NULL,
ALTER COLUMN "fee" SET DATA TYPE DECIMAL(65,30),
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "annualized" DROP NOT NULL,
ALTER COLUMN "annualized" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "assignee",
DROP COLUMN "clientRef",
ADD COLUMN     "assigneeId" TEXT,
ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "tags" TEXT[],
ALTER COLUMN "clientId" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
DROP COLUMN "priority",
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "tax_calculations" DROP COLUMN "clientRef";

-- DropEnum
DROP TYPE "Frequency";

-- DropEnum
DROP TYPE "PartyRole";

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
    "numberFormat" TEXT,
    "workingDays" TEXT[],
    "workingHoursStart" TEXT NOT NULL DEFAULT '09:00',
    "workingHoursEnd" TEXT NOT NULL DEFAULT '17:30',
    "lunchBreakStart" TEXT,
    "lunchBreakEnd" TEXT,
    "logoPath" TEXT,
    "primaryColor" TEXT DEFAULT '#2563eb',
    "secondaryColor" TEXT DEFAULT '#64748b',
    "emailHeaderTemplate" TEXT,
    "emailFooterTemplate" TEXT,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "slackWebhookUrl" TEXT,
    "teamsWebhookUrl" TEXT,
    "backupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "backupFrequency" TEXT NOT NULL DEFAULT 'daily',
    "backupRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "twoFactorAuthEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dataRetentionMonths" INTEGER NOT NULL DEFAULT 84,
    "autoArchiveClients" BOOLEAN NOT NULL DEFAULT false,
    "enforceStrongPasswords" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUpdatedBy" TEXT,

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
    "manager" TEXT,
    "openingHours" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_settings" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_access_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "auth_credentials" (
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_credentials_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_password_reset_tokens_pkey" PRIMARY KEY ("id")
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
    "accountingPeriodEnd" TIMESTAMP(3),
    "nextAccountsDueDate" TIMESTAMP(3),
    "nextCorporationTaxDueDate" TIMESTAMP(3),
    "statutoryYearEnd" TIMESTAMP(3),
    "vatRegistrationDate" TIMESTAMP(3),
    "vatPeriodStart" TIMESTAMP(3),
    "vatPeriodEnd" TIMESTAMP(3),
    "vatStagger" "VatStagger" NOT NULL DEFAULT 'NONE',
    "payrollPayDay" INTEGER,
    "payrollPeriodEndDay" INTEGER,
    "corporationTaxUtr" TEXT,
    "vatNumber" TEXT,
    "vatScheme" TEXT,
    "vatReturnFrequency" TEXT,
    "vatQuarter" TEXT,
    "payeReference" TEXT,
    "payeAccountsOfficeReference" TEXT,
    "cisRegistered" BOOLEAN NOT NULL DEFAULT false,
    "cisUtr" TEXT,
    "personalUtr" TEXT,
    "payrollRtiRequired" BOOLEAN NOT NULL DEFAULT false,
    "amlCompleted" BOOLEAN NOT NULL DEFAULT false,
    "clientRiskRating" TEXT,
    "annualFee" DECIMAL(65,30),
    "monthlyFee" DECIMAL(65,30),
    "selfAssessmentRequired" BOOLEAN NOT NULL DEFAULT false,
    "selfAssessmentFiled" BOOLEAN NOT NULL DEFAULT false,
    "tradingName" TEXT,
    "companyType" TEXT,
    "registeredAddress" TEXT,
    "authenticationCode" TEXT,
    "employeeCount" INTEGER,
    "payrollFrequency" TEXT,
    "contactPosition" TEXT,
    "telephone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "preferredContactMethod" TEXT,
    "correspondenceAddress" TEXT,
    "feeArrangement" TEXT,
    "businessBankName" TEXT,
    "accountLastFour" TEXT,
    "directDebitInPlace" BOOLEAN NOT NULL DEFAULT false,
    "paymentIssues" TEXT,
    "nationalInsuranceNumber" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "personalAddress" TEXT,
    "personalTaxYear" TEXT,
    "selfAssessmentTaxYear" TEXT,
    "linkedCompanyNumber" TEXT,
    "directorRole" TEXT,
    "companyStatusDetail" TEXT,
    "jurisdiction" TEXT,
    "sicCodes" TEXT,
    "sicDescriptions" TEXT,
    "registeredOfficeFull" TEXT,
    "directorCount" INTEGER,
    "pscCount" INTEGER,
    "currentDirectors" TEXT,
    "currentPscs" TEXT,
    "lastChRefresh" TIMESTAMP(3),
    "accountsOverdue" BOOLEAN NOT NULL DEFAULT false,
    "confirmationStatementOverdue" BOOLEAN NOT NULL DEFAULT false,
    "nextAccountsMadeUpTo" TIMESTAMP(3),
    "nextAccountsDueBy" TIMESTAMP(3),
    "lastAccountsMadeUpTo" TIMESTAMP(3),
    "nextConfirmationStatementDate" TIMESTAMP(3),
    "confirmationStatementDueBy" TIMESTAMP(3),
    "lastConfirmationStatementDate" TIMESTAMP(3),
    "notes" TEXT,
    "specialCircumstances" TEXT,
    "seasonalBusiness" BOOLEAN NOT NULL DEFAULT false,
    "dormant" BOOLEAN NOT NULL DEFAULT false,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
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
    "county" TEXT,
    "postcode" TEXT NOT NULL,
    "country" TEXT NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_items" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "ComplianceStatus" NOT NULL DEFAULT 'PENDING',
    "source" "ComplianceSource" NOT NULL,
    "reference" TEXT,
    "period" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_templates" (
    "id" TEXT NOT NULL,
    "serviceKind" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "appliesTo" TEXT[],
    "complianceImpact" BOOLEAN NOT NULL DEFAULT false,
    "pricingModel" TEXT NOT NULL DEFAULT 'per_period',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_template_tasks" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "daysBeforeDue" INTEGER NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "tags" TEXT[],
    "assigneeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_template_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standalone_task_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standalone_task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "type" "TemplateType" NOT NULL,
    "content" TEXT NOT NULL,
    "placeholders" JSONB,
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_fields" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "format" TEXT,
    "source" TEXT,
    "sourcePath" TEXT,
    "validation" JSONB,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_sets" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "companyNumber" TEXT NOT NULL,
    "framework" "AccountingFramework" NOT NULL,
    "status" "AccountsSetStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStartDate" TIMESTAMP(3) NOT NULL,
    "periodEndDate" TIMESTAMP(3) NOT NULL,
    "isFirstYear" BOOLEAN NOT NULL DEFAULT false,
    "companyData" JSONB,
    "frameworkData" JSONB,
    "policiesData" JSONB,
    "profitLossData" JSONB,
    "balanceSheetData" JSONB,
    "notesData" JSONB,
    "approvalData" JSONB,
    "validationErrors" JSONB,
    "validationWarnings" JSONB,
    "isBalanced" BOOLEAN NOT NULL DEFAULT true,
    "htmlUrl" TEXT,
    "pdfUrl" TEXT,
    "createdById" TEXT,
    "lastEditedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "practices_addressId_key" ON "practices"("addressId");

-- CreateIndex
CREATE INDEX "practice_branches_practiceId_idx" ON "practice_branches"("practiceId");

-- CreateIndex
CREATE INDEX "practice_settings_practiceId_category_idx" ON "practice_settings"("practiceId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "practice_settings_practiceId_category_key_key" ON "practice_settings"("practiceId", "category", "key");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_key" ON "auth_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refreshToken_key" ON "auth_sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "auth_password_reset_tokens_token_key" ON "auth_password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "auth_password_reset_tokens_userId_idx" ON "auth_password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "auth_password_reset_tokens_token_idx" ON "auth_password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "auth_password_reset_tokens_expiresAt_idx" ON "auth_password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_profiles_clientId_key" ON "client_profiles"("clientId");

-- CreateIndex
CREATE INDEX "service_templates_serviceKind_frequency_idx" ON "service_templates"("serviceKind", "frequency");

-- CreateIndex
CREATE INDEX "service_template_tasks_templateId_idx" ON "service_template_tasks"("templateId");

-- CreateIndex
CREATE INDEX "standalone_task_templates_category_idx" ON "standalone_task_templates"("category");

-- CreateIndex
CREATE INDEX "template_fields_templateId_displayOrder_idx" ON "template_fields"("templateId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "template_fields_templateId_key_key" ON "template_fields"("templateId", "key");

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
CREATE INDEX "clients_registeredNumber_idx" ON "clients"("registeredNumber");

-- CreateIndex
CREATE INDEX "clients_clientRef_idx" ON "clients"("clientRef");

-- CreateIndex
CREATE INDEX "idx_client_baseRef_practice" ON "clients"("practiceId", "portfolioCode", "baseClientRef");

-- CreateIndex
CREATE INDEX "idx_client_connected_principal" ON "clients"("connectedPrincipalId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_practiceId_portfolioCode_clientRef_key" ON "clients"("practiceId", "portfolioCode", "clientRef");

-- CreateIndex
CREATE INDEX "companies_house_data_clientId_idx" ON "companies_house_data"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "people_email_key" ON "people"("email");

-- CreateIndex
CREATE INDEX "ref_buckets_practiceId_portfolioCode_idx" ON "ref_buckets"("practiceId", "portfolioCode");

-- CreateIndex
CREATE UNIQUE INDEX "ref_buckets_practiceId_portfolioCode_alpha_key" ON "ref_buckets"("practiceId", "portfolioCode", "alpha");

-- AddForeignKey
ALTER TABLE "practices" ADD CONSTRAINT "practices_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_branches" ADD CONSTRAINT "practice_branches_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_branches" ADD CONSTRAINT "practice_branches_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_settings" ADD CONSTRAINT "practice_settings_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ref_buckets" ADD CONSTRAINT "ref_buckets_portfolioCode_fkey" FOREIGN KEY ("portfolioCode") REFERENCES "portfolios"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_access_profiles" ADD CONSTRAINT "user_access_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_credentials" ADD CONSTRAINT "auth_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_password_reset_tokens" ADD CONSTRAINT "auth_password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_template_tasks" ADD CONSTRAINT "service_template_tasks_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "service_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_fields" ADD CONSTRAINT "template_fields_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_parties" ADD CONSTRAINT "client_parties_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_sets" ADD CONSTRAINT "accounts_sets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_sets" ADD CONSTRAINT "accounts_sets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_sets" ADD CONSTRAINT "accounts_sets_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

