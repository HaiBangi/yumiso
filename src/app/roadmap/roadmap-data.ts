export type IconName =
  | "CheckCircle2"
  | "Clock"
  | "Lightbulb"
  | "Sparkles"
  | "Users"
  | "Shield"
  | "Zap"
  | "Heart"
  | "Search"
  | "Share2"
  | "MessageSquare"
  | "TrendingUp"
  | "Award"
  | "BookOpen"
  | "ChefHat"
  | "Calendar"
  | "Target"
  | "Eye";

export interface Feature {
  title: string;
  description: string;
  icon: IconName;
  priority: "high" | "medium" | "low";
}

export interface RoadmapSection {
  status: "completed" | "in-progress" | "planned" | "ideas";
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: IconName;
  features: Feature[];
}

export const roadmapData: RoadmapSection[] = [
  {
    status: "in-progress",
    title: "🚧 En cours",
    subtitle: "Fonctionnalités en développement actif",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: "Clock",
    features: [
      {
        title: "Optimisation des performances",
        description: "Amélioration du temps de chargement et de la réactivité générale",
        icon: "Zap",
        priority: "high"
      },
      {
        title: "Ajustements UX formulaires",
        description: "Perfectionnement de l'expérience utilisateur sur les formulaires",
        icon: "Target",
        priority: "high"
      }
    ]
  },
  {
    status: "planned",
    title: "📅 Prévues",
    subtitle: "Prochaines fonctionnalités confirmées",
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: "Calendar",
    features: [
      {
        title: "Commentaires sur recettes",
        description: "Système de commentaires avec mentions et réponses imbriquées",
        icon: "MessageSquare",
        priority: "high"
      },
      {
        title: "Notes et évaluations",
        description: "Notation des recettes par les utilisateurs avec moyenne affichée",
        icon: "Award",
        priority: "high"
      },
      {
        title: "Partage social",
        description: "Partage sur Facebook, Twitter, Pinterest avec preview cards",
        icon: "Share2",
        priority: "medium"
      },
      {
        title: "Collections personnalisées",
        description: "Création de collections de recettes thématiques par l'utilisateur",
        icon: "BookOpen",
        priority: "medium"
      },
      {
        title: "Import de recettes",
        description: "Import depuis URL (parsing automatique) ou fichiers texte",
        icon: "TrendingUp",
        priority: "medium"
      },
      {
        title: "Profils utilisateurs enrichis",
        description: "Page profil avec statistiques, badges, recettes populaires",
        icon: "Users",
        priority: "low"
      }
    ]
  },
  {
    status: "ideas",
    title: "💡 Idées",
    subtitle: "Concepts à explorer et valider",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    borderColor: "border-purple-200 dark:border-purple-800",
    icon: "Lightbulb",
    features: [
      {
        title: "IA pour suggestions",
        description: "Suggestions de recettes basées sur les ingrédients disponibles",
        icon: "Sparkles",
        priority: "high"
      },
      {
        title: "Planificateur de repas",
        description: "Planification hebdomadaire des repas avec liste de courses auto-générée",
        icon: "Calendar",
        priority: "high"
      },
      {
        title: "Mode hors-ligne",
        description: "PWA avec synchronisation pour accès sans connexion",
        icon: "Zap",
        priority: "medium"
      },
      {
        title: "Conversion d'unités intelligente",
        description: "Conversion automatique entre systèmes métrique/impérial",
        icon: "Target",
        priority: "low"
      },
      {
        title: "Nutritional info automatique",
        description: "Calcul automatique des valeurs nutritionnelles par ingrédient",
        icon: "Heart",
        priority: "medium"
      },
      {
        title: "Mode cuisson guidé",
        description: "Chronomètres intégrés et instructions pas-à-pas interactives",
        icon: "ChefHat",
        priority: "medium"
      },
      {
        title: "Communauté et suivis",
        description: "Système de followers, feed d'activités, notifications",
        icon: "Users",
        priority: "low"
      },
      {
        title: "API publique",
        description: "API REST pour intégrations tierces et applications mobiles",
        icon: "TrendingUp",
        priority: "low"
      }
    ]
  },
  {
    status: "completed",
    title: "✅ Terminées",
    subtitle: "Fonctionnalités déployées en production",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950",
    borderColor: "border-green-200 dark:border-green-800",
    icon: "CheckCircle2",
    features: [
      {
        title: "Système d'authentification",
        description: "Connexion Google et gestion des sessions sécurisée",
        icon: "Shield",
        priority: "high"
      },
      {
        title: "CRUD Recettes complet",
        description: "Création, lecture, modification et suppression de recettes",
        icon: "ChefHat",
        priority: "high"
      },
      {
        title: "Filtres et recherche avancés",
        description: "Filtrage par catégorie, tags, temps, et recherche full-text",
        icon: "Search",
        priority: "high"
      },
      {
        title: "Système de favoris",
        description: "Sauvegarde et gestion des recettes favorites par utilisateur",
        icon: "Heart",
        priority: "medium"
      },
      {
        title: "Mode administration",
        description: "Interface admin pour la gestion des utilisateurs et des recettes",
        icon: "Shield",
        priority: "high"
      },
      {
        title: "Design System vert",
        description: "Refonte complète de l'identité visuelle avec couleurs émeraude",
        icon: "Sparkles",
        priority: "medium"
      },
      {
        title: "Responsive mobile optimisé",
        description: "Expérience mobile parfaite avec bottom sheets et interfaces adaptées",
        icon: "Eye",
        priority: "high"
      },
      {
        title: "Dark mode",
        description: "Thème sombre complet avec transitions fluides",
        icon: "Zap",
        priority: "medium"
      }
    ]
  }
];

export const priorityBadges = {
  high: { label: "Haute", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  medium: { label: "Moyenne", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  low: { label: "Basse", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" }
};

