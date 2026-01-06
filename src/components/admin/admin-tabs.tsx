"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Users, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRoleManager } from "@/components/admin/user-role-manager";
import { ActivityLogsViewer } from "@/components/admin/activity-logs-viewer";
import { AdminStats } from "@/components/admin/admin-stats";
import {
  AdminStatsSkeletonLoader,
  AdminUsersSkeletonLoader,
  AdminLogsSkeletonLoader,
} from "@/components/admin/admin-skeleton-loaders";

interface AdminTabsProps {
  initialTab: string;
  stats: any;
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
  const [isChanging, setIsChanging] = useState(false);
  const [currentTab, setCurrentTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    if (value === currentTab) return;

    setIsChanging(true);
    setCurrentTab(value);

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`/admin?${params.toString()}`);

    setTimeout(() => {
      setIsChanging(false);
    }, 400);
  };

  return (
    <main className="min-h-screen bg-white dark:bg-stone-950">
      <section className="mx-auto max-w-screen-xl px-4 py-4 sm:px-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-1">Administration</h1>
          <p className="text-sm text-muted-foreground">Gérez les utilisateurs et surveillez l&apos;activité du site</p>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="logs" className="flex items-center gap-2" disabled={isChanging}>
              <Activity className="h-4 w-4" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2" disabled={isChanging}>
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2" disabled={isChanging}>
              <BarChart3 className="h-4 w-4" />
              Statistiques
            </TabsTrigger>
          </TabsList>

          <div className="relative">
            {isChanging && (
              <div className="animate-in fade-in duration-200">
                {currentTab === "stats" && <AdminStatsSkeletonLoader />}
                {currentTab === "users" && <AdminUsersSkeletonLoader />}
                {currentTab === "logs" && <AdminLogsSkeletonLoader />}
              </div>
            )}

            <div
              className={`transition-opacity duration-300 ${
                isChanging ? "opacity-0 pointer-events-none h-0 overflow-hidden" : "opacity-100"
              }`}
            >
            <TabsContent value="logs" className="mt-0">
              <ActivityLogsViewer initialLogs={logs} initialPagination={pagination} />
            </TabsContent>

            <TabsContent value="users" className="mt-0">
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

            <TabsContent value="stats" className="mt-0">
              <AdminStats stats={stats} />
            </TabsContent>
            </div>
          </div>
        </Tabs>
      </section>
    </main>
  );
}
