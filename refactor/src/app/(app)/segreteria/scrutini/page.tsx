"use client";

import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type SegreteriaScrutiniRow } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";

const PERIODO_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  P: "secondary",
  S: "secondary",
  F: "default",
  G: "destructive",
  R: "destructive",
  X: "outline",
  A: "outline",
};

export default function SegreteriaScrutiniPage() {
  const { token } = useAuth();

  const [classi, setClassi] = useState<{ id: number; nome: string }[]>([]);
  const [classeFilter, setClasseFilter] = useState<string>("all");
  const [cognomeFilter, setCognomeFilter] = useState("");
  const [nomeFilter, setNomeFilter] = useState("");
  const deferredCognomeFilter = useDeferredValue(cognomeFilter);
  const deferredNomeFilter = useDeferredValue(nomeFilter);
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<SegreteriaScrutiniRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, maxPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    void api.segreteria.classi(token).then((r) => setClassi(r.data)).catch(() => {});
  }, [token]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.segreteria.scrutini(token, {
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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Scrutini — Segreteria</h1>
        <p className="text-muted-foreground">Riepilogo periodi di scrutinio per alunno.</p>
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
          <Input placeholder="Cognome" className="w-40" value={cognomeFilter}
            onChange={(e) => { setCognomeFilter(e.target.value); setPage(1); }} />
          <Input placeholder="Nome" className="w-40" value={nomeFilter}
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
                  <TableHead>Scrutini completati</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.displayName}</TableCell>
                    <TableCell>{row.classeName}</TableCell>
                    <TableCell>
                      {row.scrutini.length === 0 ? (
                        <span className="text-sm text-muted-foreground">Nessuno</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {row.scrutini.map((s) => (
                            <Badge
                              key={s.scrutinioId}
                              variant={PERIODO_VARIANT[s.periodo] ?? "secondary"}
                              title={s.data ?? undefined}
                            >
                              {s.label}
                              {s.data && <span className="ml-1 opacity-70 text-xs">{s.data}</span>}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
    </div>
  );
}
