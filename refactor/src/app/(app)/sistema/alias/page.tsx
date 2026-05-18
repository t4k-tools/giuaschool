"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type UtenteSearch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Search, Loader2, LogIn, Undo2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function AliasPage() {
  const { token, user: currentUser, originalUser, isAliasing, startAlias, exitAlias } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UtenteSearch[]>([]);
  const [searching, setSearching] = useState(false);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [exiting, setExiting] = useState(false);

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

  const handleStartAlias = useCallback(async (target: UtenteSearch) => {
    setActivatingId(target.id);
    try {
      await startAlias(target.id);
      toast.success(`Stai impersonando ${target.cognome} ${target.nome}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante l'attivazione dell'alias");
    } finally {
      setActivatingId(null);
    }
  }, [startAlias]);

  const handleExitAlias = useCallback(async () => {
    setExiting(true);
    try {
      await exitAlias();
      toast.success("Alias terminato");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante l'uscita dall'alias");
    } finally {
      setExiting(false);
    }
  }, [exitAlias]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alias Utenti</h1>
        <p className="text-muted-foreground">
          Cerca un utente e assumi temporaneamente la sua identita
        </p>
      </div>

      {isAliasing && currentUser && originalUser && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <ShieldAlert className="h-5 w-5" />
              Alias attivo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-amber-900 dark:text-amber-200">
              Stai operando come <span className="font-semibold">{currentUser.cognome} {currentUser.nome}</span>
              {" "}({currentUser.username}) partendo da <span className="font-semibold">{originalUser.cognome} {originalUser.nome}</span>.
            </div>
            <Button variant="outline" onClick={handleExitAlias} disabled={exiting}>
              {exiting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Undo2 className="mr-2 h-4 w-4" />}
              Esci dall&apos;alias
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
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
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Cognome</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Email
                    </TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead className="text-right">Azione</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">
                        {result.username}
                      </TableCell>
                      <TableCell>{result.cognome}</TableCell>
                      <TableCell>{result.nome}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {result.email || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{result.ruolo}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isAliasing || activatingId === result.id || result.id === originalUser?.id || result.id === currentUser?.id}
                          onClick={() => handleStartAlias(result)}
                        >
                          {activatingId === result.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <LogIn className="mr-2 h-4 w-4" />
                          )}
                          Assumi
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
