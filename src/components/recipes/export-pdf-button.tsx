"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import type { Recipe } from "@/types/recipe";

interface ExportPdfButtonProps {
  recipe: Recipe;
}

export function ExportPdfButton({ recipe }: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Dynamic import to avoid SSR issues
      const { jsPDF } = await import("jspdf");

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      // Helper function to add text with word wrap
      const addWrappedText = (text: string, fontSize: number, isBold = false) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        const lines = doc.splitTextToSize(text, contentWidth);
        lines.forEach((line: string) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, margin, y);
          y += fontSize * 0.5;
        });
        y += 5;
      };

      // Title
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text(recipe.name, margin, y);
      y += 15;

      // Description
      if (recipe.description) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        const descLines = doc.splitTextToSize(recipe.description, contentWidth);
        descLines.forEach((line: string) => {
          doc.text(line, margin, y);
          y += 5;
        });
        doc.setTextColor(0, 0, 0);
        y += 5;
      }

      // Info line
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const infoLine = [
        recipe.preparationTime > 0 ? `Préparation: ${recipe.preparationTime} min` : null,
        recipe.cookingTime > 0 ? `Cuisson: ${recipe.cookingTime} min` : null,
        recipe.servings > 0 ? `${recipe.servings} portions` : null,
        recipe.costEstimate ? getCostLabel(recipe.costEstimate) : null,
      ]
        .filter(Boolean)
        .join(" • ");
      doc.text(infoLine, margin, y);
      y += 15;

      // Ingredients
      addWrappedText("Ingrédients", 14, true);
      y += 2;
      recipe.ingredients.forEach((ing) => {
        const quantity = ing.quantity ? `${ing.quantity}` : "";
        const unit = ing.unit ? ` ${ing.unit}` : "";
        const text = `• ${quantity}${unit} ${ing.name}`.trim();
        addWrappedText(text, 11);
      });
      y += 10;

      // Steps
      addWrappedText("Préparation", 14, true);
      y += 2;
      recipe.steps
        .sort((a, b) => a.order - b.order)
        .forEach((step, index) => {
          addWrappedText(`${index + 1}. ${step.text}`, 11);
          y += 3;
        });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Recette exportée depuis Yumiso - ${new Date().toLocaleDateString("fr-FR")}`, margin, 285);

      // Save
      const fileName = recipe.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      doc.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      className="text-amber-600 border-amber-200 hover:bg-amber-50 bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm shadow-lg gap-2"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">{isExporting ? "Export..." : "PDF"}</span>
    </Button>
  );
}

function getCostLabel(cost: string): string {
  switch (cost) {
    case "CHEAP":
      return "€ Économique";
    case "MEDIUM":
      return "€€ Moyen";
    case "EXPENSIVE":
      return "€€€ Cher";
    default:
      return "";
  }
}

