"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type ScrutinioInfo } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ClipboardList, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

const ANNI_CORSO = [1, 2, 3, 4, 5] as const;

function formatDate(dateStr: string | null): string {
  if (!dateStr) {
    return "Non impostata";
  }
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) {
    return "Non pubblicato";
  }
  return new Date(dateStr).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createEmptyClassiVisibili(): Record<string, string | null> {
  return {
    "1": null,
    "2": null,
    "3": null,
    "4": null,
    "5": null,
  };
}

export default function ScrutiniPage() {
  const { token } = useAuth();
  const [scrutini, setScrutini] = useState<ScrutinioInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editScrutinio, setEditScrutinio] = useState<ScrutinioInfo | null>(null);
  const [data, setData] = useState("");
  const [dataProposte, setDataProposte] = useState("");
  const [classiVisibili, setClassiVisibili] = useState<Record<string, string | null>>(createEmptyClassiVisibili());
  const [bulkVisibilita, setBulkVisibilita] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchScrutini = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    try {
      const res = await api.scuola.scrutini(token);
      setScrutini(res.data);
    } catch {
      toast.error("Errore nel caricamento degli scrutini");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchScrutini();
  }, [fetchScrutini]);

  const handleEdit = useCallback((scrutinio: ScrutinioInfo) => {
    setEditScrutinio(scrutinio);
    setData(scrutinio.data ?? "");
    setDataProposte(scrutinio.dataProposte ?? "");
    setClassiVisibili({
      "1": scrutinio.classiVisibili["1"] ?? null,
      "2": scrutinio.classiVisibili["2"] ?? null,
      "3": scrutinio.classiVisibili["3"] ?? null,
      "4": scrutinio.classiVisibili["4"] ?? null,
      "5": scrutinio.classiVisibili["5"] ?? null,
    });
    setBulkVisibilita("");
    setDialogOpen(true);
  }, []);

  const handleClassiVisibiliChange = useCallback((anno: number, value: string) => {
    setClassiVisibili((prev) => ({
      ...prev,
      [String(anno)]: value.trim() === "" ? null : value,
    }));
  }, []);

  const applyBulkVisibilita = useCallback(() => {
    if (!bulkVisibilita) {
      toast.error("Inserisci una data/ora da applicare a tutti gli anni");
      return;
    }
    setClassiVisibili({
      "1": bulkVisibilita,
      "2": bulkVisibilita,
      "3": bulkVisibilita,
      "4": bulkVisibilita,
      "5": bulkVisibilita,
    });
  }, [bulkVisibilita]);

  const clearBulkVisibilita = useCallback(() => {
    setClassiVisibili(createEmptyClassiVisibili());
    setBulkVisibilita("");
  }, []);

  const handleSave = useCallback(async () => {
    if (!token || !editScrutinio) {
      return;
    }
    if (!data || !dataProposte) {
      toast.error("Data scrutinio e data proposte sono obbligatorie");
      return;
    }

    setSaving(true);
    try {
      const res = await api.scuola.updateScrutinio(token, editScrutinio.periodo, {
        data,
        dataProposte,
        classiVisibili,
      });
      setScrutini((prev) => prev.map((item) => (
        item.periodo === editScrutinio.periodo ? res.data : item
      )));
      toast.success("Scrutinio aggiornato");
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }, [classiVisibili, data, dataProposte, editScrutinio, token]);

  const orderedScrutini = useMemo(() => {
    const order = ["P", "S", "F", "G", "R", "X"];
    return [...scrutini].sort((left, right) => order.indexOf(left.periodo) - order.indexOf(right.periodo));
  }, [scrutini]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scrutini</h1>
        <p className="text-muted-foreground">
          Configura i periodi di scrutinio, l&apos;apertura delle proposte e la pubblicazione per anno di corso.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <Skeleton className="h-28 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orderedScrutini.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nessun periodo di scrutinio disponibile.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orderedScrutini.map((scrutinio) => (
            <Card key={scrutinio.periodo} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <ClipboardList className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{scrutinio.periodoLabel}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {scrutinio.periodo}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(scrutinio)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Data scrutinio:</span>
                  <span className="font-medium">{formatDate(scrutinio.data)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Proposte:</span>
                  <span className="font-medium">{formatDate(scrutinio.dataProposte)}</span>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Pubblicazione esiti</div>
                  <div className="space-y-1 text-sm">
                    {ANNI_CORSO.map((anno) => (
                      <div key={anno} className="flex justify-between gap-3">
                        <span>{anno}ª</span>
                        <span className="text-right font-medium">
                          {formatDateTime(scrutinio.classiVisibili[String(anno)] ?? null)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editScrutinio ? `Configura ${editScrutinio.periodoLabel}` : "Configura scrutinio"}
            </DialogTitle>
            <DialogDescription>
              Imposta la data dello scrutinio, l&apos;inizio delle proposte di voto e la visibilità degli esiti per anno.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scrutinio-data">Data scrutinio *</Label>
              <Input
                id="scrutinio-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scrutinio-proposte">Apertura proposte *</Label>
              <Input
                id="scrutinio-proposte"
                type="date"
                value={dataProposte}
                onChange={(e) => setDataProposte(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Pubblicazione esiti per anno</Label>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="scrutinio-visibile-all">Data/ora comune</Label>
                  <Input
                    id="scrutinio-visibile-all"
                    type="datetime-local"
                    value={bulkVisibilita}
                    onChange={(e) => setBulkVisibilita(e.target.value)}
                  />
                </div>
                <Button type="button" variant="outline" onClick={applyBulkVisibilita}>
                  Applica a tutti
                </Button>
                <Button type="button" variant="outline" onClick={clearBulkVisibilita}>
                  Svuota tutti
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Usa queste azioni per impostare o azzerare rapidamente la pubblicazione esiti su tutti gli anni di corso.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {ANNI_CORSO.map((anno) => (
                <div key={anno} className="space-y-2">
                  <Label htmlFor={`scrutinio-visibile-${anno}`}>{anno}ª</Label>
                  <Input
                    id={`scrutinio-visibile-${anno}`}
                    type="datetime-local"
                    value={classiVisibili[String(anno)] ?? ""}
                    onChange={(e) => handleClassiVisibiliChange(anno, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving || !data || !dataProposte}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
