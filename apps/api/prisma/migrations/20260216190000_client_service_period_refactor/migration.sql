-- AlterEnum
ALTER TYPE "ServiceStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "compliance_items" ADD COLUMN     "clientServiceId" TEXT,
ADD COLUMN     "externalStatus" "ComplianceStatus",
ADD COLUMN     "filedAt" TIMESTAMP(3),
ADD COLUMN     "internalStatus" "ComplianceStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "mismatch" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "cycleNumber" INTEGER,
ADD COLUMN     "periodEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "templateId" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "ServiceStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "clientServiceId" TEXT;

-- Backfill new service-link columns from legacy serviceId columns.
UPDATE "tasks"
SET "clientServiceId" = COALESCE("clientServiceId", "serviceId")
WHERE "clientServiceId" IS NULL
  AND "serviceId" IS NOT NULL;

UPDATE "compliance_items"
SET "clientServiceId" = COALESCE("clientServiceId", "serviceId")
WHERE "clientServiceId" IS NULL
  AND "serviceId" IS NOT NULL;

-- Keep internal status aligned with existing status values for historical rows.
UPDATE "compliance_items"
SET "internalStatus" = "status"
WHERE "status" IS NOT NULL;

-- If historical duplicates exist for the same service, keep the newest linked row.
WITH ranked_compliance AS (
  SELECT
    "id",
    "clientServiceId",
    ROW_NUMBER() OVER (
      PARTITION BY "clientServiceId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS row_num
  FROM "compliance_items"
  WHERE "clientServiceId" IS NOT NULL
)
UPDATE "compliance_items" AS target
SET "clientServiceId" = NULL
FROM ranked_compliance AS ranked
WHERE target."id" = ranked."id"
  AND ranked.row_num > 1;

-- Seed period bounds for pre-existing services from known dates.
UPDATE "services"
SET
  "periodStart" = COALESCE("nextDue", "createdAt", "periodStart"),
  "periodEnd" = COALESCE("nextDue", "updatedAt", "periodEnd");

-- CreateIndex
CREATE INDEX "compliance_items_clientServiceId_idx" ON "compliance_items"("clientServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_compliance_client_service" ON "compliance_items"("clientServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_client_template_period_start" ON "services"("clientId", "templateId", "periodStart");

-- CreateIndex
CREATE INDEX "tasks_clientServiceId_idx" ON "tasks"("clientServiceId");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "service_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
