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
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      // Couleurs du thème
      const colors = {
        primary: [16, 185, 129] as const, // Emerald-500
        secondary: [249, 115, 22] as const, // Orange-500
        darkGray: [41, 37, 36] as const,
        gray: [120, 113, 108] as const,
        lightGray: [231, 229, 228] as const,
        white: [255, 255, 255] as const,
        background: [250, 250, 249] as const,
      };

      // === HEADER SIMPLE AVEC BANDE DE COULEUR ===
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(0, 0, pageWidth, 40, 'F');

      // === IMAGE DE LA RECETTE ===
      if (recipe.imageUrl) {
        try {
          const imgData = await fetch(recipe.imageUrl).then(res => res.blob()).then(blob => {
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          });
          
          const imgWidth = 45;
          const imgHeight = 30;
          doc.addImage(imgData, 'JPEG', pageWidth - margin - imgWidth, 10, imgWidth, imgHeight);
        } catch (error) {
          console.error("Erreur lors du chargement de l'image:", error);
        }
      }

      // === TITRE DE LA RECETTE ===
      y = 20;
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
      const titleLines = doc.splitTextToSize(recipe.name, contentWidth - 55);
      titleLines.forEach((line: string) => {
        doc.text(line, margin, y);
        y += 8;
      });

      y = 50;

      // === CATÉGORIE & AUTEUR ===
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      
      const categoryLabel = getCategoryLabel(recipe.category);
      const authorText = recipe.author ? `par ${recipe.author}` : "";
      const metaLine = [categoryLabel, authorText].filter(Boolean).join(" - ");
      doc.text(metaLine, margin, y);
      y += 8;

      // === DESCRIPTION ===
      if (recipe.description) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
        const descLines = doc.splitTextToSize(recipe.description, contentWidth);
        descLines.forEach((line: string) => {
          if (y > pageHeight - 30) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, margin, y);
          y += 5;
        });
        y += 5;
      }

      // === LIGNE DE SÉPARATION ===
      doc.setDrawColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // === INFORMATIONS CLÉS (version texte simple) ===
      const infoItems = [];
      if (recipe.preparationTime > 0) infoItems.push(`Preparation: ${recipe.preparationTime} min`);
      if (recipe.cookingTime > 0) infoItems.push(`Cuisson: ${recipe.cookingTime} min`);
      if (recipe.servings > 0) infoItems.push(`${recipe.servings} portions`);
      if (recipe.costEstimate) infoItems.push(`Cout: ${getCostLabel(recipe.costEstimate)}`);
      if (recipe.caloriesPerServing) infoItems.push(`${recipe.caloriesPerServing} kcal/portion`);
      if (recipe.rating > 0) infoItems.push(`Note: ${recipe.rating}/5`);

      if (infoItems.length > 0) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
        doc.text(infoItems.join("  |  "), margin, y);
        y += 10;
      }

      // === TAGS ===
      if (recipe.tags && recipe.tags.length > 0) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        const tagsText = recipe.tags.slice(0, 10).join(" - ");
        const tagLines = doc.splitTextToSize(tagsText, contentWidth);
        tagLines.forEach((line: string) => {
          doc.text(line, margin, y);
          y += 4;
        });
        y += 8;
      }

      // === SECTION INGRÉDIENTS ===
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
      }

      // En-tête de section
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(margin, y - 6, contentWidth, 8, 'F');
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.text("INGREDIENTS", margin + 2, y - 1);
      y += 8;

      // Gestion des groupes d'ingrédients
      if (recipe.ingredientGroups && recipe.ingredientGroups.length > 0) {
        recipe.ingredientGroups.forEach((group) => {
          // Nom du groupe
          if (group.name) {
            y += 3;
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
            doc.text(group.name, margin, y);
            y += 6;
          }
          
          // Ingrédients du groupe
          group.ingredients.forEach((ing) => {
            if (y > pageHeight - 30) {
              doc.addPage();
              y = 20;
            }
            
            const quantity = ing.quantity ? `${ing.quantity}` : "";
            const unit = ing.unit ? ` ${ing.unit}` : "";
            const text = `- ${quantity}${unit} ${ing.name}`;
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
            const ingLines = doc.splitTextToSize(text, contentWidth - 5);
            ingLines.forEach((line: string) => {
              doc.text(line, margin + 3, y);
              y += 4.5;
            });
          });
          y += 2;
        });
      } else {
        // Liste simple d'ingrédients
        recipe.ingredients.forEach((ing) => {
          if (y > pageHeight - 30) {
            doc.addPage();
            y = 20;
          }
          
          const quantity = ing.quantity ? `${ing.quantity}` : "";
          const unit = ing.unit ? ` ${ing.unit}` : "";
          const text = `- ${quantity}${unit} ${ing.name}`;
          
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
          const ingLines = doc.splitTextToSize(text, contentWidth - 5);
          ingLines.forEach((line: string) => {
            doc.text(line, margin + 3, y);
            y += 4.5;
          });
        });
      }

      y += 10;

      // === SECTION PRÉPARATION ===
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 20;
      }

      // En-tête de section
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(margin, y - 6, contentWidth, 8, 'F');
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.text("PREPARATION", margin + 2, y - 1);
      y += 8;

      // Étapes
      recipe.steps
        .sort((a, b) => a.order - b.order)
        .forEach((step) => {
          if (y > pageHeight - 30) {
            doc.addPage();
            y = 20;
          }
          
          // Numéro de l'étape avec cercle
          const stepNumber = step.order.toString();
          const circleRadius = 3.5;
          const circleX = margin + circleRadius + 1;
          const circleY = y - 2;
          
          doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
          doc.circle(circleX, circleY, circleRadius, 'F');
          
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
          
          // Centrer le numéro dans le cercle
          const numWidth = doc.getTextWidth(stepNumber);
          doc.text(stepNumber, circleX - numWidth / 2, circleY + 1);
          
          // Texte de l'étape avec support des listes multi-niveaux
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(colors.darkGray[0], colors.darkGray[1], colors.darkGray[2]);
          
          // Traiter chaque ligne pour détecter les niveaux d'indentation
          const lines = step.text.split('\n');
          lines.forEach((line: string) => {
            if (y > pageHeight - 30) {
              doc.addPage();
              y = 20;
            }

            // Détecter le niveau d'indentation
            const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
            const indentLevel = Math.floor(leadingSpaces / 2);
            const trimmedLine = line.trim();
            const isBulletPoint = trimmedLine.startsWith('-');

            if (isBulletPoint) {
              // Calculer l'indentation en fonction du niveau
              const baseIndent = margin + 11;
              const additionalIndent = indentLevel * 5; // 5mm par niveau
              const bullet = indentLevel > 0 ? '◦' : '•';
              const textWithBullet = `${bullet} ${trimmedLine.replace(/^-\s*/, '')}`;
              
              const wrappedLines = doc.splitTextToSize(textWithBullet, contentWidth - 15 - additionalIndent);
              wrappedLines.forEach((wrappedLine: string, idx: number) => {
                if (y > pageHeight - 30) {
                  doc.addPage();
                  y = 20;
                }
                // Première ligne avec le bullet, suivantes avec indentation supplémentaire
                const xPos = baseIndent + additionalIndent + (idx > 0 ? 3 : 0);
                doc.text(wrappedLine, xPos, y);
                y += 4.5;
              });
            } else {
              // Ligne normale
              const wrappedLines = doc.splitTextToSize(line, contentWidth - 15);
              wrappedLines.forEach((wrappedLine: string) => {
                if (y > pageHeight - 30) {
                  doc.addPage();
                  y = 20;
                }
                doc.text(wrappedLine, margin + 11, y);
                y += 4.5;
              });
            }
          });
          
          y += 5;
        });

      // === FOOTER ===
      const footerY = pageHeight - 15;
      doc.setFontSize(7);
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      doc.setFont("helvetica", "italic");
      
      // Ligne de séparation
      doc.setDrawColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
      doc.setLineWidth(0.3);
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      
      // Texte du footer
      const footerText = `Recette exportee depuis Yumiso - ${new Date().toLocaleDateString("fr-FR", { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`;
      doc.text(footerText, margin, footerY);
      
      // Logo/Nom à droite
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("Yumiso", pageWidth - margin - 12, footerY);

      // Save
      const fileName = recipe.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Enlever les accents
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
      return "Economique";
    case "MEDIUM":
      return "Moyen";
    case "EXPENSIVE":
      return "Cher";
    default:
      return "";
  }
}

function getCategoryLabel(category: string): string {
  const categories: Record<string, string> = {
    MAIN_DISH: "Plat principal",
    STARTER: "Entree",
    DESSERT: "Dessert",
    SIDE_DISH: "Accompagnement",
    SOUP: "Soupe",
    SALAD: "Salade",
    BEVERAGE: "Boisson",
    SNACK: "En-cas",
    APPETIZER: "Aperitif",
    BREAKFAST: "Petit-dejeuner",
    BRUNCH: "Brunch",
    SAUCE: "Sauce",
    MARINADE: "Marinade",
    DRESSING: "Vinaigrette",
    SPREAD: "Tartinade",
    BREAD: "Pain",
    PASTRY: "Patisserie",
    CAKE: "Gateau",
    COOKIE: "Biscuit",
    SMOOTHIE: "Smoothie",
    COCKTAIL: "Cocktail",
    PRESERVES: "Conserves",
    OTHER: "Autre",
  };
  return categories[category] || category;
}
