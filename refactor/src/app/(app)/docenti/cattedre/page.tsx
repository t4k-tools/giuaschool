"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import {
  api,
  type CattedraInfo,
  type ClasseInfo,
  type MateriaInfo,
  type DocenteOption,
} from "@/lib/api/client";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Filter, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Pagination = { page: number; limit: number; total: number; pages: number };

const TIPO_OPTIONS = [
  { value: "N", label: "Normale" },
  { value: "I", label: "ITP" },
  { value: "P", label: "Potenziamento" },
  { value: "A", label: "Att. Alternativa" },
];

interface CattedraFormData {
  docenteId: string;
  materiaId: string;
  classeId: string;
  tipo: string;
  supplenza: boolean;
  attiva: boolean;
}

const emptyForm: CattedraFormData = {
  docenteId: "",
  materiaId: "",
  classeId: "",
  tipo: "N",
  supplenza: false,
  attiva: true,
};

export default function CattedrePage() {
  const { token } = useAuth();
  const [cattedre, setCattedre] = useState<CattedraInfo[]>([]);
  const [classi, setClassi] = useState<ClasseInfo[]>([]);
  const [docenti, setDocenti] = useState<DocenteOption[]>([]);
  const [materie, setMaterie] = useState<MateriaInfo[]>([]);
  const [pagination, setPagination] = useState<Pagination>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterClasse, setFilterClasse] = useState<number | undefined>();

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCattedra, setEditCattedra] = useState<CattedraInfo | null>(null);
  const [formData, setFormData] = useState<CattedraFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCattedra, setDeleteCattedra] = useState<CattedraInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load options on mount
  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.classi.list(token, { limit: 100 }),
      api.docenti.options(token),
      api.materie.list(token),
    ]).then(([cRes, dRes, mRes]) => {
      setClassi(cRes.data);
      setDocenti(dRes.data);
      setMaterie(mRes.data);
    }).catch(() => {});
  }, [token]);

  const fetchCattedre = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.cattedre.list(token, { search, page, limit: 20, classe: filterClasse });
      setCattedre(res.data);
      setPagination(res.pagination);
    } catch {
      toast.error("Errore nel caricamento delle cattedre");
    } finally {
      setLoading(false);
    }
  }, [token, search, page, filterClasse]);

  useEffect(() => { fetchCattedre(); }, [fetchCattedre]);

  // ── CRUD handlers ──

  const handleCreate = () => {
    setEditCattedra(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (c: CattedraInfo) => {
    setEditCattedra(c);
    setFormData({
      docenteId: String(c.docente.id),
      materiaId: String(c.materia.id),
      classeId: String(c.classe.id),
      tipo: c.tipo,
      supplenza: c.supplenza,
      attiva: c.attiva,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    if (!formData.docenteId || !formData.materiaId || !formData.classeId) {
      toast.error("Docente, materia e classe sono obbligatori");
      return;
    }
    setSaving(true);
    try {
      if (editCattedra) {
        await api.cattedre.update(token, editCattedra.id, {
          docenteId: Number(formData.docenteId),
          materiaId: Number(formData.materiaId),
          classeId: Number(formData.classeId),
          tipo: formData.tipo,
          supplenza: formData.supplenza,
          attiva: formData.attiva,
        });
        toast.success("Cattedra aggiornata");
      } else {
        await api.cattedre.create(token, {
          docenteId: Number(formData.docenteId),
          materiaId: Number(formData.materiaId),
          classeId: Number(formData.classeId),
          tipo: formData.tipo,
          supplenza: formData.supplenza,
        });
        toast.success("Cattedra creata");
      }
      setDialogOpen(false);
      fetchCattedre();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOpen = (c: CattedraInfo) => {
    setDeleteCattedra(c);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!token || !deleteCattedra) return;
    setDeleting(true);
    try {
      await api.cattedre.delete(token, deleteCattedra.id);
      toast.success("Cattedra eliminata");
      setDeleteOpen(false);
      fetchCattedre();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nell'eliminazione");
    } finally {
      setDeleting(false);
    }
  };

  // ── Columns ──

  const columns: Column<CattedraInfo>[] = [
    {
      key: "docente",
      header: "Docente",
      render: (c) => (
        <span className="font-medium">{c.docente.cognome} {c.docente.nome}</span>
      ),
    },
    {
      key: "materia",
      header: "Materia",
      render: (c) => <Badge variant="outline">{c.materia.nomeBreve}</Badge>,
    },
    {
      key: "classe",
      header: "Classe",
      render: (c) => <Badge variant="secondary">{c.classe.nome}</Badge>,
    },
    {
      key: "tipo",
      header: "Tipo",
      className: "hidden md:table-cell",
      render: (c) => <span className="text-sm">{c.tipoLabel}</span>,
    },
    {
      key: "attiva",
      header: "Stato",
      render: (c) => (
        <div className="flex gap-1">
          <Badge variant={c.attiva ? "default" : "destructive"}>
            {c.attiva ? "Attiva" : "Inattiva"}
          </Badge>
          {c.supplenza && <Badge variant="secondary">Supplenza</Badge>}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); handleEdit(c); }}
            title="Modifica"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); handleDeleteOpen(c); }}
            title="Elimina"
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
          <h1 className="text-2xl font-bold tracking-tight">Cattedre</h1>
          <p className="text-muted-foreground">Gestisci le cattedre (assegnazioni docente-classe-materia)</p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={cattedre}
        pagination={pagination}
        loading={loading}
        searchPlaceholder="Cerca per docente o materia..."
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        onPageChange={setPage}
        onRowClick={(c) => handleEdit(c)}
        emptyMessage="Nessuna cattedra trovata."
        actions={
          <Select
            value={filterClasse ? String(filterClasse) : "all"}
            onValueChange={(v) => { setFilterClasse(v === "all" ? undefined : Number(v)); setPage(1); }}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtra classe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le classi</SelectItem>
              {classi.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* ──────── Create / Edit Dialog ──────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg flex flex-col max-h-[90vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>
              {editCattedra
                ? `Modifica: ${editCattedra.docente.cognome} — ${editCattedra.materia.nomeBreve} — ${editCattedra.classe.nome}`
                : "Nuova Cattedra"}
            </DialogTitle>
            <DialogDescription>
              {editCattedra
                ? "Modifica l'assegnazione docente-materia-classe."
                : "Crea una nuova assegnazione docente-materia-classe."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="grid gap-4 pb-2">
              <div className="space-y-2">
                <Label>Docente *</Label>
                <Select
                  value={formData.docenteId}
                  onValueChange={(v) => setFormData((p) => ({ ...p, docenteId: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleziona docente" /></SelectTrigger>
                  <SelectContent>
                    {docenti.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Materia *</Label>
                <Select
                  value={formData.materiaId}
                  onValueChange={(v) => setFormData((p) => ({ ...p, materiaId: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleziona materia" /></SelectTrigger>
                  <SelectContent>
                    {materie.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.nomeBreve} — {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Classe *</Label>
                <Select
                  value={formData.classeId}
                  onValueChange={(v) => setFormData((p) => ({ ...p, classeId: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleziona classe" /></SelectTrigger>
                  <SelectContent>
                    {classi.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => setFormData((p) => ({ ...p, tipo: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="supplenza-switch">Supplenza</Label>
                <Switch
                  id="supplenza-switch"
                  checked={formData.supplenza}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, supplenza: v }))}
                />
              </div>

              {editCattedra && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="attiva-switch">Attiva</Label>
                  <Switch
                    id="attiva-switch"
                    checked={formData.attiva}
                    onCheckedChange={(v) => setFormData((p) => ({ ...p, attiva: v }))}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ──────── Delete Confirmation ──────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa cattedra?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCattedra && (
                <>
                  Stai per eliminare la cattedra di{" "}
                  <strong>{deleteCattedra.docente.cognome} {deleteCattedra.docente.nome}</strong>
                  {" per "}
                  <strong>{deleteCattedra.materia.nomeBreve}</strong>
                  {" nella classe "}
                  <strong>{deleteCattedra.classe.nome}</strong>.
                  Questa azione non può essere annullata.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleting ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
