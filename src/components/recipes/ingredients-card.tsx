"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";

interface Ingredient {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
}

interface IngredientsCardProps {
  ingredients: Ingredient[];
  originalServings: number;
}

function formatQuantity(quantity: number | null, multiplier: number): string {
  if (quantity === null) return "";
  const adjusted = quantity * multiplier;
  
  // Round to nice fractions
  if (adjusted < 0.1) return adjusted.toFixed(2);
  if (adjusted < 1) {
    const rounded = Math.round(adjusted * 10) / 10;
    return rounded.toString();
  }
  if (Number.isInteger(adjusted)) return adjusted.toString();
  return (Math.round(adjusted * 10) / 10).toString();
}

export function IngredientsCard({ ingredients, originalServings }: IngredientsCardProps) {
  const [servings, setServings] = useState(originalServings);
  const multiplier = servings / originalServings;

  // Generate servings options (1-20)
  const servingsOptions = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <Card className="md:col-span-2 border border-amber-100 shadow-sm bg-white/80 backdrop-blur-sm pb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-lg sm:text-xl flex items-center gap-2">
            <span className="text-xl sm:text-2xl">🥗</span>
            Ingrédients
          </CardTitle>
          
          {/* Portion Adjuster Dropdown */}
          <Select
            value={servings.toString()}
            onValueChange={(value) => setServings(parseInt(value))}
          >
            <SelectTrigger className="w-[80px] h-8 cursor-pointer">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-emerald-600" />
                <span>{servings}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {servingsOptions.map((num) => (
                <SelectItem key={num} value={num.toString()} className="cursor-pointer">
                  {num} pers.
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {servings !== originalServings && (
          <p className="text-xs text-amber-600 mt-1 text-right">
            Quantités ajustées (×{multiplier.toFixed(1)})
          </p>
        )}
      </CardHeader>
      <CardContent className="pb-2">
        <ul className="space-y-2 sm:space-y-3">
          {ingredients.map((ingredient) => (
            <li
              key={ingredient.id}
              className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base text-stone-700"
            >
              <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span>
                {ingredient.quantity && (
                  <span className="font-medium">
                    {formatQuantity(ingredient.quantity, multiplier)}{" "}
                  </span>
                )}
                {ingredient.unit && (
                  <span className="text-stone-500">{ingredient.unit} </span>
                )}
                {ingredient.name}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
