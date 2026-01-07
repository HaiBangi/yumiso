// Script de migration des enseignes (string) vers la table Store
import { db } from "../src/lib/db";

// Enseignes françaises populaires avec couleurs et logos
const DEFAULT_STORES = [
  {
    name: "Lidl",
    color: "#0050AA",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Lidl-Logo.svg/512px-Lidl-Logo.svg.png",
    displayOrder: 1,
  },
  {
    name: "Auchan",
    color: "#E2001A",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Auchan_Logo.svg/512px-Auchan_Logo.svg.png",
    displayOrder: 2,
  },
  {
    name: "Carrefour",
    color: "#005AA9",
    logoUrl: "https://upload.wikimedia.org/wikipedia/fr/thumb/3/3b/Logo_Carrefour.svg/512px-Logo_Carrefour.svg.png",
    displayOrder: 3,
  },
  {
    name: "Leclerc",
    color: "#0066CC",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/E.Leclerc_logo.svg/512px-E.Leclerc_logo.svg.png",
    displayOrder: 4,
  },
  {
    name: "Intermarché",
    color: "#ED1C24",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_Intermarch%C3%A9.svg/512px-Logo_Intermarch%C3%A9.svg.png",
    displayOrder: 5,
  },
  {
    name: "Casino",
    color: "#E20A16",
    logoUrl: "https://upload.wikimedia.org/wikipedia/fr/thumb/3/30/Logo_Groupe_Casino.svg/512px-Logo_Groupe_Casino.svg.png",
    displayOrder: 6,
  },
  {
    name: "Monoprix",
    color: "#E2001A",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Monoprix_logo.svg/512px-Monoprix_logo.svg.png",
    displayOrder: 7,
  },
  {
    name: "Franprix",
    color: "#FF6600",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Logo_Franprix.svg/512px-Logo_Franprix.svg.png",
    displayOrder: 8,
  },
  {
    name: "Boulangerie",
    color: "#F59E0B",
    logoUrl: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
    displayOrder: 9,
  },
  {
    name: "Marché",
    color: "#10B981",
    logoUrl: "https://cdn-icons-png.flaticon.com/512/2771/2771413.png",
    displayOrder: 10,
  },
];

async function migrateStores() {
  console.log("🚀 Début de la migration des enseignes...\n");

  try {
    // 1. Créer les enseignes par défaut
    console.log("📝 Étape 1: Création des enseignes par défaut");
    for (const store of DEFAULT_STORES) {
      const existing = await db.store.findUnique({
        where: { name: store.name },
      });

      if (existing) {
        console.log(`  ⏭️  "${store.name}" existe déjà`);
      } else {
        await db.store.create({ data: store });
        console.log(`  ✅ "${store.name}" créée`);
      }
    }

    // 2. Récupérer toutes les enseignes distinctes existantes (non nulles)
    console.log("\n📝 Étape 2: Récupération des enseignes existantes");

    const existingStoresInItems = await db.$queryRaw<Array<{ store: string }>>`
      SELECT DISTINCT store
      FROM "ShoppingListItem"
      WHERE store IS NOT NULL
      AND store != ''
      UNION
      SELECT DISTINCT store
      FROM "StandaloneShoppingItem"
      WHERE store IS NOT NULL
      AND store != ''
    `;

    console.log(`  📊 ${existingStoresInItems.length} enseignes uniques trouvées dans les items`);

    // 3. Créer les enseignes manquantes
    console.log("\n📝 Étape 3: Création des enseignes manquantes");
    let createdCount = 0;
    for (const { store: storeName } of existingStoresInItems) {
      const existing = await db.store.findUnique({
        where: { name: storeName },
      });

      if (!existing) {
        await db.store.create({
          data: {
            name: storeName,
            color: "#6B7280", // Gris par défaut
            displayOrder: 100 + createdCount, // Après les enseignes par défaut
          },
        });
        console.log(`  ✅ Enseigne créée: "${storeName}"`);
        createdCount++;
      }
    }
    console.log(`  📊 ${createdCount} nouvelles enseignes créées`);

    // 4. Migrer les ShoppingListItem
    console.log("\n📝 Étape 4: Migration des ShoppingListItem");
    const itemsToMigrate = await db.shoppingListItem.findMany({
      where: {
        store: { not: null },
        storeId: null,
      },
      select: { id: true, store: true },
    });

    console.log(`  📊 ${itemsToMigrate.length} items à migrer`);

    let migratedItems = 0;
    for (const item of itemsToMigrate) {
      if (!item.store) continue;

      const storeRecord = await db.store.findUnique({
        where: { name: item.store },
      });

      if (storeRecord) {
        await db.shoppingListItem.update({
          where: { id: item.id },
          data: { storeId: storeRecord.id },
        });
        migratedItems++;
      } else {
        console.log(`  ⚠️  Enseigne introuvable pour l'item ${item.id}: "${item.store}"`);
      }
    }
    console.log(`  ✅ ${migratedItems} ShoppingListItem migrés`);

    // 5. Migrer les StandaloneShoppingItem
    console.log("\n📝 Étape 5: Migration des StandaloneShoppingItem");
    const standaloneItemsToMigrate = await db.standaloneShoppingItem.findMany({
      where: {
        store: { not: null },
        storeId: null,
      },
      select: { id: true, store: true },
    });

    console.log(`  📊 ${standaloneItemsToMigrate.length} items à migrer`);

    let migratedStandaloneItems = 0;
    for (const item of standaloneItemsToMigrate) {
      if (!item.store) continue;

      const storeRecord = await db.store.findUnique({
        where: { name: item.store },
      });

      if (storeRecord) {
        await db.standaloneShoppingItem.update({
          where: { id: item.id },
          data: { storeId: storeRecord.id },
        });
        migratedStandaloneItems++;
      } else {
        console.log(`  ⚠️  Enseigne introuvable pour l'item ${item.id}: "${item.store}"`);
      }
    }
    console.log(`  ✅ ${migratedStandaloneItems} StandaloneShoppingItem migrés`);

    // 6. Statistiques finales
    console.log("\n📊 Statistiques finales:");
    const totalStores = await db.store.count();
    const itemsWithStoreId = await db.shoppingListItem.count({
      where: { storeId: { not: null } },
    });
    const standaloneItemsWithStoreId = await db.standaloneShoppingItem.count({
      where: { storeId: { not: null } },
    });

    console.log(`  🏪 Enseignes en base: ${totalStores}`);
    console.log(`  📦 ShoppingListItem avec enseigne: ${itemsWithStoreId}`);
    console.log(`  📦 StandaloneShoppingItem avec enseigne: ${standaloneItemsWithStoreId}`);

    console.log("\n✅ Migration terminée avec succès!");
  } catch (error) {
    console.error("\n❌ Erreur lors de la migration:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Exécuter le script
migrateStores()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
