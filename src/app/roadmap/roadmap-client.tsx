"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Feature, RoadmapSection, IconName } from "./roadmap-data";
import {
  CheckCircle2,
  Clock,
  Lightbulb,
  Sparkles,
  Users,
  Shield,
  Zap,
  Heart,
  Search,
  Share2,
  MessageSquare,
  TrendingUp,
  Award,
  BookOpen,
  ChefHat,
  Calendar,
  Target,
  Eye
} from "lucide-react";

// Map icon names to actual icon components
const iconMap: Record<IconName, React.ComponentType<{ className?: string }>> = {
  CheckCircle2,
  Clock,
  Lightbulb,
  Sparkles,
  Users,
  Shield,
  Zap,
  Heart,
  Search,
  Share2,
  MessageSquare,
  TrendingUp,
  Award,
  BookOpen,
  ChefHat,
  Calendar,
  Target,
  Eye
};

const getIcon = (iconName: IconName): React.ComponentType<{ className?: string }> => iconMap[iconName];

interface RoadmapClientProps {
  roadmapData: RoadmapSection[];
  priorityBadges: {
    high: { label: string; color: string };
    medium: { label: string; color: string };
    low: { label: string; color: string };
  };
  stats: {
    completed: number;
    inProgress: number;
    planned: number;
    ideas: number;
  };
}

export function RoadmapClient({ roadmapData, priorityBadges, stats }: RoadmapClientProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filteredData = activeFilter
    ? roadmapData.filter(section => section.status === activeFilter)
    : roadmapData;

  const getStatusStats = (status: string) => {
    switch (status) {
      case "completed": return stats.completed;
      case "in-progress": return stats.inProgress;
      case "planned": return stats.planned;
      case "ideas": return stats.ideas;
      default: return 0;
    }
  };

  return (
    <>
      {/* Stats Cards - Cliquables pour filtrer */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {roadmapData.map((section) => {
          const Icon = getIcon(section.icon);
          const isActive = activeFilter === section.status;
          const count = getStatusStats(section.status);

          return (
            <button
              key={section.status}
              onClick={() => setActiveFilter(isActive ? null : section.status)}
              className={`${section.bgColor} rounded-xl p-4 border-2 transition-all hover:scale-105 cursor-pointer ${
                isActive 
                  ? `${section.borderColor} shadow-lg` 
                  : "border-transparent hover:border-stone-200 dark:hover:border-stone-700"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${isActive ? section.bgColor : "bg-white/50 dark:bg-stone-800/50"}`}>
                  <Icon className={`h-5 w-5 ${section.color}`} />
                </div>
                <div className="text-3xl font-bold text-stone-900 dark:text-stone-100">
                  {count}
                </div>
              </div>
              <div className={`text-sm font-medium ${section.color}`}>
                {section.title}
              </div>
              {isActive && (
                <div className="mt-2 text-xs text-stone-600 dark:text-stone-400">
                  Cliquer pour tout afficher
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Filter Badge */}
      {activeFilter && (
        <div className="mb-6 flex items-center gap-2">
          <span className="text-sm text-stone-600 dark:text-stone-400">Filtré par :</span>
          {(() => {
            const activeSection = roadmapData.find(s => s.status === activeFilter);
            if (!activeSection) return null;
            return (
              <Badge
                variant="outline"
                className={`${activeSection.color} ${activeSection.borderColor} font-medium`}
              >
                {activeSection.title}
              </Badge>
            );
          })()}
          <button
            onClick={() => setActiveFilter(null)}
            className="text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 underline ml-2"
          >
            Réinitialiser
          </button>
        </div>
      )}

      {/* Roadmap Sections */}
      <div className="space-y-12">
        {filteredData.map((section) => {
          const Icon = getIcon(section.icon);
          return (
            <div key={section.status} className="space-y-4">
              {/* Section Header */}
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${section.bgColor}`}>
                  <Icon className={`h-6 w-6 ${section.color}`} />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${section.color}`}>{section.title}</h2>
                  <p className="text-sm text-stone-600 dark:text-stone-400">{section.subtitle}</p>
                </div>
                <Badge variant="outline" className={`ml-auto ${section.color} ${section.borderColor}`}>
                  {section.features.length} feature{section.features.length > 1 ? 's' : ''}
                </Badge>
              </div>

              {/* Features Grid - Cards de même hauteur */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.features.map((feature, index) => {
                  const FeatureIcon = getIcon(feature.icon);
                  const priorityStyle = priorityBadges[feature.priority];

                  return (
                    <Card
                      key={index}
                      className={`border-2 ${section.borderColor} hover:shadow-lg transition-all duration-200 group flex flex-col h-full`}
                    >
                      <CardHeader className="pb-3 flex-shrink-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className={`p-2 rounded-lg ${section.bgColor} group-hover:scale-110 transition-transform`}>
                            <FeatureIcon className={`h-5 w-5 ${section.color}`} />
                          </div>
                          <Badge variant="secondary" className={`text-xs ${priorityStyle.color}`}>
                            {priorityStyle.label}
                          </Badge>
                        </div>
                        <CardTitle className="text-base leading-tight mt-2">
                          {feature.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {section.status !== "completed" && <Separator className="mt-8" />}
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <Card className="mt-12 border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950">
        <CardHeader>
          <CardTitle className="text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Note pour l'équipe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-stone-700 dark:text-stone-300">
          <p>
            Cette roadmap est un document vivant qui évolue avec les besoins des utilisateurs et les opportunités du marché.
          </p>
          <p>
            <strong>Priorités :</strong> Les fonctionnalités marquées comme <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">Haute</Badge> seront développées en priorité.
          </p>
          <p>
            <strong>Filtrage :</strong> Cliquez sur les cartes de statistiques en haut pour filtrer par statut.
          </p>
          <p>
            <strong>Feedback :</strong> N'hésitez pas à proposer de nouvelles idées ou à ajuster les priorités selon les retours utilisateurs.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

