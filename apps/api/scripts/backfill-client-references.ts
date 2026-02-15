import { Prisma, PrismaClient } from '../generated/prisma';
import {
  normalizeCompanyInitial,
  parseClientRef,
  surnameInitial,
} from '../src/modules/clients/utils/client-reference-validators';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

function normalizeBucketAlpha(alpha: unknown): string | null {
  if (typeof alpha !== 'string') return null;
  const trimmed = alpha.trim().toUpperCase();
  if (!trimmed) return null;
  const letter = trimmed[0];
  return letter >= 'A' && letter <= 'Z' ? letter : null;
}

function derivePreferredAlpha(name: string, type: string): string {
  const normalizedType = String(type || '').toUpperCase();
  const source = String(name || '');
  const preferred = normalizedType === 'INDIVIDUAL' || normalizedType === 'SOLE_TRADER'
    ? surnameInitial(source)
    : normalizeCompanyInitial(source);
  return normalizeBucketAlpha(preferred) || 'X';
}

async function findOrCreateBucket(
  tx: Prisma.TransactionClient,
  practiceId: string,
  portfolioCode: number,
  alpha: string,
): Promise<{ id: string; nextIndex: number }> {
  const existing = await tx.refBucket.findFirst({
    where: { practiceId, portfolioCode, alpha },
    orderBy: { createdAt: 'asc' },
    select: { id: true, nextIndex: true },
  });
  if (existing) return existing;

  try {
    return await tx.refBucket.create({
      data: { practiceId, portfolioCode, alpha, nextIndex: 1 },
      select: { id: true, nextIndex: true },
    });
  } catch {
    const createdByOther = await tx.refBucket.findFirst({
      where: { practiceId, portfolioCode, alpha },
      orderBy: { createdAt: 'asc' },
      select: { id: true, nextIndex: true },
    });
    if (!createdByOther) {
      throw new Error(`Could not create/find bucket ${practiceId}/${portfolioCode}/${alpha}`);
    }
    return createdByOther;
  }
}

async function allocateBaseClientRef(
  tx: Prisma.TransactionClient,
  portfolioCode: number,
  practiceId: string,
  preferredAlpha: string,
): Promise<string> {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const order = [
    preferredAlpha,
    ...alphabet.split('').filter((letter) => letter !== preferredAlpha),
  ];

  for (const alpha of order) {
    const bucket = await findOrCreateBucket(tx, practiceId, portfolioCode, alpha);
    let nextIndex = Math.max(1, Number(bucket.nextIndex) || 1);

    while (nextIndex <= 999) {
      const candidate = `${portfolioCode}${alpha}${String(nextIndex).padStart(3, '0')}`;
      const taken = await tx.client.findFirst({
        where: {
          practiceId,
          portfolioCode,
          OR: [{ clientRef: candidate }, { id: candidate }],
        },
        select: { id: true },
      });

      if (!taken) {
        await tx.refBucket.update({
          where: { id: bucket.id },
          data: { nextIndex: nextIndex + 1 },
        });
        return candidate;
      }

      nextIndex += 1;
    }
  }

  throw new Error(`No available client reference in practice=${practiceId} portfolio=${portfolioCode}`);
}

async function main() {
  const clients = await prisma.client.findMany({
    orderBy: [{ portfolioCode: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      type: true,
      portfolioCode: true,
      practiceId: true,
      clientRef: true,
      baseClientRef: true,
    },
  });

  let patched = 0;
  for (const client of clients) {
    const portfolioCode = Number(client.portfolioCode) || 1;
    const practiceId = String(client.practiceId || 'default').trim() || 'default';
    const currentRef = String(client.clientRef || '').trim().toUpperCase();
    const currentBase = String(client.baseClientRef || '').trim().toUpperCase();

    const parsedCurrentRef = parseClientRef(currentRef);
    const parsedCurrentBase = parseClientRef(currentBase);
    const refValid = !!parsedCurrentRef && parsedCurrentRef.portfolio === portfolioCode;
    const baseValid = !!parsedCurrentBase
      && !parsedCurrentBase.suffix
      && parsedCurrentBase.portfolio === portfolioCode;
    const baseMatchesRef = refValid && baseValid
      ? parsedCurrentRef.base === parsedCurrentBase.base
      : false;

    if (refValid && baseValid && baseMatchesRef && client.practiceId === practiceId) {
      continue;
    }

    let nextRef = refValid ? currentRef : '';
    let nextBase = baseValid ? currentBase : '';

    if (!nextRef) {
      const parsedId = parseClientRef(String(client.id || '').trim().toUpperCase());
      if (parsedId && parsedId.portfolio === portfolioCode) {
        nextRef = String(client.id).trim().toUpperCase();
      }
    }

    if (nextRef && !nextBase) {
      const parsedNextRef = parseClientRef(nextRef);
      if (parsedNextRef) nextBase = parsedNextRef.base;
    }

    if (!nextRef || !nextBase) {
      const preferredAlpha = derivePreferredAlpha(client.name, client.type);
      nextBase = await prisma.$transaction((tx) =>
        allocateBaseClientRef(tx, portfolioCode, practiceId, preferredAlpha));
      nextRef = nextBase;
    }

    const parsedNextRef = parseClientRef(nextRef);
    if (!parsedNextRef) {
      throw new Error(`Failed to compute valid clientRef for ${client.id}`);
    }
    nextBase = parsedNextRef.base;

    patched += 1;
    if (APPLY) {
      await prisma.client.update({
        where: { id: client.id },
        data: {
          practiceId,
          clientRef: nextRef,
          baseClientRef: nextBase,
        },
      });
    }

    console.log(
      `${APPLY ? 'APPLY' : 'DRY'} ${client.id} => clientRef=${nextRef} baseClientRef=${nextBase} practiceId=${practiceId}`,
    );
  }

  console.log(`${APPLY ? 'Applied' : 'Previewed'} ${patched} client reference update(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
