import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatTime } from "@/lib/utils";
import { ChefHat, Calendar, BookOpen, Shield, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";

interface PageProps {
  params: Promise<{ id: string }>;
}

const roleLabels = {
  OWNER: { label: "Propriétaire", icon: Shield, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/30" },
  ADMIN: { label: "Administrateur", icon: Shield, color: "text-red-500 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30" },
  CONTRIBUTOR: { label: "Contributeur", icon: ChefHat, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30" },
  READER: { label: "Lecteur", icon: UserIcon, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id }, select: { pseudo: true, name: true } });
  if (!user) return { title: "Utilisateur non trouvé | Yumiso" };
  return {
    title: `${user.pseudo || user.name || "Utilisateur"} | Yumiso`,
    description: `Découvrez les recettes de ${user.pseudo || user.name}`,
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    include: {
      _count: { select: { recipes: true } },
      recipes: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, imageUrl: true, rating: true, preparationTime: true, cookingTime: true },
      },
    },
  });

  if (!user) notFound();

  const role = roleLabels[user.role as keyof typeof roleLabels] || roleLabels.READER;
  const RoleIcon = role.icon;
  const displayName = user.pseudo || user.name || "Utilisateur";
  
  // Calculer les jours côté serveur pour éviter l'erreur d'hydratation
  // eslint-disable-next-line react-hooks/purity
  const daysSinceCreation = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const memberSinceFormatted = new Date(user.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <header className="bg-gradient-to-r from-emerald-700 to-green-600">
        <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8">
          <Link href="/recipes" className="text-white/80 hover:text-white text-sm mb-4 inline-block">← Retour aux recettes</Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-white/30">
              <AvatarImage src={user.image || ""} alt={displayName} />
              <AvatarFallback className="text-2xl bg-white text-amber-500">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{displayName}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${role.bg} ${role.color} text-sm font-medium`}>
                  <RoleIcon className="h-4 w-4" />{role.label}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
          <Card className="p-2 dark:bg-stone-800/90 dark:border-stone-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recettes publiées</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold dark:text-stone-100">{user._count.recipes}</div>
              <p className="text-xs text-muted-foreground mt-1">recettes créées</p>
            </CardContent>
          </Card>
          <Card className="p-2 dark:bg-stone-800/90 dark:border-stone-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Membre depuis</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold dark:text-stone-100">{memberSinceFormatted}</div>
              <p className="text-xs text-muted-foreground mt-1">{daysSinceCreation} jours</p>
            </CardContent>
          </Card>
        </div>
        <div className="mt-6 sm:mt-8">
          <h2 className="text-xl font-bold mb-4 dark:text-stone-100">Recettes de {displayName} ({user.recipes.length})</h2>
          {user.recipes.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {user.recipes.map((recipe) => (
                <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-700 shadow-md hover:shadow-xl transition-all">
                  {recipe.imageUrl ? (
                    <Image src={recipe.imageUrl} alt={recipe.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-emerald-400 to-green-500"><ChefHat className="h-10 w-10 text-white/50" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-medium line-clamp-2">{recipe.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-white/80 text-xs">
                      {recipe.rating > 0 && <span>⭐ {recipe.rating}/5</span>}
                      {(recipe.preparationTime > 0 || recipe.cookingTime > 0) && <span>⏱️ {formatTime(recipe.preparationTime + recipe.cookingTime)}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center dark:bg-stone-800/90 dark:border-stone-700">
              <ChefHat className="h-12 w-12 mx-auto text-stone-300 dark:text-stone-600 mb-3" />
              <p className="text-stone-500 dark:text-stone-400">{displayName} n&apos;a pas encore publié de recettes.</p>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}