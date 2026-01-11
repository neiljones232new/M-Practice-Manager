/*
  Warnings:

  - You are about to drop the column `registeredNumber` on the `clients` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[companyNumber]` on the table `clients` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "client_parties" ADD COLUMN     "appointedOn" TIMESTAMP(3),
ADD COLUMN     "isPre1992Appointment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "officerRole" TEXT,
ADD COLUMN     "resignedOn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "registeredNumber",
ADD COLUMN     "accountsAccountingReferenceDay" INTEGER,
ADD COLUMN     "accountsAccountingReferenceMonth" INTEGER,
ADD COLUMN     "accountsLastMadeUpTo" TIMESTAMP(3),
ADD COLUMN     "accountsNextDue" TIMESTAMP(3),
ADD COLUMN     "accountsOverdue" BOOLEAN,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "companyNumber" TEXT,
ADD COLUMN     "companyStatus" TEXT,
ADD COLUMN     "companyType" TEXT,
ADD COLUMN     "confirmationStatementLastMadeUpTo" TIMESTAMP(3),
ADD COLUMN     "confirmationStatementNextDue" TIMESTAMP(3),
ADD COLUMN     "confirmationStatementOverdue" BOOLEAN,
ADD COLUMN     "dateOfCessation" TIMESTAMP(3),
ADD COLUMN     "dateOfCreation" TIMESTAMP(3),
ADD COLUMN     "etag" TEXT,
ADD COLUMN     "jurisdiction" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "registeredOfficeAddressLine1" TEXT,
ADD COLUMN     "registeredOfficeAddressLine2" TEXT,
ADD COLUMN     "registeredOfficeCountry" TEXT,
ADD COLUMN     "registeredOfficeLocality" TEXT,
ADD COLUMN     "registeredOfficePostalCode" TEXT,
ADD COLUMN     "registeredOfficeRegion" TEXT,
ADD COLUMN     "sicCodes" TEXT[];

-- AlterTable
ALTER TABLE "filings" ADD COLUMN     "actionDate" TIMESTAMP(3),
ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "filedDate" TIMESTAMP(3),
ADD COLUMN     "madeUpTo" TIMESTAMP(3),
ADD COLUMN     "pages" INTEGER,
ADD COLUMN     "paperFiled" BOOLEAN,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "transactionId" TEXT;

-- AlterTable
ALTER TABLE "people" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "countryOfResidence" TEXT,
ADD COLUMN     "dateOfBirthMonth" INTEGER,
ADD COLUMN     "dateOfBirthYear" INTEGER,
ADD COLUMN     "etag" TEXT,
ADD COLUMN     "locality" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "personNumber" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "premises" TEXT,
ADD COLUMN     "region" TEXT;

-- CreateTable
CREATE TABLE "companies_house_data" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "companyNumber" TEXT NOT NULL,
    "companyDetails" JSONB,
    "officers" JSONB,
    "filingHistory" JSONB,
    "charges" JSONB,
    "pscs" JSONB,
    "lastFetched" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_house_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_house_data_clientId_key" ON "companies_house_data"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_house_data_companyNumber_key" ON "companies_house_data"("companyNumber");

-- CreateIndex
CREATE INDEX "companies_house_data_companyNumber_idx" ON "companies_house_data"("companyNumber");

-- CreateIndex
CREATE INDEX "companies_house_data_lastFetched_idx" ON "companies_house_data"("lastFetched");

-- CreateIndex
CREATE INDEX "client_parties_officerRole_idx" ON "client_parties"("officerRole");

-- CreateIndex
CREATE UNIQUE INDEX "clients_companyNumber_key" ON "clients"("companyNumber");

-- CreateIndex
CREATE INDEX "clients_companyNumber_idx" ON "clients"("companyNumber");

-- CreateIndex
CREATE INDEX "clients_companyStatus_idx" ON "clients"("companyStatus");

-- CreateIndex
CREATE INDEX "filings_type_idx" ON "filings"("type");

-- CreateIndex
CREATE INDEX "filings_transactionId_idx" ON "filings"("transactionId");

-- CreateIndex
CREATE INDEX "people_personNumber_idx" ON "people"("personNumber");

-- AddForeignKey
ALTER TABLE "companies_house_data" ADD CONSTRAINT "companies_house_data_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
