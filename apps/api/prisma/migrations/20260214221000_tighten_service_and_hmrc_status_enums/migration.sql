-- CreateEnum
CREATE TYPE "HMRCRegistrationStatus" AS ENUM (
  'NOT_REGISTERED',
  'NOT_APPLICABLE',
  'APPLIED_FOR',
  'REGISTERED',
  'DEREGISTERED',
  'MISSING_DATA'
);

-- CreateEnum
CREATE TYPE "ServiceFrequency" AS ENUM (
  'ANNUAL',
  'QUARTERLY',
  'MONTHLY',
  'WEEKLY'
);

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED'
);

-- Ensure HMRC status columns exist before type conversion.
ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "hmrcCtStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "hmrcSaStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "hmrcVatStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "hmrcPayeStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "hmrcCisStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "hmrcMtdVatStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "hmrcMtdItsaStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "hmrcEoriStatus" TEXT;

-- AlterTable
ALTER TABLE "clients"
  ALTER COLUMN "hmrcCtStatus" TYPE "HMRCRegistrationStatus"
    USING (
      CASE
        WHEN "hmrcCtStatus" IS NULL OR btrim("hmrcCtStatus"::text) = '' THEN NULL
        WHEN upper("hmrcCtStatus"::text) IN ('NOT_REGISTERED', 'NOT_APPLICABLE', 'APPLIED_FOR', 'REGISTERED', 'DEREGISTERED', 'MISSING_DATA')
          THEN upper("hmrcCtStatus"::text)::"HMRCRegistrationStatus"
        ELSE 'MISSING_DATA'::"HMRCRegistrationStatus"
      END
    ),
  ALTER COLUMN "hmrcSaStatus" TYPE "HMRCRegistrationStatus"
    USING (
      CASE
        WHEN "hmrcSaStatus" IS NULL OR btrim("hmrcSaStatus"::text) = '' THEN NULL
        WHEN upper("hmrcSaStatus"::text) IN ('NOT_REGISTERED', 'NOT_APPLICABLE', 'APPLIED_FOR', 'REGISTERED', 'DEREGISTERED', 'MISSING_DATA')
          THEN upper("hmrcSaStatus"::text)::"HMRCRegistrationStatus"
        ELSE 'MISSING_DATA'::"HMRCRegistrationStatus"
      END
    ),
  ALTER COLUMN "hmrcVatStatus" TYPE "HMRCRegistrationStatus"
    USING (
      CASE
        WHEN "hmrcVatStatus" IS NULL OR btrim("hmrcVatStatus"::text) = '' THEN NULL
        WHEN upper("hmrcVatStatus"::text) IN ('NOT_REGISTERED', 'NOT_APPLICABLE', 'APPLIED_FOR', 'REGISTERED', 'DEREGISTERED', 'MISSING_DATA')
          THEN upper("hmrcVatStatus"::text)::"HMRCRegistrationStatus"
        ELSE 'MISSING_DATA'::"HMRCRegistrationStatus"
      END
    ),
  ALTER COLUMN "hmrcPayeStatus" TYPE "HMRCRegistrationStatus"
    USING (
      CASE
        WHEN "hmrcPayeStatus" IS NULL OR btrim("hmrcPayeStatus"::text) = '' THEN NULL
        WHEN upper("hmrcPayeStatus"::text) IN ('NOT_REGISTERED', 'NOT_APPLICABLE', 'APPLIED_FOR', 'REGISTERED', 'DEREGISTERED', 'MISSING_DATA')
          THEN upper("hmrcPayeStatus"::text)::"HMRCRegistrationStatus"
        ELSE 'MISSING_DATA'::"HMRCRegistrationStatus"
      END
    ),
  ALTER COLUMN "hmrcCisStatus" TYPE "HMRCRegistrationStatus"
    USING (
      CASE
        WHEN "hmrcCisStatus" IS NULL OR btrim("hmrcCisStatus"::text) = '' THEN NULL
        WHEN upper("hmrcCisStatus"::text) IN ('NOT_REGISTERED', 'NOT_APPLICABLE', 'APPLIED_FOR', 'REGISTERED', 'DEREGISTERED', 'MISSING_DATA')
          THEN upper("hmrcCisStatus"::text)::"HMRCRegistrationStatus"
        ELSE 'MISSING_DATA'::"HMRCRegistrationStatus"
      END
    ),
  ALTER COLUMN "hmrcMtdVatStatus" TYPE "HMRCRegistrationStatus"
    USING (
      CASE
        WHEN "hmrcMtdVatStatus" IS NULL OR btrim("hmrcMtdVatStatus"::text) = '' THEN NULL
        WHEN upper("hmrcMtdVatStatus"::text) IN ('NOT_REGISTERED', 'NOT_APPLICABLE', 'APPLIED_FOR', 'REGISTERED', 'DEREGISTERED', 'MISSING_DATA')
          THEN upper("hmrcMtdVatStatus"::text)::"HMRCRegistrationStatus"
        ELSE 'MISSING_DATA'::"HMRCRegistrationStatus"
      END
    ),
  ALTER COLUMN "hmrcMtdItsaStatus" TYPE "HMRCRegistrationStatus"
    USING (
      CASE
        WHEN "hmrcMtdItsaStatus" IS NULL OR btrim("hmrcMtdItsaStatus"::text) = '' THEN NULL
        WHEN upper("hmrcMtdItsaStatus"::text) IN ('NOT_REGISTERED', 'NOT_APPLICABLE', 'APPLIED_FOR', 'REGISTERED', 'DEREGISTERED', 'MISSING_DATA')
          THEN upper("hmrcMtdItsaStatus"::text)::"HMRCRegistrationStatus"
        ELSE 'MISSING_DATA'::"HMRCRegistrationStatus"
      END
    ),
  ALTER COLUMN "hmrcEoriStatus" TYPE "HMRCRegistrationStatus"
    USING (
      CASE
        WHEN "hmrcEoriStatus" IS NULL OR btrim("hmrcEoriStatus"::text) = '' THEN NULL
        WHEN upper("hmrcEoriStatus"::text) IN ('NOT_REGISTERED', 'NOT_APPLICABLE', 'APPLIED_FOR', 'REGISTERED', 'DEREGISTERED', 'MISSING_DATA')
          THEN upper("hmrcEoriStatus"::text)::"HMRCRegistrationStatus"
        ELSE 'MISSING_DATA'::"HMRCRegistrationStatus"
      END
    );

-- AlterTable
ALTER TABLE "services"
  ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "services"
  ALTER COLUMN "frequency" TYPE "ServiceFrequency"
    USING (
      CASE
        WHEN "frequency" IS NULL OR btrim("frequency"::text) = '' THEN NULL
        WHEN upper("frequency"::text) IN ('ANNUAL', 'QUARTERLY', 'MONTHLY', 'WEEKLY')
          THEN upper("frequency"::text)::"ServiceFrequency"
        ELSE NULL
      END
    ),
  ALTER COLUMN "status" TYPE "ServiceStatus"
    USING (
      CASE
        WHEN "status" IS NULL OR btrim("status"::text) = '' THEN 'ACTIVE'::"ServiceStatus"
        WHEN upper("status"::text) IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')
          THEN upper("status"::text)::"ServiceStatus"
        ELSE 'ACTIVE'::"ServiceStatus"
      END
    ),
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
