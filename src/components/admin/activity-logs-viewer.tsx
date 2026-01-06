"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Types d'actions
type ActivityActionType =
  | "USER_SIGNUP"
  | "USER_LOGIN"
  | "RECIPE_CREATE"
  | "RECIPE_UPDATE"
  | "RECIPE_DELETE"
  | "RECIPE_GENERATE"
  | "COLLECTION_CREATE"
  | "COLLECTION_UPDATE"
  | "COLLECTION_DELETE"
  | "COMMENT_CREATE"
  | "MEAL_PLAN_CREATE"
  | "MEAL_PLAN_OPTIMIZE"
  | "SHOPPING_LIST_CREATE"
  | "SHOPPING_LIST_OPTIMIZE";

const ACTION_LABELS: Record<ActivityActionType, string> = {
  USER_SIGNUP: "Inscription",
  USER_LOGIN: "Connexion",
  RECIPE_CREATE: "Création recette",
  RECIPE_UPDATE: "Modification recette",
  RECIPE_DELETE: "Suppression recette",
  RECIPE_GENERATE: "Génération IA",
  COLLECTION_CREATE: "Création collection",
  COLLECTION_UPDATE: "Modification collection",
  COLLECTION_DELETE: "Suppression collection",
  COMMENT_CREATE: "Commentaire",
  MEAL_PLAN_CREATE: "Création menu",
  MEAL_PLAN_OPTIMIZE: "Optimisation menu",
  SHOPPING_LIST_CREATE: "Création liste",
  SHOPPING_LIST_OPTIMIZE: "Optimisation liste",
};

const ACTION_COLORS: Record<ActivityActionType, string> = {
  USER_SIGNUP: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  USER_LOGIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  RECIPE_CREATE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  RECIPE_UPDATE: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  RECIPE_DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  RECIPE_GENERATE: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  COLLECTION_CREATE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  COLLECTION_UPDATE: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  COLLECTION_DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  COMMENT_CREATE: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  MEAL_PLAN_CREATE: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  MEAL_PLAN_OPTIMIZE: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  SHOPPING_LIST_CREATE: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300",
  SHOPPING_LIST_OPTIMIZE: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  CONTRIBUTOR: "Contributeur",
  READER: "Lecteur",
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
  CONTRIBUTOR: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  READER: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800",
};

interface ActivityLog {
  id: number;
  userId: string;
  action: ActivityActionType;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    pseudo: string;
    email: string;
    image: string | null;
    role: string;
  };
}

interface Props {
  initialLogs: ActivityLog[];
  initialPagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    perPage: number;
  };
}

export function ActivityLogsViewer({ initialLogs, initialPagination }: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
  const [pagination, setPagination] = useState(initialPagination);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadPage = async (page: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: pagination.perPage.toString(),
        ...(filterAction !== "all" && { action: filterAction }),
      });

      const response = await fetch(`/api/admin/activity-logs?${params}`);
      const data = await response.json();

      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Erreur lors du chargement des logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = async (value: string) => {
    setFilterAction(value);
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        page: "1",
        perPage: pagination.perPage.toString(),
        ...(value !== "all" && { action: value }),
      });

      const response = await fetch(`/api/admin/activity-logs?${params}`);
      const data = await response.json();

      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Erreur lors du filtrage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="dark:bg-stone-800/90 dark:border-stone-700">
        <CardHeader className="pb-6 border-b dark:border-stone-700">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-1">
                Historique d&apos;activité
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-stone-700 dark:text-stone-300">{pagination.totalCount}</span>{" "}
                action{pagination.totalCount > 1 ? "s" : ""} enregistrée{pagination.totalCount > 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterAction} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  <SelectItem value="USER_SIGNUP">Inscriptions</SelectItem>
                  <SelectItem value="USER_LOGIN">Connexions</SelectItem>
                  <SelectItem value="RECIPE_CREATE">Créations recettes</SelectItem>
                  <SelectItem value="RECIPE_UPDATE">Modifications recettes</SelectItem>
                  <SelectItem value="RECIPE_DELETE">Suppressions recettes</SelectItem>
                  <SelectItem value="COLLECTION_CREATE">Créations collections</SelectItem>
                  <SelectItem value="COMMENT_CREATE">Commentaires</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-lg font-medium">Aucune activité trouvée</p>
            </div>
          ) : (
            <>
              {/* En-tête du tableau */}
              <div className="grid grid-cols-[48px_160px_160px_1fr_120px] gap-3 px-6 py-2.5 bg-stone-50 dark:bg-stone-800/50 border-b dark:border-stone-700 text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide">
                <div></div>
                <div>Utilisateur</div>
                <div>Action</div>
                <div>Élément</div>
                <div className="text-right">Date</div>
              </div>

              {/* Liste des logs */}
              <ScrollArea className="h-[900px]">
                <div className="divide-y divide-stone-200 dark:divide-stone-700">
                  {logs.map((log, index) => (
                    <button
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`w-full grid grid-cols-[48px_160px_160px_1fr_120px] gap-3 px-6 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-all text-left group ${
                        index % 2 === 0
                          ? "bg-white dark:bg-stone-900/20"
                          : "bg-stone-50/50 dark:bg-stone-900/10"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-stone-800 group-hover:ring-stone-200 dark:group-hover:ring-stone-700 transition-all">
                          <AvatarImage src={log.user.image || undefined} alt={log.user.pseudo} />
                          <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                            {log.user.pseudo.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* User info + Role (sur une ligne) */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate">
                          {log.user.pseudo}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 h-4 flex-shrink-0 ${ROLE_COLORS[log.user.role]}`}
                        >
                          {ROLE_LABELS[log.user.role]}
                        </Badge>
                      </div>

                      {/* Action */}
                      <div className="flex items-center">
                        <Badge className={`text-[11px] px-2.5 py-1 font-medium ${ACTION_COLORS[log.action]}`}>
                          {ACTION_LABELS[log.action]}
                        </Badge>
                      </div>

                      {/* Entity name */}
                      <div className="flex items-center min-w-0">
                        {log.entityName ? (
                          <span className="text-sm text-stone-700 dark:text-stone-300 truncate font-medium">
                            {log.entityName}
                          </span>
                        ) : (
                          <span className="text-sm text-stone-400 dark:text-stone-600 italic">—</span>
                        )}
                      </div>

                      {/* Time */}
                      <div className="flex items-center justify-end">
                        <div className="text-xs text-muted-foreground font-medium">
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 bg-stone-50 dark:bg-stone-800/50 border-t dark:border-stone-700">
                  <div className="text-sm font-medium text-stone-700 dark:text-stone-300">
                    Page <span className="font-bold text-stone-900 dark:text-stone-100">{pagination.currentPage}</span>{" "}
                    sur <span className="font-bold text-stone-900 dark:text-stone-100">{pagination.totalPages}</span>
                    <span className="text-muted-foreground ml-2">
                      ({pagination.perPage * (pagination.currentPage - 1) + 1}-
                      {Math.min(pagination.perPage * pagination.currentPage, pagination.totalCount)} sur{" "}
                      {pagination.totalCount})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadPage(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1 || isLoading}
                      className="font-medium"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadPage(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages || isLoading}
                      className="font-medium"
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de détails */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[650px] dark:bg-stone-900 dark:border-stone-700">
          <DialogHeader className="space-y-3 pb-6">
            <DialogTitle className="text-2xl font-bold dark:text-stone-100">
              Détails de l&apos;activité
            </DialogTitle>
            <DialogDescription className="dark:text-stone-400 text-base">
              Informations complètes sur cette action
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              {/* Utilisateur */}
              <div className="flex items-start gap-5 p-5 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-800/50 dark:to-stone-800/30 border border-stone-200 dark:border-stone-700">
                <Avatar className="h-14 w-14 ring-2 ring-white dark:ring-stone-700">
                  <AvatarImage src={selectedLog.user.image || undefined} alt={selectedLog.user.pseudo} />
                  <AvatarFallback className="text-lg font-semibold">
                    {selectedLog.user.pseudo.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="font-semibold text-lg text-stone-900 dark:text-stone-100">
                      {selectedLog.user.pseudo}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">{selectedLog.user.email}</div>
                  </div>
                  <Badge variant="outline" className={`${ROLE_COLORS[selectedLog.user.role]} font-medium`}>
                    {ROLE_LABELS[selectedLog.user.role]}
                  </Badge>
                </div>
              </div>

              {/* Action et Date */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Action</div>
                  <Badge className={`${ACTION_COLORS[selectedLog.action]} text-sm px-3 py-1.5`}>
                    {ACTION_LABELS[selectedLog.action]}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Date</div>
                  <div className="text-sm font-medium text-stone-900 dark:text-stone-100">
                    {new Date(selectedLog.createdAt).toLocaleString("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              </div>

              {/* Entité */}
              {selectedLog.entityName && (
                <div className="space-y-3 p-5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-200 dark:border-amber-800/50">
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {selectedLog.entityType || "Élément"}
                  </div>
                  <div className="text-xl font-semibold text-stone-900 dark:text-stone-100">
                    {selectedLog.entityName}
                  </div>
                  {selectedLog.entityId && (
                    <div className="text-xs font-mono text-muted-foreground bg-white/50 dark:bg-stone-900/50 px-2 py-1 rounded inline-block">
                      ID: {selectedLog.entityId}
                    </div>
                  )}
                </div>
              )}

              {/* Détails techniques */}
              {(selectedLog.ipAddress || selectedLog.userAgent || selectedLog.details) && (
                <div className="space-y-4 p-5 rounded-xl bg-stone-50 dark:bg-stone-800/30 border border-stone-200 dark:border-stone-700">
                  <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wide">
                    Informations techniques
                  </div>

                  {selectedLog.ipAddress && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground min-w-[90px] font-medium">Adresse IP</span>
                      <span className="font-mono text-sm text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900/50 px-3 py-1 rounded">
                        {selectedLog.ipAddress}
                      </span>
                    </div>
                  )}

                  {selectedLog.userAgent && (
                    <div className="flex items-start gap-3">
                      <span className="text-sm text-muted-foreground min-w-[90px] flex-shrink-0 font-medium">
                        Navigateur
                      </span>
                      <span className="font-mono text-xs text-stone-700 dark:text-stone-300 break-all bg-white dark:bg-stone-900/50 px-3 py-2 rounded flex-1">
                        {selectedLog.userAgent}
                      </span>
                    </div>
                  )}

                  {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                    <div className="flex items-start gap-3">
                      <span className="text-sm text-muted-foreground min-w-[90px] flex-shrink-0 font-medium">
                        Données
                      </span>
                      <pre className="font-mono text-xs text-stone-700 dark:text-stone-300 overflow-x-auto bg-white dark:bg-stone-900/50 px-3 py-2 rounded flex-1 max-h-[200px] overflow-y-auto">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
