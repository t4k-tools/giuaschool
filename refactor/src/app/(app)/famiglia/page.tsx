"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { api, type FamigliaDashboardData } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function levelVariant(level: string): "default" | "secondary" | "outline" | "destructive" {
  switch (level) {
    case "danger":
      return "destructive";
    case "warning":
      return "secondary";
    default:
      return "default";
  }
}

export default function FamigliaPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "panoramica";
  const [tab, setTab] = useState(initialTab);
  const [data, setData] = useState<FamigliaDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!token) {
      return;
    }
    setLoading(true);
    api.famiglia
      .dashboard(token)
      .then((response) => {
        setData(response.data);
        setError(null);
      })
      .catch((err: { message?: string }) => {
        setError(err.message || "Impossibile caricare l’area famiglia.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const latestLessonSubjects = useMemo(
    () => data?.lessons.items.flatMap((lesson) => lesson.groups.map((group) => group.subject)).filter(Boolean) ?? [],
    [data],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Area famiglia</h1>
        <p className="text-muted-foreground">
          Consultazione rapida di lezioni, voti, assenze, note e osservazioni.
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
                <CardDescription>Ore di assenza</CardDescription>
                <CardTitle>{data.absences.stats.ore}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={levelVariant(data.absences.stats.livello)}>
                  {data.absences.stats.orePerc}% del monte ore
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Note registrate</CardDescription>
                <CardTitle>{data.overview.notesCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Giustifiche in evidenza</CardDescription>
                <CardTitle>{data.overview.pendingJustifications}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {data.student.supportsJustification ? "Gestione online disponibile" : "Gestione online non disponibile"}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comunicazioni</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-sm">
                <Link href="/circolari" className="text-primary underline-offset-4 hover:underline">Circolari</Link>
                <Link href="/avvisi" className="text-primary underline-offset-4 hover:underline">Avvisi</Link>
                <Link href="/agenda" className="text-primary underline-offset-4 hover:underline">Agenda</Link>
                <Link href="/colloqui" className="text-primary underline-offset-4 hover:underline">Colloqui</Link>
                <Link href="/richieste" className="text-primary underline-offset-4 hover:underline">Richieste</Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lezioni di oggi</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {latestLessonSubjects.length ? latestLessonSubjects.join(", ") : "Nessuna lezione disponibile"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Voti recenti</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {data.votes.recent.slice(0, 3).map((vote) => `${vote.subject} ${vote.votoLabel || vote.giudizio}`).join(" · ") || "Nessun voto visibile"}
              </CardContent>
            </Card>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList className="flex h-auto flex-wrap">
              <TabsTrigger value="panoramica">Panoramica</TabsTrigger>
              <TabsTrigger value="lezioni">Lezioni</TabsTrigger>
              <TabsTrigger value="voti">Voti</TabsTrigger>
              <TabsTrigger value="assenze">Assenze</TabsTrigger>
              <TabsTrigger value="note">Note</TabsTrigger>
              <TabsTrigger value="osservazioni">Osservazioni</TabsTrigger>
            </TabsList>

            <TabsContent value="panoramica">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ultimi voti</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.votes.recent.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nessun voto disponibile.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Materia</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Esito</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.votes.recent.slice(0, 8).map((vote, index) => (
                            <TableRow key={`${vote.subject}-${vote.date}-${index}`}>
                              <TableCell className="font-medium">{vote.subject}</TableCell>
                              <TableCell>{vote.displayDate}</TableCell>
                              <TableCell>{vote.votoLabel || vote.giudizio || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ultime note e osservazioni</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.notes.recent.slice(0, 4).map((note, index) => (
                      <div key={`${note.date}-${index}`} className="rounded-md border p-3 text-sm">
                        <p className="font-medium">{note.displayDate} · {note.type === "individuale" ? "Nota individuale" : "Nota di classe"}</p>
                        <p className="text-muted-foreground">{note.teacher}</p>
                        <p className="mt-2 whitespace-pre-wrap">{note.text}</p>
                      </div>
                    ))}
                    {data.observations.recent.slice(0, 2).map((item, index) => (
                      <div key={`${item.date}-${index}`} className="rounded-md border p-3 text-sm">
                        <p className="font-medium">{item.displayDate} · {item.subject}</p>
                        <p className="text-muted-foreground">{item.teacher}</p>
                        <p className="mt-2 whitespace-pre-wrap">{item.text}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="lezioni">
              <Card>
                <CardHeader>
                  <CardTitle>Lezioni del giorno</CardTitle>
                  <CardDescription>Argomenti e attività visibili in area famiglia.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.lessons.items.map((lesson) => (
                    <div key={lesson.ora} className="rounded-md border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="font-medium">Ora {lesson.ora}</p>
                        <p className="text-sm text-muted-foreground">{lesson.startTime} - {lesson.endTime}</p>
                      </div>
                      <div className="space-y-3">
                        {lesson.groups.map((group) => (
                          <div key={group.key} className="rounded-md bg-muted/40 p-3 text-sm">
                            <p className="font-medium">{group.subject || "Nessuna materia"}</p>
                            {group.argomento && <p className="mt-1 whitespace-pre-wrap">{group.argomento}</p>}
                            {group.attivita && <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{group.attivita}</p>}
                            {group.sostegno && <p className="mt-1 text-muted-foreground whitespace-pre-wrap">Sostegno: {group.sostegno}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {data.lessons.annotations.length > 0 && (
                    <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle className="text-base">Annotazioni del giorno</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {data.lessons.annotations.map((item, index) => (
                          <p key={index} className="text-sm whitespace-pre-wrap">{item}</p>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="voti">
              <div className="grid gap-4">
                {data.votes.groups.map((group) => (
                  <Card key={group.period}>
                    <CardHeader>
                      <CardTitle>{group.period}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {group.subjects.map((subject) => (
                        <div key={subject.subject} className="rounded-md border p-4">
                          <p className="font-medium">{subject.subject}</p>
                          <Table className="mt-3">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Esito</TableHead>
                                <TableHead>Docente</TableHead>
                                <TableHead>Argomento</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {subject.entries.map((entry, index) => (
                                <TableRow key={`${entry.date}-${index}`}>
                                  <TableCell>{entry.displayDate}</TableCell>
                                  <TableCell>{entry.votoLabel || entry.giudizio || "-"}</TableCell>
                                  <TableCell>{entry.teacher}</TableCell>
                                  <TableCell className="max-w-md truncate">{entry.argomento || "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="assenze">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Statistiche assenze</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-4 text-sm">
                    <div>Assenze: <strong>{data.absences.stats.assenze}</strong></div>
                    <div>Ritardi: <strong>{data.absences.stats.ritardi}</strong></div>
                    <div>Uscite: <strong>{data.absences.stats.uscite}</strong></div>
                    <div>Ore: <strong>{data.absences.stats.ore}</strong></div>
                  </CardContent>
                </Card>
                {data.absences.periods.map((period) => (
                  <Card key={period.period}>
                    <CardHeader>
                      <CardTitle>{period.period}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Assenza</TableHead>
                            <TableHead>Ritardo</TableHead>
                            <TableHead>Uscita</TableHead>
                            <TableHead>Fuori classe</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {period.entries.map((entry) => (
                            <TableRow key={`${period.period}-${entry.date}`}>
                              <TableCell>{String((entry.assenza as { data?: string } | null)?.data || (entry.ritardo as { data?: string } | null)?.data || (entry.uscita as { data?: string } | null)?.data || (entry.fuoriClasse as { data?: string } | null)?.data || entry.date)}</TableCell>
                              <TableCell>{entry.assenza ? "Sì" : "-"}</TableCell>
                              <TableCell>{entry.ritardo ? "Sì" : "-"}</TableCell>
                              <TableCell>{entry.uscita ? "Sì" : "-"}</TableCell>
                              <TableCell>{entry.fuoriClasse ? "Sì" : "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="note">
              <div className="grid gap-4">
                {data.notes.groups.map((group) => (
                  <Card key={group.period}>
                    <CardHeader>
                      <CardTitle>{group.period}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {group.entries.map((entry, index) => (
                        <div key={`${entry.date}-${index}`} className="rounded-md border p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={entry.type === "individuale" ? "default" : "outline"}>
                              {entry.type === "individuale" ? "Individuale" : "Classe"}
                            </Badge>
                            <span className="text-muted-foreground">{entry.displayDate}</span>
                          </div>
                          <p className="mt-2 font-medium">{entry.teacher}</p>
                          <p className="mt-2 whitespace-pre-wrap">{entry.text}</p>
                          {entry.provvedimento && (
                            <p className="mt-2 text-muted-foreground whitespace-pre-wrap">
                              Provvedimento: {entry.provvedimento}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="osservazioni">
              <div className="grid gap-4">
                {data.observations.groups.length === 0 && (
                  <Card>
                    <CardHeader>
                      <CardDescription>Nessuna osservazione disponibile.</CardDescription>
                    </CardHeader>
                  </Card>
                )}
                {data.observations.groups.map((group) => (
                  <Card key={group.period}>
                    <CardHeader>
                      <CardTitle>{group.period}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {group.entries.map((entry, index) => (
                        <div key={`${entry.date}-${index}`} className="rounded-md border p-3 text-sm">
                          <p className="font-medium">{entry.displayDate} · {entry.subject}</p>
                          <p className="text-muted-foreground">{entry.teacher}</p>
                          <p className="mt-2 whitespace-pre-wrap">{entry.text}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
