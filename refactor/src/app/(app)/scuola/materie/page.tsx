"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type MateriaInfo } from "@/lib/api/client";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

const TIPO_OPTIONS = [
  { value: "N", label: "Normale" },
  { value: "R", label: "Religione" },
  { value: "S", label: "Sostegno" },
  { value: "C", label: "Condotta" },
  { value: "E", label: "Ed. Civica" },
  { value: "U", label: "Supplenza" },
];

const VALUTAZIONE_OPTIONS = [
  { value: "N", label: "Numerica" },
  { value: "G", label: "Giudizio" },
  { value: "A", label: "Assente" },
];

export default function MateriePage() {
  const { token } = useAuth();
  const [materie, setMaterie] = useState<MateriaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editMateria, setEditMateria] = useState<MateriaInfo | null>(null);
  const [formData, setFormData] = useState<Record<string, string | boolean | number>>({});
  const [saving, setSaving] = useState(false);

  const fetchMaterie = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.materie.list(token, { search: search || undefined });
      setMaterie(res.data);
    } catch {
      toast.error("Errore nel caricamento delle materie");
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => { fetchMaterie(); }, [fetchMaterie]);

  const handleCreate = () => {
    setEditMateria(null);
    setFormData({
      nome: "",
      nomeBreve: "",
      tipo: "N",
      valutazione: "N",
      media: true,
      ordinamento: 0,
    });
    setEditOpen(true);
  };

  const handleEdit = (materia: MateriaInfo) => {
    setEditMateria(materia);
    setFormData({
      nome: materia.nome,
      nomeBreve: materia.nomeBreve,
      tipo: materia.tipo,
      valutazione: materia.valutazione,
      media: materia.media,
      ordinamento: materia.ordinamento,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    if (!(formData.nome as string)?.trim() || !(formData.nomeBreve as string)?.trim()) {
      toast.error("Nome e nome breve sono obbligatori");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        nome: (formData.nome as string).trim(),
        nomeBreve: (formData.nomeBreve as string).trim(),
      } as Partial<MateriaInfo>;

      if (editMateria) {
        await api.materie.update(token, editMateria.id, payload);
        toast.success("Materia aggiornata");
      } else {
        await api.materie.create(token, payload);
        toast.success("Materia creata");
      }
      setEditOpen(false);
      fetchMaterie();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<MateriaInfo>[] = [
    {
      key: "nome",
      header: "Nome",
      render: (m) => <span className="font-medium">{m.nome}</span>,
    },
    {
      key: "nomeBreve",
      header: "Sigla",
      className: "hidden sm:table-cell",
      render: (m) => <Badge variant="outline">{m.nomeBreve}</Badge>,
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (m) => {
        const variant = m.tipo === "N" ? "default" : m.tipo === "S" ? "secondary" : "outline";
        return <Badge variant={variant}>{m.tipoLabel}</Badge>;
      },
    },
    {
      key: "valutazione",
      header: "Valutazione",
      className: "hidden md:table-cell",
      render: (m) => (
        <span className="text-sm">
          {m.valutazione === "N" ? "Numerica" : m.valutazione === "G" ? "Giudizio" : "Assente"}
        </span>
      ),
    },
    {
      key: "media",
      header: "Media",
      className: "hidden md:table-cell text-center",
      render: (m) => (
        <Badge variant={m.media ? "default" : "secondary"}>
          {m.media ? "Sì" : "No"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (m) => (
        <Button variant="ghost" size="icon" className="h-8 w-8"
          onClick={(e) => { e.stopPropagation(); handleEdit(m); }}>
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Materie</h1>
          <p className="text-muted-foreground">Gestisci le materie scolastiche</p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Nuova Materia
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={materie}
        loading={loading}
        searchPlaceholder="Cerca materia..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={(m) => handleEdit(m)}
        emptyMessage="Nessuna materia trovata."
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg flex flex-col max-h-[90vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{editMateria ? `Modifica: ${editMateria.nomeBreve}` : "Nuova Materia"}</DialogTitle>
            <DialogDescription>
              {editMateria ? "Modifica i dati della materia." : "Inserisci i dati della nuova materia."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6">
            <div className="grid gap-4 pb-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={formData.nome as string}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nome breve</Label>
                  <Input value={formData.nomeBreve as string}
                    onChange={(e) => setFormData({ ...formData, nomeBreve: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.tipo as string}
                    onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valutazione</Label>
                  <Select value={formData.valutazione as string}
                    onValueChange={(v) => setFormData({ ...formData, valutazione: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VALUTAZIONE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ordinamento</Label>
                  <Input type="number" value={formData.ordinamento as number}
                    onChange={(e) => setFormData({ ...formData, ordinamento: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={formData.media as boolean}
                    onCheckedChange={(v) => setFormData({ ...formData, media: v })} />
                  <Label>Includi nella media</Label>
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
