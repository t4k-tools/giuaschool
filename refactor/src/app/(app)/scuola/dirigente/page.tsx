"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, Mail, User, Pencil, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface DirigenteData {
  id: number;
  nome: string;
  cognome: string;
  username: string;
  email: string;
  sesso: string;
  fotoUrl?: string | null;
}

interface EditForm {
  nome: string;
  cognome: string;
  username: string;
  email: string;
  sesso: string;
  password: string;
  fotoUrl: string;
}

export default function DirigentePage() {
  const { token } = useAuth();
  const [dirigente, setDirigente] = useState<DirigenteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm>({
    nome: "",
    cognome: "",
    username: "",
    email: "",
    sesso: "M",
    password: "",
    fotoUrl: "",
  });

  const fetchDirigente = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.scuola.dirigente(token);
      setDirigente(res.data);
    } catch {
      toast.error("Errore nel caricamento dei dati del dirigente");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDirigente();
  }, [fetchDirigente]);

  function openEditDialog() {
    if (!dirigente) return;
    setForm({
      nome: dirigente.nome,
      cognome: dirigente.cognome,
      username: dirigente.username,
      email: dirigente.email,
      sesso: dirigente.sesso,
      password: "",
      fotoUrl: dirigente.fotoUrl || "",
    });
    setDialogOpen(true);
  }

  function openCreateDialog() {
    setForm({
      nome: "",
      cognome: "",
      username: "",
      email: "",
      sesso: "M",
      password: "",
      fotoUrl: "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    try {
      if (!dirigente) {
        if (!form.username.trim()) {
          toast.error("Inserisci uno username.");
          return;
        }
        if (!form.password) {
          toast.error("Inserisci una password.");
          return;
        }
        const res = await api.scuola.createDirigente(token, {
          nome: form.nome,
          cognome: form.cognome,
          username: form.username.trim(),
          email: form.email,
          sesso: form.sesso,
          password: form.password,
          ...(form.fotoUrl ? { fotoUrl: form.fotoUrl } : {}),
        });
        toast.success(res.message);
      } else {
        const payload: Record<string, string> = {
          nome: form.nome,
          cognome: form.cognome,
          email: form.email,
          sesso: form.sesso,
          fotoUrl: form.fotoUrl,
        };
        if (form.password) {
          payload.password = form.password;
        }
        const res = await api.scuola.updateDirigente(token, payload);
        toast.success(res.message);
      }
      setDialogOpen(false);
      await fetchDirigente();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore durante il salvataggio";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dirigente Scolastico</h1>
        <p className="text-muted-foreground">
          Informazioni sul dirigente scolastico
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ) : !dirigente ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="space-y-4">
              <p>Nessun dirigente scolastico configurato.</p>
              <Button onClick={openCreateDialog}>
                Inserisci dirigente
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {dirigente.fotoUrl ? (
                  <div className="h-12 w-12 rounded-lg overflow-hidden border shrink-0">
                    <img
                      src={dirigente.fotoUrl}
                      alt={`${dirigente.nome} ${dirigente.cognome}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg">
                    {dirigente.cognome} {dirigente.nome}
                  </CardTitle>
                  <Badge variant="secondary" className="mt-1">
                    Dirigente Scolastico
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={openEditDialog}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifica
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="font-medium">{dirigente.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{dirigente.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Sesso</p>
                  <p className="font-medium">
                    {dirigente.sesso === "M" ? "Maschio" : "Femmina"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Dirigente Scolastico</DialogTitle>
            <DialogDescription>
              Modifica i dati del dirigente scolastico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome</Label>
              <Input
                id="edit-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cognome">Cognome</Label>
              <Input
                id="edit-cognome"
                value={form.cognome}
                onChange={(e) => setForm({ ...form, cognome: e.target.value })}
              />
            </div>
            {!dirigente && (
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="Inserisci lo username del dirigente"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sesso">Sesso</Label>
              <Select
                value={form.sesso}
                onValueChange={(value) => setForm({ ...form, sesso: value })}
              >
                <SelectTrigger id="edit-sesso">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Maschio</SelectItem>
                  <SelectItem value="F">Femmina</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-foto">Foto (URL)</Label>
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 rounded-lg border overflow-hidden bg-muted flex items-center justify-center"
                  style={{ width: 76, height: 76 }}
                >
                  {form.fotoUrl ? (
                    <img
                      src={form.fotoUrl}
                      alt="Anteprima"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </div>
                <Input
                  id="edit-foto"
                  type="url"
                  value={form.fotoUrl}
                  onChange={(e) => setForm({ ...form, fotoUrl: e.target.value })}
                  placeholder="https://esempio.com/foto.jpg"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">Foto tessera 2×2 cm</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Password</Label>
              <Input
                id="edit-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={dirigente ? "Lascia vuoto per non cambiare" : "Inserisci la password iniziale"}
              />
              <p className="text-xs text-muted-foreground">
                {dirigente
                  ? "Lascia vuoto per non cambiare la password attuale."
                  : "La password iniziale è obbligatoria."}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Annulla
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salva
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
