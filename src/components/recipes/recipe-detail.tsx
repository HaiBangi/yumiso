"use client";

import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { Clock, Users, Star, Play, Coins, Flame, MoreVertical, Share2, Download, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecipeImage } from "./recipe-image";
import { EditRecipeButton } from "./edit-recipe-button";
import { DeleteRecipeButton } from "./delete-recipe-button";
import { RecipeComments } from "./recipe-comments";
import { IngredientsCard } from "./ingredients-card";
import { ShareButtons } from "./share-buttons";
import { ExportPdfButton } from "./export-pdf-button";
import { PersonalNote } from "./personal-note";
import { AddToCollection } from "./add-to-collection";
import { RecipeSteps } from "./recipe-steps";
import Link from "next/link";
import type { Recipe } from "@/types/recipe";

interface Comment {
  id: number;
  text: string;
  rating: number | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    pseudo: string;
    image: string | null;
  };
}

interface Collection {
  id: number;
  name: string;
  color: string;
  recipes: { id: number }[];
}

interface RecipeWithUserId extends Recipe {
  userId?: string | null;
}

interface RecipeDetailProps {
  recipe: RecipeWithUserId;
  canEdit?: boolean;
  comments?: Comment[];
  userNote?: string | null;
  collections?: Collection[];
  isAuthenticated?: boolean;
}

const categoryLabels: Record<string, string> = {
  MAIN_DISH: "Plat principal",
  STARTER: "Entrée",
  DESSERT: "Dessert",
  SIDE_DISH: "Accompagnement",
  SOUP: "Soupe",
  SALAD: "Salade",
  BEVERAGE: "Boisson",
  SNACK: "En-cas",
};

const costLabels: Record<string, { label: string; emoji: string; color: string }> = {
  CHEAP: { label: "Économique", emoji: "€", color: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40" },
  MEDIUM: { label: "Moyen", emoji: "€€", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40" },
  EXPENSIVE: { label: "Cher", emoji: "€€€", color: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40" },
};

export function RecipeDetail({
  recipe,
  canEdit = false,
  comments = [],
  userNote,
  collections = [],
  isAuthenticated = false,
}: RecipeDetailProps) {
  console.log("[RecipeDetail] canEdit prop received:", canEdit);
  const [showToast, setShowToast] = useState(false);
  const editButtonRef = useRef<HTMLDivElement>(null);
  const deleteButtonRef = useRef<HTMLDivElement>(null);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowToast(true);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleExportPDF = () => {
    const pdfButton = document.querySelector('[data-export-pdf]') as HTMLButtonElement;
    if (pdfButton) pdfButton.click();
  };

  const handleEditRecipe = () => {
    const button = editButtonRef.current?.querySelector('button');
    if (button) button.click();
  };

  const handleDeleteRecipe = () => {
    const button = deleteButtonRef.current?.querySelector('button');
    if (button) button.click();
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 pb-8">
      {/* Hero Section */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 md:px-8 py-4">
        {/* Mobile: Image seule */}
        <div className="lg:hidden relative h-[250px] sm:h-[300px] w-full overflow-hidden rounded-2xl bg-stone-900 shadow-xl">
          <RecipeImage
            src={recipe.imageUrl}
            alt={recipe.name}
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1536px) 1536px, 100vw"
            className="object-cover opacity-80"
            iconSize="lg"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Mobile: Dropdown Menu - Top Right */}
          <div className="sm:hidden absolute top-3 right-3 z-20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/90 hover:bg-white text-stone-700 border-0 backdrop-blur-sm shadow-lg h-9 w-9 p-0"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {canEdit && (
                  <>
                    <DropdownMenuItem onClick={handleEditRecipe} className="cursor-pointer">
                      <Edit className="h-4 w-4 mr-2 text-amber-700 dark:text-amber-500" />
                      <span className="text-amber-700 dark:text-amber-500">Modifier</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDeleteRecipe} className="cursor-pointer">
                      <Trash2 className="h-4 w-4 mr-2 text-rose-700 dark:text-rose-400" />
                      <span className="text-rose-700 dark:text-rose-400">Supprimer</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {recipe.videoUrl && (
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <a href={recipe.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                      <Play className="h-4 w-4 mr-2 text-red-700 dark:text-red-400" />
                      <span className="text-red-700 dark:text-red-400">Voir la vidéo</span>
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                  <Download className="h-4 w-4 mr-2 text-purple-700 dark:text-purple-400" />
                  <span className="text-purple-700 dark:text-purple-400">Télécharger PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={copyToClipboard} className="cursor-pointer">
                  <Share2 className="h-4 w-4 mr-2 text-blue-700 dark:text-blue-400" />
                  <span className="text-blue-700 dark:text-blue-400">Partager</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Boutons invisibles pour Edit et Delete - utilisés par le dropdown mobile */}
            {canEdit && (
              <>
                <div ref={editButtonRef} className="hidden">
                  <EditRecipeButton recipe={recipe} />
                </div>
                <div ref={deleteButtonRef} className="hidden">
                  <DeleteRecipeButton recipeId={recipe.id} recipeName={recipe.name} />
                </div>
              </>
            )}
          </div>

          {/* Desktop: Edit/Delete Buttons - Top Right */}
          {canEdit && (
            <div className="hidden sm:flex absolute top-3 right-3 gap-2 z-20">
              <EditRecipeButton recipe={recipe} />
              <DeleteRecipeButton recipeId={recipe.id} recipeName={recipe.name} />
            </div>
          )}

          {/* Tags - Top Left - MASQUÉ SUR MOBILE */}
          <div className={`hidden sm:flex absolute top-3 left-3 flex-wrap gap-2 z-10 ${canEdit ? 'max-w-[calc(100%-140px)] sm:max-w-none' : 'max-w-[calc(100%-20px)]'}`}>
            <Badge className="bg-emerald-700/90 hover:bg-emerald-600 text-white border-0 backdrop-blur-sm shadow-lg">
              {categoryLabels[recipe.category] || recipe.category}
            </Badge>
            {recipe.tags && recipe.tags.length > 0 && recipe.tags.map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="bg-white/90 text-stone-700 border-0 backdrop-blur-sm shadow-lg"
              >
                {tag}
              </Badge>
            ))}
          </div>

          {/* Video/Share/PDF Buttons - Desktop Only - Bottom Right */}
          <div className="hidden sm:flex absolute bottom-3 right-3 gap-2 z-10">
            <ShareButtons title={`${recipe.name} - Yumiso`} />
            <ExportPdfButton recipe={recipe} />
            {recipe.videoUrl && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="cursor-pointer bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 shadow-lg"
              >
                <a href={recipe.videoUrl} target="_blank" rel="noopener noreferrer">
                  <Play className="h-4 w-4 sm:mr-2 fill-white" />
                  <span className="hidden sm:inline">Vidéo</span>
                </a>
              </Button>
            )}
          </div>

          {/* Title Overlay - Bottom Left */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <h1 className="font-serif text-xl sm:text-3xl md:text-4xl font-bold text-white mb-0.5 sm:mb-1 leading-tight">
              {recipe.name}
            </h1>
            <p className="text-white/80 text-xs sm:text-lg italic">
              {recipe.userId ? (
                <Link
                  href={`/users/${recipe.userId}`}
                  className="hover:text-white hover:underline transition-colors"
                >
                  {recipe.author}
                </Link>
              ) : (
                recipe.author
              )}
            </p>
          </div>
        </div>

        {/* Desktop: Image 85% + Stats 15% côte à côte */}
        <div className="hidden lg:flex gap-4 h-[300px]">
          {/* Image 85% */}
          <div className="relative w-[85%] overflow-hidden rounded-2xl bg-stone-900 shadow-xl">
            <RecipeImage
              src={recipe.imageUrl}
              alt={recipe.name}
              priority
              sizes="(min-width: 1024px) 87vw, 100vw"
              className="object-cover opacity-80"
              iconSize="lg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            {/* Edit/Delete Buttons - Top Right */}
            {canEdit && (
              <div className="absolute top-3 right-3 flex gap-2 z-20">
                <EditRecipeButton recipe={recipe} />
                <DeleteRecipeButton recipeId={recipe.id} recipeName={recipe.name} />
              </div>
            )}

            {/* Tags - Top Left */}
            <div className={`absolute top-3 left-3 flex flex-wrap gap-2 z-10 ${canEdit ? 'max-w-[calc(100%-140px)]' : 'max-w-[calc(100%-20px)]'}`}>
              <Badge className="bg-emerald-700/90 hover:bg-emerald-600 text-white border-0 backdrop-blur-sm shadow-lg">
                {categoryLabels[recipe.category] || recipe.category}
              </Badge>
              {recipe.tags && recipe.tags.length > 0 && recipe.tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-white/90 text-stone-700 border-0 backdrop-blur-sm shadow-lg"
                >
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Author - Bottom Left */}
            <div className="absolute bottom-14 left-6 z-10">
              <p className="text-white/80 text-base italic">
                {recipe.userId ? (
                  <Link
                    href={`/users/${recipe.userId}`}
                    className="hover:text-white hover:underline transition-colors"
                  >
                    {recipe.author}
                  </Link>
                ) : (
                  recipe.author
                )}
              </p>
            </div>

            {/* Collections & Notes & Share/PDF/Video - Bottom Right */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
              {isAuthenticated && (
                <>
                  <AddToCollection recipeId={recipe.id} collections={collections} />
                  <PersonalNote recipeId={recipe.id} initialNote={userNote} />
                </>
              )}
              <ShareButtons title={`${recipe.name} - Yumiso`} />
              <ExportPdfButton recipe={recipe} />
              {recipe.videoUrl && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="cursor-pointer bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 shadow-lg"
                >
                  <a href={recipe.videoUrl} target="_blank" rel="noopener noreferrer">
                    <Play className="h-4 w-4 sm:mr-2 fill-white" />
                    <span className="hidden sm:inline">Vidéo</span>
                  </a>
                </Button>
              )}
            </div>

            {/* Title Overlay - Bottom Left (au-dessus de l'auteur) */}
            <div className="absolute bottom-0 left-0 right-0 p-6 pb-[72px]">
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                {recipe.name}
              </h1>
            </div>
          </div>

          {/* Stats 15% - 6 rows verticales */}
          <div className="w-[15%] flex flex-col gap-1.5 p-3 rounded-2xl bg-white/80 dark:bg-stone-800/90 backdrop-blur-sm border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
            {/* Row 1: Préparation */}
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex-shrink-0">
                <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Préparation</p>
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{recipe.preparationTime} min</p>
              </div>
            </div>
            
            {/* Row 2: Cuisson */}
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/40 flex-shrink-0">
                <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Cuisson</p>
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{recipe.cookingTime} min</p>
              </div>
            </div>
            
            {/* Row 3: Personnes */}
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex-shrink-0">
                <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Personnes</p>
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{recipe.servings} pers.</p>
              </div>
            </div>
            
            {/* Row 4: Coût */}
            {recipe.costEstimate && costLabels[recipe.costEstimate] && (
              <div className="flex items-center gap-1.5">
                <div className={`p-1.5 rounded-full flex-shrink-0 ${costLabels[recipe.costEstimate].color.split(' ').slice(1).join(' ')}`}>
                  <Coins className={`h-4 w-4 ${costLabels[recipe.costEstimate].color.split(' ')[0]}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Coût</p>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{costLabels[recipe.costEstimate].emoji} {costLabels[recipe.costEstimate].label}</p>
                </div>
              </div>
            )}
            
            {/* Row 5: Calories */}
            {recipe.caloriesPerServing && (
              <div className="flex items-center gap-1.5">
                <div className="p-1.5 rounded-full bg-orange-100 dark:bg-orange-900/40 flex-shrink-0">
                  <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Calories</p>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{recipe.caloriesPerServing} kcal/pers.</p>
                </div>
              </div>
            )}
            
            {/* Row 6: Note */}
            {recipe.rating > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="p-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex-shrink-0">
                  <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400 fill-yellow-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Note</p>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{recipe.rating.toFixed(1)}/10</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        {/* Stats Bar - MASQUÉ SUR DESKTOP (lg+) car maintenant à côté de l'image */}
        <div className="lg:hidden grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 p-4 sm:p-6 rounded-2xl bg-white/80 dark:bg-stone-800/90 backdrop-blur-sm border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                Préparation
              </p>
              <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                {recipe.preparationTime} min
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/40">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                Cuisson
              </p>
              <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                {recipe.cookingTime} min
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                Personnes
              </p>
              <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                {recipe.servings} pers.
              </p>
            </div>
          </div>
          {recipe.costEstimate && costLabels[recipe.costEstimate] && (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-2 rounded-full ${costLabels[recipe.costEstimate].color.split(' ').slice(1).join(' ')}`}>
                <Coins className={`h-4 w-4 sm:h-5 sm:w-5 ${costLabels[recipe.costEstimate].color.split(' ')[0]} ${costLabels[recipe.costEstimate].color.split(' ')[1] || ''}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                  Coût
                </p>
                <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                  {costLabels[recipe.costEstimate].emoji} {costLabels[recipe.costEstimate].label}
                </p>
              </div>
            </div>
          )}
          {recipe.caloriesPerServing && (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/40">
                <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                  Calories
                </p>
                <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                  {recipe.caloriesPerServing} kcal/pers.
                </p>
              </div>
            </div>
          )}
          {recipe.rating > 0 && (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/40">
                <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                  Note
                </p>
                <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                  {recipe.rating.toFixed(1)}/10
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {recipe.description && (
          <p className="text-base sm:text-lg text-stone-600 dark:text-stone-300 mb-6 sm:mb-8 leading-relaxed">
            {recipe.description}
          </p>
        )}

        <div className="grid gap-4 sm:gap-6 md:grid-cols-5">
          {/* Ingredients with Portion Adjuster */}
          <IngredientsCard
            ingredients={recipe.ingredients}
            ingredientGroups={recipe.ingredientGroups}
            recipeId={recipe.id}
            originalServings={recipe.servings}
          />

          {/* Steps */}
          <RecipeSteps steps={recipe.steps} />
        </div>

        {/* Comments Section */}
        <div className="mt-6 sm:mt-8">
          <RecipeComments recipeId={recipe.id} comments={comments} />
        </div>
      </div>

      {/* Toast notification pour le partage */}
      <Toast
        message="Lien copié dans le presse-papier !"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}