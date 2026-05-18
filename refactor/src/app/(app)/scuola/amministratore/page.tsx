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
import { ShieldCheck, Mail, User, Pencil, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface AmministratoreData {
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
  email: string;
  sesso: string;
  password: string;
  fotoUrl: string;
}

export default function AmministratorePage() {
  const { token } = useAuth();
  const [admin, setAdmin] = useState<AmministratoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm>({
    nome: "",
    cognome: "",
    email: "",
    sesso: "M",
    password: "",
    fotoUrl: "",
  });

  const fetchAdmin = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.scuola.amministratore(token);
      setAdmin(res.data);
    } catch {
      toast.error("Errore nel caricamento dei dati dell'amministratore");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  function openEditDialog() {
    if (!admin) return;
    setForm({
      nome: admin.nome,
      cognome: admin.cognome,
      email: admin.email,
      sesso: admin.sesso,
      password: "",
      fotoUrl: admin.fotoUrl || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    try {
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
      const res = await api.scuola.updateAmministratore(token, payload);
      toast.success(res.message);
      setDialogOpen(false);
      await fetchAdmin();
    } catch {
      toast.error("Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Amministratore</h1>
        <p className="text-muted-foreground">
          Informazioni sull&apos;utente amministratore del sistema
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ) : !admin ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nessun amministratore configurato.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {admin.fotoUrl ? (
                  <div className="h-12 w-12 rounded-lg overflow-hidden border shrink-0">
                    <img
                      src={admin.fotoUrl}
                      alt={`${admin.nome} ${admin.cognome}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg">
                    {admin.cognome} {admin.nome}
                  </CardTitle>
                  <Badge variant="secondary" className="mt-1">
                    Amministratore
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
                  <p className="font-medium">{admin.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{admin.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Sesso</p>
                  <p className="font-medium">
                    {admin.sesso === "M" ? "Maschio" : "Femmina"}
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
            <DialogTitle>Modifica Amministratore</DialogTitle>
            <DialogDescription>
              Modifica i dati dell&apos;amministratore del sistema.
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
                placeholder="Lascia vuoto per non cambiare"
              />
              <p className="text-xs text-muted-foreground">
                Lascia vuoto per non cambiare la password attuale.
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
