/**
 * Script de migration pour générer les slugs des recettes existantes
 * 
 * À exécuter une seule fois après la migration du schéma :
 * npx tsx scripts/migrate-slugs.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Génère un slug URL-friendly à partir d'un texte
 */
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Génère un slug unique en vérifiant les doublons
 */
async function generateUniqueSlug(name: string, excludeId: number): Promise<string> {
  const baseSlug = slugify(name);
  
  if (!baseSlug) {
    return `recette-${excludeId}`;
  }

  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.recipe.findFirst({
      where: {
        slug,
        NOT: { id: excludeId },
      },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

async function migrateSlugs() {
  console.log("🔄 Migration des slugs...\n");

  // Récupérer toutes les recettes sans slug
  const recipes = await prisma.recipe.findMany({
    where: {
      OR: [
        { slug: null as unknown as string },
        { slug: "" },
      ],
    },
    select: { id: true, name: true },
  });

  console.log(`📊 ${recipes.length} recettes à migrer\n`);

  let updated = 0;
  let errors = 0;

  for (const recipe of recipes) {
    try {
      const slug = await generateUniqueSlug(recipe.name, recipe.id);
      
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { slug },
      });

      console.log(`✅ ${recipe.name} → ${slug}`);
      updated++;
    } catch (error) {
      console.error(`❌ Erreur pour "${recipe.name}":`, error);
      errors++;
    }
  }

  console.log(`\n🎉 Migration terminée!`);
  console.log(`   - ${updated} recettes migrées avec succès`);
  console.log(`   - ${errors} erreurs\n`);
}

// Vérifier également les recettes qui ont déjà un slug (pour les doublons)
async function checkForDuplicateSlugs() {
  console.log("🔍 Vérification des doublons de slugs...\n");

  const slugCounts = await prisma.recipe.groupBy({
    by: ["slug"],
    _count: { id: true },
    having: {
      id: { _count: { gt: 1 } },
    },
  });

  if (slugCounts.length === 0) {
    console.log("✅ Aucun doublon trouvé!\n");
    return;
  }

  console.log(`⚠️ ${slugCounts.length} slugs en doublon trouvés:\n`);

  for (const { slug, _count } of slugCounts) {
    console.log(`   - "${slug}" (${_count.id} occurrences)`);
    
    // Corriger les doublons
    const duplicates = await prisma.recipe.findMany({
      where: { slug },
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });

    // Garder le premier, renommer les autres
    for (let i = 1; i < duplicates.length; i++) {
      const newSlug = await generateUniqueSlug(duplicates[i].name, duplicates[i].id);
      await prisma.recipe.update({
        where: { id: duplicates[i].id },
        data: { slug: newSlug },
      });
      console.log(`     → Corrigé: ${duplicates[i].name} → ${newSlug}`);
    }
  }

  console.log("\n✅ Doublons corrigés!\n");
}

async function main() {
  try {
    await migrateSlugs();
    await checkForDuplicateSlugs();
  } catch (error) {
    console.error("❌ Erreur lors de la migration:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
