"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

function toDatetimeLocal(isoString: string): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch {
    return "";
  }
}

function getStatus(inizio: string, fine: string): { label: string; active: boolean } {
  if (!inizio || !fine) return { label: "Non programmata", active: false };
  const now = new Date();
  const start = new Date(inizio);
  const end = new Date(fine);
  if (now >= start && now <= end) return { label: "In corso", active: true };
  if (now < start) return { label: "Programmata", active: false };
  return { label: "Terminata", active: false };
}

export default function ManutenzionePage() {
  const { token } = useAuth();
  const [inizio, setInizio] = useState("");
  const [fine, setFine] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchManutenzione = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.sistema.manutenzione(token);
      setInizio(toDatetimeLocal(res.inizio));
      setFine(toDatetimeLocal(res.fine));
    } catch {
      toast.error("Errore nel caricamento della manutenzione");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchManutenzione();
  }, [fetchManutenzione]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await api.sistema.updateManutenzione(token, {
        inizio: inizio ? new Date(inizio).toISOString() : "",
        fine: fine ? new Date(fine).toISOString() : "",
      });
      toast.success("Manutenzione aggiornata");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Errore nel salvataggio"
      );
    } finally {
      setSaving(false);
    }
  };

  const status = getStatus(inizio, fine);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manutenzione</h1>
        <p className="text-muted-foreground">
          Programma una finestra di manutenzione del sistema
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Finestra di Manutenzione
            </CardTitle>
            <Badge variant={status.active ? "destructive" : "secondary"}>
              {status.label}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inizio">Data e ora inizio</Label>
                <Input
                  id="inizio"
                  type="datetime-local"
                  value={inizio}
                  onChange={(e) => setInizio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fine">Data e ora fine</Label>
                <Input
                  id="fine"
                  type="datetime-local"
                  value={fine}
                  onChange={(e) => setFine(e.target.value)}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Durante la finestra di manutenzione il sistema non sara
              accessibile agli utenti. Lasciare i campi vuoti per disabilitare
              la manutenzione.
            </p>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {saving ? "Salvataggio..." : "Salva"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
