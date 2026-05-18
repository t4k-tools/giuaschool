"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { api, type ClasseInfo, type SedeInfo, type CorsoInfo } from "@/lib/api/client";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Loader2, Filter } from "lucide-react";
import { toast } from "sonner";

type Pagination = { page: number; limit: number; total: number; pages: number };

interface ClasseFormData {
  anno: number;
  sezione: string;
  gruppo: string;
  oreSettimanali: number;
  sedeId: string;
  corsoId: string;
}

const emptyForm: ClasseFormData = {
  anno: 1,
  sezione: "",
  gruppo: "",
  oreSettimanali: 27,
  sedeId: "",
  corsoId: "",
};

export default function ClassiPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [classi, setClassi] = useState<ClasseInfo[]>([]);
  const [sedi, setSedi] = useState<SedeInfo[]>([]);
  const [corsi, setCorsi] = useState<CorsoInfo[]>([]);
  const [pagination, setPagination] = useState<Pagination>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterSede, setFilterSede] = useState<number | undefined>();

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClasse, setEditClasse] = useState<ClasseInfo | null>(null);
  const [formData, setFormData] = useState<ClasseFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [newHandled, setNewHandled] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteClasse, setDeleteClasse] = useState<ClasseInfo | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Fetch lookup data on mount
  useEffect(() => {
    if (!token) return;
    api.sedi.list(token).then((res) => setSedi(res.data)).catch(() => {});
    api.corsi.list(token).then((res) => setCorsi(res.data)).catch(() => {});
  }, [token]);

  const fetchClassi = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.classi.list(token, { search, page, limit: 20, sede: filterSede });
      setClassi(res.data);
      setPagination(res.pagination);
    } catch {
      toast.error("Errore nel caricamento delle classi");
    } finally {
      setLoading(false);
    }
  }, [token, search, page, filterSede]);

  useEffect(() => {
    fetchClassi();
  }, [fetchClassi]);

  // ── Create ──
  const handleCreate = () => {
    setEditClasse(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("new") === "1" && !newHandled) {
      handleCreate();
      setNewHandled(true);
    }
  }, [searchParams, newHandled]);

  // ── Edit ──
  const handleEdit = (classe: ClasseInfo) => {
    setEditClasse(classe);
    setFormData({
      anno: classe.anno,
      sezione: classe.sezione,
      gruppo: classe.gruppo || "",
      oreSettimanali: classe.oreSettimanali,
      sedeId: String(classe.sede.id),
      corsoId: String(classe.corso.id),
    });
    setDialogOpen(true);
  };

  // ── Save (create or update) ──
  const handleSave = async () => {
    if (!token) return;
    if (!formData.sezione.trim()) {
      toast.error("La sezione è obbligatoria");
      return;
    }
    if (!formData.sedeId) {
      toast.error("Seleziona una sede");
      return;
    }
    if (!formData.corsoId) {
      toast.error("Seleziona un corso");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        anno: formData.anno,
        sezione: formData.sezione.trim(),
        gruppo: formData.gruppo.trim() || undefined,
        oreSettimanali: formData.oreSettimanali,
        sedeId: Number(formData.sedeId),
        corsoId: Number(formData.corsoId),
      };

      if (editClasse) {
        await api.classi.update(token, editClasse.id, payload);
        toast.success("Classe aggiornata");
      } else {
        await api.classi.create(token, payload as { anno: number; sezione: string; gruppo?: string; oreSettimanali?: number; sedeId: number; corsoId: number });
        toast.success("Classe creata");
      }
      setDialogOpen(false);
      fetchClassi();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──
  const handleDeleteOpen = (classe: ClasseInfo) => {
    setDeleteClasse(classe);
    setDeleteConfirm("");
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!token || !deleteClasse) return;
    setDeleting(true);
    try {
      await api.classi.delete(token, deleteClasse.id);
      toast.success("Classe eliminata");
      setDeleteOpen(false);
      fetchClassi();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nell'eliminazione");
    } finally {
      setDeleting(false);
    }
  };

  // ── Form field helpers ──
  const updateField = <K extends keyof ClasseFormData>(key: K, value: ClasseFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };


  // ── Table columns ──
  const columns: Column<ClasseInfo>[] = [
    {
      key: "nome",
      header: "Classe",
      render: (c) => <span className="font-medium text-lg">{c.nome}</span>,
    },
    {
      key: "corso",
      header: "Corso",
      render: (c) => <Badge variant="outline">{c.corso.nomeBreve}</Badge>,
    },
    {
      key: "sede",
      header: "Sede",
      className: "hidden sm:table-cell",
      render: (c) => <Badge variant="secondary">{c.sede.nomeBreve}</Badge>,
    },
    {
      key: "oreSettimanali",
      header: "Ore/Sett.",
      className: "hidden md:table-cell text-center",
      render: (c) => <span>{c.oreSettimanali}</span>,
    },
    {
      key: "coordinatore",
      header: "Coordinatore",
      className: "hidden lg:table-cell",
      render: (c) =>
        c.coordinatore ? (
          <span>{c.coordinatore.cognome} {c.coordinatore.nome}</span>
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        ),
    },
    {
      key: "segretario",
      header: "Segretario",
      className: "hidden xl:table-cell",
      render: (c) =>
        c.segretario ? (
          <span>{c.segretario.cognome} {c.segretario.nome}</span>
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        ),
    },
    {
      key: "azioni",
      header: "",
      className: "w-[80px]",
      render: (c) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(c);
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
              handleDeleteOpen(c);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Classi</h1>
          <p className="text-muted-foreground">Visualizza e gestisci le classi dell&apos;istituto</p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi
        </Button>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={classi}
        pagination={pagination}
        loading={loading}
        searchPlaceholder="Cerca per sezione, corso, sede..."
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onPageChange={setPage}
        emptyMessage="Nessuna classe trovata."
        actions={
          <Select
            value={filterSede ? String(filterSede) : "all"}
            onValueChange={(v) => {
              setFilterSede(v === "all" ? undefined : Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtra sede" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le sedi</SelectItem>
              {sedi.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.nomeBreve}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg flex flex-col max-h-[90vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{editClasse ? `Modifica: ${editClasse.nome}` : "Nuova Classe"}</DialogTitle>
            <DialogDescription>
              {editClasse ? "Modifica i dati della classe." : "Inserisci i dati della nuova classe."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="grid gap-4 pb-2">
              {/* Anno + Sezione */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="classe-anno">Anno *</Label>
                  <Input
                    id="classe-anno"
                    type="number"
                    min={1}
                    max={5}
                    value={formData.anno}
                    onChange={(e) => updateField("anno", parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classe-sezione">Sezione *</Label>
                  <Input
                    id="classe-sezione"
                    placeholder="es. A"
                    value={formData.sezione}
                    onChange={(e) => updateField("sezione", e.target.value)}
                  />
                </div>
              </div>

              {/* Gruppo + Ore settimanali */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="classe-gruppo">Gruppo</Label>
                  <Input
                    id="classe-gruppo"
                    placeholder="es. Informatica"
                    value={formData.gruppo}
                    onChange={(e) => updateField("gruppo", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classe-ore">Ore settimanali</Label>
                  <Input
                    id="classe-ore"
                    type="number"
                    min={1}
                    value={formData.oreSettimanali}
                    onChange={(e) => updateField("oreSettimanali", parseInt(e.target.value) || 27)}
                  />
                </div>
              </div>

              {/* Sede */}
              <div className="space-y-2">
                <Label>Sede *</Label>
                <Select value={formData.sedeId} onValueChange={(v) => updateField("sedeId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {sedi.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.nome} ({s.nomeBreve})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Corso */}
              <div className="space-y-2">
                <Label>Corso *</Label>
                <Select value={formData.corsoId} onValueChange={(v) => updateField("corsoId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona corso" />
                  </SelectTrigger>
                  <SelectContent>
                    {corsi.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome} ({c.nomeBreve})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la classe &quot;{deleteClasse?.nome}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Tutti gli alunni, le cattedre e i dati
              associati a questa classe potrebbero essere interessati. Per confermare, digita{" "}
              <span className="font-semibold text-foreground">{deleteClasse?.nome}</span> nel campo sottostante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              placeholder={`Digita "${deleteClasse?.nome}" per confermare`}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || deleteConfirm !== deleteClasse?.nome}
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
