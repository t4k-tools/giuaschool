"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type FestivitaInfo, type SedeInfo } from "@/lib/api/client";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TIPO_OPTIONS = [
  { value: "F", label: "Festivita" },
  { value: "A", label: "Assemblea" },
];

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function FestivitaPage() {
  const { token } = useAuth();
  const [festivita, setFestivita] = useState<FestivitaInfo[]>([]);
  const [sedi, setSedi] = useState<SedeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog create/edit
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<FestivitaInfo | null>(null);
  const [formData, setFormData] = useState<{
    data: string;
    descrizione: string;
    tipo: string;
    sede: string;
  }>({ data: "", descrizione: "", tipo: "F", sede: "none" });
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<FestivitaInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.sedi.list(token).then((res) => setSedi(res.data)).catch(() => {});
  }, [token]);

  const fetchFestivita = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.scuola.festivita(token);
      setFestivita(res.data);
    } catch {
      toast.error("Errore nel caricamento delle festivita");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFestivita();
  }, [fetchFestivita]);

  const handleCreate = () => {
    setEditItem(null);
    setFormData({ data: "", descrizione: "", tipo: "F", sede: "none" });
    setEditOpen(true);
  };

  const handleEdit = (item: FestivitaInfo) => {
    setEditItem(item);
    setFormData({
      data: item.data ? item.data.substring(0, 10) : "",
      descrizione: item.descrizione,
      tipo: item.tipo,
      sede: item.sede ? String(item.sede.id) : "none",
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    if (!formData.data || !formData.descrizione) {
      toast.error("Compila data e descrizione");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        data: formData.data,
        descrizione: formData.descrizione,
        tipo: formData.tipo,
        sede: formData.sede !== "none" ? Number(formData.sede) : null,
      };
      if (editItem) {
        await api.scuola.updateFestivita(token, editItem.id, payload);
        toast.success("Festivita aggiornata");
      } else {
        await api.scuola.createFestivita(token, payload);
        toast.success("Festivita creata");
      }
      setEditOpen(false);
      fetchFestivita();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!token || !deleteItem) return;
    setDeleting(true);
    try {
      await api.scuola.deleteFestivita(token, deleteItem.id);
      toast.success("Festivita eliminata");
      setDeleteOpen(false);
      setDeleteItem(null);
      fetchFestivita();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nell'eliminazione");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<FestivitaInfo>[] = [
    {
      key: "data",
      header: "Data",
      render: (f) => <span className="font-medium">{formatDate(f.data)}</span>,
    },
    {
      key: "descrizione",
      header: "Descrizione",
      render: (f) => <span>{f.descrizione}</span>,
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (f) => (
        <Badge variant={f.tipo === "F" ? "default" : "secondary"}>
          {f.tipoLabel}
        </Badge>
      ),
    },
    {
      key: "sede",
      header: "Sede",
      className: "hidden sm:table-cell",
      render: (f) =>
        f.sede ? (
          <Badge variant="outline">{f.sede.nomeBreve}</Badge>
        ) : (
          <span className="text-muted-foreground">Tutte</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (f) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(f);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteItem(f);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Festivita</h1>
          <p className="text-muted-foreground">
            Gestisci le festivita e le assemblee
          </p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Nuova Festivita
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={festivita}
        loading={loading}
        emptyMessage="Nessuna festivita configurata."
      />

      {/* Create/Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg flex flex-col max-h-[90vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>
              {editItem
                ? `Modifica: ${editItem.descrizione}`
                : "Nuova Festivita"}
            </DialogTitle>
            <DialogDescription>
              {editItem
                ? "Modifica i dati della festivita."
                : "Inserisci i dati della nuova festivita."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="grid gap-4 pb-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input
                    type="date"
                    value={formData.data}
                    onChange={(e) =>
                      setFormData({ ...formData, data: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(v) => setFormData({ ...formData, tipo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPO_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrizione *</Label>
                <Input
                  value={formData.descrizione}
                  onChange={(e) =>
                    setFormData({ ...formData, descrizione: e.target.value })
                  }
                  placeholder="Es. Festa della Repubblica"
                />
              </div>
              <div className="space-y-2">
                <Label>Sede (opzionale)</Label>
                <Select
                  value={formData.sede}
                  onValueChange={(v) => setFormData({ ...formData, sede: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tutte le sedi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tutte le sedi</SelectItem>
                    {sedi.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.nomeBreve}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare la festivita &quot;{deleteItem?.descrizione}&quot;?
              Questa azione non puo essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
