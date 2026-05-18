"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type Docente } from "@/lib/api/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RsppPage() {
  const { token } = useAuth();
  const [rspp, setRspp] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Docente[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);

  const fetchRspp = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.docenti.rspp(token);
      setRspp(res.data);
    } catch {
      toast.error("Errore nel caricamento degli RSPP");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRspp();
  }, [fetchRspp]);

  const handleRemove = async (id: number) => {
    if (!token) return;
    setRemoving(id);
    try {
      const res = await api.docenti.toggleRspp(token, id);
      toast.success(res.message);
      setRspp((prev) => prev.filter((d) => d.id !== id));
    } catch {
      toast.error("Errore nella rimozione dell'RSPP");
    } finally {
      setRemoving(null);
    }
  };

  const handleSearch = async () => {
    if (!token || !searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.docenti.list(token, {
        search: searchQuery,
        limit: 20,
      });
      const rsppIds = new Set(rspp.map((d) => d.id));
      setSearchResults(res.data.filter((d) => !rsppIds.has(d.id)));
    } catch {
      toast.error("Errore nella ricerca");
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (docente: Docente) => {
    if (!token) return;
    setAdding(docente.id);
    try {
      const res = await api.docenti.toggleRspp(token, docente.id);
      toast.success(res.message);
      setRspp((prev) => [...prev, docente]);
      setSearchResults((prev) => prev.filter((d) => d.id !== docente.id));
      setAddOpen(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch {
      toast.error("Errore nell'aggiunta dell'RSPP");
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">RSPP</h1>
          <p className="text-muted-foreground">
            Gestisci i docenti con incarico RSPP (Responsabile del Servizio di
            Prevenzione e Protezione)
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cognome</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Username</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-5 w-28" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : rspp.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nessun RSPP assegnato.
                </TableCell>
              </TableRow>
            ) : (
              rspp.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.cognome}</TableCell>
                  <TableCell>{d.nome}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {d.username}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {d.email}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemove(d.id)}
                      disabled={removing === d.id}
                      title="Rimuovi RSPP"
                    >
                      {removing === d.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add RSPP Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg flex flex-col max-h-[90vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>Aggiungi RSPP</DialogTitle>
            <DialogDescription>
              Cerca un docente e assegnalo come RSPP.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="grid gap-4 pb-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca docente per cognome..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  disabled={searching}
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Cerca"
                  )}
                </Button>
              </form>

              {searchResults.length > 0 && (
                <div className="rounded-md border max-h-[240px] overflow-y-auto">
                  <Table>
                    <TableBody>
                      {searchResults.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">
                            {d.cognome} {d.nome}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                            {d.email}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleAdd(d)}
                              disabled={adding === d.id}
                            >
                              {adding === d.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Aggiungi"
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {searchResults.length === 0 && searchQuery && !searching && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessun docente trovato.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annulla</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
