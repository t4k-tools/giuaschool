"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type Docente, type SedeInfo } from "@/lib/api/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

type BesDocente = Omit<Docente, 'responsabileBesSede'> & {
  responsabileBesSede: { id: number; nomeBreve: string } | null;
};

export default function ResponsabiliBesPage() {
  const { token } = useAuth();
  const [docenti, setDocenti] = useState<BesDocente[]>([]);
  const [sedi, setSedi] = useState<SedeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  const [changingSede, setChangingSede] = useState<number | null>(null);

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Docente[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSedeId, setSelectedSedeId] = useState<string>("");
  const [adding, setAdding] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [besRes, sediRes] = await Promise.all([
        api.docenti.responsabiliBes(token),
        api.sedi.list(token),
      ]);
      setDocenti(besRes.data);
      setSedi(sediRes.data);
    } catch {
      toast.error("Errore nel caricamento dei responsabili BES");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRemove = async (id: number) => {
    if (!token) return;
    setRemoving(id);
    try {
      const res = await api.docenti.toggleBes(token, id, {
        responsabileBes: false,
        sedeId: null,
      });
      toast.success(res.message);
      setDocenti((prev) => prev.filter((d) => d.id !== id));
    } catch {
      toast.error("Errore nella rimozione del responsabile BES");
    } finally {
      setRemoving(null);
    }
  };

  const handleSedeChange = async (docenteId: number, sedeValue: string) => {
    if (!token) return;
    setChangingSede(docenteId);
    try {
      const sedeId = sedeValue === "none" ? null : Number(sedeValue);
      const res = await api.docenti.toggleBes(token, docenteId, {
        responsabileBes: true,
        sedeId,
      });
      toast.success(res.message);
      setDocenti((prev) =>
        prev.map((d) => {
          if (d.id !== docenteId) return d;
          const sede = sedeId
            ? sedi.find((s) => s.id === sedeId)
            : null;
          return {
            ...d,
            responsabileBesSede: sede
              ? { id: sede.id, nomeBreve: sede.nomeBreve }
              : null,
          };
        }),
      );
    } catch {
      toast.error("Errore nel cambio sede");
    } finally {
      setChangingSede(null);
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
      // Filter out docenti already in the BES list
      const besIds = new Set(docenti.map((d) => d.id));
      setSearchResults(res.data.filter((d) => !besIds.has(d.id)));
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
      const sedeId = selectedSedeId && selectedSedeId !== "none"
        ? Number(selectedSedeId)
        : null;
      const res = await api.docenti.toggleBes(token, docente.id, {
        responsabileBes: true,
        sedeId,
      });
      toast.success(res.message);
      const sede = sedeId ? sedi.find((s) => s.id === sedeId) : null;
      setDocenti((prev) => [
        ...prev,
        {
          ...docente,
          responsabileBesSede: sede
            ? { id: sede.id, nomeBreve: sede.nomeBreve }
            : null,
        } as BesDocente,
      ]);
      setSearchResults((prev) => prev.filter((d) => d.id !== docente.id));
      setAddOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedSedeId("");
    } catch {
      toast.error("Errore nell'aggiunta del responsabile BES");
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Responsabili BES
          </h1>
          <p className="text-muted-foreground">
            Gestisci i docenti responsabili BES e le sedi di competenza
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
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell><Skeleton className="h-9 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : docenti.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nessun responsabile BES assegnato.
                </TableCell>
              </TableRow>
            ) : (
              docenti.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.cognome}</TableCell>
                  <TableCell>{d.nome}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {d.email}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={
                          d.responsabileBesSede
                            ? String(d.responsabileBesSede.id)
                            : "none"
                        }
                        onValueChange={(v) => handleSedeChange(d.id, v)}
                        disabled={changingSede === d.id}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Seleziona sede" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tutte le sedi</SelectItem>
                          {sedi.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.nomeBreve}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {changingSede === d.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemove(d.id)}
                      disabled={removing === d.id}
                      title="Rimuovi responsabile BES"
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

      {/* Add BES Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg flex flex-col max-h-[90vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>Aggiungi Responsabile BES</DialogTitle>
            <DialogDescription>
              Cerca un docente e assegnalo come responsabile BES.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="grid gap-4 pb-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sede (opzionale)</label>
                <Select
                  value={selectedSedeId || "none"}
                  onValueChange={(v) =>
                    setSelectedSedeId(v === "none" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tutte le sedi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tutte le sedi</SelectItem>
                    {sedi.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.nomeBreve}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                <Button type="submit" variant="secondary" size="sm" disabled={searching}>
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
