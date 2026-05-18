"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type ModuloInfo } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, MapPin, Paperclip, Users, Loader2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";

export default function ModuliPage() {
  const { token } = useAuth();
  const [moduli, setModuli] = useState<ModuloInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | "enabled" | "disabled">("all");

  const [editTarget, setEditTarget] = useState<ModuloInfo | null>(null);
  const [editUnica, setEditUnica] = useState(false);
  const [editGestione, setEditGestione] = useState(true);
  const [editAllegati, setEditAllegati] = useState(0);
  const [saving, setSaving] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const fetchModuli = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.scuola.moduli(token);
      setModuli(res.data);
    } catch {
      toast.error("Errore nel caricamento dei moduli");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchModuli();
  }, [fetchModuli]);

  const filteredModuli = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();

    return moduli.filter((modulo) => {
      const matchesState =
        stateFilter === "all" ||
        (stateFilter === "enabled" && modulo.abilitata) ||
        (stateFilter === "disabled" && !modulo.abilitata);

      if (!matchesState) {
        return false;
      }

      if (normalized === "") {
        return true;
      }

      return [
        modulo.nome,
        modulo.tipo,
        modulo.sede?.nomeBreve ?? "",
        modulo.richiedenti.join(" "),
        modulo.destinatari.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [deferredSearch, moduli, stateFilter]);

  async function handleToggle(id: number) {
    if (!token) return;
    setTogglingId(id);
    try {
      const res = await api.scuola.toggleModulo(token, id);
      setModuli((prev) => prev.map((m) => (m.id === id ? res.data : m)));
      toast.success(res.message);
    } catch {
      toast.error("Errore durante l'aggiornamento del modulo");
    } finally {
      setTogglingId(null);
    }
  }

  function openEdit(modulo: ModuloInfo) {
    setEditTarget(modulo);
    setEditUnica(modulo.unica);
    setEditGestione(modulo.gestione);
    setEditAllegati(modulo.allegati);
  }

  async function handleSave() {
    if (!token || !editTarget) return;
    setSaving(true);
    try {
      const res = await api.scuola.updateModulo(token, editTarget.id, {
        unica: editUnica,
        gestione: editGestione,
        allegati: editAllegati,
      });
      setModuli((prev) => prev.map((m) => (m.id === editTarget.id ? res.data : m)));
      toast.success(res.message);
      setEditTarget(null);
    } catch {
      toast.error("Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Moduli</h1>
        <p className="text-muted-foreground">Moduli di richiesta disponibili</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cerca per nome, tipo, sede, ruoli..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={stateFilter} onValueChange={(value: "all" | "enabled" | "disabled") => setStateFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i moduli</SelectItem>
              <SelectItem value="enabled">Solo abilitati</SelectItem>
              <SelectItem value="disabled">Solo disabilitati</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredModuli.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nessun modulo trovato con i filtri selezionati.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredModuli.map((modulo) => {
            const isToggling = togglingId === modulo.id;
            return (
              <Card key={modulo.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{modulo.nome}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-0.5">{modulo.tipo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(modulo)}
                        title="Modifica impostazioni"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isToggling ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {modulo.abilitata ? "Abilitata" : "Disabilitata"}
                        </span>
                      )}
                      <Switch
                        checked={modulo.abilitata}
                        onCheckedChange={() => handleToggle(modulo.id)}
                        disabled={isToggling}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {modulo.unica && <Badge variant="outline">Richiesta unica</Badge>}
                    {modulo.gestione && <Badge variant="outline">Gestione</Badge>}
                    {modulo.allegati > 0 && (
                      <Badge variant="outline">
                        <Paperclip className="mr-1 h-3 w-3" />
                        {modulo.allegati} allegat{modulo.allegati === 1 ? "o" : "i"}
                      </Badge>
                    )}
                  </div>

                  {modulo.richiedenti.length > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                      <Users className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <span className="text-muted-foreground">Richiedenti: </span>
                        {modulo.richiedenti.join(", ")}
                      </div>
                    </div>
                  )}

                  {modulo.destinatari.length > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                      <Users className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <span className="text-muted-foreground">Destinatari: </span>
                        {modulo.destinatari.join(", ")}
                      </div>
                    </div>
                  )}

                  {modulo.sede && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline">{modulo.sede.nomeBreve}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editTarget !== null} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica modulo: {editTarget?.nome}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Richiesta unica</Label>
                <p className="text-sm text-muted-foreground">
                  Una sola richiesta attiva per utente
                </p>
              </div>
              <Switch checked={editUnica} onCheckedChange={setEditUnica} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Gestione stati</Label>
                <p className="text-sm text-muted-foreground">
                  Richiede workflow di approvazione
                </p>
              </div>
              <Switch checked={editGestione} onCheckedChange={setEditGestione} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="allegati">Numero allegati richiesti</Label>
              <Input
                id="allegati"
                type="number"
                min={0}
                max={10}
                value={editAllegati}
                onChange={(e) => setEditAllegati(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>
              Annulla
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
