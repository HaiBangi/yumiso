/**
 * Script de migration pour créer les listes de courses manquantes
 * pour les menus existants qui n'en ont pas
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Recherche des menus sans liste de courses...');

  // Récupérer tous les menus
  const allPlans = await prisma.weeklyMealPlan.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      linkedShoppingLists: true,
    },
  });

  console.log(`📊 ${allPlans.length} menus trouvés`);

  // Filtrer ceux qui n'ont pas de liste
  const plansWithoutList = allPlans.filter(plan => plan.linkedShoppingLists.length === 0);

  if (plansWithoutList.length === 0) {
    console.log('✅ Tous les menus ont déjà une liste de courses !');
    return;
  }

  console.log(`⚠️  ${plansWithoutList.length} menus sans liste de courses trouvés`);
  console.log('');

  // Créer les listes manquantes
  for (const plan of plansWithoutList) {
    console.log(`🛒 Création de la liste pour: "${plan.name}" (ID: ${plan.id})`);
    
    try {
      await prisma.shoppingList.create({
        data: {
          name: `Liste de Courses - ${plan.name}`,
          userId: plan.userId,
          weeklyMealPlanId: plan.id,
          isPublic: false,
        },
      });
      console.log(`   ✅ Liste créée`);
    } catch (error) {
      console.error(`   ❌ Erreur:`, error);
    }
  }

  console.log('');
  console.log('✅ Migration terminée !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
