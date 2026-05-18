"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { api, type Alunno, type ClasseInfo } from "@/lib/api/client";
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
import { Pencil, ToggleLeft, Filter, ImageIcon, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Pagination = { page: number; limit: number; total: number; pages: number };

const BES_LABELS: Record<string, string> = {
  N: "No",
  H: "Disabilità",
  D: "DSA",
  B: "BES",
  A: "Altro",
};

const RELIGIONE_LABELS: Record<string, string> = {
  S: "Si avvale",
  U: "Esce",
  I: "Studio individuale",
  D: "Studio con docente",
  A: "Attività alternativa",
};

export default function AlunniModificaPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [alunni, setAlunni] = useState<Alunno[]>([]);
  const [classi, setClassi] = useState<ClasseInfo[]>([]);
  const [pagination, setPagination] = useState<Pagination>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterClasse, setFilterClasse] = useState<number | undefined>();

  // Dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editAlunno, setEditAlunno] = useState<Alunno | null>(null);
  const [formData, setFormData] = useState<Record<string, string | boolean | number | null>>({});
  const [saving, setSaving] = useState(false);
  const [newHandled, setNewHandled] = useState(false);

  // Load classi for filter
  useEffect(() => {
    if (!token) return;
    api.classi.list(token, { limit: 100 }).then((res) => setClassi(res.data)).catch(() => {});
  }, [token]);

  const fetchAlunni = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.alunni.list(token, { search, page, limit: 20, classe: filterClasse });
      setAlunni(res.data);
      setPagination(res.pagination);
    } catch (err) {
      toast.error("Errore nel caricamento degli alunni");
    } finally {
      setLoading(false);
    }
  }, [token, search, page, filterClasse]);

  useEffect(() => { fetchAlunni(); }, [fetchAlunni]);

  const handleSearch = (value: string) => { setSearch(value); setPage(1); };

  const handleCreate = () => {
    setEditAlunno(null);
    setFormData({
      nome: "",
      cognome: "",
      sesso: "M",
      username: "",
      email: "",
      codiceFiscale: "",
      dataNascita: "",
      bes: "N",
      religione: "S",
      fotoUrl: "",
      classe: null,
      password: "",
    });
    setEditOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("new") === "1" && !newHandled) {
      handleCreate();
      setNewHandled(true);
    }
  }, [searchParams, newHandled]);

  const handleEdit = (alunno: Alunno) => {
    setEditAlunno(alunno);
    setFormData({
      nome: alunno.nome,
      cognome: alunno.cognome,
      sesso: alunno.sesso,
      username: alunno.username,
      email: alunno.email,
      codiceFiscale: alunno.codiceFiscale || "",
      dataNascita: alunno.dataNascita || "",
      bes: alunno.bes,
      religione: alunno.religione,
      fotoUrl: alunno.fotoUrl || "",
      classe: alunno.classe?.id ?? null,
      password: "",
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    if (!(formData.cognome as string)?.trim() || !(formData.nome as string)?.trim()) {
      toast.error("Cognome e nome sono obbligatori");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...formData };
      if (!payload.password) delete payload.password;
      if (editAlunno) {
        await api.alunni.update(token, editAlunno.id, payload as Partial<Alunno>);
        toast.success("Alunno aggiornato con successo");
      } else {
        await api.alunni.create(token, payload as Partial<Alunno>);
        toast.success("Alunno creato con successo");
      }
      setEditOpen(false);
      fetchAlunni();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (alunno: Alunno) => {
    if (!token) return;
    try {
      const res = await api.alunni.toggleAbilita(token, alunno.id);
      toast.success(res.message);
      fetchAlunni();
    } catch {
      toast.error("Errore nella modifica dello stato");
    }
  };

  const columns: Column<Alunno>[] = [
    {
      key: "cognome",
      header: "Cognome",
      render: (a) => <span className="font-medium">{a.cognome}</span>,
    },
    { key: "nome", header: "Nome" },
    {
      key: "classe",
      header: "Classe",
      render: (a) => a.classe ? (
        <Badge variant="outline">{a.classe.nome}</Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      ),
    },
    { key: "username", header: "Username", className: "hidden md:table-cell" },
    {
      key: "bes",
      header: "BES",
      className: "hidden lg:table-cell",
      render: (a) => a.bes !== "N" ? (
        <Badge variant="secondary">{BES_LABELS[a.bes] || a.bes}</Badge>
      ) : null,
    },
    {
      key: "abilitato",
      header: "Stato",
      render: (a) => (
        <Badge variant={a.abilitato ? "default" : "destructive"}>
          {a.abilitato ? "Attivo" : "Disabilitato"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (a) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); handleEdit(a); }} title="Modifica">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); handleToggle(a); }}
            title={a.abilitato ? "Disabilita" : "Abilita"}>
            <ToggleLeft className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modifica Alunni</h1>
          <p className="text-muted-foreground">Gestisci i dati degli alunni dell&apos;istituto</p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={alunni}
        pagination={pagination}
        loading={loading}
        searchPlaceholder="Cerca per cognome, nome, username..."
        searchValue={search}
        onSearchChange={handleSearch}
        onPageChange={setPage}
        onRowClick={(a) => handleEdit(a)}
        emptyMessage="Nessun alunno trovato."
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editAlunno ? `Modifica: ${editAlunno.cognome} ${editAlunno.nome}` : "Nuovo Alunno"}
            </DialogTitle>
            <DialogDescription>
              {editAlunno ? "Modifica i dati dell'alunno." : "Inserisci i dati del nuovo alunno. Username e password verranno generati automaticamente se lasciati vuoti."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cognome *</Label>
                <Input value={formData.cognome as string}
                  onChange={(e) => setFormData({ ...formData, cognome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={formData.nome as string}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sesso</Label>
                <Select value={formData.sesso as string}
                  onValueChange={(v) => setFormData({ ...formData, sesso: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Maschio</SelectItem>
                    <SelectItem value="F">Femmina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Classe</Label>
                <Select value={formData.classe ? String(formData.classe) : "none"}
                  onValueChange={(v) => setFormData({ ...formData, classe: v === "none" ? null : Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuna</SelectItem>
                    {classi.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={formData.username as string}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email as string}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>BES</Label>
                <Select value={formData.bes as string}
                  onValueChange={(v) => setFormData({ ...formData, bes: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BES_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Religione</Label>
                <Select value={formData.religione as string}
                  onValueChange={(v) => setFormData({ ...formData, religione: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RELIGIONE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                {editAlunno ? "Nuova Password (lascia vuoto per non modificare)" : "Password (lascia vuoto per generare automaticamente)"}
              </Label>
              <Input type="password" value={formData.password as string}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fotoUrl">Foto (URL)</Label>
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 rounded-lg border overflow-hidden bg-muted flex items-center justify-center"
                  style={{ width: 76, height: 76 }}
                >
                  {(formData.fotoUrl as string) ? (
                    <img
                      src={formData.fotoUrl as string}
                      alt="Anteprima"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </div>
                <Input
                  id="fotoUrl"
                  type="url"
                  value={formData.fotoUrl as string}
                  onChange={(e) => setFormData({ ...formData, fotoUrl: e.target.value })}
                  placeholder="https://esempio.com/foto.jpg"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">Foto tessera 2×2 cm</p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
