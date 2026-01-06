"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, ChefHat, MessageSquare, Calendar, Star, Eye, BookOpen, Sparkles, Heart } from "lucide-react";

interface StatsData {
  users: {
    total: number;
    owners: number;
    admins: number;
    contributors: number;
    readers: number;
    newThisMonth: number;
  };
  recipes: {
    total: number;
    public: number;
    private: number;
    avgRating: number;
    totalViews: number;
    thisMonth: number;
  };
  engagement: {
    totalComments: number;
    avgCommentsPerRecipe: number;
    totalFavorites: number;
  };
  collections: {
    total: number;
    avgRecipesPerCollection: number;
  };
  activity: {
    totalLogs: number;
    logsToday: number;
    logsThisWeek: number;
  };
}

interface AdminStatsProps {
  stats: StatsData;
}

export function AdminStats({ stats }: AdminStatsProps) {
  return (
    <div className="space-y-8 pb-8">
      {/* Users Section */}
      <div className="pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30">
            <Users className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">Utilisateurs</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-4xl font-bold bg-gradient-to-br from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {stats.users.total}
              </div>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +{stats.users.newThisMonth} ce mois
              </p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Par rôle</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    Owners
                  </span>
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{stats.users.owners}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    Admins
                  </span>
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{stats.users.admins}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    Contributeurs
                  </span>
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{stats.users.contributors}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    Lecteurs
                  </span>
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{stats.users.readers}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-green-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Nouveaux
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-4xl font-bold bg-gradient-to-br from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {stats.users.newThisMonth}
              </div>
              <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-2">Ce mois-ci</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recipes Section */}
      <div className="pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/30">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">Recettes</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Total</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-4xl font-bold bg-gradient-to-br from-orange-600 to-red-600 bg-clip-text text-transparent">
                {stats.recipes.total}
              </div>
              <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +{stats.recipes.thisMonth} ce mois
              </p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-teal-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-teal-700 dark:text-teal-300">Visibilité</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Publiques
                  </span>
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{stats.recipes.public}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    Privées
                  </span>
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{stats.recipes.private}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Star className="h-3.5 w-3.5" />
                Note moyenne
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-4xl font-bold bg-gradient-to-br from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                {stats.recipes.avgRating.toFixed(1)}
              </div>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-2">sur 10</p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                <Eye className="h-3.5 w-3.5" />
                Vues totales
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-4xl font-bold bg-gradient-to-br from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                {stats.recipes.totalViews.toLocaleString()}
              </div>
              <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-2">Toutes recettes</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Engagement Section */}
      <div className="pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-pink-500/30">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">Engagement</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-cyan-700 dark:text-cyan-300 flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" />
                Commentaires
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-4xl font-bold bg-gradient-to-br from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                {stats.engagement.totalComments}
              </div>
              <p className="text-xs text-cyan-600/70 dark:text-cyan-400/70 mt-2">
                Moy. {stats.engagement.avgCommentsPerRecipe.toFixed(1)} par recette
              </p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-rose-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <Heart className="h-3.5 w-3.5" />
                Favoris
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-4xl font-bold bg-gradient-to-br from-rose-600 to-pink-600 bg-clip-text text-transparent">
                {stats.engagement.totalFavorites}
              </div>
              <p className="text-xs text-rose-600/70 dark:text-rose-400/70 mt-2">Recettes favorites</p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-violet-700 dark:text-violet-300 flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" />
                Collections
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-4xl font-bold bg-gradient-to-br from-violet-600 to-purple-600 bg-clip-text text-transparent">
                {stats.collections.total}
              </div>
              <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-2">
                Moy. {stats.collections.avgRecipesPerCollection.toFixed(1)} recettes
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Section */}
      <div className="pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">Activité récente</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-950/20 dark:to-green-950/20 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-lime-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-lime-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-lime-700 dark:text-lime-300 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                Aujourd&apos;hui
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-4xl font-bold bg-gradient-to-br from-lime-600 to-green-600 bg-clip-text text-transparent">
                {stats.activity.logsToday}
              </div>
              <p className="text-xs text-lime-600/70 dark:text-lime-400/70 mt-2">Actions</p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/20 dark:to-indigo-950/20 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-sky-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-sky-700 dark:text-sky-300 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Cette semaine
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-4xl font-bold bg-gradient-to-br from-sky-600 to-indigo-600 bg-clip-text text-transparent">
                {stats.activity.logsThisWeek}
              </div>
              <p className="text-xs text-sky-600/70 dark:text-sky-400/70 mt-2">Actions</p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-zinc-50 dark:from-slate-950/20 dark:to-zinc-950/20 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-slate-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Total</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-4xl font-bold bg-gradient-to-br from-slate-700 to-zinc-700 dark:from-slate-300 dark:to-zinc-300 bg-clip-text text-transparent">
                {stats.activity.totalLogs}
              </div>
              <p className="text-xs text-slate-600/70 dark:text-slate-400/70 mt-2">Actions enregistrées</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
