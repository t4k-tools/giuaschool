"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import {
  api,
  type RegistroAssenzeData,
  type RegistroAssenzeStudent,
} from "@/lib/api/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  MessageSquareWarning,
} from "lucide-react";

const STORAGE_KEY = "lesson_context_v1";

interface StoredLessonContext {
  mode: "cattedra" | "classe";
  cattedraId: number | null;
  classeId: number | null;
}

interface EntrataUscitaFormState {
  open: boolean;
  student: RegistroAssenzeStudent | null;
  ora: string;
  valido: boolean;
  note: string;
}

interface FuoriClasseFormState {
  open: boolean;
  student: RegistroAssenzeStudent | null;
  oraTipo: "G" | "F" | "I";
  oraInizio: string;
  oraFine: string;
  tipo: "P" | "M" | "S" | "E";
  descrizione: string;
}

function readStoredContext(): StoredLessonContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredLessonContext;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildMutationContext(stored: StoredLessonContext, data: string) {
  return stored.mode === "cattedra"
    ? { cattedraId: stored.cattedraId ?? undefined, data }
    : { classeId: stored.classeId ?? undefined, data };
}

export default function RegistroAssenzePage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();

  const [data, setData] = useState<RegistroAssenzeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showContextMissing, setShowContextMissing] = useState(false);

  const [appelloOpen, setAppelloOpen] = useState(false);
  const [appelloSaving, setAppelloSaving] = useState(false);
  const [appelloEntries, setAppelloEntries] = useState<Record<number, "P" | "A">>({});

  const [actionBusyKey, setActionBusyKey] = useState<string | null>(null);

  const [entrataForm, setEntrataForm] = useState<EntrataUscitaFormState>({
    open: false,
    student: null,
    ora: "",
    valido: false,
    note: "",
  });
  const [uscitaForm, setUscitaForm] = useState<EntrataUscitaFormState>({
    open: false,
    student: null,
    ora: "",
    valido: false,
    note: "",
  });
  const [fuoriClasseForm, setFuoriClasseForm] = useState<FuoriClasseFormState>({
    open: false,
    student: null,
    oraTipo: "G",
    oraInizio: "",
    oraFine: "",
    tipo: "S",
    descrizione: "",
  });

  const currentDate =
    searchParams.get("data") || new Date().toISOString().slice(0, 10);

  const loadAssenze = async () => {
    if (!token) {
      return;
    }

    const stored = readStoredContext();
    if (!stored) {
      setShowContextMissing(true);
      return;
    }

    try {
      const response = await api.registro.assenzeQuadro(
        token,
        buildMutationContext(stored, currentDate),
      );
      setData(response.data);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Impossibile caricare il quadro assenze.";
      setError(message);
    }
  };

  useEffect(() => {
    void loadAssenze();
  }, [currentDate, token]);

  useEffect(() => {
    if (!data) {
      return;
    }

    const nextEntries = Object.fromEntries(
      data.attendanceDraft.map((entry) => [entry.alunnoId, entry.presenza]),
    ) as Record<number, "P" | "A">;
    setAppelloEntries(nextEntries);
  }, [data]);

  const stats = useMemo(() => {
    if (!data) {
      return [];
    }

    const assenti = data.students.filter(
      (student) => student.status === "ASSENTE",
    ).length;
    const fuoriClasse = data.students.filter(
      (student) => student.status === "FUORI_CLASSE",
    ).length;
    const daGiustificare = data.students.filter(
      (student) =>
        student.giustificazioni.assenze +
          student.giustificazioni.ritardi +
          student.giustificazioni.uscite +
          student.giustificazioni.convalide >
        0,
    ).length;

    return [
      { label: "Studenti", value: data.students.length },
      { label: "Assenti", value: assenti },
      { label: "Fuori classe", value: fuoriClasse },
      { label: "Da giustificare", value: daGiustificare },
    ];
  }, [data]);

  const runMutation = async (
    key: string,
    handler: (context: ReturnType<typeof buildMutationContext>) => Promise<unknown>,
    onDone?: () => void,
  ) => {
    if (!token) {
      return;
    }

    const stored = readStoredContext();
    if (!stored) {
      setShowContextMissing(true);
      return;
    }

    setActionBusyKey(key);
    try {
      await handler(buildMutationContext(stored, currentDate));
      if (onDone) {
        onDone();
      }
      await loadAssenze();
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Operazione non riuscita.";
      setError(message);
    } finally {
      setActionBusyKey(null);
    }
  };

  const openEntrataDialog = (student: RegistroAssenzeStudent) => {
    setEntrataForm({
      open: true,
      student,
      ora: student.entrata?.ora ?? "",
      valido: student.entrata?.valido ?? false,
      note: student.entrata?.note ?? "",
    });
  };

  const openUscitaDialog = (student: RegistroAssenzeStudent) => {
    setUscitaForm({
      open: true,
      student,
      ora: student.uscita?.ora ?? "",
      valido: student.uscita?.valido ?? false,
      note: student.uscita?.note ?? "",
    });
  };

  const openFuoriClasseDialog = (student: RegistroAssenzeStudent) => {
    const fc = student.fuoriClasse;
    const oraTipo: "G" | "F" | "I" = !fc
      ? "G"
      : fc.oraInizio && fc.oraFine
        ? "I"
        : fc.oraInizio
          ? "F"
          : "G";

    setFuoriClasseForm({
      open: true,
      student,
      oraTipo,
      oraInizio: fc?.oraInizio ?? "",
      oraFine: fc?.oraFine ?? "",
      tipo: (fc?.tipo as "P" | "M" | "S" | "E") ?? "S",
      descrizione: fc?.descrizione ?? "",
    });
  };

  const handleSaveAppello = async () => {
    if (!token || !data) {
      return;
    }

    const stored = readStoredContext();
    if (!stored) {
      setShowContextMissing(true);
      return;
    }

    setAppelloSaving(true);
    try {
      await api.registro.salvaAppello(token, {
        ...buildMutationContext(stored, data.info.data),
        entries: Object.entries(appelloEntries).map(([alunnoId, presenza]) => ({
          alunnoId: Number(alunnoId),
          presenza,
        })),
      });
      setAppelloOpen(false);
      await loadAssenze();
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Salvataggio appello non riuscito.";
      setError(message);
    } finally {
      setAppelloSaving(false);
    }
  };

  const handleToggleAssenza = async (student: RegistroAssenzeStudent) => {
    await runMutation(`assenza-${student.alunnoId}`, (context) =>
      api.registro.toggleAssenza(token!, {
        ...context,
        alunnoId: student.alunnoId,
      }),
    );
  };

  const handleSaveEntrata = async () => {
    if (!entrataForm.student || !entrataForm.ora) {
      return;
    }

    await runMutation(
      `entrata-save-${entrataForm.student.alunnoId}`,
      (context) =>
        api.registro.salvaEntrata(token!, {
          ...context,
          alunnoId: entrataForm.student!.alunnoId,
          ora: entrataForm.ora,
          valido: entrataForm.valido,
          note: entrataForm.note,
        }),
      () =>
        setEntrataForm({
          open: false,
          student: null,
          ora: "",
          valido: false,
          note: "",
        }),
    );
  };

  const handleDeleteEntrata = async (student: RegistroAssenzeStudent) => {
    await runMutation(`entrata-delete-${student.alunnoId}`, (context) =>
      api.registro.deleteEntrata(token!, {
        ...context,
        alunnoId: student.alunnoId,
      }),
    );
  };

  const handleSaveUscita = async () => {
    if (!uscitaForm.student || !uscitaForm.ora) {
      return;
    }

    await runMutation(
      `uscita-save-${uscitaForm.student.alunnoId}`,
      (context) =>
        api.registro.salvaUscita(token!, {
          ...context,
          alunnoId: uscitaForm.student!.alunnoId,
          ora: uscitaForm.ora,
          valido: uscitaForm.valido,
          note: uscitaForm.note,
        }),
      () =>
        setUscitaForm({
          open: false,
          student: null,
          ora: "",
          valido: false,
          note: "",
        }),
    );
  };

  const handleDeleteUscita = async (student: RegistroAssenzeStudent) => {
    await runMutation(`uscita-delete-${student.alunnoId}`, (context) =>
      api.registro.deleteUscita(token!, {
        ...context,
        alunnoId: student.alunnoId,
      }),
    );
  };

  const handleSaveFuoriClasse = async () => {
    if (!fuoriClasseForm.student || !fuoriClasseForm.descrizione.trim()) {
      return;
    }

    await runMutation(
      `fc-save-${fuoriClasseForm.student.alunnoId}`,
      (context) =>
        api.registro.salvaFuoriClasse(token!, {
          ...context,
          alunnoId: fuoriClasseForm.student!.alunnoId,
          oraTipo: fuoriClasseForm.oraTipo,
          oraInizio:
            fuoriClasseForm.oraTipo === "G" ? undefined : fuoriClasseForm.oraInizio || undefined,
          oraFine:
            fuoriClasseForm.oraTipo === "I" ? fuoriClasseForm.oraFine || undefined : undefined,
          tipo: fuoriClasseForm.tipo,
          descrizione: fuoriClasseForm.descrizione.trim(),
        }),
      () =>
        setFuoriClasseForm({
          open: false,
          student: null,
          oraTipo: "G",
          oraInizio: "",
          oraFine: "",
          tipo: "S",
          descrizione: "",
        }),
    );
  };

  const handleDeleteFuoriClasse = async (student: RegistroAssenzeStudent) => {
    await runMutation(`fc-delete-${student.alunnoId}`, (context) =>
      api.registro.deleteFuoriClasse(token!, {
        ...context,
        alunnoId: student.alunnoId,
      }),
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Registro assenze</h1>
        <p className="text-muted-foreground">
          Vista giornaliera con appello, ritardi, uscite e fuori classe sul nuovo
          stack API.
        </p>
      </div>

      <AlertDialog open={showContextMissing} onOpenChange={setShowContextMissing}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contesto lezioni mancante</AlertDialogTitle>
            <AlertDialogDescription>
              Prima di usare il registro devi selezionare una cattedra o una
              classe nella pagina contesto lezioni.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Link href="/lezioni">Vai a contesto lezioni</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={appelloOpen} onOpenChange={setAppelloOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Appello</DialogTitle>
            <DialogDescription>
              Aggiorna rapidamente lo stato presenza per la giornata selezionata.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {data?.attendanceDraft.map((entry) => (
              <div
                key={entry.alunnoId}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{entry.displayName}</p>
                  {entry.ora && (
                    <p className="text-sm text-muted-foreground">
                      Ora registrata: {entry.ora}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={appelloEntries[entry.alunnoId] === "P" ? "default" : "outline"}
                    onClick={() =>
                      setAppelloEntries((current) => ({
                        ...current,
                        [entry.alunnoId]: "P",
                      }))
                    }
                  >
                    Presente
                  </Button>
                  <Button
                    type="button"
                    variant={
                      appelloEntries[entry.alunnoId] === "A" ? "destructive" : "outline"
                    }
                    onClick={() =>
                      setAppelloEntries((current) => ({
                        ...current,
                        [entry.alunnoId]: "A",
                      }))
                    }
                  >
                    Assente
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAppelloOpen(false)}>
              Chiudi
            </Button>
            <Button onClick={() => void handleSaveAppello()} disabled={appelloSaving}>
              {appelloSaving ? "Salvataggio..." : "Salva appello"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={entrataForm.open}
        onOpenChange={(open) =>
          setEntrataForm((current) => ({ ...current, open }))
        }
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Entrata</DialogTitle>
            <DialogDescription>
              {entrataForm.student?.displayName || "Seleziona uno studente"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="entrata-ora">Ora</Label>
              <Input
                id="entrata-ora"
                type="time"
                value={entrataForm.ora}
                onChange={(event) =>
                  setEntrataForm((current) => ({
                    ...current,
                    ora: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Ritardo valido</p>
                <p className="text-sm text-muted-foreground">
                  Attiva il conteggio del ritardo nel periodo.
                </p>
              </div>
              <Switch
                checked={entrataForm.valido}
                onCheckedChange={(checked) =>
                  setEntrataForm((current) => ({
                    ...current,
                    valido: checked,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entrata-note">Note</Label>
              <Textarea
                id="entrata-note"
                value={entrataForm.note}
                onChange={(event) =>
                  setEntrataForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setEntrataForm({
                  open: false,
                  student: null,
                  ora: "",
                  valido: false,
                  note: "",
                })
              }
            >
              Chiudi
            </Button>
            <Button
              onClick={() => void handleSaveEntrata()}
              disabled={
                !entrataForm.student ||
                !entrataForm.ora ||
                actionBusyKey === `entrata-save-${entrataForm.student.alunnoId}`
              }
            >
              {entrataForm.student?.entrata ? "Aggiorna entrata" : "Salva entrata"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={uscitaForm.open}
        onOpenChange={(open) => setUscitaForm((current) => ({ ...current, open }))}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Uscita</DialogTitle>
            <DialogDescription>
              {uscitaForm.student?.displayName || "Seleziona uno studente"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="uscita-ora">Ora</Label>
              <Input
                id="uscita-ora"
                type="time"
                value={uscitaForm.ora}
                onChange={(event) =>
                  setUscitaForm((current) => ({
                    ...current,
                    ora: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Uscita valida</p>
                <p className="text-sm text-muted-foreground">
                  Mantiene la registrazione come uscita conteggiabile.
                </p>
              </div>
              <Switch
                checked={uscitaForm.valido}
                onCheckedChange={(checked) =>
                  setUscitaForm((current) => ({
                    ...current,
                    valido: checked,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="uscita-note">Note</Label>
              <Textarea
                id="uscita-note"
                value={uscitaForm.note}
                onChange={(event) =>
                  setUscitaForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setUscitaForm({
                  open: false,
                  student: null,
                  ora: "",
                  valido: false,
                  note: "",
                })
              }
            >
              Chiudi
            </Button>
            <Button
              onClick={() => void handleSaveUscita()}
              disabled={
                !uscitaForm.student ||
                !uscitaForm.ora ||
                actionBusyKey === `uscita-save-${uscitaForm.student.alunnoId}`
              }
            >
              {uscitaForm.student?.uscita ? "Aggiorna uscita" : "Salva uscita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fuoriClasseForm.open}
        onOpenChange={(open) =>
          setFuoriClasseForm((current) => ({ ...current, open }))
        }
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Fuori classe</DialogTitle>
            <DialogDescription>
              {fuoriClasseForm.student?.displayName || "Seleziona uno studente"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Durata</Label>
              <Select
                value={fuoriClasseForm.oraTipo}
                onValueChange={(value: "G" | "F" | "I") =>
                  setFuoriClasseForm((current) => ({
                    ...current,
                    oraTipo: value,
                    oraFine: value === "I" ? current.oraFine : "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="G">Giornata intera</SelectItem>
                  <SelectItem value="F">Da un orario a fine giornata</SelectItem>
                  <SelectItem value="I">Intervallo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {fuoriClasseForm.oraTipo !== "G" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="fc-ora-inizio">Ora inizio</Label>
                  <Input
                    id="fc-ora-inizio"
                    type="time"
                    value={fuoriClasseForm.oraInizio}
                    onChange={(event) =>
                      setFuoriClasseForm((current) => ({
                        ...current,
                        oraInizio: event.target.value,
                      }))
                    }
                  />
                </div>
                {fuoriClasseForm.oraTipo === "I" && (
                  <div className="grid gap-2">
                    <Label htmlFor="fc-ora-fine">Ora fine</Label>
                    <Input
                      id="fc-ora-fine"
                      type="time"
                      value={fuoriClasseForm.oraFine}
                      onChange={(event) =>
                        setFuoriClasseForm((current) => ({
                          ...current,
                          oraFine: event.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label>Tipo attività</Label>
              <Select
                value={fuoriClasseForm.tipo}
                onValueChange={(value: "P" | "M" | "S" | "E") =>
                  setFuoriClasseForm((current) => ({ ...current, tipo: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P">PCTO</SelectItem>
                  <SelectItem value="M">Mobilità</SelectItem>
                  <SelectItem value="S">Attività a scuola</SelectItem>
                  <SelectItem value="E">Attività esterna</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fc-descrizione">Descrizione</Label>
              <Textarea
                id="fc-descrizione"
                value={fuoriClasseForm.descrizione}
                onChange={(event) =>
                  setFuoriClasseForm((current) => ({
                    ...current,
                    descrizione: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setFuoriClasseForm({
                  open: false,
                  student: null,
                  oraTipo: "G",
                  oraInizio: "",
                  oraFine: "",
                  tipo: "S",
                  descrizione: "",
                })
              }
            >
              Chiudi
            </Button>
            <Button
              onClick={() => void handleSaveFuoriClasse()}
              disabled={
                !fuoriClasseForm.student ||
                !fuoriClasseForm.descrizione.trim() ||
                actionBusyKey === `fc-save-${fuoriClasseForm.student.alunnoId}`
              }
            >
              {fuoriClasseForm.student?.fuoriClasse
                ? "Aggiorna fuori classe"
                : "Salva fuori classe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Errore operazione</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {stats.map((item) => (
              <Card key={item.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{item.label}</CardDescription>
                  <CardTitle>{item.value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{data.info.dataLabel}</CardTitle>
                  <CardDescription>
                    {data.info.classe.nome} · {data.info.materia.nomeBreve || "Sostituzione"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" asChild>
                    <Link href={`/registro/assenze?data=${shiftDate(currentDate, -1)}`}>
                      <ChevronLeft className="size-4" />
                      Precedente
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/registro/assenze?data=${shiftDate(currentDate, 1)}`}>
                      Successivo
                      <ChevronRight className="size-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/registro/firme?data=${data.info.data}&vista=G`}>
                      <CalendarDays className="size-4" />
                      Quadro firme
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/registro/voti">
                      <GraduationCap className="size-4" />
                      Voti
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/registro/note?data=${data.info.data}`}>
                      <MessageSquareWarning className="size-4" />
                      Note
                    </Link>
                  </Button>
                  <Button
                    onClick={() => setAppelloOpen(true)}
                    disabled={!data.info.appello.enabled}
                  >
                    <ClipboardCheck className="size-4" />
                    Appello
                  </Button>
                </div>
              </div>
              {!data.info.appello.enabled && data.info.appello.reason && (
                <CardDescription>{data.info.appello.reason}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {data.info.errore && (
                <p className="text-sm text-muted-foreground">{data.info.errore}</p>
              )}

              {data.students.map((student) => (
                <div
                  key={student.alunnoId}
                  className="space-y-3 rounded-lg border p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="font-medium">{student.displayName}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={
                            student.status === "ASSENTE"
                              ? "destructive"
                              : student.status === "FUORI_CLASSE"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {student.status.replace("_", " ")}
                        </Badge>
                        {student.entrata && (
                          <Badge variant="outline">
                            Entrata {student.entrata.ora}
                            {student.entrata.ritardoBreve ? " · breve" : ""}
                          </Badge>
                        )}
                        {student.uscita && (
                          <Badge variant="outline">Uscita {student.uscita.ora}</Badge>
                        )}
                        {student.giustificazioni.convalide > 0 && (
                          <Badge variant="secondary">
                            Convalide {student.giustificazioni.convalide}
                          </Badge>
                        )}
                      </div>
                      {student.fuoriClasse && (
                        <p className="text-sm text-muted-foreground">
                          Fuori classe {student.fuoriClasse.tipo}:{" "}
                          {student.fuoriClasse.descrizione}
                          {student.fuoriClasse.oraInizio
                            ? ` · ${student.fuoriClasse.oraInizio}`
                            : ""}
                          {student.fuoriClasse.oraFine
                            ? `-${student.fuoriClasse.oraFine}`
                            : ""}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground sm:grid-cols-4">
                      <div>
                        <p>Assenze</p>
                        <p className="font-medium text-foreground">
                          {student.giustificazioni.assenze}
                        </p>
                      </div>
                      <div>
                        <p>Ritardi</p>
                        <p className="font-medium text-foreground">
                          {student.ritardiPeriodo}
                        </p>
                      </div>
                      <div>
                        <p>Uscite</p>
                        <p className="font-medium text-foreground">
                          {student.uscitePeriodo}
                        </p>
                      </div>
                      <div>
                        <p>Da giustificare</p>
                        <p className="font-medium text-foreground">
                          {student.giustificazioni.assenze +
                            student.giustificazioni.ritardi +
                            student.giustificazioni.uscite}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={student.status === "ASSENTE" ? "destructive" : "outline"}
                      onClick={() => void handleToggleAssenza(student)}
                      disabled={actionBusyKey === `assenza-${student.alunnoId}`}
                    >
                      {student.status === "ASSENTE" ? "Rimuovi assenza" : "Segna assenza"}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => openEntrataDialog(student)}
                    >
                      {student.entrata ? "Modifica entrata" : "Aggiungi entrata"}
                    </Button>
                    {student.entrata && (
                      <Button
                        variant="outline"
                        onClick={() => void handleDeleteEntrata(student)}
                        disabled={actionBusyKey === `entrata-delete-${student.alunnoId}`}
                      >
                        Rimuovi entrata
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => openUscitaDialog(student)}
                    >
                      {student.uscita ? "Modifica uscita" : "Aggiungi uscita"}
                    </Button>
                    {student.uscita && (
                      <Button
                        variant="outline"
                        onClick={() => void handleDeleteUscita(student)}
                        disabled={actionBusyKey === `uscita-delete-${student.alunnoId}`}
                      >
                        Rimuovi uscita
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => openFuoriClasseDialog(student)}
                    >
                      {student.fuoriClasse
                        ? "Modifica fuori classe"
                        : "Aggiungi fuori classe"}
                    </Button>
                    {student.fuoriClasse && (
                      <Button
                        variant="outline"
                        onClick={() => void handleDeleteFuoriClasse(student)}
                        disabled={actionBusyKey === `fc-delete-${student.alunnoId}`}
                      >
                        Rimuovi fuori classe
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
