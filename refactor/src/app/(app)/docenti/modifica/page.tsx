"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { api, type Docente } from "@/lib/api/client";
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
import { UserPlus, Pencil, ToggleLeft, ImageIcon } from "lucide-react";
import { toast } from "sonner";

type Pagination = { page: number; limit: number; total: number; pages: number };

export default function DocentiModificaPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [docenti, setDocenti] = useState<Docente[]>([]);
  const [pagination, setPagination] = useState<Pagination>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editDocente, setEditDocente] = useState<Docente | null>(null);
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [newHandled, setNewHandled] = useState(false);

  const fetchDocenti = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.docenti.list(token, { search, page, limit: 20 });
      setDocenti(res.data);
      setPagination(res.pagination);
    } catch {
      toast.error("Errore nel caricamento dei docenti");
    } finally {
      setLoading(false);
    }
  }, [token, search, page]);

  useEffect(() => { fetchDocenti(); }, [fetchDocenti]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleEdit = (docente: Docente) => {
    setEditDocente(docente);
    setFormData({
      nome: docente.nome,
      cognome: docente.cognome,
      sesso: docente.sesso,
      username: docente.username,
      email: docente.email,
      codiceFiscale: docente.codiceFiscale || "",
      spid: docente.spid,
      fotoUrl: docente.fotoUrl || "",
      password: "",
    });
    setEditOpen(true);
  };

  const handleCreate = () => {
    setEditDocente(null);
    setFormData({
      nome: "",
      cognome: "",
      sesso: "M",
      username: "",
      email: "",
      codiceFiscale: "",
      spid: true,
      fotoUrl: "",
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

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...formData };
      if (!payload.password) delete payload.password;

      if (editDocente) {
        await api.docenti.update(token, editDocente.id, payload as Partial<Docente>);
        toast.success("Docente aggiornato con successo");
      } else {
        const res = await api.docenti.create(token, payload as Partial<Docente> & { password?: string });
        if (res.generatedPassword) {
          toast.success(`Docente creato. Password generata: ${res.generatedPassword}`);
        } else {
          toast.success("Docente creato con successo");
        }
      }
      setEditOpen(false);
      fetchDocenti();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (docente: Docente) => {
    if (!token) return;
    try {
      const res = await api.docenti.toggleAbilita(token, docente.id);
      toast.success(res.message);
      fetchDocenti();
    } catch {
      toast.error("Errore nella modifica dello stato");
    }
  };

  const columns: Column<Docente>[] = [
    {
      key: "cognome",
      header: "Cognome",
      render: (d) => <span className="font-medium">{d.cognome}</span>,
    },
    { key: "nome", header: "Nome" },
    { key: "username", header: "Username", className: "hidden md:table-cell" },
    { key: "email", header: "Email", className: "hidden lg:table-cell" },
    {
      key: "ruolo",
      header: "Ruolo",
      className: "hidden sm:table-cell",
      render: (d) => (
        <Badge variant={d.ruolo === "Dirigente" ? "default" : d.ruolo === "Staff" ? "secondary" : "outline"}>
          {d.ruolo}
        </Badge>
      ),
    },
    {
      key: "abilitato",
      header: "Stato",
      render: (d) => (
        <Badge variant={d.abilitato ? "default" : "destructive"}>
          {d.abilitato ? "Attivo" : "Disabilitato"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (d) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); handleEdit(d); }}
            title="Modifica"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); handleToggle(d); }}
            title={d.abilitato ? "Disabilita" : "Abilita"}
          >
            <ToggleLeft className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Modifica Docenti</h1>
        <p className="text-muted-foreground">Gestisci i dati dei docenti dell&apos;istituto</p>
      </div>

      <DataTable
        columns={columns}
        data={docenti}
        pagination={pagination}
        loading={loading}
        searchPlaceholder="Cerca per cognome, nome, username..."
        searchValue={search}
        onSearchChange={handleSearch}
        onPageChange={setPage}
        onRowClick={(d) => handleEdit(d)}
        emptyMessage="Nessun docente trovato."
        actions={
          <Button onClick={handleCreate} size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Nuovo Docente
          </Button>
        }
      />

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editDocente ? `Modifica: ${editDocente.cognome} ${editDocente.nome}` : "Nuovo Docente"}
            </DialogTitle>
            <DialogDescription>
              {editDocente ? "Modifica i dati del docente." : "Inserisci i dati del nuovo docente."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cognome">Cognome *</Label>
                <Input
                  id="cognome"
                  value={formData.cognome as string}
                  onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome as string}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sesso">Sesso *</Label>
                <Select
                  value={formData.sesso as string}
                  onValueChange={(v) => setFormData({ ...formData, sesso: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Maschio</SelectItem>
                    <SelectItem value="F">Femmina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="codiceFiscale">Codice Fiscale</Label>
                <Input
                  id="codiceFiscale"
                  value={formData.codiceFiscale as string}
                  onChange={(e) => setFormData({ ...formData, codiceFiscale: e.target.value })}
                  maxLength={16}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username as string}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email as string}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {editDocente ? "Nuova Password (lascia vuoto per non modificare)" : "Password (lascia vuoto per generare)"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password as string}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="spid"
                checked={formData.spid as boolean}
                onCheckedChange={(v) => setFormData({ ...formData, spid: v })}
              />
              <Label htmlFor="spid">Accesso SPID abilitato</Label>
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
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
