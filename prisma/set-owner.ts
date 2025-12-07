import { db } from "../src/lib/db";

async function setOwnerRole() {
  const ownerEmail = "ngmich95@gmail.com";
  
  console.log(`🔍 Recherche de l'utilisateur ${ownerEmail}...`);
  
  const user = await db.user.findUnique({
    where: { email: ownerEmail },
  });

  if (!user) {
    console.log(`❌ Utilisateur ${ownerEmail} non trouvé`);
    return;
  }

  console.log(`✅ Utilisateur trouvé: ${user.name} (${user.email})`);
  console.log(`📝 Rôle actuel: ${user.role}`);

  const updated = await db.user.update({
    where: { email: ownerEmail },
    data: { role: "OWNER" },
  });

  console.log(`✅ Rôle mis à jour: ${updated.role}`);
  console.log(`👑 ${updated.name} est maintenant OWNER!`);
}

setOwnerRole()
  .then(() => {
    console.log("✅ Script terminé avec succès");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erreur:", error);
    process.exit(1);
  });
