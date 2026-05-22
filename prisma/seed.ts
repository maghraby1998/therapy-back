import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';
import {
  doctorVerificationDocumentTypeSeeds,
  type DoctorVerificationDocumentTypeSeed,
} from './seed-data/doctor-verification-document-types.seed.js';

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

async function upsertDoctorVerificationDocumentType(
  seed: DoctorVerificationDocumentTypeSeed,
) {
  return prisma.doctorVerificationDocumentType.upsert({
    where: {
      name: seed.name,
    },
    update: {
      description: seed.description ?? null,
      isRequired: seed.isRequired,
      isActive: seed.isActive ?? true,
    },
    create: {
      name: seed.name,
      description: seed.description ?? null,
      isRequired: seed.isRequired,
      isActive: seed.isActive ?? true,
    },
  });
}

async function main() {
  for (const seed of doctorVerificationDocumentTypeSeeds) {
    await upsertDoctorVerificationDocumentType(seed);
  }

  console.log(
    `Seeded ${doctorVerificationDocumentTypeSeeds.length} doctor verification document types.`,
  );
}

main()
  .catch((error) => {
    console.error('Prisma seed failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
