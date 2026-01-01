"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Clock, SortAsc, X } from "lucide-react";
import { useCallback, useTransition } from "react";

interface AdvancedFiltersProps {
  currentSort?: string;
  currentMaxTime?: string;
  viewToggle?: React.ReactNode;
  deletionModeToggle?: React.ReactNode;
}

const sortOptions = [
  { value: "default", label: "Tri par défaut" },
  { value: "newest", label: "Plus récentes" },
  { value: "oldest", label: "Plus anciennes" },
  { value: "rating", label: "Meilleures notes" },
  { value: "views", label: "Plus vues" },
  { value: "time_asc", label: "Temps (croissant)" },
  { value: "time_desc", label: "Temps (décroissant)" },
  { value: "name_asc", label: "Nom (A-Z)" },
  { value: "name_desc", label: "Nom (Z-A)" },
];

const timeOptions = [
  { value: "all", label: "Tous les temps" },
  { value: "15", label: "< 15 min" },
  { value: "30", label: "< 30 min" },
  { value: "60", label: "< 1 heure" },
  { value: "120", label: "< 2 heures" },
];

