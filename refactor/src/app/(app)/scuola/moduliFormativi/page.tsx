"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type ModuloFormativoInfo } from "@/lib/api/client";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ANNI_CORSO = [1, 2, 3, 4, 5] as const;

const TIPO_OPTIONS = [
  { value: "O", label: "Orientamento" },
  { value: "P", label: "PCTO" },
] as const;

function sortModuli(items: ModuloFormativoInfo[]) {
  return [...items].sort((left, right) => {
    const tipoComparison = left.tipoLabel.localeCompare(right.tipoLabel, "it");
    if (tipoComparison !== 0) {
      return tipoComparison;
    }
    return left.nomeBreve.localeCompare(right.nomeBreve, "it");
  });
}

export default function ModuliFormativiPage() {
  const { token } = useAuth();
  const [moduli, setModuli] = useState<ModuloFormativoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editModulo, setEditModulo] = useState<ModuloFormativoInfo | null>(null);
  const [nome, setNome] = useState("");
  const [nomeBreve, setNomeBreve] = useState("");
  const [tipo, setTipo] = useState<"O" | "P">("O");
  const [classi, setClassi] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteModulo, setDeleteModulo] = useState<ModuloFormativoInfo | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchModuli = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    try {
      const res = await api.scuola.moduliFormativi(token);
      setModuli(sortModuli(res.data));
    } catch {
      toast.error("Errore nel caricamento dei moduli formativi");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchModuli();
  }, [fetchModuli]);

  const resetForm = useCallback(() => {
    setEditModulo(null);
    setNome("");
    setNomeBreve("");
    setTipo("O");
    setClassi([]);
  }, []);

  const handleCreate = useCallback(() => {
    resetForm();
    setDialogOpen(true);
  }, [resetForm]);

  const handleEdit = useCallback((modulo: ModuloFormativoInfo) => {
    setEditModulo(modulo);
    setNome(modulo.nome);
    setNomeBreve(modulo.nomeBreve);
    setTipo(modulo.tipo === "P" ? "P" : "O");
    setClassi([...modulo.classi].sort((left, right) => left - right));
    setDialogOpen(true);
  }, []);

  const toggleClasse = useCallback((anno: number) => {
    setClassi((prev) => {
      const next = prev.includes(anno)
        ? prev.filter((value) => value !== anno)
        : [...prev, anno];
      return next.sort((left, right) => left - right);
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!token) {
      return;
    }
    if (!nome.trim() || !nomeBreve.trim()) {
      toast.error("Nome e nome breve sono obbligatori");
      return;
    }
    if (classi.length === 0) {
      toast.error("Seleziona almeno una classe");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        nomeBreve: nomeBreve.trim(),
        tipo,
        classi,
      };

      if (editModulo) {
        const res = await api.scuola.updateModuloFormativo(token, editModulo.id, payload);
        setModuli((prev) => sortModuli(prev.map((item) => (
          item.id === editModulo.id ? res.data : item
        ))));
        toast.success("Modulo formativo aggiornato");
      } else {
        const res = await api.scuola.createModuloFormativo(token, payload);
        setModuli((prev) => sortModuli([...prev, res.data]));
        toast.success("Modulo formativo creato");
      }
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }, [classi, editModulo, nome, nomeBreve, resetForm, tipo, token]);

  const handleDeleteOpen = useCallback((modulo: ModuloFormativoInfo) => {
    setDeleteModulo(modulo);
    setDeleteConfirm("");
    setDeleteOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!token || !deleteModulo) {
      return;
    }
    setDeleting(true);
    try {
      await api.scuola.deleteModuloFormativo(token, deleteModulo.id);
      setModuli((prev) => prev.filter((item) => item.id !== deleteModulo.id));
      toast.success("Modulo formativo eliminato");
      setDeleteOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nell'eliminazione");
    } finally {
      setDeleting(false);
    }
  }, [deleteModulo, token]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return moduli;
    }
    return moduli.filter((modulo) =>
      modulo.nome.toLowerCase().includes(query) ||
      modulo.nomeBreve.toLowerCase().includes(query) ||
      modulo.tipoLabel.toLowerCase().includes(query),
    );
  }, [moduli, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Moduli Formativi</h1>
          <p className="text-muted-foreground">
            Configura i moduli di orientamento e PCTO disponibili per le classi.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            className="w-full md:w-72"
            placeholder="Cerca per nome o tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Modulo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <Skeleton className="h-28 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <GraduationCap className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>{moduli.length === 0 ? "Nessun modulo formativo configurato." : "Nessun risultato per la ricerca corrente."}</p>
            {moduli.length === 0 && (
              <Button variant="link" onClick={handleCreate} className="mt-2">
                Crea il primo modulo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((modulo) => (
            <Card key={modulo.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{modulo.nome}</CardTitle>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">{modulo.nomeBreve}</Badge>
                      <Badge>{modulo.tipoLabel}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(modulo)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteOpen(modulo)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">Classi abilitate</div>
                <div className="flex flex-wrap gap-2">
                  {modulo.classi.map((anno) => (
                    <Badge key={anno} variant="secondary">
                      {anno}ª
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editModulo ? `Modifica: ${editModulo.nomeBreve}` : "Nuovo Modulo Formativo"}</DialogTitle>
            <DialogDescription>
              Definisci nome, tipo e classi a cui il modulo è destinato.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="modulo-formativo-nome">Nome *</Label>
              <Input
                id="modulo-formativo-nome"
                placeholder="es. Percorso orientativo STEM"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modulo-formativo-nome-breve">Nome breve *</Label>
              <Input
                id="modulo-formativo-nome-breve"
                placeholder="es. STEM"
                value={nomeBreve}
                onChange={(e) => setNomeBreve(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(value) => setTipo(value as "O" | "P")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona il tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Classi *</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ANNI_CORSO.map((anno) => (
                  <label
                    key={anno}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={classi.includes(anno)}
                      onCheckedChange={() => toggleClasse(anno)}
                    />
                    <span>{anno}ª</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving || !nome.trim() || !nomeBreve.trim() || classi.length === 0}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il modulo &quot;{deleteModulo?.nomeBreve}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Per confermare, digita{" "}
              <span className="font-semibold text-foreground">{deleteModulo?.nomeBreve}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              placeholder={`Digita "${deleteModulo?.nomeBreve}" per confermare`}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deleting || deleteConfirm.trim() !== (deleteModulo?.nomeBreve ?? "")}
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
