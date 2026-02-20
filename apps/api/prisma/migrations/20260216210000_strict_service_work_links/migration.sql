DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecurrenceType') THEN
    CREATE TYPE "RecurrenceType" AS ENUM ('NONE', 'STANDARD');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecurrenceUnit') THEN
    CREATE TYPE "RecurrenceUnit" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TriggerMode') THEN
    CREATE TYPE "TriggerMode" AS ENUM ('COMPLETION', 'DATE_BASED');
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'ServiceStatus'
      AND e.enumlabel IN ('INACTIVE', 'SUSPENDED')
  ) THEN
    CREATE TYPE "ServiceStatus_new" AS ENUM ('DRAFT', 'ACTIVE', 'AWAITING_FILING', 'READY_TO_CLOSE', 'COMPLETE', 'ARCHIVED');
    ALTER TABLE "services" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "services" ALTER COLUMN "status" TYPE "ServiceStatus_new" USING ("status"::text::"ServiceStatus_new");
    ALTER TYPE "ServiceStatus" RENAME TO "ServiceStatus_old";
    ALTER TYPE "ServiceStatus_new" RENAME TO "ServiceStatus";
    DROP TYPE "ServiceStatus_old";
  END IF;
END
$$;

ALTER TABLE "services" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "service_templates" ADD COLUMN IF NOT EXISTS "autoGenerateNext" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "service_templates" ADD COLUMN IF NOT EXISTS "recurrenceType" "RecurrenceType" NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "service_templates" ADD COLUMN IF NOT EXISTS "recurrenceInterval" INTEGER;
ALTER TABLE "service_templates" ADD COLUMN IF NOT EXISTS "recurrenceUnit" "RecurrenceUnit";
ALTER TABLE "service_templates" ADD COLUMN IF NOT EXISTS "triggerMode" "TriggerMode" NOT NULL DEFAULT 'COMPLETION';

-- Remove legacy client reference artifacts
UPDATE "clients"
SET "clientRef" = UPPER(TRIM("clientRef"))
WHERE "clientRef" IS NOT NULL;

DROP INDEX IF EXISTS "idx_client_baseRef_practice";
ALTER TABLE "clients" DROP COLUMN IF EXISTS "baseClientRef";

ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_practiceId_portfolioCode_clientRef_key";
ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_clientRef_key";
ALTER TABLE "clients" ADD CONSTRAINT "clients_clientRef_key" UNIQUE ("clientRef");

-- Migrate task/compliance linkage to serviceId only
ALTER TABLE "compliance_items" DROP CONSTRAINT IF EXISTS "compliance_items_clientId_fkey";
ALTER TABLE "compliance_items" DROP CONSTRAINT IF EXISTS "compliance_items_clientServiceId_fkey";
ALTER TABLE "compliance_items" DROP CONSTRAINT IF EXISTS "compliance_items_serviceId_fkey";
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_clientId_fkey";
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_clientServiceId_fkey";
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_serviceId_fkey";

ALTER TABLE "compliance_items" ADD COLUMN IF NOT EXISTS "serviceId" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "serviceId" TEXT;

UPDATE "compliance_items"
SET "serviceId" = COALESCE("serviceId", "clientServiceId")
WHERE "serviceId" IS NULL;

UPDATE "tasks"
SET "serviceId" = COALESCE("serviceId", "clientServiceId")
WHERE "serviceId" IS NULL;

DELETE FROM "compliance_items" WHERE "serviceId" IS NULL;
DELETE FROM "tasks" WHERE "serviceId" IS NULL;

ALTER TABLE "compliance_items" ALTER COLUMN "serviceId" SET NOT NULL;
ALTER TABLE "tasks" ALTER COLUMN "serviceId" SET NOT NULL;

ALTER TABLE "compliance_items" DROP COLUMN IF EXISTS "clientId";
ALTER TABLE "compliance_items" DROP COLUMN IF EXISTS "clientServiceId";
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "clientId";
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "clientServiceId";

DROP INDEX IF EXISTS "tasks_clientServiceId_idx";
DROP INDEX IF EXISTS "compliance_items_clientServiceId_idx";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_serviceId_fkey'
  ) THEN
    ALTER TABLE "tasks"
      ADD CONSTRAINT "tasks_serviceId_fkey"
      FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'compliance_items_serviceId_fkey'
  ) THEN
    ALTER TABLE "compliance_items"
      ADD CONSTRAINT "compliance_items_serviceId_fkey"
      FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

ALTER TABLE "compliance_items" DROP CONSTRAINT IF EXISTS "compliance_items_clientServiceId_key";
ALTER TABLE "compliance_items" DROP CONSTRAINT IF EXISTS "compliance_items_serviceId_key";
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_serviceId_key" UNIQUE ("serviceId");

CREATE INDEX IF NOT EXISTS "tasks_serviceId_idx" ON "tasks"("serviceId");
CREATE INDEX IF NOT EXISTS "compliance_items_serviceId_idx" ON "compliance_items"("serviceId");
