"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type RichiestaGestioneRow, type RichiestaGestioneData } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

function statusVariant(code: string): "default" | "secondary" | "outline" | "destructive" {
  switch (code) {
    case "I": return "default";
    case "G": return "secondary";
    case "A":
    case "C": return "outline";
    default: return "destructive";
  }
}

function formatDate(value: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}

type ActionType = "gestisci" | "rimuovi";

export default function RichiesteGestionePage() {
  const { token } = useAuth();
  const [data, setData] = useState<RichiestaGestioneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statoFilter, setStatoFilter] = useState<string>("I");

  const [actionTarget, setActionTarget] = useState<{ row: RichiestaGestioneRow; type: ActionType } | null>(null);
  const [messaggio, setMessaggio] = useState("");
  const [acting, setActing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.richieste.gestioneList(token, {
        stato: statoFilter === "all" ? undefined : statoFilter,
        pagina: page,
      });
      setData(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel caricamento delle richieste.");
    } finally {
      setLoading(false);
    }
  }, [token, statoFilter, page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const openAction = (row: RichiestaGestioneRow, type: ActionType) => {
    setActionTarget({ row, type });
    setMessaggio("");
  };

  const handleAction = async () => {
    if (!token || !actionTarget) return;
    setActing(true);
    try {
      if (actionTarget.type === "gestisci") {
        const res = await api.richieste.gestisci(token, actionTarget.row.id, messaggio || undefined);
        toast.success(res.message);
      } else {
        const res = await api.richieste.rimuovi(token, actionTarget.row.id, messaggio || undefined);
        toast.success(res.message);
      }
      setActionTarget(null);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante l'operazione.");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Gestione richieste</h1>
        <p className="text-muted-foreground">
          Elenco delle richieste da gestire per le definizioni accessibili al tuo ruolo.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Filtri</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Select value={statoFilter} onValueChange={(v) => { setStatoFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="I">Inviata</SelectItem>
              <SelectItem value="G">Gestita</SelectItem>
              <SelectItem value="A">Annullata</SelectItem>
              <SelectItem value="C">Cancellata</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardHeader><CardDescription>Caricamento in corso...</CardDescription></CardHeader></Card>
      ) : data?.items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nessuna richiesta</CardTitle>
            <CardDescription>Nessuna richiesta trovata per i filtri selezionati.</CardDescription>
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
                  <TableHead>Modulo</TableHead>
                  <TableHead>Inviata</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Messaggio</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.student}</TableCell>
                    <TableCell>{row.classe}</TableCell>
                    <TableCell>{row.moduleName}</TableCell>
                    <TableCell>{formatDate(row.sentAt)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status.code)}>{row.status.label}</Badge>
                    </TableCell>
                    <TableCell className="max-w-32 truncate text-sm text-muted-foreground">
                      {row.message || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {row.canGestire && (
                          <Button size="sm" variant="outline" onClick={() => openAction(row, "gestisci")}>
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Gestisci
                          </Button>
                        )}
                        {row.canRimuovere && (
                          <Button size="sm" variant="outline" onClick={() => openAction(row, "rimuovi")}>
                            <XCircle className="mr-1 h-3 w-3" />
                            Rimuovi
                          </Button>
                        )}
                      </div>
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
          Pagina {data?.pagination.page ?? page} di {data?.pagination.maxPages ?? 1}
          {data ? ` · ${data.pagination.total} totali` : ""}
        </span>
        <Button
          variant="outline"
          disabled={!data || page >= data.pagination.maxPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Pagina successiva
        </Button>
      </div>

      <Dialog open={actionTarget !== null} onOpenChange={(open) => { if (!open) setActionTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.type === "gestisci" ? "Gestisci richiesta" : "Rimuovi richiesta"}
            </DialogTitle>
            <DialogDescription>
              {actionTarget?.row.student} — {actionTarget?.row.moduleName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="messaggio">Messaggio (opzionale)</Label>
              <Textarea
                id="messaggio"
                placeholder="Messaggio da mostrare al richiedente..."
                value={messaggio}
                onChange={(e) => setMessaggio(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionTarget(null)} disabled={acting}>
              Annulla
            </Button>
            <Button
              variant={actionTarget?.type === "rimuovi" ? "destructive" : "default"}
              onClick={() => void handleAction()}
              disabled={acting}
            >
              {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionTarget?.type === "gestisci" ? "Conferma gestione" : "Conferma rimozione"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
