"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type UtenteSearch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Search, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export default function PasswordPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UtenteSearch[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UtenteSearch | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!token || search.trim().length < 2) {
      toast.error("Inserisci almeno 2 caratteri per la ricerca");
      return;
    }
    setSearching(true);
    try {
      const res = await api.sistema.cercaUtenti(token, search.trim());
      setResults(res.data);
      if (res.data.length === 0) {
        toast.info("Nessun utente trovato");
      }
    } catch {
      toast.error("Errore nella ricerca utenti");
    } finally {
      setSearching(false);
    }
  }, [token, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleSelectUser = (user: UtenteSearch) => {
    setSelectedUser(user);
    setNewPassword("");
  };

  const handleChangePassword = async () => {
    if (!token || !selectedUser) return;
    if (newPassword.length < 8) {
      toast.error("La password deve essere di almeno 8 caratteri");
      return;
    }
    setSaving(true);
    try {
      await api.sistema.cambiaPassword(token, selectedUser.id, newPassword);
      toast.success(
        `Password cambiata per ${selectedUser.cognome} ${selectedUser.nome}`
      );
      setNewPassword("");
      setSelectedUser(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Errore nel cambio password"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cambio Password</h1>
        <p className="text-muted-foreground">
          Cerca un utente e cambia la sua password
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Cerca Utente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Cerca per nome, cognome o username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="border rounded-md divide-y">
              {results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                    selectedUser?.id === user.id ? "bg-muted" : ""
                  }`}
                  onClick={() => handleSelectUser(user)}
                >
                  <div>
                    <div className="font-medium">
                      {user.cognome} {user.nome}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.username}
                      {user.email ? ` - ${user.email}` : ""}
                    </div>
                  </div>
                  <Badge variant="outline">{user.ruolo}</Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Nuova Password per {selectedUser.cognome} {selectedUser.nome}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nuova password (min. 8 caratteri)</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Inserisci la nuova password..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleChangePassword}
                disabled={saving || newPassword.length < 8}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {saving ? "Salvataggio..." : "Cambia Password"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
