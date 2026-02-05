import { PrismaClient } from '../apps/api/generated/prisma';

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true' || process.env.DRY_RUN === undefined;
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 500);

type Mismatch = {
  model: string;
  id: string;
  clientId?: string | null;
  personId?: string | null;
  reason: string;
};

type Report = {
  dryRun: boolean;
  updated: Record<string, number>;
  skippedAlreadySet: Record<string, number>;
  skippedNoClientId: Record<string, number>;
  mismatches: Mismatch[];
};

async function main() {
  const prisma = new PrismaClient();
  const report: Report = {
    dryRun: DRY_RUN,
    updated: {},
    skippedAlreadySet: {},
    skippedNoClientId: {},
    mismatches: [],
  };

  const clientRefCache = new Map<string, string>();
  const personRefCache = new Map<string, string>();

  const prismaAny = prisma as any;

  const inc = (bucket: Record<string, number>, key: string, amount: number = 1) => {
    bucket[key] = (bucket[key] || 0) + amount;
  };

  const resolveClientRef = async (tx: any, clientId: string): Promise<string | null> => {
    const cached = clientRefCache.get(clientId);
    if (cached) return cached;

    const client = await tx.client.findUnique({ where: { id: clientId }, select: { ref: true } });
    const ref = client?.ref ? String(client.ref) : null;
    if (ref) clientRefCache.set(clientId, ref);
    return ref;
  };

  const resolvePersonRef = async (tx: any, personId: string): Promise<string | null> => {
    const cached = personRefCache.get(personId);
    if (cached) return cached;

    const person = await tx.person.findUnique({ where: { id: personId }, select: { ref: true } });
    const ref = person?.ref ? String(person.ref) : null;
    if (ref) personRefCache.set(personId, ref);
    return ref;
  };

  const backfillClientRefForModel = async (tx: any, modelName: string) => {
    while (true) {
      const rows: Array<{ id: string; clientId?: string | null; clientRef?: string | null }> =
        await prismaAny[modelName].findMany({
          where: { clientRef: null },
          select: { id: true, clientId: true, clientRef: true },
          take: BATCH_SIZE,
        });

      if (rows.length === 0) break;

      for (const row of rows) {
        if (!row.clientId) {
          inc(report.skippedNoClientId, modelName);
          continue;
        }

        const clientRef = await resolveClientRef(tx, String(row.clientId));
        if (!clientRef) {
          report.mismatches.push({
            model: modelName,
            id: row.id,
            clientId: row.clientId,
            reason: 'clientId could not be resolved to a Client.ref',
          });
          continue;
        }

        if (DRY_RUN) {
          inc(report.updated, modelName);
          continue;
        }

        await prismaAny[modelName].update({
          where: { id: row.id },
          data: { clientRef },
        });
        inc(report.updated, modelName);
      }
    }
  };

  const backfillClientPartyRefs = async (tx: any) => {
    while (true) {
      const rows: Array<{ id: string; clientId: string; clientRef?: string | null; personId: string; personRef?: string | null }> =
        await prismaAny.clientParty.findMany({
          where: {
            OR: [{ clientRef: null }, { personRef: null }],
          },
          select: { id: true, clientId: true, clientRef: true, personId: true, personRef: true },
          take: BATCH_SIZE,
        });

      if (rows.length === 0) break;

      for (const row of rows) {
        let clientRef: string | null = row.clientRef ? String(row.clientRef) : null;
        let personRef: string | null = row.personRef ? String(row.personRef) : null;

        if (!clientRef) {
          clientRef = await resolveClientRef(tx, String(row.clientId));
          if (!clientRef) {
            report.mismatches.push({
              model: 'clientParty',
              id: row.id,
              clientId: row.clientId,
              personId: row.personId,
              reason: 'clientId could not be resolved to a Client.ref',
            });
          }
        }

        if (!personRef) {
          personRef = await resolvePersonRef(tx, String(row.personId));
          if (!personRef) {
            report.mismatches.push({
              model: 'clientParty',
              id: row.id,
              clientId: row.clientId,
              personId: row.personId,
              reason: 'personId could not be resolved to a Person.ref',
            });
          }
        }

        if (!clientRef && !personRef) {
          continue;
        }

        if (DRY_RUN) {
          inc(report.updated, 'clientParty');
          continue;
        }

        await prismaAny.clientParty.update({
          where: { id: row.id },
          data: {
            ...(clientRef ? { clientRef } : {}),
            ...(personRef ? { personRef } : {}),
          },
        });
        inc(report.updated, 'clientParty');
      }
    }
  };

  try {
    await prisma.$connect();

    const run = async (tx: any) => {
      await backfillClientRefForModel(tx, 'service');
      await backfillClientRefForModel(tx, 'task');
      await backfillClientRefForModel(tx, 'filing');
      await backfillClientRefForModel(tx, 'document');
      await backfillClientPartyRefs(tx);
      await backfillClientRefForModel(tx, 'taxCalculation');
      await backfillClientRefForModel(tx, 'generatedReport');
    };

    if (DRY_RUN) {
      await run(prisma);
    } else {
      await prisma.$transaction(async (tx) => {
        await run(tx);
      });
    }

    // Output report as JSON so it can be redirected to a file.
    // Example: ts-node ... > backfill-report.json
    // (We avoid writing files by default.)
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
