import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateIngredientsToGroups() {
  console.log("🔄 Début de la migration des ingrédients vers les groupes...\n");

  try {
    // Récupérer toutes les recettes avec leurs ingrédients
    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: true,
        ingredientGroups: true,
      },
    });

    console.log(`📊 ${recipes.length} recettes trouvées\n`);

    let recipesWithGroups = 0;
    let recipesNeedingMigration = 0;
    let totalIngredientsMigrated = 0;

    for (const recipe of recipes) {
      // Vérifier si la recette a déjà des groupes
      if (recipe.ingredientGroups.length > 0) {
        recipesWithGroups++;
        console.log(`✓ Recette "${recipe.name}" a déjà des groupes, ignorée`);
        continue;
      }

      // Vérifier si la recette a des ingrédients sans groupe
      const ingredientsWithoutGroup = recipe.ingredients.filter(
        (ing) => ing.groupId === null
      );

      if (ingredientsWithoutGroup.length === 0) {
        console.log(`✓ Recette "${recipe.name}" n'a pas d'ingrédients à migrer`);
        continue;
      }

      recipesNeedingMigration++;

      // Créer un groupe par défaut "Ingrédients"
      const defaultGroup = await prisma.ingredientGroup.create({
        data: {
          name: "Ingrédients",
          order: 0,
          recipeId: recipe.id,
        },
      });

      console.log(
        `📦 Groupe "Ingrédients" créé pour la recette "${recipe.name}"`
      );

      // Associer tous les ingrédients existants à ce groupe
      const updateResult = await prisma.ingredient.updateMany({
        where: {
          recipeId: recipe.id,
          groupId: null,
        },
        data: {
          groupId: defaultGroup.id,
        },
      });

      totalIngredientsMigrated += updateResult.count;

      console.log(
        `  ✓ ${updateResult.count} ingrédient(s) associé(s) au groupe\n`
      );
    }

    console.log("\n✅ Migration terminée avec succès!\n");
    console.log("📊 Statistiques:");
    console.log(`   - Recettes avec groupes existants: ${recipesWithGroups}`);
    console.log(`   - Recettes migrées: ${recipesNeedingMigration}`);
    console.log(
      `   - Total d'ingrédients migrés: ${totalIngredientsMigrated}`
    );
  } catch (error) {
    console.error("❌ Erreur lors de la migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateIngredientsToGroups();

