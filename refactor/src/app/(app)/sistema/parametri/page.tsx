"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type Parametro } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Settings, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ParametriPage() {
  const { token } = useAuth();
  const [parametri, setParametri] = useState<Record<string, Parametro[]>>({});
  const [loading, setLoading] = useState(true);
  const [editedValues, setEditedValues] = useState<Record<number, string>>({});
  const [savingCategory, setSavingCategory] = useState<string | null>(null);

  const fetchParametri = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.sistema.parametri(token);
      setParametri(res.data);
      setEditedValues({});
    } catch {
      toast.error("Errore nel caricamento dei parametri");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchParametri();
  }, [fetchParametri]);

  const handleValueChange = (id: number, valore: string) => {
    setEditedValues((prev) => ({ ...prev, [id]: valore }));
  };

  const getDisplayValue = (param: Parametro) => {
    return editedValues[param.id] !== undefined
      ? editedValues[param.id]
      : param.valore;
  };

  const hasChanges = (category: string) => {
    const params = parametri[category] || [];
    return params.some(
      (p) => editedValues[p.id] !== undefined && editedValues[p.id] !== p.valore
    );
  };

  const handleSave = async (category: string) => {
    if (!token) return;
    const params = parametri[category] || [];
    const changed = params
      .filter(
        (p) =>
          editedValues[p.id] !== undefined && editedValues[p.id] !== p.valore
      )
      .map((p) => ({ id: p.id, valore: editedValues[p.id] }));

    if (changed.length === 0) return;

    setSavingCategory(category);
    try {
      await api.sistema.updateParametri(token, changed);
      toast.success("Parametri aggiornati");
      fetchParametri();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Errore nel salvataggio"
      );
    } finally {
      setSavingCategory(null);
    }
  };

  const categories = Object.keys(parametri);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Parametri di Sistema
        </h1>
        <p className="text-muted-foreground">
          Configura i parametri del sistema raggruppati per categoria
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nessun parametro configurato.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={categories[0]} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="capitalize">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category} value={category}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 capitalize">
                    <Settings className="h-5 w-5" />
                    {category}
                  </CardTitle>
                  <Button
                    size="sm"
                    disabled={
                      !hasChanges(category) || savingCategory === category
                    }
                    onClick={() => handleSave(category)}
                  >
                    {savingCategory === category ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {savingCategory === category
                      ? "Salvataggio..."
                      : "Salva modifiche"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(parametri[category] || []).map((param) => (
                    <div key={param.id} className="space-y-1.5">
                      <Label htmlFor={`param-${param.id}`}>
                        {param.parametro}
                      </Label>
                      {param.descrizione && (
                        <p className="text-xs text-muted-foreground">
                          {param.descrizione}
                        </p>
                      )}
                      <Input
                        id={`param-${param.id}`}
                        value={getDisplayValue(param)}
                        onChange={(e) =>
                          handleValueChange(param.id, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
