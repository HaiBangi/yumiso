import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("📦 Démarrage du backup de la base de données...\n");

  // Fetch all data
  const users = await prisma.user.findMany({
    include: {
      accounts: true,
      sessions: true,
    },
  });

  const recipes = await prisma.recipe.findMany({
    include: {
      ingredients: true,
      steps: true,
      comments: true,
    },
  });

  const collections = await prisma.collection.findMany({
    include: {
      recipes: {
        select: { id: true },
      },
    },
  });

  const userRecipeNotes = await prisma.userRecipeNote.findMany();

  const favorites = await prisma.user.findMany({
    select: {
      id: true,
      favorites: {
        select: { id: true },
      },
    },
  });

  // Create backup object
  const backup = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    data: {
      users: users.map((u) => ({
        ...u,
        accounts: u.accounts,
        sessions: u.sessions,
      })),
      recipes: recipes.map((r) => ({
        ...r,
        ingredients: r.ingredients,
        steps: r.steps,
        comments: r.comments,
      })),
      collections: collections.map((c) => ({
        ...c,
        recipeIds: c.recipes.map((r) => r.id),
      })),
      userRecipeNotes,
      userFavorites: favorites
        .filter((u) => u.favorites.length > 0)
        .map((u) => ({
          userId: u.id,
          recipeIds: u.favorites.map((f) => f.id),
        })),
    },
    stats: {
      users: users.length,
      recipes: recipes.length,
      collections: collections.length,
      notes: userRecipeNotes.length,
      ingredients: recipes.reduce((acc, r) => acc + r.ingredients.length, 0),
      steps: recipes.reduce((acc, r) => acc + r.steps.length, 0),
      comments: recipes.reduce((acc, r) => acc + r.comments.length, 0),
    },
  };

  // Create backups directory if it doesn't exist
  const backupsDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `backup-${timestamp}.json`;
  const filepath = path.join(backupsDir, filename);

  // Write backup file
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), "utf-8");

  console.log("✅ Backup créé avec succès!\n");
  console.log(`📁 Fichier: ${filepath}\n`);
  console.log("📊 Statistiques:");
  console.log(`   - Utilisateurs: ${backup.stats.users}`);
  console.log(`   - Recettes: ${backup.stats.recipes}`);
  console.log(`   - Ingrédients: ${backup.stats.ingredients}`);
  console.log(`   - Étapes: ${backup.stats.steps}`);
  console.log(`   - Collections: ${backup.stats.collections}`);
  console.log(`   - Notes personnelles: ${backup.stats.notes}`);
  console.log(`   - Commentaires: ${backup.stats.comments}`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du backup:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

