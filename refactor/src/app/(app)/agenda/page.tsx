"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type AgendaDayData, type AgendaMonthData } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, ClipboardCheck, NotebookPen, Users } from "lucide-react";

const labels = {
  A: "Attività",
  V: "Verifiche",
  P: "Compiti",
  Q: "Colloqui",
} as const;

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function AgendaPage() {
  const { token } = useAuth();
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });
  const [data, setData] = useState<AgendaMonthData | null>(null);
  const [detail, setDetail] = useState<AgendaDayData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    api.comunicazioni
      .agendaMonth(token, month)
      .then((response) => {
        setData(response.data);
        setError(null);
      })
      .catch((err: { message?: string }) => {
        setError(err.message || "Impossibile caricare l'agenda.");
      });
  }, [month, token]);

  const openDay = async (day: number, type: keyof typeof labels) => {
    if (!token || !data) {
      return;
    }
    const date = `${data.month}-${String(day).padStart(2, "0")}`;
    try {
      const response = await api.comunicazioni.agendaDay(token, date, type);
      setDetail(response.data);
      setDetailOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dettaglio agenda non disponibile.");
    }
  };

  const grid = useMemo(() => {
    if (!data) {
      return [];
    }
    const [year, monthNumber] = data.month.split("-").map(Number);
    const first = new Date(year, monthNumber - 1, 1);
    const totalDays = new Date(year, monthNumber, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const map = new Map(data.days.map((item) => [item.day, item.flags]));
    const cells: Array<{ day: number | null; flags?: AgendaMonthData["days"][number]["flags"] }> = [];

    for (let i = 0; i < offset; i += 1) {
      cells.push({ day: null });
    }
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push({ day, flags: map.get(day) });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null });
    }

    return cells;
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
        <p className="text-muted-foreground">
          Calendario personale di attività, verifiche, compiti e colloqui.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{data?.label ?? "Agenda"}</CardTitle>
              <CardDescription>Vista mensile degli eventi assegnati al tuo profilo.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setMonth((current) => shiftMonth(current, -1))}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setMonth((current) => shiftMonth(current, 1))}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-muted-foreground">
            {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {grid.map((cell, index) => (
              <div
                key={`${cell.day ?? "empty"}-${index}`}
                className={`min-h-28 rounded-lg border p-2 ${cell.day ? "bg-card" : "border-dashed opacity-40"}`}
              >
                {cell.day && (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold">{cell.day}</div>
                    <div className="flex flex-col gap-1">
                      {cell.flags?.attivita && (
                        <Button size="sm" variant="outline" className="justify-start" onClick={() => void openDay(cell.day!, "A")}>
                          <NotebookPen className="size-4" />
                          Attività
                        </Button>
                      )}
                      {cell.flags?.verifiche && (
                        <Button size="sm" variant="outline" className="justify-start" onClick={() => void openDay(cell.day!, "V")}>
                          <ClipboardCheck className="size-4" />
                          Verifiche
                        </Button>
                      )}
                      {cell.flags?.compiti && (
                        <Button size="sm" variant="outline" className="justify-start" onClick={() => void openDay(cell.day!, "P")}>
                          <Badge className="mr-2 px-1 py-0">P</Badge>
                          Compiti
                        </Button>
                      )}
                      {cell.flags?.colloqui && (
                        <Button size="sm" variant="outline" className="justify-start" onClick={() => void openDay(cell.day!, "Q")}>
                          <Users className="size-4" />
                          Colloqui
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detail ? `${labels[detail.type]} del ${detail.date}` : "Dettaglio agenda"}
            </DialogTitle>
            <DialogDescription>
              {detail ? `${detail.items.length} elemento/i disponibili` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {detail?.items.map((item) => (
              <Card key={`${item.kind}-${item.id}`}>
                <CardContent className="space-y-2 p-4">
                  {item.kind === "colloquio" ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">Colloquio</Badge>
                        {item.time && <Badge variant="outline">{item.time}</Badge>}
                        {item.className && <Badge variant="outline">{item.className}</Badge>}
                      </div>
                      <p className="font-medium">{item.student}</p>
                      <p className="text-sm text-muted-foreground">{item.teacher}</p>
                      {item.location && <p className="text-sm text-muted-foreground">Luogo: {item.location}</p>}
                      {item.message && <p className="whitespace-pre-wrap text-sm">{item.message}</p>}
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{item.type}</Badge>
                        {item.className && <Badge variant="outline">{item.className}</Badge>}
                        {item.subject && <Badge variant="outline">{item.subject}</Badge>}
                      </div>
                      <p className="font-medium">{item.title}</p>
                      {item.text && <p className="whitespace-pre-wrap text-sm">{item.text}</p>}
                      {item.destinatari && (
                        <p className="text-sm text-muted-foreground">Destinatari: {item.destinatari}</p>
                      )}
                      {item.classFilters && (
                        <p className="text-sm text-muted-foreground">Classi: {item.classFilters}</p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
            {detail && detail.items.length === 0 && (
              <p className="text-sm text-muted-foreground">Nessun dettaglio disponibile.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
