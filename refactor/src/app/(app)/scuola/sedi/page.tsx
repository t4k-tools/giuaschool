"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { api, type SedeInfo } from "@/lib/api/client";
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
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Phone, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

export default function SediPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [sedi, setSedi] = useState<SedeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editSede, setEditSede] = useState<SedeInfo | null>(null);
  const [formData, setFormData] = useState<Record<string, string | number>>({});
  const [saving, setSaving] = useState(false);
  const [newHandled, setNewHandled] = useState(false);

  const fetchSedi = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.sedi.list(token);
      setSedi(res.data);
    } catch {
      toast.error("Errore nel caricamento delle sedi");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchSedi(); }, [fetchSedi]);

  const handleEdit = (sede: SedeInfo) => {
    setEditSede(sede);
    setFormData({
      nome: sede.nome,
      nomeBreve: sede.nomeBreve,
      citta: sede.citta || "",
      indirizzo1: sede.indirizzo1 || "",
      indirizzo2: sede.indirizzo2 || "",
      telefono: sede.telefono || "",
      ordinamento: sede.ordinamento,
    });
    setEditOpen(true);
  };

  const handleCreate = () => {
    setEditSede(null);
    setFormData({ nome: "", nomeBreve: "", citta: "", indirizzo1: "", indirizzo2: "", telefono: "", ordinamento: 0 });
    setEditOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("new") === "1" && !newHandled) {
      handleCreate();
      setNewHandled(true);
    }
  }, [searchParams, newHandled]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      if (editSede) {
        await api.sedi.update(token, editSede.id, formData as Partial<SedeInfo>);
        toast.success("Sede aggiornata");
      } else {
        await api.sedi.create(token, formData as Partial<SedeInfo>);
        toast.success("Sede creata");
      }
      setEditOpen(false);
      fetchSedi();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sedi</h1>
          <p className="text-muted-foreground">Gestisci le sedi scolastiche</p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Nuova Sede
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : sedi.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nessuna sede configurata.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sedi.map((sede) => (
            <Card key={sede.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">{sede.nome}</CardTitle>
                  <p className="text-sm text-muted-foreground">{sede.nomeBreve}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(sede)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {(sede.indirizzo1 || sede.citta) && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      {sede.indirizzo1 && <div>{sede.indirizzo1}</div>}
                      {sede.indirizzo2 && <div>{sede.indirizzo2}</div>}
                      {sede.citta && <div>{sede.citta}</div>}
                    </div>
                  </div>
                )}
                {sede.telefono && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{sede.telefono}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg flex flex-col max-h-[90vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{editSede ? `Modifica: ${editSede.nomeBreve}` : "Nuova Sede"}</DialogTitle>
            <DialogDescription>
              {editSede ? "Modifica i dati della sede." : "Inserisci i dati della nuova sede."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="grid gap-4 pb-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={formData.nome as string}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nome breve *</Label>
                  <Input value={formData.nomeBreve as string}
                    onChange={(e) => setFormData({ ...formData, nomeBreve: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Indirizzo</Label>
                <Input value={formData.indirizzo1 as string}
                  onChange={(e) => setFormData({ ...formData, indirizzo1: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CAP/Città (riga 2)</Label>
                  <Input value={formData.indirizzo2 as string}
                    onChange={(e) => setFormData({ ...formData, indirizzo2: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Città</Label>
                  <Input value={formData.citta as string}
                    onChange={(e) => setFormData({ ...formData, citta: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefono</Label>
                  <Input value={formData.telefono as string}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Ordinamento</Label>
                  <Input type="number" value={formData.ordinamento as number}
                    onChange={(e) => setFormData({ ...formData, ordinamento: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
