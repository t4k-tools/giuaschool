"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { api, type AvvisiData, type AvvisoDetail } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { BellRing, CalendarDays } from "lucide-react";

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

export default function AvvisiPage() {
  const { token } = useAuth();
  const [data, setData] = useState<AvvisiData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [visualizza, setVisualizza] = useState("P");
  const [mese, setMese] = useState("0");
  const [oggetto, setOggetto] = useState("");
  const [selected, setSelected] = useState<AvvisoDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    api.comunicazioni
      .avvisi(token, {
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
        setError(err.message || "Impossibile caricare gli avvisi.");
      })
      .finally(() => setLoading(false));
  }, [mese, oggetto, page, token, visualizza]);

  const unreadCount = useMemo(
    () => data?.items.filter((item) => !item.isRead).length ?? 0,
    [data],
  );

  const openDetail = async (id: number) => {
    if (!token) {
      return;
    }
    try {
      const response = await api.comunicazioni.avviso(token, id);
      setSelected(response.data);
      setDetailOpen(true);
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === id ? { ...item, isRead: true } : item,
              ),
            }
          : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dettaglio avviso non disponibile.");
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
      await api.comunicazioni.downloadAvvisoAttachment(token, selected.id, attachmentId, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download allegato non riuscito.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Avvisi</h1>
        <p className="text-muted-foreground">
          Bacheca avvisi con lettura implicita e dettaglio degli eventi assegnati.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avvisi in pagina</CardDescription>
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
            <CardDescription>Accesso rapido</CardDescription>
            <CardTitle className="text-base">Agenda disponibile</CardTitle>
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
              <SelectItem value="P">Tutti</SelectItem>
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
          <Button variant="outline" asChild>
            <Link href="/agenda">
              <CalendarDays className="size-4" />
              Apri agenda
            </Link>
          </Button>
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
              <CardTitle>Nessun avviso</CardTitle>
              <CardDescription>Non ci sono avvisi per i filtri selezionati.</CardDescription>
            </CardHeader>
          </Card>
        )}
        {data?.items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{item.type}</Badge>
                  <Badge variant={item.isRead ? "outline" : "default"}>
                    {item.isRead ? "Letto" : "Da leggere"}
                  </Badge>
                </div>
                <div className="font-medium">{item.title}</div>
                <p className="text-sm text-muted-foreground">{item.displayDate}</p>
              </div>
              <Button onClick={() => void openDetail(item.id)}>
                <BellRing className="size-4" />
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
            <DialogTitle>{selected?.title ?? "Avviso"}</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.displayDate} · ${selected.author || "Autore non disponibile"}` : ""}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{selected.type}</Badge>
                <Badge variant={selected.status.isRead ? "outline" : "default"}>
                  {selected.status.isRead ? "Letto" : "Da leggere"}
                </Badge>
                {selected.className && <Badge variant="outline">{selected.className}</Badge>}
                {selected.subject && <Badge variant="outline">{selected.subject}</Badge>}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Testo</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{selected.text}</p>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
