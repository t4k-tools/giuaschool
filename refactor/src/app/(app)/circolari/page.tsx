"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type CircolareDetail, type CircolariData } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCheck, FileText, PenSquare } from "lucide-react";

const months = [
  { value: "0", label: "Tutti i mesi" },
  { value: "9", label: "Settembre" },
  { value: "10", label: "Ottobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Dicembre" },
  { value: "1", label: "Gennaio" },
  { value: "2", label: "Febbraio" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Aprile" },
  { value: "5", label: "Maggio" },
  { value: "6", label: "Giugno" },
  { value: "7", label: "Luglio" },
  { value: "8", label: "Agosto" },
];

export default function CircolariPage() {
  const { token } = useAuth();
  const [data, setData] = useState<CircolariData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [visualizza, setVisualizza] = useState("P");
  const [mese, setMese] = useState("0");
  const [oggetto, setOggetto] = useState("");
  const [selected, setSelected] = useState<CircolareDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    setLoading(true);
    api.comunicazioni
      .circolari(token, {
        pagina: page,
        visualizza,
        mese: mese !== "0" ? Number(mese) : undefined,
        oggetto: oggetto || undefined,
      })
      .then((response) => {
        setData(response.data);
        setError(null);
      })
      .catch((err: { message?: string }) => {
        setError(err.message || "Impossibile caricare le circolari.");
      })
      .finally(() => setLoading(false));
  }, [mese, oggetto, page, token, visualizza]);

  const unreadCount = useMemo(
    () => data?.items.filter((item) => !item.status.isRead).length ?? 0,
    [data],
  );

  const openDetail = async (id: number) => {
    if (!token) {
      return;
    }
    try {
      const response = await api.comunicazioni.circolare(token, id);
      setSelected(response.data);
      setDetailOpen(true);
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === id
                  ? {
                      ...item,
                      status: { ...item.status, isRead: true, isSigned: response.data.status.isSigned },
                    }
                  : item,
              ),
            }
          : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dettaglio circolare non disponibile.");
    }
  };

  const handleSign = async () => {
    if (!token || !selected) {
      return;
    }
    setSigning(true);
    try {
      const response = await api.comunicazioni.firmaCircolare(token, selected.id);
      setSelected((current) =>
        current ? { ...current, status: response.data, recipient: { ...current.recipient, signedAt: response.data.signedAt } } : current,
      );
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === selected.id ? { ...item, status: { ...item.status, isRead: true, isSigned: true } } : item,
              ),
            }
          : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Firma circolare non riuscita.");
    } finally {
      setSigning(false);
    }
  };

  const handleAttachment = async (
    attachmentId: number,
    mode: "download" | "open",
  ) => {
    if (!token || !selected) {
      return;
    }
    try {
      await api.comunicazioni.downloadCircolareAttachment(token, selected.id, attachmentId, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download allegato non riuscito.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Circolari</h1>
        <p className="text-muted-foreground">
          Bacheca circolari con stato di lettura e presa visione.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Circolari in pagina</CardDescription>
            <CardTitle>{data?.items.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Da leggere</CardDescription>
            <CardTitle>{unreadCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pagine</CardDescription>
            <CardTitle>{data?.pagination.maxPages ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtri</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Select value={visualizza} onValueChange={(value) => { setVisualizza(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Visualizzazione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="D">Da leggere</SelectItem>
              <SelectItem value="P">Proprie</SelectItem>
              <SelectItem value="T">Tutte</SelectItem>
            </SelectContent>
          </Select>
          <Select value={mese} onValueChange={(value) => { setMese(value); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Mese" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Oggetto"
            value={oggetto}
            onChange={(event) => {
              setOggetto(event.target.value);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Errore</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4">
        {loading && <Card><CardHeader><CardDescription>Caricamento in corso...</CardDescription></CardHeader></Card>}
        {!loading && data?.items.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Nessuna circolare</CardTitle>
              <CardDescription>Non ci sono circolari per i filtri selezionati.</CardDescription>
            </CardHeader>
          </Card>
        )}
        {data?.items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">N. {item.numero}</Badge>
                  <Badge variant={item.status.isRead ? "outline" : "default"}>
                    {item.status.isRead ? "Letta" : "Da leggere"}
                  </Badge>
                  {item.firma && (
                    <Badge variant={item.status.isSigned ? "outline" : "destructive"}>
                      {item.status.isSigned ? "Firmata" : "Firma richiesta"}
                    </Badge>
                  )}
                </div>
                <div className="font-medium">{item.title}</div>
                <p className="text-sm text-muted-foreground">{item.displayDate}</p>
              </div>
              <Button onClick={() => void openDetail(item.id)}>
                <FileText className="size-4" />
                Apri dettaglio
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
          Pagina precedente
        </Button>
        <span className="text-sm text-muted-foreground">
          Pagina {data?.pagination.page ?? page} di {data?.pagination.maxPages ?? 1}
        </span>
        <Button
          variant="outline"
          disabled={!data || page >= data.pagination.maxPages}
          onClick={() => setPage((current) => current + 1)}
        >
          Pagina successiva
        </Button>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.title ?? "Circolare"}</DialogTitle>
            <DialogDescription>
              {selected ? `Circolare n. ${selected.numero} del ${selected.displayDate}` : ""}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={selected.status.isRead ? "outline" : "default"}>
                  {selected.status.isRead ? "Letta" : "Da leggere"}
                </Badge>
                {selected.firma && (
                  <Badge variant={selected.status.isSigned ? "outline" : "destructive"}>
                    {selected.status.isSigned ? "Firmata" : "Firma richiesta"}
                  </Badge>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Metadati</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Autore: {selected.author || "Non disponibile"}</p>
                  <p>Lettura: {selected.status.readAt ? new Date(selected.status.readAt).toLocaleString("it-IT") : "Non registrata"}</p>
                  <p>Firma: {selected.status.signedAt ? new Date(selected.status.signedAt).toLocaleString("it-IT") : "Non registrata"}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Allegati</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selected.attachments.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nessun allegato disponibile.</p>
                  )}
                  {selected.attachments.map((attachment) => (
                    <div key={attachment.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{attachment.title}</p>
                      <p className="text-muted-foreground">
                        {attachment.filename}.{attachment.extension} · {attachment.size} byte
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => void handleAttachment(attachment.id, "open")}>
                          Apri
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void handleAttachment(attachment.id, "download")}>
                          Scarica
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            {selected?.firma && !selected.status.isSigned && (
              <Button onClick={() => void handleSign()} disabled={signing}>
                <PenSquare className="size-4" />
                {signing ? "Registrazione..." : "Conferma presa visione"}
              </Button>
            )}
            {selected?.status.isSigned && (
              <Button variant="outline" disabled>
                <CheckCheck className="size-4" />
                Firma registrata
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
