# 🍳 Yumiso

Application moderne de gestion de recettes construite avec Next.js 16, proposant une interface élégante, des opérations CRUD complètes et un design responsive.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)

## ✨ Fonctionnalités

### 📖 Gestion des recettes
- ✅ **CRUD complet** - Créer, lire, modifier et supprimer des recettes
- ✅ **Ingrédients dynamiques** - Ajout/suppression d'ingrédients avec quantités et unités
- ✅ **Étapes de préparation** - Instructions numérotées et ordonnées
- ✅ **Images & Vidéos** - URLs d'images avec fallback chef, liens YouTube
- ✅ **Ajustement des portions** - Recalcul automatique des quantités d'ingrédients

### 🏷️ Organisation
- ✅ **Catégories** - Plat principal, Entrée, Dessert, Boisson, etc.
- ✅ **Tags / Mots-clés** - Système de tags avec autocomplétion (asiatique, végétarien, rapide...)
- ✅ **Filtres rapides** - Badges cliquables pour les catégories principales
- ✅ **Recherche avancée** - Par nom, description, auteur ou tags
- ✅ **Tri personnalisé** - Par date, note, temps de préparation, nom

### 🔐 Authentification & Utilisateurs
- ✅ **Google OAuth** - Connexion sécurisée avec NextAuth.js v5
- ✅ **Rôles utilisateurs** - Admin / Contributeur / Lecteur avec permissions granulaires
- ✅ **Profils personnalisés** - Pseudo modifiable, tableau de bord personnel
- ✅ **Gestion admin** - Page d'administration pour gérer les rôles des utilisateurs

### ⭐ Social & Engagement
- ✅ **Favoris** - Sauvegarder ses recettes préférées (❤️)
- ✅ **Commentaires** - Ajouter des avis avec notation étoiles
- ✅ **Partage social** - Twitter, Facebook, WhatsApp, copier le lien
- ✅ **Publication anonyme** - Option pour masquer son pseudo

### 🎨 Interface & UX
- ✅ **Design moderne** - Composants ShadCN UI avec Tailwind CSS
- ✅ **100% Responsive** - Optimisé mobile, tablette et desktop
- ✅ **Mode sombre** - Toggle thème clair/sombre/système
- ✅ **Animations fluides** - Transitions et hover states soignés
- ✅ **Loading states** - Skeletons et indicateurs de chargement

### ⚡ Performance
- ✅ **Server-side rendering** - Next.js App Router avec Server Components
- ✅ **Prisma Accelerate** - Connection pooling pour performances optimales
- ✅ **Images optimisées** - Next/Image avec lazy loading
- ✅ **Revalidation automatique** - Server actions avec cache intelligent

## 🛠️ Stack Technique

| Couche | Technologie |
|--------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Langage** | [TypeScript](https://www.typescriptlang.org/) |
| **Base de données** | [PostgreSQL](https://www.postgresql.org/) + [Prisma ORM](https://www.prisma.io/) + [Prisma Accelerate](https://www.prisma.io/data-platform/accelerate) |
| **Auth** | [NextAuth.js v5](https://authjs.dev/) (Auth.js) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Composants** | [ShadCN UI](https://ui.shadcn.com/) |
| **Validation** | [Zod](https://zod.dev/) |
| **Icônes** | [Lucide React](https://lucide.dev/) |
| **Déploiement** | [Vercel](https://vercel.com/) |

## 🚀 Démarrage rapide

### Prérequis
- [Node.js](https://nodejs.org/) 18+ 
- npm, yarn ou pnpm

### Installation

```bash
# Cloner le repo
git clone https://github.com/HaiBangi/yumiso.git
cd yumiso

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Remplir les variables dans .env.local

# Initialiser la base de données
npx prisma db push

# Lancer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) 🎉

## 📜 Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm run start` | Serveur production |
| `npm run lint` | Linter ESLint |
| `npx prisma studio` | Interface Prisma Studio |
| `npx prisma db push` | Synchroniser le schéma |

## 🗃️ Modèle de données

### Recipe (Recette)
| Champ | Type | Description |
|-------|------|-------------|
| `id` | Int | Clé primaire |
| `name` | String | Nom de la recette |
| `description` | String? | Description optionnelle |
| `category` | String | Catégorie (MAIN_DISH, DESSERT, etc.) |
| `author` | String | Auteur de la recette |
| `tags` | String[] | Mots-clés (asiatique, végétarien, etc.) |
| `imageUrl` | String? | URL de l'image |
| `videoUrl` | String? | URL de la vidéo |
| `preparationTime` | Int | Temps de préparation (min) |
| `cookingTime` | Int | Temps de cuisson (min) |
| `rating` | Int | Note 0-10 |
| `servings` | Int | Nombre de portions |
| `userId` | String? | Auteur (relation User) |

### User (Utilisateur)
| Champ | Type | Description |
|-------|------|-------------|
| `id` | String | Clé primaire (cuid) |
| `name` | String? | Nom complet |
| `pseudo` | String | Pseudo affiché |
| `email` | String | Email unique |
| `role` | Role | ADMIN / CONTRIBUTOR / READER |

## 🏷️ Catégories disponibles

| Valeur | Label |
|--------|-------|
| `MAIN_DISH` | Plat principal |
| `STARTER` | Entrée |
| `DESSERT` | Dessert |
| `SIDE_DISH` | Accompagnement |
| `SOUP` | Soupe |
| `SALAD` | Salade |
| `BEVERAGE` | Boisson |
| `SNACK` | En-cas |

## 🗺️ Roadmap

### ✅ Implémenté
- [x] CRUD complet des recettes
- [x] Authentification Google OAuth
- [x] Rôles utilisateurs (Admin/Contributeur/Lecteur)
- [x] Favoris avec coeur animé
- [x] Commentaires avec notation
- [x] Tags avec autocomplétion
- [x] Partage social (Twitter, Facebook, WhatsApp)
- [x] Mode sombre
- [x] Ajustement des portions
- [x] Profils utilisateurs personnalisés
- [x] Administration des utilisateurs

### 🔜 À venir
- [ ] PWA (installation mobile)
- [ ] Mode cuisine (écran allumé, navigation étapes)
- [ ] Liste de courses automatique
- [ ] Planificateur de repas hebdomadaire
- [ ] Import par URL (Marmiton, 750g...)
- [ ] Collections personnalisées
- [ ] Notifications (nouveaux commentaires, etc.)

---

## 📝 Licence

Ce projet est open source sous licence [MIT](LICENSE).

---

Made with ❤️ and 🍳 by the Yumiso team
