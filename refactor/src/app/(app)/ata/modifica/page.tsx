"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type AtaInfo, type SedeInfo } from "@/lib/api/client";
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
import { Pencil, ToggleLeft, ImageIcon, Plus } from "lucide-react";
import { toast } from "sonner";

type Pagination = { page: number; limit: number; total: number; pages: number };

const TIPO_LABELS: Record<string, string> = {
  A: "Amministrativo",
  T: "Tecnico",
  C: "Collaboratore",
  U: "Autista",
  D: "DSGA",
};

export default function AtaModificaPage() {
  const { token } = useAuth();
  const [ataList, setAtaList] = useState<AtaInfo[]>([]);
  const [sedi, setSedi] = useState<SedeInfo[]>([]);
  const [pagination, setPagination] = useState<Pagination>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editAta, setEditAta] = useState<AtaInfo | null>(null);
  const [formData, setFormData] = useState<Record<string, string | boolean | number | null>>({});
  const [saving, setSaving] = useState(false);

  // Load sedi for select
  useEffect(() => {
    if (!token) return;
    api.sedi.list(token).then((res) => setSedi(res.data)).catch(() => {});
  }, [token]);

  const fetchAta = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.ata.list(token, { search, page, limit: 20 });
      setAtaList(res.data);
      setPagination(res.pagination);
    } catch {
      toast.error("Errore nel caricamento del personale ATA");
    } finally {
      setLoading(false);
    }
  }, [token, search, page]);

  useEffect(() => { fetchAta(); }, [fetchAta]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleEdit = (ata: AtaInfo) => {
    setEditAta(ata);
    setFormData({
      nome: ata.nome,
      cognome: ata.cognome,
      sesso: ata.sesso,
      username: ata.username,
      email: ata.email,
      tipo: ata.tipo,
      segreteria: ata.segreteria,
      fotoUrl: ata.fotoUrl || "",
      sede: ata.sede?.id ?? null,
      password: "",
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!token || !editAta) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...formData };
      if (!payload.password) delete payload.password;
      if (payload.sede === null) delete payload.sede;
      await api.ata.update(token, editAta.id, payload);
      toast.success("Personale ATA aggiornato con successo");
      setEditOpen(false);
      fetchAta();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (ata: AtaInfo) => {
    if (!token) return;
    try {
      const res = await api.ata.toggleAbilita(token, ata.id);
      toast.success(res.message);
      fetchAta();
    } catch {
      toast.error("Errore nella modifica dello stato");
    }
  };

  const columns: Column<AtaInfo>[] = [
    {
      key: "cognome",
      header: "Cognome",
      render: (a) => <span className="font-medium">{a.cognome}</span>,
    },
    { key: "nome", header: "Nome" },
    {
      key: "tipo",
      header: "Tipo",
      className: "hidden sm:table-cell",
      render: (a) => (
        <Badge variant={a.tipo === "D" ? "default" : "secondary"}>
          {a.tipoLabel}
        </Badge>
      ),
    },
    {
      key: "sede",
      header: "Sede",
      className: "hidden md:table-cell",
      render: (a) => a.sede ? a.sede.nomeBreve : <span className="text-muted-foreground text-sm">&mdash;</span>,
    },
    {
      key: "segreteria",
      header: "Segreteria",
      className: "hidden lg:table-cell",
      render: (a) => a.segreteria ? (
        <Badge variant="outline">Segreteria</Badge>
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); handleEdit(a); }}
            title="Modifica"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); handleToggle(a); }}
            title={a.abilitato ? "Disabilita" : "Abilita"}
          >
            <ToggleLeft className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modifica Personale ATA</h1>
          <p className="text-muted-foreground">Gestisci i dati del personale ATA dell&apos;istituto</p>
        </div>
        <Button asChild>
          <Link href="/ata">
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi
          </Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={ataList}
        pagination={pagination}
        loading={loading}
        searchPlaceholder="Cerca per cognome, nome, username..."
        searchValue={search}
        onSearchChange={handleSearch}
        onPageChange={setPage}
        onRowClick={(a) => handleEdit(a)}
        emptyMessage="Nessun personale ATA trovato."
      />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editAta ? `Modifica: ${editAta.cognome} ${editAta.nome}` : "Dettaglio ATA"}
            </DialogTitle>
            <DialogDescription>Modifica i dati del personale ATA.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cognome *</Label>
                <Input
                  value={formData.cognome as string}
                  onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.nome as string}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sesso *</Label>
                <Select
                  value={formData.sesso as string}
                  onValueChange={(v) => setFormData({ ...formData, sesso: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Maschio</SelectItem>
                    <SelectItem value="F">Femmina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={formData.tipo as string}
                  onValueChange={(v) => setFormData({ ...formData, tipo: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Username *</Label>
              <Input
                value={formData.username as string}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email as string}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Sede</Label>
              <Select
                value={formData.sede ? String(formData.sede) : "none"}
                onValueChange={(v) => setFormData({ ...formData, sede: v === "none" ? null : Number(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuna</SelectItem>
                  {sedi.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="segreteria"
                checked={formData.segreteria as boolean}
                onCheckedChange={(v) => setFormData({ ...formData, segreteria: v })}
              />
              <Label htmlFor="segreteria">Accesso Segreteria</Label>
            </div>

            <div className="space-y-2">
              <Label>Nuova Password (lascia vuoto per non modificare)</Label>
              <Input
                type="password"
                value={formData.password as string}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
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
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
