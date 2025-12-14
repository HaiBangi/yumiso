import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MealPlannerTabs } from "@/components/meal-planner/meal-planner-tabs";

export default async function MealPlannerPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <MealPlannerTabs />
    </div>
  );
}
