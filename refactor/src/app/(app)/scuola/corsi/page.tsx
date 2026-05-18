"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { api, type CorsoInfo } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CorsiPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [corsi, setCorsi] = useState<CorsoInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCorso, setEditCorso] = useState<CorsoInfo | null>(null);
  const [nome, setNome] = useState("");
  const [nomeBreve, setNomeBreve] = useState("");
  const [saving, setSaving] = useState(false);
  const [newHandled, setNewHandled] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCorso, setDeleteCorso] = useState<CorsoInfo | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchCorsi = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.corsi.list(token);
      setCorsi(res.data);
    } catch {
      toast.error("Errore nel caricamento dei corsi");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCorsi();
  }, [fetchCorsi]);

  // ── Create ──
  const handleCreate = () => {
    setEditCorso(null);
    setNome("");
    setNomeBreve("");
    setDialogOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("new") === "1" && !newHandled) {
      handleCreate();
      setNewHandled(true);
    }
  }, [searchParams, newHandled]);

  // ── Edit ──
  const handleEdit = (corso: CorsoInfo) => {
    setEditCorso(corso);
    setNome(corso.nome);
    setNomeBreve(corso.nomeBreve);
    setDialogOpen(true);
  };

  // ── Save (create or update) ──
  const handleSave = async () => {
    if (!token || !nome.trim() || !nomeBreve.trim()) return;
    setSaving(true);
    try {
      if (editCorso) {
        const res = await api.corsi.update(token, editCorso.id, { nome: nome.trim(), nomeBreve: nomeBreve.trim() });
        setCorsi((prev) => prev.map((c) => (c.id === editCorso.id ? res.data : c)));
        toast.success("Corso aggiornato");
      } else {
        const res = await api.corsi.create(token, { nome: nome.trim(), nomeBreve: nomeBreve.trim() });
        setCorsi((prev) => [...prev, res.data]);
        toast.success("Corso creato");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──
  const handleDeleteOpen = (corso: CorsoInfo) => {
    setDeleteCorso(corso);
    setDeleteConfirm("");
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!token || !deleteCorso) return;
    setDeleting(true);
    try {
      await api.corsi.delete(token, deleteCorso.id);
      setCorsi((prev) => prev.filter((c) => c.id !== deleteCorso.id));
      toast.success("Corso eliminato");
      setDeleteOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nell'eliminazione");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Corsi</h1>
          <p className="text-muted-foreground">Corsi di studio dell&apos;istituto</p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : corsi.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <GraduationCap className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>Nessun corso configurato.</p>
            <Button variant="link" onClick={handleCreate} className="mt-2">
              Aggiungi il primo corso
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {corsi.map((corso) => (
            <Card key={corso.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{corso.nome}</CardTitle>
                    <Badge variant="outline" className="mt-1">{corso.nomeBreve}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(corso)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteOpen(corso)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCorso ? `Modifica: ${editCorso.nomeBreve}` : "Nuovo Corso"}</DialogTitle>
            <DialogDescription>
              {editCorso ? "Modifica i dati del corso." : "Inserisci i dati del nuovo corso."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="corso-nome">Nome *</Label>
              <Input
                id="corso-nome"
                placeholder="es. Liceo Scientifico"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="corso-nome-breve">Nome breve *</Label>
              <Input
                id="corso-nome-breve"
                placeholder="es. LS"
                value={nomeBreve}
                onChange={(e) => setNomeBreve(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving || !nome.trim() || !nomeBreve.trim()}>
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
            <AlertDialogTitle>Eliminare il corso &quot;{deleteCorso?.nome}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Tutte le classi associate a questo corso
              potrebbero essere interessate. Per confermare, digita{" "}
              <span className="font-semibold text-foreground">{deleteCorso?.nomeBreve}</span> nel campo sottostante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              placeholder={`Digita "${deleteCorso?.nomeBreve}" per confermare`}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || deleteConfirm !== deleteCorso?.nomeBreve}
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
