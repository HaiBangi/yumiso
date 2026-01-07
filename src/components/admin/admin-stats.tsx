"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, ChefHat, MessageSquare, Calendar, Star, Eye, BookOpen, Sparkles, Heart, Lock, Globe } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';

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
  // Données pour le graphique en camembert des rôles d'utilisateurs
  const userRolesData = [
    { name: 'Owners', value: stats.users.owners, color: '#a855f7' },
    { name: 'Admins', value: stats.users.admins, color: '#ef4444' },
    { name: 'Contributeurs', value: stats.users.contributors, color: '#f59e0b' },
    { name: 'Lecteurs', value: stats.users.readers, color: '#9ca3af' },
  ];

  // Données pour le graphique des recettes publiques vs privées
  const recipesVisibilityData = [
    { name: 'Publiques', value: stats.recipes.public, color: '#10b981' },
    { name: 'Privées', value: stats.recipes.private, color: '#6b7280' },
  ];

  // Données pour le graphique d'engagement
  const engagementData = [
    { name: 'Commentaires', value: stats.engagement.totalComments, color: '#06b6d4' },
    { name: 'Favoris', value: stats.engagement.totalFavorites, color: '#ec4899' },
    { name: 'Collections', value: stats.collections.total, color: '#8b5cf6' },
  ];

  // Données pour l'activité
  const activityData = [
    { name: "Aujourd'hui", actions: stats.activity.logsToday },
    { name: 'Cette semaine', actions: stats.activity.logsThisWeek },
    { name: 'Total', actions: stats.activity.totalLogs },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Vue d'ensemble - Grandes cartes KPI */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-10 w-10 opacity-80" />
              <TrendingUp className="h-6 w-6 opacity-60" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium opacity-90">Total Utilisateurs</p>
              <p className="text-5xl font-bold">{stats.users.total}</p>
              <p className="text-xs opacity-75">+{stats.users.newThisMonth} ce mois</p>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <ChefHat className="h-10 w-10 opacity-80" />
              <Sparkles className="h-6 w-6 opacity-60" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium opacity-90">Total Recettes</p>
              <p className="text-5xl font-bold">{stats.recipes.total}</p>
              <p className="text-xs opacity-75">+{stats.recipes.thisMonth} ce mois</p>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Star className="h-10 w-10 opacity-80" />
              <Star className="h-6 w-6 opacity-60 fill-current" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium opacity-90">Note Moyenne</p>
              <p className="text-5xl font-bold">{stats.recipes.avgRating.toFixed(1)}</p>
              <p className="text-xs opacity-75">sur 10</p>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Eye className="h-10 w-10 opacity-80" />
              <TrendingUp className="h-6 w-6 opacity-60" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium opacity-90">Vues Totales</p>
              <p className="text-5xl font-bold">{(stats.recipes.totalViews / 1000).toFixed(1)}K</p>
              <p className="text-xs opacity-75">Toutes recettes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques principaux */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Graphique en camembert - Répartition des utilisateurs */}
        <Card className="dark:bg-stone-800/90 dark:border-stone-700 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
              <Users className="h-5 w-5" />
              Répartition des Utilisateurs par Rôle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userRolesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {userRolesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {userRolesData.map((role) => (
                <div key={role.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                  <span className="text-sm text-stone-600 dark:text-stone-400">{role.name}: </span>
                  <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{role.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Graphique en camembert - Recettes publiques vs privées */}
        <Card className="dark:bg-stone-800/90 dark:border-stone-700 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
              <ChefHat className="h-5 w-5" />
              Visibilité des Recettes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={recipesVisibilityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name} ${value} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {recipesVisibilityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-green-600" />
                <span className="text-sm text-stone-600 dark:text-stone-400">Publiques: </span>
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{stats.recipes.public}</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-stone-600 dark:text-stone-400">Privées: </span>
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{stats.recipes.private}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphique à barres - Engagement */}
      <Card className="dark:bg-stone-800/90 dark:border-stone-700 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
            <MessageSquare className="h-5 w-5" />
            Engagement des Utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200 dark:stroke-stone-700" />
                <XAxis dataKey="name" className="text-sm" />
                <YAxis className="text-sm" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {engagementData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-cyan-50 dark:bg-cyan-950/20">
              <MessageSquare className="h-6 w-6 mx-auto mb-2 text-cyan-600" />
              <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{stats.engagement.totalComments}</p>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">Commentaires</p>
              <p className="text-xs text-stone-500 dark:text-stone-500 mt-0.5">
                Moy. {stats.engagement.avgCommentsPerRecipe.toFixed(1)}/recette
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-pink-50 dark:bg-pink-950/20">
              <Heart className="h-6 w-6 mx-auto mb-2 text-pink-600" />
              <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{stats.engagement.totalFavorites}</p>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">Favoris</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-violet-50 dark:bg-violet-950/20">
              <BookOpen className="h-6 w-6 mx-auto mb-2 text-violet-600" />
              <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{stats.collections.total}</p>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">Collections</p>
              <p className="text-xs text-stone-500 dark:text-stone-500 mt-0.5">
                Moy. {stats.collections.avgRecipesPerCollection.toFixed(1)} recettes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Graphique en ligne - Activité */}
      <Card className="dark:bg-stone-800/90 dark:border-stone-700 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
            <Calendar className="h-5 w-5" />
            Activité du Site
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-stone-200 dark:stroke-stone-700" />
                <XAxis dataKey="name" className="text-sm" />
                <YAxis className="text-sm" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actions"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
