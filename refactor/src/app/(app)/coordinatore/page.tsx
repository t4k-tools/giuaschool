"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type ClasseOption = { id: number; nome: string; sede: string };
type AlunnoSituazione = { id: number; displayName: string; dataNascita: string | null; sesso: string; bes: string; noteBes: string; religione: boolean; note: string };
type AlunnoAssenze = { id: number; displayName: string; assenze: number; assenzeNonGiust: number; ritardi: number; ritardiNonGiust: number; uscite: number };
type AlunnoVoti = { id: number; displayName: string; materie: { materia: string; media: number | null; count: number }[] };

function besVariant(bes: string): "default" | "secondary" | "outline" {
  if (bes === "N" || !bes) return "outline";
  if (bes === "H") return "default";
  return "secondary";
}

export default function CoordinatorePage() {
  const { token } = useAuth();
  const [classi, setClassi] = useState<ClasseOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loadingClassi, setLoadingClassi] = useState(true);
  const [activeTab, setActiveTab] = useState("situazione");

  const [situazione, setSituazione] = useState<{ classe: { id: number; nome: string; sede: string; oreSettimanali: number }; alunni: AlunnoSituazione[] } | null>(null);
  const [assenze, setAssenze] = useState<AlunnoAssenze[]>([]);
  const [voti, setVoti] = useState<AlunnoVoti[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.coordinatore.classi(token)
      .then((res) => {
        setClassi(res.data);
        if (res.data.length > 0) setSelectedId(res.data[0].id);
      })
      .catch(() => toast.error("Errore nel caricamento delle classi"))
      .finally(() => setLoadingClassi(false));
  }, [token]);

  const loadTab = useCallback(async (tab: string, classeId: number) => {
    if (!token) return;
    setLoading(true);
    try {
      if (tab === "situazione") {
        const res = await api.coordinatore.situazione(token, classeId);
        setSituazione(res.data);
      } else if (tab === "assenze") {
        const res = await api.coordinatore.assenze(token, classeId);
        setAssenze(res.data.items);
      } else if (tab === "voti") {
        const res = await api.coordinatore.voti(token, classeId);
        setVoti(res.data.items);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel caricamento dei dati.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!selectedId) return;
    void loadTab(activeTab, selectedId);
  }, [selectedId, activeTab, loadTab]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Coordinatore</h1>
        <p className="text-muted-foreground">Situazione, assenze e voti della classe coordinata.</p>
      </div>

      {loadingClassi ? (
        <Skeleton className="h-10 w-64" />
      ) : classi.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nessuna classe</CardTitle>
            <CardDescription>Non sei coordinatore di nessuna classe.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Select
            value={selectedId ? String(selectedId) : ""}
            onValueChange={(v) => setSelectedId(Number(v))}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Seleziona classe" />
            </SelectTrigger>
            <SelectContent>
              {classi.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nome} — {c.sede}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="situazione">Situazione</TabsTrigger>
              <TabsTrigger value="assenze">Assenze</TabsTrigger>
              <TabsTrigger value="voti">Voti</TabsTrigger>
            </TabsList>

            <TabsContent value="situazione" className="space-y-4 pt-4">
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : situazione ? (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Classe</CardDescription>
                        <CardTitle>{situazione.classe.nome}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Sede</CardDescription>
                        <CardTitle>{situazione.classe.sede}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Alunni</CardDescription>
                        <CardTitle>{situazione.alunni.length}</CardTitle>
                      </CardHeader>
                    </Card>
                  </div>
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Alunno</TableHead>
                            <TableHead>Sesso</TableHead>
                            <TableHead>BES</TableHead>
                            <TableHead>Religione</TableHead>
                            <TableHead>Note BES</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {situazione.alunni.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell className="font-medium">{a.displayName}</TableCell>
                              <TableCell>{a.sesso}</TableCell>
                              <TableCell>
                                {a.bes && a.bes !== "N" ? (
                                  <Badge variant={besVariant(a.bes)}>{a.bes}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>{a.religione ? "Sì" : "No"}</TableCell>
                              <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                                {a.noteBes || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </TabsContent>

            <TabsContent value="assenze" className="pt-4">
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Alunno</TableHead>
                          <TableHead className="text-center">Assenze</TableHead>
                          <TableHead className="text-center">Non giust.</TableHead>
                          <TableHead className="text-center">Ritardi</TableHead>
                          <TableHead className="text-center">Rit. non giust.</TableHead>
                          <TableHead className="text-center">Uscite</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assenze.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.displayName}</TableCell>
                            <TableCell className="text-center">{a.assenze}</TableCell>
                            <TableCell className="text-center">
                              {a.assenzeNonGiust > 0 ? (
                                <Badge variant="destructive">{a.assenzeNonGiust}</Badge>
                              ) : "0"}
                            </TableCell>
                            <TableCell className="text-center">{a.ritardi}</TableCell>
                            <TableCell className="text-center">
                              {a.ritardiNonGiust > 0 ? (
                                <Badge variant="secondary">{a.ritardiNonGiust}</Badge>
                              ) : "0"}
                            </TableCell>
                            <TableCell className="text-center">{a.uscite}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="voti" className="pt-4">
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="space-y-4">
                  {voti.map((a) => (
                    <Card key={a.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{a.displayName}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {a.materie.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nessun voto registrato.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {a.materie.map((m) => (
                              <div key={m.materia} className="rounded-md border px-3 py-1.5 text-sm">
                                <span className="font-medium">{m.materia}</span>
                                <span className="ml-2 text-muted-foreground">
                                  {m.media !== null ? m.media.toFixed(2) : "—"}
                                  <span className="ml-1 text-xs">({m.count} voti)</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
