import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Old recipe structure from the JSON
interface OldIngredient {
  nom: string;
  quantite: string;
  lien_image: string | null;
}

interface OldRecipe {
  recetteId: number;
  categorie: string;
  auteur: string;
  nom: string;
  description: string;
  lien_image: string;
  lien_video: string;
  temps_preparation: string;
  temps_cuisson: string;
  temps_total: number | null;
  note: string;
  nb_personnes: number;
  liste_ingredients: OldIngredient[];
  liste_etapes: string[];
}

// Category mapping from French to English enum
const categoryMapping: Record<string, string> = {
  "Plat": "MAIN_DISH",
  "Entrée": "STARTER",
  "Dessert": "DESSERT",
  "Autres": "SNACK",
  "Accompagnement": "SIDE_DISH",
  "Soupe": "SOUP",
  "Salade": "SALAD",
  "Boisson": "BEVERAGE",
};

// Parse quantity string to extract number and unit
function parseQuantity(quantite: string): { quantity: number | null; unit: string | null } {
  if (!quantite || quantite.trim() === "") {
    return { quantity: null, unit: null };
  }

  // Common patterns: "3", "500g", "2 c.a.s", "1/2", "une grosse boite d'"
  const trimmed = quantite.trim();
  
  // Try to extract a number at the beginning
  const numberMatch = trimmed.match(/^(\d+(?:[.,]\d+)?)/);
  
  if (numberMatch) {
    const quantity = parseFloat(numberMatch[1].replace(",", "."));
    const unit = trimmed.slice(numberMatch[0].length).trim() || null;
    return { quantity, unit };
  }
  
  // Handle fractions like "1/2"
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)/);
  if (fractionMatch) {
    const quantity = parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
    const unit = trimmed.slice(fractionMatch[0].length).trim() || null;
    return { quantity, unit };
  }
  
  // If no number found, treat the whole string as unit/description
  return { quantity: null, unit: trimmed };
}

// Parse time string to integer minutes
function parseTime(time: string): number {
  if (!time || time.trim() === "") return 0;
  const parsed = parseInt(time.trim(), 10);
  return isNaN(parsed) ? 0 : parsed;
}

// Parse rating string to integer
function parseRating(note: string): number {
  if (!note || note === "?" || note.trim() === "") return 0;
  const parsed = parseFloat(note.replace(",", "."));
  return isNaN(parsed) ? 0 : Math.round(parsed);
}

// Convert old recipe to new format
function convertRecipe(old: OldRecipe) {
  const category = categoryMapping[old.categorie] || "MAIN_DISH";
  
  const ingredients = old.liste_ingredients.map((ing) => {
    const { quantity, unit } = parseQuantity(ing.quantite);
    return {
      name: ing.nom,
      quantity,
      unit,
    };
  });

  const steps = old.liste_etapes.map((text, index) => ({
    order: index + 1,
    text,
  }));

  return {
    name: old.nom,
    description: old.description || null,
    category,
    author: old.auteur,
    imageUrl: old.lien_image || null,
    videoUrl: old.lien_video || null,
    preparationTime: parseTime(old.temps_preparation),
    cookingTime: parseTime(old.temps_cuisson),
    rating: parseRating(old.note),
    servings: Math.max(1, Math.round(old.nb_personnes || 1)),
    ingredients,
    steps,
  };
}

// Old recipes data
const oldRecipes: OldRecipe[] = [
  {
    recetteId: 1,
    categorie: "Plat",
    auteur: "Mich",
    nom: "Riz cantonnais",
    description: "",
    lien_image: "https://d1e3z2jco40k3v.cloudfront.net/-/media/ducrosfr-2016/recipes/600/riz_cantonais_express_600.jpg?rev=79bd026c885e4037878079237d7de31e&vd=20200704T132111Z&hash=3018F508B737555622D130323BE59405",
    lien_video: "",
    temps_preparation: "",
    temps_cuisson: "",
    temps_total: null,
    note: "7",
    nb_personnes: 0.0,
    liste_ingredients: [],
    liste_etapes: []
  },
  {
    recetteId: 2,
    categorie: "Plat",
    auteur: "Mich",
    nom: "Médaillons de poulet citronnés",
    description: "",
    lien_image: "https://assets.afcdn.com/recipe/20200220/107966_w1024h1024c1cx1435cy2553.jpg",
    lien_video: "",
    temps_preparation: "10",
    temps_cuisson: "60",
    temps_total: null,
    note: "8",
    nb_personnes: 3.0,
    liste_ingredients: [
      { nom: "Sel, poivre", quantite: "", lien_image: null },
      { nom: "Huile d'olive", quantite: "", lien_image: null }
    ],
    liste_etapes: [
      "Couper les poitrines de poulet en médaillons (4x2 cm).",
      "Recouvrir les morceaux de farine salé et poivré.",
      "Cuire les morceaux de poulets avec l'ail jusqu'à qu'ils soient dorés des deux faces.",
      "Verser le bouillon de poulet et laisser cuire jusqu'à réduction de la sauce.",
      "Rajouter le jus de citron et laisser mijoter jusqu'à ce que la sauce s'épaississe. Si la sauce est trop liquide, rajoutez un mélange d'eau froide et de farine de tapioca.",
      "Rajouter le beurre coupé en lamelle et laisser revenir pendant 2 minutes.",
      "Servir le poulet et sa sauce avec du riz par exemple."
    ]
  },
  {
    recetteId: 3,
    categorie: "Plat",
    auteur: "Mich",
    nom: "Omelette",
    description: "",
    lien_image: "https://www.jessicagavin.com/wp-content/uploads/2020/09/how-to-make-an-omelette-american-12-1200.jpg",
    lien_video: "",
    temps_preparation: "1",
    temps_cuisson: "2",
    temps_total: null,
    note: "?",
    nb_personnes: 3.0,
    liste_ingredients: [
      { nom: "oeufs", quantite: "3", lien_image: null },
      { nom: "sel", quantite: "Une pincée de", lien_image: null },
      { nom: "Poivre", quantite: "", lien_image: null },
      { nom: "Sauce de poisson (nuoc-mâm)", quantite: "", lien_image: null },
      { nom: "Huile", quantite: "", lien_image: null }
    ],
    liste_etapes: [
      "Casser les oeufs dans un bol.",
      "Mélanger les oeufs avec du sel, du poivre, et un peu de nuoc-mâm",
      "Chauffer un peu d'huile dans une poêle à feu moyen. Verser le contenu du bol dans la poêle.",
      "Retourner l'omelette une fois que le dos est un peu doré.",
      "Servir l'omelette dans une assiette."
    ]
  },
  {
    recetteId: 4,
    categorie: "Plat",
    auteur: "Mich",
    nom: "Blanquette de veau",
    description: "",
    lien_image: "https://assets.afcdn.com/recipe/20190529/93189_w600.jpg",
    lien_video: "",
    temps_preparation: "20",
    temps_cuisson: "120",
    temps_total: null,
    note: "9",
    nb_personnes: 3.0,
    liste_ingredients: [
      { nom: "blanquette de veau", quantite: "1 kg", lien_image: null },
      { nom: "cube de bouillons de légumes", quantite: "1", lien_image: null },
      { nom: "carottes", quantite: "2", lien_image: null },
      { nom: "oignon", quantite: "1", lien_image: null },
      { nom: "champignons coupés", quantite: "250g", lien_image: null },
      { nom: "petit pot de crème fraiche", quantite: "1", lien_image: null },
      { nom: "citron", quantite: "1", lien_image: null },
      { nom: "jaune d'oeuf", quantite: "1", lien_image: null },
      { nom: "farine", quantite: "30g", lien_image: null },
      { nom: "vin blanc", quantite: "20cl", lien_image: null },
      { nom: "Sel", quantite: "", lien_image: null },
      { nom: "Poivre", quantite: "", lien_image: null }
    ],
    liste_etapes: [
      "Couper la viande en assez gros morceaux puis les faire cuire avec du beurre dans une casserole.",
      "Saupoudrer de 2 cuillères de farine. Bien remuer.",
      "Ajouter 2 ou 3 verres d'eau, les cubes de bouillon, le vin et remuer. Ajouter de l'eau si nécessaire pour couvrir.",
      "Couper les carottes en rondelles et émincer les oignons puis les incorporer à la viande, ainsi que les champignons.",
      "Laisser mijoter à feu très doux environ 1h30 à 2h00 en remuant.",
      "Si nécessaire, ajouter de l'eau de temps en temps.",
      "Dans un bol, bien mélanger la crème fraîche, le jaune d'oeuf et le jus de citron. Ajouter ce mélange au dernier moment, bien remuer et servir tout de suite."
    ]
  },
  {
    recetteId: 5,
    categorie: "Plat",
    auteur: "Mich",
    nom: "Pâtes de riz sautées au boeuf",
    description: "",
    lien_image: "https://whodoesthedishes.com/wp-content/uploads/2012/12/WDTD_KevinWong_20-600x900.jpg",
    lien_video: "https://www.youtube.com/watch?v=cFK1nDUZXpI&ab_channel=CookingWithMorgane",
    temps_preparation: "48",
    temps_cuisson: "10",
    temps_total: null,
    note: "8.5",
    nb_personnes: 4.0,
    liste_ingredients: [
      { nom: "pâtes de riz", quantite: "1kg", lien_image: null },
      { nom: "boeuf tendre", quantite: "400g", lien_image: null },
      { nom: "germes de soja", quantite: "400g", lien_image: null },
      { nom: "sauce soja foncée (pâtes)", quantite: "1 c.a.c", lien_image: null },
      { nom: "huile", quantite: "120ml", lien_image: null },
      { nom: "ciboulette", quantite: "4", lien_image: null },
      { nom: "oignon", quantite: "2", lien_image: null },
      { nom: "gousse d'ail", quantite: "2", lien_image: null },
      { nom: "sel", quantite: "1/2 c.a.c", lien_image: null },
      { nom: "alcool riz shaoxing", quantite: "1 c.a.c", lien_image: null },
      { nom: "sauce soja claire (sauce)", quantite: "2 c.a.c", lien_image: null },
      { nom: "sauce soja foncée", quantite: "1 c.a.c", lien_image: null },
      { nom: "sauce huitre", quantite: "2 c.a.c", lien_image: null }
    ],
    liste_etapes: [
      "Émincer l'ail, les oignons et les cibolettes. Découper la viande en tranches fines.",
      "Mélanger le sel, la sauce soja foncée, l'alcool de riz sauce soja claire et la sauce d'huître dans un petit bol.",
      "Cuire la viande de boeuf dans une poêle avec de l'huile à feu très vif.",
      "Mettre la viande de côté et versez l'huile dans un petit récipient.",
      "Cuire les pâtes de riz à feu très vif avec 1 c.a.c de sauce soja foncée, tout en remuant très rapidement pendant 2 minutes. Retirer les pâtes et mettre de côté.",
      "Verser l'huile de boeuf dans la même poêle, puis cuire l'ail puis les oignons. Rajouter les pâtes, la viande et la sauce préparée.",
      "Rajouter les ciboulettes et manger."
    ]
  },
  {
    recetteId: 6,
    categorie: "Plat",
    auteur: "Mich",
    nom: "Pâtes sauce coco / lardon",
    description: "",
    lien_image: "",
    lien_video: "",
    temps_preparation: "",
    temps_cuisson: "",
    temps_total: null,
    note: "?",
    nb_personnes: 4.0,
    liste_ingredients: [
      { nom: "lardons", quantite: "", lien_image: null },
      { nom: "poivrons", quantite: "", lien_image: null },
      { nom: "champignons", quantite: "", lien_image: null },
      { nom: "sauce coco", quantite: "", lien_image: null }
    ],
    liste_etapes: []
  },
  {
    recetteId: 7,
    categorie: "Plat",
    auteur: "Mich",
    nom: "Boeuf bourguignon aux carottes",
    description: "",
    lien_image: "https://www.papillesetpupilles.fr/wp-content/uploads/2017/10/Boeuf-aux-carottes-et-au-vin-rouge-a%CC%80-lautocuiseur.jpg",
    lien_video: "",
    temps_preparation: "",
    temps_cuisson: "",
    temps_total: null,
    note: "?",
    nb_personnes: 3.0,
    liste_ingredients: [],
    liste_etapes: []
  },
  {
    recetteId: 8,
    categorie: "Plat",
    auteur: "Mich",
    nom: "Tacos",
    description: "",
    lien_image: "https://i.pinimg.com/originals/3f/1b/a8/3f1ba88a8461086579ed5a51c067e021.jpg",
    lien_video: "",
    temps_preparation: "",
    temps_cuisson: "",
    temps_total: null,
    note: "?",
    nb_personnes: 0.0,
    liste_ingredients: [],
    liste_etapes: []
  },
  {
    recetteId: 9,
    categorie: "Plat",
    auteur: "Mich",
    nom: "Tomates mozzarella",
    description: "",
    lien_image: "https://www.papillesetpupilles.fr/wp-content/uploads/2015/04/Tomate-mozza-basilic.jpg",
    lien_video: "",
    temps_preparation: "",
    temps_cuisson: "",
    temps_total: null,
    note: "?",
    nb_personnes: 0.0,
    liste_ingredients: [],
    liste_etapes: []
  },
  {
    recetteId: 10,
    categorie: "Plat",
    auteur: "Mich",
    nom: "Crêpes",
    description: "",
    lien_image: "https://www.auxdelicesdupalais.net/wp-content/uploads/2020/01/DSC01406.jpg",
    lien_video: "",
    temps_preparation: "",
    temps_cuisson: "",
    temps_total: null,
    note: "?",
    nb_personnes: 0.0,
    liste_ingredients: [],
    liste_etapes: []
  },
  {
    recetteId: 11,
    categorie: "Plat",
    auteur: "Mich",
    nom: "Tofu frit",
    description: "",
    lien_image: "https://i1.wp.com/kindhealthyhappy.com/wp-content/uploads/2017/04/Tofu-Frit-et-Sauce-Soja-Coriandre-4.jpg",
    lien_video: "",
    temps_preparation: "",
    temps_cuisson: "",
    temps_total: null,
    note: "?",
    nb_personnes: 0.0,
    liste_ingredients: [],
    liste_etapes: []
  },
  {
    recetteId: 12,
    categorie: "Plat",
    auteur: "Sabry",
    nom: "Poutine",
    description: "",
    lien_image: "https://i.pinimg.com/originals/27/1d/6f/271d6f996bf8d379c263d73b67144d5e.jpg",
    lien_video: "",
    temps_preparation: "15",
    temps_cuisson: "10",
    temps_total: null,
    note: "8",
    nb_personnes: 2.0,
    liste_ingredients: [
      { nom: "Grosses pommes de terre à frites", quantite: "4", lien_image: null },
      { nom: "Fromage Gouda en grains ou Mozzarella", quantite: "300g", lien_image: null },
      { nom: "échalotes", quantite: "1", lien_image: null },
      { nom: "gousses Ail", quantite: "1", lien_image: null },
      { nom: "Sucre roux", quantite: "25g", lien_image: null },
      { nom: "Vinaigre balsamique", quantite: "2,5 cuil. à soupe", lien_image: null },
      { nom: "Beurre", quantite: "10g", lien_image: null },
      { nom: "Bouillon de volaille", quantite: "25cl", lien_image: null },
      { nom: "Petite boîte de concentré de tomates", quantite: "1/2", lien_image: null },
      { nom: "Poivre de Cayenne", quantite: "1/2 pincée", lien_image: null },
      { nom: "Clous de girofle", quantite: "1", lien_image: null },
      { nom: "Cumin", quantite: "0,5 cuil. à soupe", lien_image: null },
      { nom: "Feuilles de laurier", quantite: "1", lien_image: null },
      { nom: "Maïzena", quantite: "1,5 cuil. à soupe", lien_image: null },
      { nom: "Bain d'huile à frire", quantite: "1/2", lien_image: null },
      { nom: "Sel", quantite: "", lien_image: null },
      { nom: "Poivre", quantite: "", lien_image: null }
    ],
    liste_etapes: [
      "Préparez la sauce : pelez et émincez les échalotes et l'ail. Dans une casserole, faites fondre le sucre avec les échalotes et l'ail émincés sur feu moyen, jusqu'à ce que vous obteniez un caramel.",
      "Déglacez avec le vinaigre balsamique, ajoutez le beurre et faites réduire de moitié sur feu moyen.",
      "Versez le bouillon de volaille puis ajoutez le concentré de tomates et les épices. Mélangez et laissez mijoter 5 min.",
      "Ajoutez la Maïzena délayée dans 10 cl d'eau froide et faites épaissir 5 à 10 min sur feu doux.",
      "Pelez les pommes de terre, coupez-les en frites moyennes, lavez-les et épongez soigneusement.",
      "Faites-les frire en deux fois, une première fois à 160-170 °C, puis 2 minutes à 180-190 °C.",
      "Egouttez-les sur du papier absorbant.",
      "Servez bien chaud avec le fromage coupée et la sauce bien chaude par dessus.",
      "Et c'est prêt ! À table !"
    ]
  },
  {
    recetteId: 13,
    categorie: "Plat",
    auteur: "Futur légende",
    nom: "Kebab",
    description: "Le terme kebab ou kébab, emprunté à l'arabe : کباب, kabāb, signifie « grillade », « viande grillée » et désigne différents plats à base de viande grillée dans de nombreux pays ayant généralement fait partie des mondes ottoman et perse.",
    lien_image: "https://img.huffingtonpost.com/asset/5e690c9c230000841839f17d.jpeg?cache=m6hnJ2la6O&ops=1778_1000",
    lien_video: "",
    temps_preparation: "15",
    temps_cuisson: "15",
    temps_total: null,
    note: "9",
    nb_personnes: 1.0,
    liste_ingredients: [
      { nom: "Pain Kébab", quantite: "1", lien_image: null },
      { nom: "Salade", quantite: "1", lien_image: null },
      { nom: "Tomate", quantite: "1", lien_image: null },
      { nom: "Oignons", quantite: "1", lien_image: null },
      { nom: "Viande Kebab", quantite: "1", lien_image: null },
      { nom: "Sauces", quantite: "2", lien_image: null }
    ],
    liste_etapes: [
      "Prendre le pain et le couper en 2",
      "Mettre la mayonnaise (où vos autres sauces) et l'étaler dans le pain",
      "Couper la salade, la tomate et les oignons et les mettre dans la pain",
      "Faire cuire la viande de kebab et le mettre dans la pain"
    ]
  },
  {
    recetteId: 14,
    categorie: "Autres",
    auteur: "Mom",
    nom: "Hauts de cuisses de poulet",
    description: "",
    lien_image: "https://i.pinimg.com/originals/40/6f/dc/406fdcb611e2264dea9c20962ab27ed0.jpg",
    lien_video: "",
    temps_preparation: "20",
    temps_cuisson: "20",
    temps_total: null,
    note: "8",
    nb_personnes: 4.0,
    liste_ingredients: [
      { nom: "hauts de cuisses de poulet", quantite: "8", lien_image: null },
      { nom: "ail haché", quantite: "3", lien_image: null },
      { nom: "echalote haché", quantite: "2", lien_image: null },
      { nom: "citronnelle haché", quantite: "1", lien_image: null },
      { nom: "sauce huître", quantite: "2 c.a.s", lien_image: null },
      { nom: "sauce soja", quantite: "2 c.a.s", lien_image: null },
      { nom: "(pâte de piments avec huile de soja)", quantite: "1 c.a.c", lien_image: null },
      { nom: "miel", quantite: "1 c.a.c", lien_image: null },
      { nom: "poudre 5 parfums", quantite: "1 c.a.s", lien_image: null },
      { nom: "sucre", quantite: "pincée de", lien_image: null },
      { nom: "poivre", quantite: "", lien_image: null },
      { nom: "sel", quantite: "", lien_image: null }
    ],
    liste_etapes: [
      "3 heures avant la cuisson, marinez le poulet avec l'ail, l'échalote, la citronnelle, la sauce huître, la sauce soja, une pincée de sucre, du poivre, du miel, et de la poudre des 5 parfums.",
      "Cuire au Airfryer pendant 10 minutes de chaque côté à 190°C.",
      "Servir avec du riz ou des pâtes."
    ]
  },
  {
    recetteId: 15,
    categorie: "Entrée",
    auteur: "Mich",
    nom: "Tomates farcies",
    description: "",
    lien_image: "https://www.papillesetpupilles.fr/wp-content/uploads/2014/08/Tomates-Farcies-HD.jpg",
    lien_video: "",
    temps_preparation: "",
    temps_cuisson: "",
    temps_total: null,
    note: "?",
    nb_personnes: 3.0,
    liste_ingredients: [],
    liste_etapes: []
  },
  {
    recetteId: 16,
    categorie: "Plat",
    auteur: "Mich",
    nom: "Sauté de veau au chorizo",
    description: "",
    lien_image: "https://assets.afcdn.com/recipe/20130122/35196_w1024h1024c1cx192cy256.jpg",
    lien_video: "",
    temps_preparation: "",
    temps_cuisson: "",
    temps_total: null,
    note: "?",
    nb_personnes: 0.0,
    liste_ingredients: [],
    liste_etapes: []
  },
  {
    recetteId: 17,
    categorie: "Plat",
    auteur: "Mich",
    nom: "Loc lac",
    description: "Un loc lac vietnamien avec du riz rouge.",
    lien_image: "https://www.lidl-recettes.fr/var/site/storage/images/_aliases/960x960/3/2/1/9/89123-3-fre-FR/Loc-lac.jpg",
    lien_video: "",
    temps_preparation: "20",
    temps_cuisson: "3",
    temps_total: null,
    note: "9",
    nb_personnes: 4.0,
    liste_ingredients: [
      { nom: "Fondue ou aiguillette de boeuf", quantite: "", lien_image: null },
      { nom: "Ail (émincé)", quantite: "", lien_image: null },
      { nom: "Sucre", quantite: "", lien_image: null },
      { nom: "Poivre", quantite: "", lien_image: null },
      { nom: "Sauce maggi", quantite: "", lien_image: null },
      { nom: "Sauce huître", quantite: "", lien_image: null },
      { nom: "Farine de blé", quantite: "", lien_image: null },
      { nom: "Riz", quantite: "", lien_image: null },
      { nom: "Concentré de tomates", quantite: "", lien_image: null },
      { nom: "Huile", quantite: "", lien_image: null },
      { nom: "Sauce soja", quantite: "2 c.a.s", lien_image: null },
      { nom: "Oeufs", quantite: "", lien_image: null }
    ],
    liste_etapes: [
      "Enlever la graisse de la viande de boeuf (les parties blanches) et découper des morceaux de 2 cm².",
      "Mélanger rigoureusement les morceaux avec l'ail, le sucre, le poivre, la sauce maggi et la sauce huître.",
      "Mettre la viande dans le frigo pendant 3 heures (ou pendant la nuit).",
      "Chauffer de l'huile dans une casserole à feu moyen, et rajouter du riz.",
      "Mélanger le riz avec le concentré de tomates.",
      "Sucrer, poivrer et mettre à feu doux.",
      "Sortir la viande du frigo et recouvrir la viande de farine.",
      "Chauffer de l'huile dans une autre casserole à feu très fort.",
      "Rajouter la viande et mélanger avec la sauce soja pendant 2 minutes",
      "Récupérer la viande et server dans les assiettes avec du riz rouge.",
      "Préparer les oeufs au plat dans la même casserole et déposer sur le riz rouge."
    ]
  },
  {
    recetteId: 18,
    categorie: "Plat",
    auteur: "Mich",
    nom: "Pâtes bolognaise",
    description: "Une sauce bolognaise pour accompagner vos pâtes !",
    lien_image: "https://i-reg.unimedias.fr/sites/art-de-vivre/files/styles/recipe/public/spaghettis-bolognaise_istock.jpg?auto=compress%2Cformat&crop=faces%2Cedges&cs=srgb&fit=crop&h=500&w=393",
    lien_video: "",
    temps_preparation: "",
    temps_cuisson: "",
    temps_total: null,
    note: "?",
    nb_personnes: 3.0,
    liste_ingredients: [
      { nom: "Huile d'olive", quantite: "", lien_image: null },
      { nom: "Ail (émincés)", quantite: "", lien_image: null },
      { nom: "Oignons (émincés)", quantite: "", lien_image: null },
      { nom: "Steak haché", quantite: "", lien_image: null },
      { nom: "Sucre, sel, poivre", quantite: "", lien_image: null },
      { nom: "Champignons", quantite: "", lien_image: null },
      { nom: "Sauce huître", quantite: "", lien_image: null },
      { nom: "Sauce bolognaise", quantite: "", lien_image: null },
      { nom: "Sauce tomate", quantite: "", lien_image: null }
    ],
    liste_etapes: [
      "Émincer les gousses d'ail et l'oignon.",
      "Découper les champignons en 4 sur les 2 axes.",
      "Cuire le steak haché à feu fort avec de la sauce huître dans de l'huile d'olive jusqu'à ce qu'il prenne sa couleur.",
      "Rajouter du sucre, du sel, du poivre et mélanger avec les émincés d'ail et d'oignons.",
      "Ajouter la sauce bolognaise puis la sauce tomate. Cuire à feu doux pendant 10 minutes."
    ]
  },
  {
    recetteId: 19,
    categorie: "Plat",
    auteur: "Mich",
    nom: "Chili con carne",
    description: "",
    lien_image: "https://cookeez.fr/wp-content/uploads/2020/04/Chili-con-carne-1.jpg",
    lien_video: "",
    temps_preparation: "10",
    temps_cuisson: "25",
    temps_total: null,
    note: "9",
    nb_personnes: 4.0,
    liste_ingredients: [
      { nom: "boeuf haché", quantite: "500g", lien_image: null },
      { nom: "gousses d'ail", quantite: "2", lien_image: null },
      { nom: "Sel", quantite: "", lien_image: null },
      { nom: "cumin en poudre", quantite: "2 c.a.c", lien_image: null },
      { nom: "beurre", quantite: "50g", lien_image: null },
      { nom: "oignons", quantite: "2", lien_image: null },
      { nom: "concentré de tomates", quantite: "65g", lien_image: null },
      { nom: "haricot rouges", quantite: "une grosse boite d'", lien_image: null },
      { nom: "bouillon de boeuf", quantite: "30cl", lien_image: null },
      { nom: "Poivre", quantite: "", lien_image: null },
      { nom: "Persil", quantite: "", lien_image: null }
    ],
    liste_etapes: [
      "Hacher l'oignon et l'ail",
      "Dans une cocotte en fonte, faire fondre le beurre, et ensuite dorer doucement l'oignon et l'ail.",
      "Incorporer le boeuf haché et laisser cuire doucement 10 min.",
      "Mélanger le chili, le cumin, le concentré de tomates, et incorporer le tout au boeuf. Ajouter les haricots, le bouillon, du sel et du poivre.",
      "Couvrir."
    ]
  },
  {
    recetteId: 20,
    categorie: "Entrée",
    auteur: "Mich",
    nom: "Sauce salade / betterave",
    description: "",
    lien_image: "https://cdn.pratico-pratiques.com/app/uploads/sites/4/2018/08/30183230/salade-au-saumon-fume-et-avocat.jpeg",
    lien_video: "",
    temps_preparation: "",
    temps_cuisson: "",
    temps_total: null,
    note: "?",
    nb_personnes: 3.0,
    liste_ingredients: [
      { nom: "vinaigre de citron", quantite: "4 c.a.s", lien_image: null },
      { nom: "sauce de poisson", quantite: "2 c.a.s", lien_image: null },
      { nom: "sucre", quantite: "1 c.a.s", lien_image: null },
      { nom: "huile d'olive", quantite: "1 c.a.s", lien_image: null },
      { nom: "Salade", quantite: "", lien_image: null }
    ],
    liste_etapes: [
      "Verser le vinaigre de citron, la sauce de poisson, le sucre et l'huile d'olive dans un bol assez grand.",
      "Laver la salade et sécher dans une essoreuse à salade.",
      "Découper la salade en morceaux assez petits pour pouvoir manger.",
      "Mélanger la sauce avec la salade (ou la béterave découpée en petits cubes)."
    ]
  }
];

async function main() {
  console.log("🔄 Importing old recipes...\n");

  // Clear existing data
  await prisma.step.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.recipe.deleteMany();
  console.log("🗑️  Cleared existing data\n");

  let imported = 0;
  let skipped = 0;

  for (const oldRecipe of oldRecipes) {
    const converted = convertRecipe(oldRecipe);
    
    // Skip recipes without ingredients AND steps (incomplete)
    if (converted.ingredients.length === 0 && converted.steps.length === 0) {
      console.log(`⏭️  Skipping incomplete recipe: ${converted.name}`);
      skipped++;
      continue;
    }

    // Ensure at least one ingredient and one step
    if (converted.ingredients.length === 0) {
      converted.ingredients.push({ name: "À compléter", quantity: null, unit: null });
    }
    if (converted.steps.length === 0) {
      converted.steps.push({ order: 1, text: "À compléter" });
    }

    try {
      await prisma.recipe.create({
        data: {
          ...converted,
          ingredients: { create: converted.ingredients },
          steps: { create: converted.steps },
        },
      });
      console.log(`✅ Imported: ${converted.name}`);
      imported++;
    } catch (error) {
      console.error(`❌ Failed to import ${converted.name}:`, error);
    }
  }

  console.log(`\n🎉 Import completed! ${imported} recipes imported, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error("❌ Import failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

