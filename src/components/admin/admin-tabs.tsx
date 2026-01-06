"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Users, ChefHat, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRoleManager } from "@/components/admin/user-role-manager";
import { ActivityLogsViewer } from "@/components/admin/activity-logs-viewer";

interface AdminTabsProps {
  initialTab: string;
  stats: {
    totalUsers: number;
    owners: number;
    admins: number;
    contributors: number;
    readers: number;
    totalRecipes: number;
  };
  users: any[];
  currentUserId: string;
  isOwner: boolean;
  logs: any[];
  pagination: any;
}

export function AdminTabs({
  initialTab,
  stats,
  users,
  currentUserId,
  isOwner,
  logs,
  pagination,
}: AdminTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`/admin?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <section className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-2">Administration</h1>
          <p className="text-muted-foreground">Gérez les utilisateurs et surveillez l&apos;activité du site</p>
        </div>

        {/* Onglets */}
        <Tabs value={initialTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              Statistiques
            </TabsTrigger>
          </TabsList>

          {/* Onglet Historique (par défaut) */}
          <TabsContent value="logs">
            <ActivityLogsViewer initialLogs={logs} initialPagination={pagination} />
          </TabsContent>

          {/* Onglet Utilisateurs */}
          <TabsContent value="users">
            <Card className="pb-6 dark:bg-stone-800/90 dark:border-stone-700">
              <CardHeader className="pb-4">
                <CardTitle className="text-stone-900 dark:text-stone-100">Gestion des utilisateurs</CardTitle>
                <CardDescription className="dark:text-stone-400">
                  Modifiez les rôles des utilisateurs pour contrôler leurs permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <UserRoleManager users={users} currentUserId={currentUserId} isOwner={isOwner} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Statistiques */}
          <TabsContent value="stats">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="pb-4 dark:bg-stone-800/90 dark:border-stone-700">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Utilisateurs</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="text-3xl font-bold text-stone-900 dark:text-stone-100">{stats.totalUsers}</div>
                </CardContent>
              </Card>

              <Card className="pb-4 dark:bg-stone-800/90 dark:border-stone-700">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Recettes</CardTitle>
                  <ChefHat className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="text-3xl font-bold text-stone-900 dark:text-stone-100">{stats.totalRecipes}</div>
                </CardContent>
              </Card>

              <Card className="pb-4 dark:bg-stone-800/90 dark:border-stone-700">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Contributeurs</CardTitle>
                  <ChefHat className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.contributors}</div>
                </CardContent>
              </Card>

              <Card className="pb-4 dark:bg-stone-800/90 dark:border-stone-700">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
                  <Shield className="h-4 w-4 text-red-500 dark:text-red-400" />
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.admins}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
