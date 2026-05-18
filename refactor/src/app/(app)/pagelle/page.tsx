"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type FamigliaPagelleData } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function esitoVariant(code: string | null): "default" | "secondary" | "outline" | "destructive" {
  switch (code) {
    case "A":
      return "default";
    case "N":
    case "L":
      return "destructive";
    case "S":
    case "X":
      return "secondary";
    default:
      return "outline";
  }
}

export default function PagellePage() {
  const { token } = useAuth();
  const [data, setData] = useState<FamigliaPagelleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  useEffect(() => {
    if (!token) {
      return;
    }
    api.famiglia
      .pagelle(token, selectedPeriod || undefined)
      .then((response) => {
        setData(response.data);
        setSelectedPeriod(response.data.selectedPeriod);
        setError(null);
      })
      .catch((err: { message?: string }) => {
        setError(err.message || "Impossibile caricare le pagelle.");
      })
      .finally(() => setLoading(false));
  }, [selectedPeriod, token]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Pagelle</h1>
        <p className="text-muted-foreground">
          Consultazione degli esiti e dei voti di scrutinio disponibili in area famiglia.
        </p>
      </div>

      {error && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Errore</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {loading && (
        <Card>
          <CardHeader>
            <CardDescription>Caricamento in corso...</CardDescription>
          </CardHeader>
        </Card>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Studente</CardDescription>
                <CardTitle className="text-base">{data.student.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{data.student.className}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Periodo selezionato</CardDescription>
                <CardTitle>{data.selectedPeriod}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Esito</CardDescription>
                <CardTitle className="text-base">{data.detail.esito.label || "Non disponibile"}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Media / Credito</CardDescription>
                <CardTitle className="text-base">
                  {data.detail.esito.media ?? "-"} / {data.detail.esito.credito ?? "-"}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Tabs
            value={selectedPeriod}
            onValueChange={(value) => {
              setLoading(true);
              setSelectedPeriod(value);
            }}
            className="space-y-4"
          >
            <TabsList className="flex h-auto flex-wrap">
              {data.periods.map((period) => (
                <TabsTrigger key={period.code} value={period.code}>
                  {period.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Esito scrutinio
                <Badge variant={esitoVariant(data.detail.esito.code)}>
                  {data.detail.esito.label || "N/D"}
                </Badge>
              </CardTitle>
              <CardDescription>
                {data.detail.hasHistoricalData ? "Dati storici dell’anno precedente." : "Dettaglio del periodo visibile."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 text-sm">
              {data.detail.flags.carenze && <Badge variant="secondary">Carenze presenti</Badge>}
              {data.detail.flags.noscrutinato && <Badge variant="destructive">Non scrutinato</Badge>}
              {data.detail.flags.estero && <Badge variant="outline">Anno all&apos;estero</Badge>}
              {data.detail.flags.rinviato && <Badge variant="secondary">Esito rinviato</Badge>}
              {data.detail.flags.cittadinanza && <Badge variant="outline">Cittadinanza attiva</Badge>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Voti per materia</CardTitle>
            </CardHeader>
            <CardContent>
              {data.detail.subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun dato disponibile per il periodo selezionato.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Materia</TableHead>
                      <TableHead>Voto</TableHead>
                      <TableHead>Assenze</TableHead>
                      <TableHead>Debito / Carenze</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.detail.subjects.map((subject, index) => (
                      <TableRow key={`${subject.subjectId ?? subject.subject}-${index}`}>
                        <TableCell className="font-medium">{subject.subject}</TableCell>
                        <TableCell>{subject.grade ?? "-"}</TableCell>
                        <TableCell>{subject.assenze ?? "-"}</TableCell>
                        <TableCell>
                          {subject.debito ? (
                            <pre className="max-w-md whitespace-pre-wrap text-xs">{JSON.stringify(subject.debito, null, 2)}</pre>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
