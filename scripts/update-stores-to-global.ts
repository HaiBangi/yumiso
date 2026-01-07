import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Mise à jour des enseignes existantes...');

  // Mettre toutes les enseignes existantes comme globales (isGlobal = true, userId = null)
  const result = await prisma.store.updateMany({
    data: {
      isGlobal: true,
      userId: null,
    },
  });

  console.log(`✅ ${result.count} enseigne(s) mise(s) à jour comme globales`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
