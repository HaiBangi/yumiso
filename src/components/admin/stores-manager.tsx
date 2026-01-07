"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Loader2 } from "lucide-react";

interface Store {
  id: number;
  name: string;
  logoUrl: string | null;
  color: string;
  displayOrder: number;
  isActive: boolean;
}

interface StoresManagerProps {
  initialStores: Store[];
}

export function StoresManager({ initialStores }: StoresManagerProps) {
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (id: number, field: keyof Store, value: any) => {
    setStores((prev) =>
      prev.map((store) =>
        store.id === id ? { ...store, [field]: value } : store
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stores }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la sauvegarde");
      }

      toast.success("✅ Enseignes mises à jour avec succès");
      setHasChanges(false);
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="dark:bg-stone-800/90 dark:border-stone-700">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-stone-900 dark:text-stone-100">Gestion des enseignes</CardTitle>
            <CardDescription className="dark:text-stone-400">
              Modifiez les informations des enseignes disponibles sur le site
            </CardDescription>
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b dark:border-stone-700">
                <th className="text-left p-3 font-semibold text-sm text-stone-900 dark:text-stone-100">ID</th>
                <th className="text-left p-3 font-semibold text-sm text-stone-900 dark:text-stone-100">Nom</th>
                <th className="text-left p-3 font-semibold text-sm text-stone-900 dark:text-stone-100">Logo</th>
                <th className="text-left p-3 font-semibold text-sm text-stone-900 dark:text-stone-100">URL du logo</th>
                <th className="text-left p-3 font-semibold text-sm text-stone-900 dark:text-stone-100">Couleur</th>
                <th className="text-left p-3 font-semibold text-sm text-stone-900 dark:text-stone-100">Ordre</th>
                <th className="text-left p-3 font-semibold text-sm text-stone-900 dark:text-stone-100">Active</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr
                  key={store.id}
                  className="border-b dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                >
                  <td className="p-3 text-sm text-stone-700 dark:text-stone-300">
                    {store.id}
                  </td>
                  <td className="p-3">
                    <Input
                      value={store.name}
                      onChange={(e) => handleChange(store.id, "name", e.target.value)}
                      className="max-w-[200px] dark:bg-stone-900 dark:border-stone-600"
                    />
                  </td>
                  <td className="p-3">
                    {store.logoUrl && (
                      <img
                        src={store.logoUrl}
                        alt={store.name}
                        className="h-8 w-8 object-contain"
                      />
                    )}
                  </td>
                  <td className="p-3">
                    <Input
                      value={store.logoUrl || ""}
                      onChange={(e) => handleChange(store.id, "logoUrl", e.target.value || null)}
                      placeholder="https://..."
                      className="max-w-[300px] dark:bg-stone-900 dark:border-stone-600"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={store.color}
                        onChange={(e) => handleChange(store.id, "color", e.target.value)}
                        className="h-8 w-8 rounded border dark:border-stone-600 cursor-pointer"
                      />
                      <Input
                        value={store.color}
                        onChange={(e) => handleChange(store.id, "color", e.target.value)}
                        className="max-w-[100px] dark:bg-stone-900 dark:border-stone-600"
                      />
                    </div>
                  </td>
                  <td className="p-3">
                    <Input
                      type="number"
                      value={store.displayOrder}
                      onChange={(e) => handleChange(store.id, "displayOrder", parseInt(e.target.value, 10))}
                      className="max-w-[80px] dark:bg-stone-900 dark:border-stone-600"
                    />
                  </td>
                  <td className="p-3">
                    <Checkbox
                      checked={store.isActive}
                      onCheckedChange={(checked) => handleChange(store.id, "isActive", checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {stores.length === 0 && (
          <div className="text-center py-12 text-stone-500 dark:text-stone-400">
            Aucune enseigne trouvée
          </div>
        )}
      </CardContent>
    </Card>
  );
}
