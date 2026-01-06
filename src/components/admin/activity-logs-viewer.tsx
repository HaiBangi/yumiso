"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  User,
  Clock,
  MapPin,
  Monitor,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types d'actions - on les définit ici pour éviter d'importer activity-logger (Server-only)
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
  RECIPE_CREATE: "Création de recette",
  RECIPE_UPDATE: "Modification de recette",
  RECIPE_DELETE: "Suppression de recette",
  RECIPE_GENERATE: "Génération de recette par IA",
  COLLECTION_CREATE: "Création de collection",
  COLLECTION_UPDATE: "Modification de collection",
  COLLECTION_DELETE: "Suppression de collection",
  COMMENT_CREATE: "Ajout de commentaire",
  MEAL_PLAN_CREATE: "Création de menu",
  MEAL_PLAN_OPTIMIZE: "Optimisation de menu",
  SHOPPING_LIST_CREATE: "Création de liste de courses",
  SHOPPING_LIST_OPTIMIZE: "Optimisation de liste de courses",
};

const ACTION_COLORS: Record<ActivityActionType, string> = {
  USER_SIGNUP: "text-green-600 dark:text-green-400",
  USER_LOGIN: "text-blue-600 dark:text-blue-400",
  RECIPE_CREATE: "text-amber-600 dark:text-amber-400",
  RECIPE_UPDATE: "text-orange-600 dark:text-orange-400",
  RECIPE_DELETE: "text-red-600 dark:text-red-400",
  RECIPE_GENERATE: "text-purple-600 dark:text-purple-400",
  COLLECTION_CREATE: "text-emerald-600 dark:text-emerald-400",
  COLLECTION_UPDATE: "text-teal-600 dark:text-teal-400",
  COLLECTION_DELETE: "text-red-600 dark:text-red-400",
  COMMENT_CREATE: "text-cyan-600 dark:text-cyan-400",
  MEAL_PLAN_CREATE: "text-indigo-600 dark:text-indigo-400",
  MEAL_PLAN_OPTIMIZE: "text-violet-600 dark:text-violet-400",
  SHOPPING_LIST_CREATE: "text-lime-600 dark:text-lime-400",
  SHOPPING_LIST_OPTIMIZE: "text-fuchsia-600 dark:text-fuchsia-400",
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
  createdAt: Date;
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
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export function ActivityLogsViewer({ initialLogs, initialPagination }: Props) {
  const [logs, setLogs] = useState(initialLogs);
  const [pagination, setPagination] = useState(initialPagination);
  const [currentPage, setCurrentPage] = useState(initialPagination.page);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const loadLogs = async (page: number, action?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: "50",
      });
      if (action && action !== "all") {
        params.append("action", action);
      }

      const response = await fetch(`/api/admin/activity-logs?${params}`);
      const data = await response.json();

      setLogs(data.logs);
      setPagination(data.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error("Erreur lors du chargement des logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    loadLogs(newPage, filterAction);
  };

  const handleFilterChange = (action: string) => {
    setFilterAction(action);
    loadLogs(1, action);
  };

  const formatUserAgent = (ua: string | null) => {
    if (!ua) return "N/A";
    // Extraire navigateur et OS de manière simple
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return "Autre";
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            Historique des activités
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {pagination.total} action{pagination.total > 1 ? "s" : ""} enregistrée
            {pagination.total > 1 ? "s" : ""}
          </p>
        </div>

        {/* Filtre par action */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterAction} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrer par action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              <SelectItem value="USER_SIGNUP">Inscriptions</SelectItem>
              <SelectItem value="USER_LOGIN">Connexions</SelectItem>
              <SelectItem value="RECIPE_CREATE">Créations de recettes</SelectItem>
              <SelectItem value="RECIPE_GENERATE">Générations IA</SelectItem>
              <SelectItem value="COLLECTION_CREATE">Créations de collections</SelectItem>
              <SelectItem value="COMMENT_CREATE">Commentaires</SelectItem>
              <SelectItem value="MEAL_PLAN_CREATE">Créations de menus</SelectItem>
              <SelectItem value="MEAL_PLAN_OPTIMIZE">Optimisations de menus</SelectItem>
              <SelectItem value="SHOPPING_LIST_CREATE">Créations de listes</SelectItem>
              <SelectItem value="SHOPPING_LIST_OPTIMIZE">Optimisations de listes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Liste des logs */}
      <Card className="dark:bg-stone-800/90 dark:border-stone-700">
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="divide-y divide-stone-200 dark:divide-stone-700">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Activity className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucune activité trouvée</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar utilisateur */}
                      <div className="flex-shrink-0">
                        {log.user.image ? (
                          <img
                            src={log.user.image}
                            alt={log.user.name || log.user.pseudo}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-stone-900 dark:text-stone-100">
                            {log.user.name || log.user.pseudo}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {log.user.role}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-sm font-medium ${ACTION_COLORS[log.action]}`}>
                            {ACTION_LABELS[log.action]}
                          </span>
                          {log.entityName && (
                            <>
                              <span className="text-sm text-muted-foreground">·</span>
                              <span className="text-sm text-stone-700 dark:text-stone-300 truncate">
                                {log.entityName}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Métadonnées */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(log.createdAt), {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </span>
                          </div>
                          {log.ipAddress && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{log.ipAddress}</span>
                            </div>
                          )}
                          {log.userAgent && (
                            <div className="flex items-center gap-1">
                              <Monitor className="h-3 w-3" />
                              <span>{formatUserAgent(log.userAgent)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bouton détails */}
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} sur {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pagination.totalPages || loading}
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal détails (optionnel) */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <Card
            className="max-w-2xl w-full dark:bg-stone-800 dark:border-stone-700"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>Détails de l'activité</CardTitle>
              <CardDescription>
                {formatDistanceToNow(new Date(selectedLog.createdAt), {
                  addSuffix: true,
                  locale: fr,
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Utilisateur</h4>
                <p className="text-sm">
                  {selectedLog.user.name || selectedLog.user.pseudo} ({selectedLog.user.email})
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Action</h4>
                <p className="text-sm">{ACTION_LABELS[selectedLog.action]}</p>
              </div>
              {selectedLog.entityName && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Entité</h4>
                  <p className="text-sm">
                    {selectedLog.entityType}: {selectedLog.entityName}
                  </p>
                </div>
              )}
              {selectedLog.ipAddress && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Adresse IP
                  </h4>
                  <p className="text-sm font-mono">{selectedLog.ipAddress}</p>
                </div>
              )}
              {selectedLog.userAgent && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Navigateur
                  </h4>
                  <p className="text-xs font-mono break-all">{selectedLog.userAgent}</p>
                </div>
              )}
              {selectedLog.details && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Détails supplémentaires
                  </h4>
                  <pre className="text-xs bg-stone-100 dark:bg-stone-900 p-3 rounded overflow-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={() => setSelectedLog(null)}>Fermer</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
