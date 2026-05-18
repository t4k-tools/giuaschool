"use client";

import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type SegreteriaAlunnoRow, type SegreteriaAlunnoDetail } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function SegreteriaAssenzePage() {
  const { token } = useAuth();

  const [classi, setClassi] = useState<{ id: number; nome: string }[]>([]);
  const [classeFilter, setClasseFilter] = useState<string>("all");
  const [cognomeFilter, setCognomeFilter] = useState("");
  const [nomeFilter, setNomeFilter] = useState("");
  const deferredCognomeFilter = useDeferredValue(cognomeFilter);
  const deferredNomeFilter = useDeferredValue(nomeFilter);
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<SegreteriaAlunnoRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, maxPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const [detail, setDetail] = useState<SegreteriaAlunnoDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    void api.segreteria.classi(token)
      .then((r) => setClassi(r.data))
      .catch(() => {});
  }, [token]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.segreteria.assenze(token, {
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

  const openDetail = async (id: number) => {
    if (!token) return;
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await api.segreteria.alunnoAssenze(token, id);
      setDetail(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel caricamento dettaglio.");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Assenze — Segreteria</h1>
        <p className="text-muted-foreground">Riepilogo assenze degli alunni per classe o nome.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Filtri</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Select
            value={classeFilter}
            onValueChange={(v) => { setClasseFilter(v); setPage(1); }}
          >
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

          <Input
            placeholder="Cognome"
            className="w-40"
            value={cognomeFilter}
            onChange={(e) => { setCognomeFilter(e.target.value); setPage(1); }}
          />
          <Input
            placeholder="Nome"
            className="w-40"
            value={nomeFilter}
            onChange={(e) => { setNomeFilter(e.target.value); setPage(1); }}
          />
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
                  <TableHead className="text-center">Assenze</TableHead>
                  <TableHead className="text-center">Non giust.</TableHead>
                  <TableHead className="text-center">Ritardi</TableHead>
                  <TableHead className="text-center">Rit. non giust.</TableHead>
                  <TableHead className="text-center">Uscite</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.displayName}</TableCell>
                    <TableCell>{row.classeName}</TableCell>
                    <TableCell className="text-center">{row.assenze}</TableCell>
                    <TableCell className="text-center">
                      {row.assenzeNonGiust > 0
                        ? <Badge variant="destructive">{row.assenzeNonGiust}</Badge>
                        : "0"}
                    </TableCell>
                    <TableCell className="text-center">{row.ritardi}</TableCell>
                    <TableCell className="text-center">
                      {row.ritardiNonGiust > 0
                        ? <Badge variant="secondary">{row.ritardiNonGiust}</Badge>
                        : "0"}
                    </TableCell>
                    <TableCell className="text-center">{row.uscite}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => void openDetail(row.id)}>
                        Dettaglio
                      </Button>
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
        <Button
          variant="outline"
          disabled={page >= pagination.maxPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Pagina successiva
        </Button>
      </div>

      <Dialog open={detailOpen} onOpenChange={(open) => { if (!open) { setDetailOpen(false); setDetail(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detail?.alunno.displayName ?? "Dettaglio assenze"}
              {detail?.alunno.classeName && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {detail.alunno.classeName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : detail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-3 text-center">
                {[
                  { label: "Assenze", value: detail.totali.assenze },
                  { label: "Non giust.", value: detail.totali.assenzeNonGiust, warn: detail.totali.assenzeNonGiust > 0 },
                  { label: "Ritardi", value: detail.totali.ritardi },
                  { label: "Rit. non giust.", value: detail.totali.ritardiNonGiust, warn: detail.totali.ritardiNonGiust > 0 },
                  { label: "Uscite", value: detail.totali.uscite },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardHeader className="pb-1 pt-3">
                      <CardDescription className="text-xs">{s.label}</CardDescription>
                      <CardTitle className={s.warn ? "text-destructive" : ""}>{s.value}</CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              {detail.mesi.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mese</TableHead>
                      <TableHead className="text-center">Assenze</TableHead>
                      <TableHead className="text-center">Non giust.</TableHead>
                      <TableHead className="text-center">Ritardi</TableHead>
                      <TableHead className="text-center">Uscite</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.mesi.map((m) => (
                      <TableRow key={m.mese}>
                        <TableCell className="font-medium">{m.mese}</TableCell>
                        <TableCell className="text-center">{m.assenze}</TableCell>
                        <TableCell className="text-center">
                          {m.assenzeNonGiust > 0
                            ? <Badge variant="destructive">{m.assenzeNonGiust}</Badge>
                            : "0"}
                        </TableCell>
                        <TableCell className="text-center">{m.ritardi}</TableCell>
                        <TableCell className="text-center">{m.uscite}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
