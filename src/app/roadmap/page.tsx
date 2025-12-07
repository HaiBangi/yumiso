import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Rocket } from "lucide-react";
import { RoadmapClient } from "./roadmap-client";
import { roadmapData, priorityBadges } from "./roadmap-data";

export const metadata = {
  title: "Roadmap - Yumiso",
  description: "Roadmap et vision produit de Yumiso",
};

export default async function RoadmapPage() {
  const session = await auth();

  // Redirect if not admin or owner
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "OWNER")) {
    redirect("/");
  }

  const completedCount = roadmapData.find(s => s.status === "completed")?.features.length || 0;
  const inProgressCount = roadmapData.find(s => s.status === "in-progress")?.features.length || 0;
  const plannedCount = roadmapData.find(s => s.status === "planned")?.features.length || 0;
  const ideasCount = roadmapData.find(s => s.status === "ideas")?.features.length || 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-900 dark:to-green-900 text-white py-12">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Rocket className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold font-serif">Roadmap Yumiso</h1>
              <p className="text-emerald-100 mt-1">Vision produit et prochaines fonctionnalités</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8">
        <RoadmapClient
          roadmapData={roadmapData}
          priorityBadges={priorityBadges}
          stats={{
            completed: completedCount,
            inProgress: inProgressCount,
            planned: plannedCount,
            ideas: ideasCount
          }}
        />
      </div>
    </main>
  );
}

