"use client";

import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import {
  api,
  type SegreteriaGenitoriRow,
  type SegreteriaGenitore,
} from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Plus, ShieldCheck, UserX } from "lucide-react";
import { toast } from "sonner";

export default function SegreteriaGenitoriPage() {
  const { token } = useAuth();

  const [classi, setClassi] = useState<{ id: number; nome: string }[]>([]);
  const [classeFilter, setClasseFilter] = useState<string>("all");
  const [cognomeFilter, setCognomeFilter] = useState("");
  const [nomeFilter, setNomeFilter] = useState("");
  const deferredCognomeFilter = useDeferredValue(cognomeFilter);
  const deferredNomeFilter = useDeferredValue(nomeFilter);
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<SegreteriaGenitoriRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, maxPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [editGenitore, setEditGenitore] = useState<SegreteriaGenitore | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editTelefoni, setEditTelefoni] = useState("");
  const [createRow, setCreateRow] = useState<SegreteriaGenitoriRow | null>(null);
  const [createNome, setCreateNome] = useState("");
  const [createCognome, setCreateCognome] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createSesso, setCreateSesso] = useState<"F" | "M">("F");
  const [createTelefoni, setCreateTelefoni] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);
  const [disableTarget, setDisableTarget] = useState<SegreteriaGenitore | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    void api.segreteria.classi(token).then((r) => setClassi(r.data)).catch(() => {});
  }, [token]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.segreteria.genitori(token, {
        classe: classeFilter !== "all" ? Number(classeFilter) : undefined,
        cognome: deferredCognomeFilter || undefined,
        nome: deferredNomeFilter || undefined,
        pagina: page,
      });
      setItems(res.data.items);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel caricamento.");
    } finally {
      setLoading(false);
    }
  }, [token, classeFilter, deferredCognomeFilter, deferredNomeFilter, page]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const openEdit = (g: SegreteriaGenitore) => {
    setEditGenitore(g);
    setEditEmail(g.email ?? "");
    setEditTelefoni((g.telefoni ?? []).join(", "));
  };

  const openCreate = (row: SegreteriaGenitoriRow) => {
    setCreateRow(row);
    setCreateNome("");
    setCreateCognome(row.displayName.split(" ")[0] ?? "");
    setCreateEmail("");
    setCreateUsername("");
    setCreateSesso("F");
    setCreateTelefoni("");
  };

  const handleSave = async () => {
    if (!token || !editGenitore) return;
    setSaving(true);
    try {
      const telefoni = editTelefoni
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await api.segreteria.genitoreEdit(token, editGenitore.id, {
        email: editEmail.trim() || undefined,
        telefoni,
      });
      toast.success("Dati aggiornati.");
      setEditGenitore(null);
      void fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!token || !createRow) return;
    setSaving(true);
    try {
      const telefoni = createTelefoni
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await api.segreteria.genitoreCreate(token, createRow.id, {
        nome: createNome.trim(),
        cognome: createCognome.trim(),
        email: createEmail.trim(),
        username: createUsername.trim() || undefined,
        sesso: createSesso,
        telefoni,
      });
      setCreatedCredentials({
        username: res.data.genitore.username ?? createUsername.trim(),
        password: res.data.generatedPassword,
      });
      toast.success("Genitore creato.");
      setCreateRow(null);
      void fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nella creazione del genitore.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!token || !disableTarget) return;
    setSaving(true);
    try {
      const res = await api.segreteria.genitoreToggleAbilita(token, disableTarget.id);
      toast.success(res.message);
      setDisableTarget(null);
      void fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nella disabilitazione del genitore.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Genitori — Segreteria</h1>
        <p className="text-muted-foreground">Gestione contatti genitori degli alunni.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Filtri</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Select value={classeFilter} onValueChange={(v) => { setClasseFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Classe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le classi</SelectItem>
              {classi.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Cognome alunno" className="w-44" value={cognomeFilter}
            onChange={(e) => { setCognomeFilter(e.target.value); setPage(1); }} />
          <Input placeholder="Nome alunno" className="w-40" value={nomeFilter}
            onChange={(e) => { setNomeFilter(e.target.value); setPage(1); }} />
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nessun risultato</CardTitle>
            <CardDescription>Nessun alunno trovato con i filtri selezionati.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alunno</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Genitore</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefoni</TableHead>
                  <TableHead className="text-center">SPID</TableHead>
                  <TableHead className="text-center">Ultimo accesso</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.flatMap((row) =>
                  row.genitori.length === 0 ? (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.displayName}</TableCell>
                      <TableCell>{row.classeName}</TableCell>
                      <TableCell colSpan={5} className="text-muted-foreground text-sm">
                        Nessun genitore registrato
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openCreate(row)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Nuovo genitore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : row.genitori.map((g, i) => (
                    <TableRow key={g.id}>
                      {i === 0 && (
                        <>
                          <TableCell className="font-medium" rowSpan={row.genitori.length}>
                            {row.displayName}
                          </TableCell>
                          <TableCell rowSpan={row.genitori.length}>{row.classeName}</TableCell>
                        </>
                      )}
                      <TableCell>{g.displayName}</TableCell>
                      <TableCell className="text-sm">{g.email || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm">
                        {(g.telefoni ?? []).length > 0
                          ? g.telefoni.join(", ")
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {g.spid && <ShieldCheck className="h-4 w-4 text-green-600 mx-auto" />}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {g.ultimoAccesso ?? <span className="text-muted-foreground">Mai</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(g)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {i === 0 && row.genitori.length < 2 && (
                            <Button size="sm" variant="ghost" onClick={() => openCreate(row)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setDisableTarget(g)}>
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Pagina precedente
        </Button>
        <span className="text-sm text-muted-foreground">
          Pagina {pagination.page} di {pagination.maxPages} · {pagination.total} alunni
        </span>
        <Button variant="outline" disabled={page >= pagination.maxPages} onClick={() => setPage((p) => p + 1)}>
          Pagina successiva
        </Button>
      </div>

      <Dialog open={!!editGenitore} onOpenChange={(open) => { if (!open) setEditGenitore(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica contatti — {editGenitore?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-tel">Numeri di telefono</Label>
              <Input id="edit-tel" placeholder="es. 333123456, 0641234567" value={editTelefoni}
                onChange={(e) => setEditTelefoni(e.target.value)} />
              <p className="text-xs text-muted-foreground">Separati da virgola</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGenitore(null)}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createRow} onOpenChange={(open) => { if (!open) setCreateRow(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo genitore — {createRow?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="create-cognome">Cognome</Label>
                <Input id="create-cognome" value={createCognome} onChange={(e) => setCreateCognome(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="create-nome">Nome</Label>
                <Input id="create-nome" value={createNome} onChange={(e) => setCreateNome(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-email">Email</Label>
              <Input id="create-email" type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="create-username">Username</Label>
                <Input id="create-username" placeholder="automatico se vuoto" value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Sesso</Label>
                <Select value={createSesso} onValueChange={(value: "F" | "M") => setCreateSesso(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="F">F</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-tel">Numeri di telefono</Label>
              <Input id="create-tel" placeholder="es. 333123456, 0641234567" value={createTelefoni}
                onChange={(e) => setCreateTelefoni(e.target.value)} />
              <p className="text-xs text-muted-foreground">Separati da virgola</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateRow(null)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creazione..." : "Crea genitore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdCredentials} onOpenChange={(open) => { if (!open) setCreatedCredentials(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Credenziali iniziali generate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Username</Label>
              <Input value={createdCredentials?.username ?? ""} readOnly />
            </div>
            <div className="space-y-1">
              <Label>Password iniziale</Label>
              <Input value={createdCredentials?.password ?? ""} readOnly />
            </div>
            <p className="text-xs text-muted-foreground">
              Comunica queste credenziali al genitore e verifica il primo accesso.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedCredentials(null)}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!disableTarget} onOpenChange={(open) => { if (!open) setDisableTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disabilitare questo genitore?</AlertDialogTitle>
            <AlertDialogDescription>
              {disableTarget?.displayName} non potra più accedere e sparirà dalla lista attiva della segreteria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisable} disabled={saving}>
              {saving ? "Disabilitazione..." : "Disabilita"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
