"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Plus } from "lucide-react";
import { MealPlannerForm } from "./meal-planner-form";
import { WeeklyCalendarView } from "./weekly-calendar-view";

export function MealPlannerTabs() {
  const [savedPlans, setSavedPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchSavedPlans();
  }, []);

  const fetchSavedPlans = async () => {
    try {
      const response = await fetch("/api/meal-planner/saved");
      if (response.ok) {
        const data = await response.json();
        setSavedPlans(data);
      }
    } catch (error) {
      console.error("Error fetching saved plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Éviter l'erreur d'hydratation en n'affichant les Tabs qu'après le montage côté client
  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <div className="text-stone-500 dark:text-stone-400">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Mes Menus
          </TabsTrigger>
          <TabsTrigger value="generate" className="gap-2">
            <Plus className="h-4 w-4" />
            Générer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <WeeklyCalendarView 
            savedPlans={savedPlans} 
            isLoading={isLoading} 
            onRefresh={fetchSavedPlans}
          />
        </TabsContent>

        <TabsContent value="generate">
          <MealPlannerForm onSuccess={fetchSavedPlans} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
