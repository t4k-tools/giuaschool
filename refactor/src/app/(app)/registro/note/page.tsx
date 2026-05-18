"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import {
  api,
  type RegistroNotaEntry,
  type RegistroNoteData,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  PenSquare,
} from "lucide-react";

const STORAGE_KEY = "lesson_context_v1";

interface StoredLessonContext {
  mode: "cattedra" | "classe";
  cattedraId: number | null;
  classeId: number | null;
}

interface NoteFormState {
  open: boolean;
  mode: "create" | "edit";
  note: RegistroNotaEntry | null;
  tipo: "C" | "I";
  testo: string;
  alunnoIds: number[];
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

function emptyForm(): NoteFormState {
  return {
    open: false,
    mode: "create",
    note: null,
    tipo: "C",
    testo: "",
    alunnoIds: [],
  };
}

export default function RegistroNotePage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();

  const [data, setData] = useState<RegistroNoteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showContextMissing, setShowContextMissing] = useState(false);
  const [form, setForm] = useState<NoteFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [provvedimentoTarget, setProvvedimentoTarget] = useState<RegistroNotaEntry | null>(null);
  const [provvedimentoText, setProvvedimentoText] = useState("");
  const [provvedimentoSaving, setProvvedimentoSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RegistroNotaEntry | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<RegistroNotaEntry | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const currentDate =
    searchParams.get("data") || new Date().toISOString().slice(0, 10);

  const loadNotes = async () => {
    if (!token) {
      return;
    }

    const stored = readStoredContext();
    if (!stored) {
      setShowContextMissing(true);
      return;
    }

    try {
      const response = await api.registro.noteList(token, {
        cattedraId:
          stored.mode === "cattedra" ? stored.cattedraId ?? undefined : undefined,
        classeId:
          stored.mode === "classe" ? stored.classeId ?? undefined : undefined,
        data: currentDate,
      });
      setData(response.data);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Impossibile caricare le note.";
      setError(message);
    }
  };

  useEffect(() => {
    void loadNotes();
  }, [currentDate, token]);

  const stats = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      { label: "Note totali", value: data.notes.length },
      {
        label: "Individuali",
        value: data.notes.filter((note) => note.tipo === "I").length,
      },
      {
        label: "Con provvedimento",
        value: data.notes.filter((note) => note.provvedimento).length,
      },
    ];
  }, [data]);

  const openCreate = () => {
    setForm({
      open: true,
      mode: "create",
      note: null,
      tipo: "C",
      testo: "",
      alunnoIds: [],
    });
  };

  const openEdit = (note: RegistroNotaEntry) => {
    setForm({
      open: true,
      mode: "edit",
      note,
      tipo: note.tipo,
      testo: note.testo,
      alunnoIds: note.alunniIds,
    });
  };

  const handleSave = async () => {
    if (!token || !data) {
      return;
    }

    const stored = readStoredContext();
    if (!stored) {
      setShowContextMissing(true);
      return;
    }

    setSaving(true);
    try {
      if (form.mode === "create") {
        await api.registro.createNote(token, {
          cattedraId:
            stored.mode === "cattedra" ? stored.cattedraId ?? undefined : undefined,
          classeId:
            stored.mode === "classe" ? stored.classeId ?? undefined : undefined,
          data: currentDate,
          tipo: form.tipo,
          testo: form.testo,
          alunnoIds: form.tipo === "I" ? form.alunnoIds : [],
        });
      } else if (form.note) {
        await api.registro.updateNote(token, {
          id: form.note.id,
          tipo: form.tipo,
          testo: form.testo,
          alunnoIds: form.tipo === "I" ? form.alunnoIds : [],
        });
      }

      setForm(emptyForm());
      await loadNotes();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Salvataggio nota non riuscito.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) {
      return;
    }

    setDeleteBusy(true);
    try {
      await api.registro.deleteNote(token, deleteTarget.id);
      setDeleteTarget(null);
      await loadNotes();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Cancellazione nota non riuscita.";
      setError(message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!token || !cancelTarget) {
      return;
    }

    setCancelBusy(true);
    try {
      await api.registro.cancelNote(token, cancelTarget.id);
      setCancelTarget(null);
      await loadNotes();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Annullamento nota non riuscito.";
      setError(message);
    } finally {
      setCancelBusy(false);
    }
  };

  const handleSaveProvvedimento = async () => {
    if (!token || !provvedimentoTarget || !provvedimentoText.trim()) {
      return;
    }

    setProvvedimentoSaving(true);
    try {
      await api.registro.setProvvedimento(
        token,
        provvedimentoTarget.id,
        provvedimentoText.trim(),
      );
      setProvvedimentoTarget(null);
      setProvvedimentoText("");
      await loadNotes();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Salvataggio provvedimento non riuscito.";
      setError(message);
    } finally {
      setProvvedimentoSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Registro note</h1>
        <p className="text-muted-foreground">
          Note disciplinari giornaliere con CRUD, annullamento e provvedimento.
        </p>
      </div>

      <AlertDialog open={showContextMissing} onOpenChange={setShowContextMissing}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contesto lezioni mancante</AlertDialogTitle>
            <AlertDialogDescription>
              Prima di usare le note devi selezionare una cattedra o una classe nella pagina contesto lezioni.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Link href="/lezioni">Vai a contesto lezioni</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={form.open} onOpenChange={(open) => setForm((current) => ({ ...current, open }))}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {form.mode === "create" ? "Nuova nota" : "Modifica nota"}
            </DialogTitle>
            <DialogDescription>
              {data ? `${data.info.classe.nome} · ${data.info.data}` : "Compila i dati della nota."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nota-tipo">Tipo nota</Label>
              <Select
                value={form.tipo}
                onValueChange={(value: "C" | "I") =>
                  setForm((current) => ({
                    ...current,
                    tipo: value,
                    alunnoIds: value === "I" ? current.alunnoIds : [],
                  }))
                }
              >
                <SelectTrigger id="nota-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="C">Classe</SelectItem>
                  <SelectItem value="I">Individuale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nota-testo">Testo</Label>
              <Textarea
                id="nota-testo"
                value={form.testo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, testo: event.target.value }))
                }
              />
            </div>

            {form.tipo === "I" && (
              <div className="grid gap-2">
                <Label>Alunni coinvolti</Label>
                <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border p-3">
                  {data?.studentOptions.map((student) => {
                    const checked = form.alunnoIds.includes(student.id);
                    return (
                      <label
                        key={student.id}
                        className="flex items-center gap-3 rounded-md px-2 py-1 text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) =>
                            setForm((current) => ({
                              ...current,
                              alunnoIds: next
                                ? [...current.alunnoIds, student.id]
                                : current.alunnoIds.filter((id) => id !== student.id),
                            }))
                          }
                        />
                        <span>{student.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(emptyForm())}>
              Chiudi
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || !form.testo.trim()}>
              {saving ? "Salvataggio..." : form.mode === "create" ? "Crea nota" : "Salva modifiche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(provvedimentoTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setProvvedimentoTarget(null);
            setProvvedimentoText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Provvedimento</DialogTitle>
            <DialogDescription>
              {provvedimentoTarget?.tipo === "I" ? "Nota individuale" : "Nota di classe"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="provvedimento-testo">Testo provvedimento</Label>
            <Textarea
              id="provvedimento-testo"
              value={provvedimentoText}
              onChange={(event) => setProvvedimentoText(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setProvvedimentoTarget(null);
                setProvvedimentoText("");
              }}
            >
              Chiudi
            </Button>
            <Button
              onClick={() => void handleSaveProvvedimento()}
              disabled={provvedimentoSaving || !provvedimentoText.trim()}
            >
              {provvedimentoSaving ? "Salvataggio..." : "Salva provvedimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma cancellazione nota</AlertDialogTitle>
            <AlertDialogDescription>
              Vuoi eliminare definitivamente questa nota?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} disabled={deleteBusy}>
              {deleteBusy ? "Cancellazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annulla nota</AlertDialogTitle>
            <AlertDialogDescription>
              La nota resterà storicizzata ma marcata come annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Chiudi</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleCancel()} disabled={cancelBusy}>
              {cancelBusy ? "Annullamento..." : "Annulla nota"}
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
                    {data.info.materia.nomeBreve || "Materia"} · {data.info.data}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{data.notes.length} note</Badge>
                  {data.info.permissions.canAdd && (
                    <Button type="button" onClick={openCreate}>
                      <PenSquare className="size-4" />
                      Nuova nota
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href={`/registro/note?data=${shiftDate(currentDate, -1)}`}>
                    <ChevronLeft className="size-4" />
                    Giorno precedente
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/registro/note?data=${shiftDate(currentDate, 1)}`}>
                    <ChevronRight className="size-4" />
                    Giorno successivo
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/registro/firme?data=${currentDate}&vista=G`}>
                    <ClipboardList className="size-4" />
                    Registro firme
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/registro/voti">
                    <GraduationCap className="size-4" />
                    Voti
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {data.notes.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Nessuna nota nel giorno selezionato</CardTitle>
                  <CardDescription>
                    Non risultano note disciplinari per questa data.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {data.notes.map((note) => (
              <Card key={note.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge>{note.tipo === "I" ? "Individuale" : "Classe"}</Badge>
                        {note.annullata && <Badge variant="destructive">Annullata</Badge>}
                        {note.provvedimento && <Badge variant="secondary">Provvedimento</Badge>}
                      </div>
                      <CardDescription>
                        {note.docente}
                        {note.docenteProvvedimento
                          ? ` · provvedimento: ${note.docenteProvvedimento}`
                          : ""}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {note.permissions.canEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(note)}
                        >
                          Modifica
                        </Button>
                      )}
                      {note.permissions.canProvvedimento && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setProvvedimentoTarget(note);
                            setProvvedimentoText(note.provvedimento || "");
                          }}
                        >
                          Provvedimento
                        </Button>
                      )}
                      {note.permissions.canCancel && !note.annullata && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCancelTarget(note)}
                        >
                          Annulla
                        </Button>
                      )}
                      {note.permissions.canDelete && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteTarget(note)}
                        >
                          Elimina
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="whitespace-pre-wrap text-sm">{note.testo}</p>

                  {note.alunni.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {note.alunni.map((alunno) => (
                        <Badge key={alunno} variant="outline">
                          {alunno}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {note.provvedimento && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <p className="font-medium">Provvedimento</p>
                      <p className="mt-1 whitespace-pre-wrap">{note.provvedimento}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
