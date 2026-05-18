"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import {
  api,
  type LezioneContextCattedra,
  type RegistroVoteEntry,
  type RegistroVotiData,
  type RegistroVotiStandardData,
  type RegistroVotiStudent,
  type RegistroVotiSupportData,
} from "@/lib/api/client";
import {
  CardAction,
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
  AlertDialogCancel,
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
  ClipboardList,
  MessageSquareWarning,
  PenLine,
  Trash2,
} from "lucide-react";

const STORAGE_KEY = "lesson_context_v1";
const RESOLVED_CATTEDRA_STORAGE_KEY = "registro_voti_resolved_cattedre_v1";

interface StoredLessonContext {
  mode: "cattedra" | "classe";
  cattedraId: number | null;
  classeId: number | null;
}

type ResolvedCattedraMap = Record<string, number>;

interface VoteFormState {
  open: boolean;
  mode: "create" | "edit";
  student: RegistroVotiStudent | null;
  alunnoId: number | null;
  entry: RegistroVoteEntry | null;
  entryId: number | null;
  tipo: "S" | "O" | "P";
  data: string;
  visibile: boolean;
  media: boolean;
  voto: string;
  giudizio: string;
  argomento: string;
  confirmAbsent: boolean;
  materiaId: number | null;
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

function readResolvedCattedre(): ResolvedCattedraMap {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(RESOLVED_CATTEDRA_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === "number" && Number.isFinite(entry[1]),
      ),
    );
  } catch {
    window.localStorage.removeItem(RESOLVED_CATTEDRA_STORAGE_KEY);
    return {};
  }
}

function writeResolvedCattedra(classeId: number, cattedraId: number) {
  if (typeof window === "undefined") {
    return;
  }

  const next = {
    ...readResolvedCattedre(),
    [String(classeId)]: cattedraId,
  };
  window.localStorage.setItem(RESOLVED_CATTEDRA_STORAGE_KEY, JSON.stringify(next));
}

function clearResolvedCattedra(classeId: number) {
  if (typeof window === "undefined") {
    return;
  }

  const current = readResolvedCattedre();
  delete current[String(classeId)];
  if (Object.keys(current).length === 0) {
    window.localStorage.removeItem(RESOLVED_CATTEDRA_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(RESOLVED_CATTEDRA_STORAGE_KEY, JSON.stringify(current));
}

function emptyVoteForm(): VoteFormState {
  return {
    open: false,
    mode: "create",
    student: null,
    alunnoId: null,
    entry: null,
    entryId: null,
    tipo: "S",
    data: new Date().toISOString().slice(0, 10),
    visibile: true,
    media: true,
    voto: "",
    giudizio: "",
    argomento: "",
    confirmAbsent: false,
    materiaId: null,
  };
}

function formatAverage(value: number | string) {
  return typeof value === "number" ? value.toFixed(2) : value;
}

function formatVote(entry: RegistroVoteEntry) {
  if (entry.votoText) {
    return entry.votoText;
  }
  if (entry.voto !== null) {
    return String(entry.voto);
  }

  return "Giudizio";
}

function orderLabel(tipo: "S" | "O" | "P") {
  if (tipo === "S") return "Scritti";
  if (tipo === "O") return "Orali";
  return "Pratici";
}

function isSupportData(data: RegistroVotiData | null): data is RegistroVotiSupportData {
  return data?.info.mode === "support";
}

function isStandardData(data: RegistroVotiData | null): data is RegistroVotiStandardData {
  return data?.info.mode === "standard";
}

export default function RegistroVotiPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();

  const [data, setData] = useState<RegistroVotiData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showContextMissing, setShowContextMissing] = useState(false);
  const [showClassContextResolver, setShowClassContextResolver] = useState(false);
  const [classContextCandidates, setClassContextCandidates] = useState<LezioneContextCattedra[]>([]);
  const [selectedResolvedCattedraId, setSelectedResolvedCattedraId] = useState<string>("");
  const [classContextLabel, setClassContextLabel] = useState<string>("");
  const [classContextInfo, setClassContextInfo] = useState<string | null>(null);
  const [form, setForm] = useState<VoteFormState>(emptyVoteForm);
  const [saving, setSaving] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<{ id: number; displayDate?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedPeriod = Number(searchParams.get("periodo") || 0) || undefined;
  const selectedSubject = Number(searchParams.get("materia") || 0) || undefined;
  const currentStoredContext = readStoredContext();
  const resolvedFromClassContext =
    currentStoredContext?.mode === "classe" && Boolean(currentStoredContext.classeId);
  const resolvedClassOriginLabel =
    resolvedFromClassContext && classContextLabel ? classContextLabel : null;

  const openClassContextResolver = useCallback(async () => {
    const stored = readStoredContext();
    if (!stored) {
      setShowContextMissing(true);
      return;
    }
    if (stored.mode !== "classe" || !stored.classeId || !token) {
      setShowContextMissing(true);
      return;
    }

    try {
      const response = await api.lezioni.context(token);
      const selectedClasse = response.data.classiSostituzione.find((item) => item.id === stored.classeId) || null;
      const candidates = response.data.cattedre.filter((item) => item.classe.id === stored.classeId);
      const persistedCandidateId = readResolvedCattedre()[String(stored.classeId)] ?? null;

      setClassContextCandidates(candidates);
      setClassContextLabel(selectedClasse?.label || "classe selezionata");
      setSelectedResolvedCattedraId(
        persistedCandidateId && candidates.some((item) => item.id === persistedCandidateId)
          ? String(persistedCandidateId)
          : candidates[0]
            ? String(candidates[0].id)
            : "",
      );
      setClassContextInfo(
        candidates.length > 0
          ? "Contesto classe rilevato: seleziona la cattedra da associare a questa classe per il quadro voti."
          : "La classe selezionata in modalità sostituzione non corrisponde a nessuna tua cattedra attiva: per usare i voti devi scegliere una cattedra.",
      );
      setShowClassContextResolver(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossibile caricare il contesto lezioni.");
    }
  }, [token]);

  const handleClearResolvedCattedra = useCallback(() => {
    const stored = readStoredContext();
    if (!stored || stored.mode !== "classe" || !stored.classeId) {
      setShowContextMissing(true);
      return;
    }

    clearResolvedCattedra(stored.classeId);
    setSelectedResolvedCattedraId("");
    setClassContextCandidates([]);
    setClassContextLabel("");
    setData(null);
    setError(null);
    setClassContextInfo("Associazione classe-cattedra rimossa. Se riapri il quadro voti dovrai scegliere di nuovo una cattedra compatibile.");
  }, []);

  const resolveCattedraId = useCallback(async (): Promise<number | null> => {
    const stored = readStoredContext();
    if (!stored) {
      setShowContextMissing(true);
      return null;
    }

    if (stored.mode === "cattedra" && stored.cattedraId) {
      setClassContextInfo(null);
      return stored.cattedraId;
    }

    if (stored.mode !== "classe" || !stored.classeId || !token) {
      setShowContextMissing(true);
      return null;
    }

    const persistedCandidateId = readResolvedCattedre()[String(stored.classeId)] ?? null;
    const selectedCandidateId = Number(selectedResolvedCattedraId || persistedCandidateId || 0) || null;
    const response = await api.lezioni.context(token);
    const selectedClasse = response.data.classiSostituzione.find((item) => item.id === stored.classeId) || null;
    const candidates = response.data.cattedre.filter((item) => item.classe.id === stored.classeId);

    setClassContextCandidates(candidates);
    setClassContextLabel(selectedClasse?.label || "classe selezionata");

    if (selectedCandidateId && candidates.some((item) => item.id === selectedCandidateId)) {
      setSelectedResolvedCattedraId(String(selectedCandidateId));
      writeResolvedCattedra(stored.classeId, selectedCandidateId);
      setClassContextInfo("Contesto classe rilevato: il refactor voti userà la cattedra già associata a questa classe.");
      return selectedCandidateId;
    }

    if (candidates.length === 1) {
      setSelectedResolvedCattedraId(String(candidates[0].id));
      writeResolvedCattedra(stored.classeId, candidates[0].id);
      setClassContextInfo("Contesto classe rilevato: il refactor voti ha risolto e memorizzato automaticamente una cattedra compatibile.");
      return candidates[0].id;
    }

    if (candidates.length > 1) {
      setSelectedResolvedCattedraId(String(candidates[0].id));
      setClassContextInfo("Contesto classe rilevato: seleziona la cattedra da associare a questa classe per il quadro voti.");
      setShowClassContextResolver(true);
      return null;
    }

    setClassContextInfo("La classe selezionata in modalità sostituzione non corrisponde a nessuna tua cattedra attiva: per usare i voti devi scegliere una cattedra.");
    setShowClassContextResolver(true);
    return null;
  }, [selectedResolvedCattedraId, token]);

  const loadQuadro = useCallback(async () => {
    if (!token) {
      return;
    }

    const resolvedCattedraId = await resolveCattedraId();
    if (!resolvedCattedraId) {
      return;
    }

    try {
      const response = await api.voti.quadro(token, {
        cattedraId: resolvedCattedraId,
        periodo: selectedPeriod,
        materiaId: selectedSubject,
      });
      setData(response.data);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Impossibile caricare il quadro voti.";
      setError(message);
    }
  }, [resolveCattedraId, selectedPeriod, selectedSubject, token]);

  useEffect(() => {
    void loadQuadro();
  }, [loadQuadro]);

  const supportData = isSupportData(data) ? data : null;
  const standardData = isStandardData(data) ? data : null;

  const stats = useMemo(() => {
    if (!data) {
      return [];
    }

    if (supportData) {
      const studentCount = supportData.support.classAverages.students.length;
      const subjectCount = supportData.support.classAverages.subjects.length;
      const selectedVotes = supportData.support.votePeriods.reduce((sum: number, period) => {
        return sum + period.subjects.reduce((inner, subject) => inner + subject.entries.length, 0);
      }, 0);

      return [
        { label: "Studenti classe", value: studentCount },
        { label: "Materie monitorate", value: subjectCount },
        { label: "Voti materia selezionata", value: selectedVotes },
      ];
    }

    if (!standardData) {
      return [];
    }

    const votesCount = standardData.students.reduce(
      (sum, student) =>
        sum +
        student.votes.S.length +
        student.votes.O.length +
        student.votes.P.length,
      0,
    );
    const average =
      standardData.students.length > 0
        ? standardData.students.reduce((sum, student) => {
            return sum + (typeof student.averages.T === "number" ? student.averages.T : 0);
          }, 0) / standardData.students.length
        : 0;

    return [
      { label: "Studenti", value: standardData.students.length },
      { label: "Valutazioni", value: votesCount },
      { label: "Media periodo", value: standardData.students.length > 0 ? average.toFixed(2) : "-" },
    ];
  }, [data, standardData, supportData]);

  const openCreateDialog = (
    student: RegistroVotiStudent,
    tipo: "S" | "O" | "P",
  ) => {
    setForm({
      open: true,
      mode: "create",
      student,
      alunnoId: null,
      entry: null,
      entryId: null,
      tipo,
      data: new Date().toISOString().slice(0, 10),
      visibile: true,
      media: true,
      voto: "",
      giudizio: "",
      argomento: "",
      confirmAbsent: false,
      materiaId: null,
    });
  };

  const openSupportCreateDialog = (alunnoId: number, materiaId: number | null, tipo: "S" | "O" | "P" = "S") => {
    setForm({
      open: true,
      mode: "create",
      student: null,
      alunnoId,
      entry: null,
      entryId: null,
      tipo,
      data: new Date().toISOString().slice(0, 10),
      visibile: true,
      media: true,
      voto: "",
      giudizio: "",
      argomento: "",
      confirmAbsent: false,
      materiaId,
    });
  };

  const openEditDialog = (
    student: RegistroVotiStudent,
    entry: RegistroVoteEntry,
  ) => {
    setForm({
      open: true,
      mode: "edit",
      student,
      alunnoId: null,
      entry,
      entryId: null,
      tipo: entry.tipo,
      data: entry.data,
      visibile: entry.visibile,
      media: entry.media,
      voto: entry.voto !== null ? String(entry.voto) : "",
      giudizio: entry.giudizio,
      argomento: entry.argomento,
      confirmAbsent: false,
      materiaId: null,
    });
  };

  const openSupportEditDialog = (entry: { id: number; tipo: string; data: string; voto: number | null; giudizio: string; argomento: string; media: boolean }) => {
    setForm({
      open: true,
      mode: "edit",
      student: null,
      alunnoId: null,
      entry: null,
      entryId: entry.id,
      tipo: (entry.tipo as "S" | "O" | "P") || "S",
      data: entry.data,
      visibile: true,
      media: entry.media,
      voto: entry.voto !== null ? String(entry.voto) : "",
      giudizio: entry.giudizio,
      argomento: entry.argomento,
      confirmAbsent: false,
      materiaId: null,
    });
  };

  const handleSave = async () => {
    const resolvedAlunnoId = form.alunnoId ?? form.student?.alunnoId;
    if (!token || !resolvedAlunnoId) {
      return;
    }

    const resolvedCattedraId = await resolveCattedraId();
    if (!resolvedCattedraId) {
      return;
    }

    setSaving(true);
    try {
      if (form.mode === "create") {
        await api.voti.create(token, {
          cattedraId: resolvedCattedraId,
          alunnoId: resolvedAlunnoId,
          tipo: form.tipo,
          data: form.data,
          visibile: form.visibile,
          media: form.media,
          voto: form.voto !== "" ? Number(form.voto) : null,
          giudizio: form.giudizio,
          argomento: form.argomento,
          confirmAbsent: form.confirmAbsent,
          materiaId: form.materiaId ?? undefined,
        });
      } else {
        const editId = form.entry?.id ?? form.entryId;
        if (!editId) {
          return;
        }
        await api.voti.update(token, {
          id: editId,
          data: form.data,
          visibile: form.visibile,
          media: form.media,
          voto: form.voto !== "" ? Number(form.voto) : null,
          giudizio: form.giudizio,
          argomento: form.argomento,
          confirmAbsent: form.confirmAbsent,
        });
      }

      setForm(emptyVoteForm());
      await loadQuadro();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Salvataggio voto non riuscito.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteEntry) {
      return;
    }

    setDeleting(true);
    try {
      await api.voti.delete(token, deleteEntry.id);
      setDeleteEntry(null);
      await loadQuadro();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Cancellazione voto non riuscita.";
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Registro voti</h1>
        <p className="text-muted-foreground">
          Quadro valutazioni del periodo con inserimento e modifica del voto singolo.
        </p>
      </div>

      <AlertDialog open={showContextMissing} onOpenChange={setShowContextMissing}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contesto lezioni mancante</AlertDialogTitle>
            <AlertDialogDescription>
              Prima di usare i voti devi selezionare una cattedra nella pagina contesto lezioni.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Link href="/lezioni">Vai a contesto lezioni</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showClassContextResolver} onOpenChange={setShowClassContextResolver}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seleziona una cattedra per i voti</DialogTitle>
            <DialogDescription>
              {classContextCandidates.length > 0
                ? `Hai aperto i voti dalla classe ${classContextLabel}. Per questo modulo serve una cattedra reale della stessa classe.`
                : `Hai aperto i voti dalla classe ${classContextLabel}. Non risulta nessuna tua cattedra attiva compatibile.`}
            </DialogDescription>
          </DialogHeader>

          {classContextCandidates.length > 0 ? (
            <div className="grid gap-2">
              <Label htmlFor="resolved-cattedra">Cattedra</Label>
              <Select value={selectedResolvedCattedraId} onValueChange={setSelectedResolvedCattedraId}>
                <SelectTrigger id="resolved-cattedra" className="w-full">
                  <SelectValue placeholder="Seleziona una cattedra" />
                </SelectTrigger>
                <SelectContent>
                  {classContextCandidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={String(candidate.id)}>
                      {candidate.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Apri la pagina contesto lezioni e seleziona una cattedra per usare il modulo voti.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" asChild>
              <Link href="/lezioni">Vai a contesto lezioni</Link>
            </Button>
            <Button
              onClick={() => {
                const selectedId = Number(selectedResolvedCattedraId || 0);
                const stored = readStoredContext();
                if (stored?.mode === "classe" && stored.classeId && selectedId) {
                  writeResolvedCattedra(stored.classeId, selectedId);
                }
                setShowClassContextResolver(false);
                void loadQuadro();
              }}
              disabled={classContextCandidates.length === 0 || !selectedResolvedCattedraId}
            >
              Usa questa cattedra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form.open} onOpenChange={(open) => setForm((current) => ({ ...current, open }))}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {form.mode === "create" ? "Nuova valutazione" : "Modifica valutazione"}
            </DialogTitle>
            <DialogDescription>
              {form.student?.displayName ?? (supportData?.support.alunno.displayName || "Studente")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{form.student?.displayName || "Studente"}</Badge>
              <Badge variant="secondary">{orderLabel(form.tipo)}</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="voto-data">Data</Label>
                <Input
                  id="voto-data"
                  type="date"
                  value={form.data}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, data: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="voto-valore">Voto</Label>
                <Input
                  id="voto-valore"
                  type="number"
                  min="1"
                  max="10"
                  step="0.25"
                  value={form.voto}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, voto: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="voto-giudizio">Giudizio</Label>
              <Textarea
                id="voto-giudizio"
                value={form.giudizio}
                onChange={(event) =>
                  setForm((current) => ({ ...current, giudizio: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="voto-argomento">Argomento</Label>
              <Textarea
                id="voto-argomento"
                value={form.argomento}
                onChange={(event) =>
                  setForm((current) => ({ ...current, argomento: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">Visibile alle famiglie</p>
                  <p className="text-sm text-muted-foreground">
                    Se disattivato, il voto resta interno.
                  </p>
                </div>
                <Switch
                  checked={form.visibile}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      visibile: checked,
                      media: checked ? current.media : false,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">Considera in media</p>
                  <p className="text-sm text-muted-foreground">
                    Attivo solo se il voto è visibile.
                  </p>
                </div>
                <Switch
                  checked={form.media}
                  disabled={!form.visibile}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, media: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">Conferma studente assente</p>
                  <p className="text-sm text-muted-foreground">
                    Attiva solo se il backend segnala che lo studente risulta assente nella lezione.
                  </p>
                </div>
                <Switch
                  checked={form.confirmAbsent}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, confirmAbsent: checked }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(emptyVoteForm())}>
              Chiudi
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={saving || (!form.student && !form.alunnoId) || !form.data}
            >
              {saving ? "Salvataggio..." : form.mode === "create" ? "Crea voto" : "Salva modifiche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteEntry)} onOpenChange={(open) => !open && setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma cancellazione voto</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteEntry
                ? `Vuoi rimuovere la valutazione del ${deleteEntry.displayDate}?`
                : "Vuoi rimuovere questa valutazione?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Cancellazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Operazione non riuscita</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {classContextInfo && (
        <Card>
          <CardHeader>
            <CardAction>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void openClassContextResolver()}>
                  Cambia cattedra
                </Button>
                {resolvedFromClassContext && (
                  <Button type="button" variant="outline" size="sm" onClick={handleClearResolvedCattedra}>
                    Azzera associazione
                  </Button>
                )}
              </div>
            </CardAction>
            <CardTitle>Contesto voti</CardTitle>
            <CardDescription>{classContextInfo}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
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
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>{data.info.classe.nome}</CardTitle>
                  <CardDescription>
                    {data.info.mode === "support"
                      ? `${data.info.materia.nomeBreve || "Sostegno"} · docente di sostegno · cattedra #${data.info.cattedra.id}`
                      : `${data.info.materia.nomeBreve || "Materia"} · cattedra #${data.info.cattedra.id}`}
                  </CardDescription>
                  {resolvedFromClassContext && (
                    <div className="pt-1">
                      <Badge variant="outline">
                        {resolvedClassOriginLabel
                          ? `Classe ${resolvedClassOriginLabel} -> cattedra risolta #${data.info.cattedra.id}`
                          : `Contesto classe: cattedra risolta #${data.info.cattedra.id}`}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Periodo {data.info.periodo}</Badge>
                  <Badge>
                    {supportData
                      ? `${supportData.support.classAverages.students.length} studenti`
                      : `${standardData?.students.length ?? 0} studenti`}
                  </Badge>
                  {supportData && (
                    <Badge variant="outline">{supportData.support.alunno.displayName}</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={String(data.info.periodo)}
                  onValueChange={(value) => {
                    const next = new URLSearchParams(searchParams.toString());
                    next.set("periodo", value);
                    window.location.search = next.toString();
                  }}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.periods.map((period) => (
                      <SelectItem key={period.id} value={String(period.id)}>
                        {period.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {supportData && (
                  <Select
                    value={String(supportData.support.selectedSubjectId ?? "")}
                    onValueChange={(value) => {
                      const next = new URLSearchParams(searchParams.toString());
                      next.set("materia", value);
                      window.location.search = next.toString();
                    }}
                  >
                    <SelectTrigger className="w-[240px]">
                      <SelectValue placeholder="Materia osservata" />
                    </SelectTrigger>
                    <SelectContent>
                      {supportData.support.subjectOptions.map((subject) => (
                        <SelectItem key={subject.id} value={String(subject.id)}>
                          {subject.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button asChild variant="outline">
                  <Link href="/registro/firme">
                    <ClipboardList className="size-4" />
                    Registro firme
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/registro/note">
                    <MessageSquareWarning className="size-4" />
                    Note
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {supportData ? (
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quadro classe per sostegno</CardTitle>
                  <CardDescription>
                    Medie del periodo per monitorare la classe e i risultati di {supportData.support.alunno.displayName}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {supportData.support.alunno.note && (
                    <p className="text-sm text-muted-foreground">{supportData.support.alunno.note}</p>
                  )}
                  <div className="grid gap-3">
                    {supportData.support.classAverages.students.map((student) => (
                      <div key={student.alunnoId} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">{student.displayName}</div>
                          <Badge>Totale {formatAverage(student.totalAverage)}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-sm">
                          {student.subjectAverages.map((subject) => (
                            <Badge key={`${student.alunnoId}-${subject.subjectId}`} variant="outline">
                              {subject.label} {formatAverage(subject.value)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dettaglio studente supportato</CardTitle>
                  <CardDescription>
                    {supportData.support.selectedSubjectLabel
                      ? `Voti visibili in ${supportData.support.selectedSubjectLabel}`
                      : "Seleziona una materia per visualizzare i voti dello studente."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.info.canEdit && supportData.support.selectedSubjectId && (
                    <div className="flex flex-wrap gap-2">
                      {(["S", "O", "P"] as const).map((tipo) => (
                        <Button
                          key={tipo}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openSupportCreateDialog(
                              supportData.support.alunno.id,
                              supportData.support.selectedSubjectId,
                              tipo,
                            )
                          }
                        >
                          <PenLine className="size-4" />
                          Nuovo {tipo === "S" ? "scritto" : tipo === "O" ? "orale" : "pratico"}
                        </Button>
                      ))}
                    </div>
                  )}
                  {supportData.support.votePeriods.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nessun voto visibile disponibile per la materia selezionata.
                    </p>
                  )}
                  {supportData.support.votePeriods.map((period) => (
                    <div key={period.label} className="space-y-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {period.label}
                      </h3>
                      {period.subjects.map((subject) => (
                        <div key={`${period.label}-${subject.label}`} className="rounded-lg border p-4">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="font-medium">{subject.label}</div>
                            <Badge variant="secondary">{subject.entries.length} voti</Badge>
                          </div>
                          <div className="grid gap-3">
                            {subject.entries.map((entry) => (
                              <div key={entry.id} className="rounded-md border p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{entry.displayTipo}</Badge>
                                    <Badge variant="secondary">{entry.displayDate}</Badge>
                                    {entry.votoText && <Badge>{entry.votoText}</Badge>}
                                  </div>
                                  {data.info.canEdit && (
                                    <div className="flex gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openSupportEditDialog(entry)}
                                      >
                                        <PenLine className="size-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeleteEntry({ id: entry.id, displayDate: entry.displayDate })}
                                      >
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                <p className="mt-2 text-sm font-medium">{entry.docente}</p>
                                {entry.argomento && (
                                  <p className="mt-1 text-sm text-muted-foreground">{entry.argomento}</p>
                                )}
                                {entry.giudizio && (
                                  <p className="mt-1 text-sm text-muted-foreground">{entry.giudizio}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid gap-4">
            {standardData?.students.map((student) => (
              <Card key={student.alunnoId}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{student.displayName}</CardTitle>
                      <CardDescription>
                        {student.dataNascita
                          ? `Nato il ${student.dataNascita}`
                          : "Data nascita non disponibile"}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {student.bes && <Badge variant="secondary">BES {student.bes}</Badge>}
                      {student.trasferito && <Badge variant="destructive">Trasferito</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="outline">S {formatAverage(student.averages.S)}</Badge>
                    <Badge variant="outline">O {formatAverage(student.averages.O)}</Badge>
                    <Badge variant="outline">P {formatAverage(student.averages.P)}</Badge>
                    <Badge>T {formatAverage(student.averages.T)}</Badge>
                  </div>

                  {student.note && (
                    <p className="text-sm text-muted-foreground">{student.note}</p>
                  )}

                  {(["S", "O", "P"] as const).map((tipo) => (
                    <div key={tipo} className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{orderLabel(tipo)}</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openCreateDialog(student, tipo)}
                        >
                          <PenLine className="size-4" />
                          Nuovo
                        </Button>
                      </div>

                      {student.votes[tipo].length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {student.votes[tipo].map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                            >
                              <button
                                type="button"
                                className="text-left"
                                onClick={() => openEditDialog(student, entry)}
                              >
                                <span className="font-medium">{formatVote(entry)}</span>
                                <span className="ml-2 text-muted-foreground">
                                  {entry.displayDate}
                                </span>
                              </button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteEntry(entry)}
                              >
                                Elimina
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nessuna valutazione nel periodo.
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
