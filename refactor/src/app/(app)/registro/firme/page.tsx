"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import {
  api,
  type RegistroFirmeData,
  type RegistroLezioneCreateContext,
  type RegistroLezioneEditContext,
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
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ClipboardList,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STORAGE_KEY = "lesson_context_v1";

interface StoredLessonContext {
  mode: "cattedra" | "classe";
  cattedraId: number | null;
  classeId: number | null;
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

function formatDisplayDate(value: string) {
  return new Date(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function RegistroFirmePage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [data, setData] = useState<RegistroFirmeData | null>(null);
  const [createContext, setCreateContext] = useState<RegistroLezioneCreateContext | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [selectedCreateSlot, setSelectedCreateSlot] = useState<{ date: string; ora: number } | null>(null);
  const [argomento, setArgomento] = useState("");
  const [attivita, setAttivita] = useState("");
  const [fineOra, setFineOra] = useState<string>("");
  const [moduloFormativoId, setModuloFormativoId] = useState<string>("none");
  const [materiaId, setMateriaId] = useState<string>("none");
  const [tipoSostituzione, setTipoSostituzione] = useState<string>("none");
  const [editContext, setEditContext] = useState<RegistroLezioneEditContext | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [selectedEditSlot, setSelectedEditSlot] = useState<{ date: string; ora: number } | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteContextLoading, setDeleteContextLoading] = useState(false);
  const [deleteContextInfo, setDeleteContextInfo] = useState<{ isShared: boolean; message: string } | null>(null);
  const [selectedDeleteSlot, setSelectedDeleteSlot] = useState<{ date: string; ora: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showContextMissing, setShowContextMissing] = useState(false);

  const currentDate = searchParams.get("data") || new Date().toISOString().slice(0, 10);
  const currentVista: "G" | "M" = searchParams.get("vista") === "M" ? "M" : "G";

  useEffect(() => {
    if (!token) {
      return;
    }

    api.lezioni.context(token)
      .then(() => undefined)
      .catch((err: { message?: string }) => {
        setError(err.message || "Impossibile caricare il contesto lezioni.");
      });
  }, [token]);

  const loadRegistro = useCallback(async () => {
    if (!token) {
      return;
    }

    const stored = readStoredContext();
    if (!stored) {
      setShowContextMissing(true);
      return;
    }

    const params =
      stored.mode === "cattedra"
        ? {
            cattedraId: stored.cattedraId ?? undefined,
            data: currentDate,
            vista: currentVista,
          }
        : {
            classeId: stored.classeId ?? undefined,
            data: currentDate,
            vista: currentVista,
          };

    api.registro.firme(token, params)
      .then((response) => {
        setData(response.data);
        setError(null);
      })
      .catch((err: { message?: string }) => {
        setError(err.message || "Impossibile caricare il quadro firme.");
      });
  }, [currentDate, currentVista, token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    void loadRegistro();
  }, [loadRegistro, token]);

  const assentiSummary = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      { label: "Assenti", value: data.assenti.assenze.length },
      { label: "Entrate", value: data.assenti.entrate.length },
      { label: "Uscite", value: data.assenti.uscite.length },
      { label: "Fuori classe", value: data.assenti.fuoriClasse.length },
    ];
  }, [data]);

  const openCreateDialog = async (date: string, ora: number) => {
    if (!token) {
      return;
    }

    const stored = readStoredContext();
    if (!stored) {
      setShowContextMissing(true);
      return;
    }

    setCreateLoading(true);
    setSelectedCreateSlot({ date, ora });
    setCreateDialogOpen(true);
    setArgomento("");
    setAttivita("");
    setFineOra("");
    setModuloFormativoId("none");
    setMateriaId("none");
    setTipoSostituzione("none");

    const params =
      stored.mode === "cattedra"
        ? { cattedraId: stored.cattedraId ?? undefined, data: date, ora }
        : { classeId: stored.classeId ?? undefined, data: date, ora };

    try {
      const response = await api.registro.createContext(token, params);
      setCreateContext(response.data);
      if (response.data.endOptions[0]) {
        setFineOra(String(response.data.endOptions[0].ora));
      }
      setArgomento(response.data.argomentoDefault || "");
      setAttivita(response.data.attivitaDefault || "");
      setModuloFormativoId(
        response.data.moduloFormativoDefaultId
          ? String(response.data.moduloFormativoDefaultId)
          : "none",
      );
      setMateriaId(
        response.data.materiaOptions[0] ? String(response.data.materiaOptions[0].id) : "none",
      );
      setTipoSostituzione(
        response.data.substitutionOptions[0] ? response.data.substitutionOptions[0].value : "none",
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Impossibile caricare il form di creazione.";
      setCreateContext({
        supported: false,
        action: {
          type: "create",
          label: "Nuova lezione",
        },
        reason: message,
        endOptions: [],
        moduliFormativi: [],
        materiaOptions: [],
        substitutionOptions: [],
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!token || !selectedCreateSlot || !fineOra) {
      return;
    }

    const stored = readStoredContext();
    if (!stored) {
      setShowContextMissing(true);
      return;
    }

    setCreateSaving(true);
    try {
      await api.registro.createLezione(token, {
        cattedraId: stored.mode === "cattedra" ? stored.cattedraId ?? undefined : undefined,
        classeId: stored.mode === "classe" ? stored.classeId ?? undefined : undefined,
        data: selectedCreateSlot.date,
        ora: selectedCreateSlot.ora,
        fineOra: Number(fineOra),
        argomento,
        attivita,
        moduloFormativoId: moduloFormativoId !== "none" ? Number(moduloFormativoId) : null,
        materiaId: materiaId !== "none" ? Number(materiaId) : null,
        tipoSostituzione: tipoSostituzione !== "none" ? tipoSostituzione : null,
      });
      setCreateDialogOpen(false);
      await loadRegistro();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Creazione lezione non riuscita.";
      setCreateContext((prev) => ({
        supported: prev?.supported ?? false,
        action: prev?.action ?? { type: "create", label: "Nuova lezione" },
        reason: message,
        endOptions: prev?.endOptions ?? [],
        moduliFormativi: prev?.moduliFormativi ?? [],
        materiaOptions: prev?.materiaOptions ?? [],
        substitutionOptions: prev?.substitutionOptions ?? [],
        context: prev?.context,
        argomentoDefault: prev?.argomentoDefault,
        attivitaDefault: prev?.attivitaDefault,
      }));
    } finally {
      setCreateSaving(false);
    }
  };

  const openEditDialog = async (date: string, ora: number) => {
    if (!token) {
      return;
    }

    const stored = readStoredContext();
    if (!stored) {
      setShowContextMissing(true);
      return;
    }

    setEditLoading(true);
    setSelectedEditSlot({ date, ora });
    setEditDialogOpen(true);
    setArgomento("");
    setAttivita("");
    setModuloFormativoId("none");

    const params =
      stored.mode === "cattedra"
        ? { cattedraId: stored.cattedraId ?? undefined, data: date, ora }
        : { classeId: stored.classeId ?? undefined, data: date, ora };

    try {
      const response = await api.registro.editContext(token, params);
      setEditContext(response.data);
      setArgomento(response.data.argomento || "");
      setAttivita(response.data.attivita || "");
      setModuloFormativoId(
        response.data.moduloFormativoId ? String(response.data.moduloFormativoId) : "none",
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Impossibile caricare il form di modifica.";
      setEditContext({
        supported: false,
        reason: message,
        argomento: "",
        attivita: "",
        moduloFormativoId: null,
        moduliFormativi: [],
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!token || !selectedEditSlot) {
      return;
    }

    const stored = readStoredContext();
    if (!stored) {
      setShowContextMissing(true);
      return;
    }

    setEditSaving(true);
    try {
      await api.registro.updateLezione(token, {
        cattedraId: stored.mode === "cattedra" ? stored.cattedraId ?? undefined : undefined,
        classeId: stored.mode === "classe" ? stored.classeId ?? undefined : undefined,
        data: selectedEditSlot.date,
        ora: selectedEditSlot.ora,
        argomento,
        attivita,
        moduloFormativoId: moduloFormativoId !== "none" ? Number(moduloFormativoId) : null,
      });
      setEditDialogOpen(false);
      await loadRegistro();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Modifica lezione non riuscita.";
      setEditContext((prev) => ({
        supported: prev?.supported ?? false,
        reason: message,
        argomento: prev?.argomento ?? "",
        attivita: prev?.attivita ?? "",
        moduloFormativoId: prev?.moduloFormativoId ?? null,
        moduliFormativi: prev?.moduliFormativi ?? [],
        context: prev?.context,
      }));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !selectedDeleteSlot) {
      return;
    }

    const stored = readStoredContext();
    if (!stored) {
      setShowContextMissing(true);
      return;
    }

    setDeleteSaving(true);
    try {
      await api.registro.deleteLezione(token, {
        cattedraId: stored.mode === "cattedra" ? stored.cattedraId ?? undefined : undefined,
        classeId: stored.mode === "classe" ? stored.classeId ?? undefined : undefined,
        data: selectedDeleteSlot.date,
        ora: selectedDeleteSlot.ora,
      });
      setDeleteDialogOpen(false);
      await loadRegistro();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Cancellazione lezione non riuscita.";
      setError(message);
      setDeleteDialogOpen(false);
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Registro firme</h1>
        <p className="text-muted-foreground">
          Vista iniziale del registro docenti alimentata dalle nuove API `refactor`.
        </p>
      </div>

      <AlertDialog open={showContextMissing} onOpenChange={setShowContextMissing}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contesto lezioni mancante</AlertDialogTitle>
            <AlertDialogDescription>
              Prima di usare il registro devi selezionare una cattedra o una classe nella pagina contesto lezioni.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Link href="/lezioni">Vai a contesto lezioni</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova lezione</DialogTitle>
            <DialogDescription>
              {selectedCreateSlot
                ? `${formatDisplayDate(selectedCreateSlot.date)} · ${selectedCreateSlot.ora}ª ora`
                : "Compila i dati della lezione."}
            </DialogDescription>
          </DialogHeader>

          {createLoading && (
            <p className="text-sm text-muted-foreground">Caricamento opzioni...</p>
          )}

          {!createLoading && createContext && !createContext.supported && (
            <p className="text-sm text-muted-foreground">{createContext.reason}</p>
          )}

          {!createLoading && createContext?.supported && (
            <div className="space-y-4">
              {createContext.context && (
                <div className="flex flex-wrap gap-2">
                  <Badge>{createContext.context.classe.nome}</Badge>
                  <Badge variant="secondary">
                    {createContext.context.materia.nomeBreve || "Materia"}
                  </Badge>
                  <Badge variant={createContext.action.type === "create" ? "outline" : "default"}>
                    {createContext.action.label}
                  </Badge>
                  {createContext.context.sostituzioneSostegno && (
                    <Badge variant="destructive">Supplenza sostegno</Badge>
                  )}
                </div>
              )}

              {createContext.context?.sostituzioneSostegno && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  Stai operando come docente di sostegno in supplenza su uno slot già occupato.
                  La materia sarà <strong>Sostegno</strong> e la firma verrà registrata come compresenza
                  senza alunno associato.
                </div>
              )}

              {createContext.reason && (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {createContext.reason}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fineOra">Ora fine</Label>
                <Select value={fineOra} onValueChange={setFineOra}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona ora fine" />
                  </SelectTrigger>
                  <SelectContent>
                    {createContext.endOptions.map((option) => (
                      <SelectItem key={option.ora} value={String(option.ora)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {createContext.materiaOptions.length > 0 && !createContext.context?.sostituzioneSostegno && (
                <div className="space-y-2">
                  <Label htmlFor="materiaSostituzione">Materia</Label>
                  <Select value={materiaId} onValueChange={setMateriaId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona materia" />
                    </SelectTrigger>
                    <SelectContent>
                      {createContext.materiaOptions.map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {createContext.substitutionOptions.length > 0 && !createContext.context?.sostituzioneSostegno && (
                <div className="space-y-2">
                  <Label htmlFor="tipoSostituzione">Tipo sostituzione</Label>
                  <Select value={tipoSostituzione} onValueChange={setTipoSostituzione}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {createContext.substitutionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="argomento">Argomento</Label>
                <Textarea
                  id="argomento"
                  value={argomento}
                  onChange={(event) => setArgomento(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attivita">Attività</Label>
                <Textarea
                  id="attivita"
                  value={attivita}
                  onChange={(event) => setAttivita(event.target.value)}
                />
              </div>

              {createContext.moduliFormativi.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="moduloFormativo">Modulo formativo</Label>
                  <Select value={moduloFormativoId} onValueChange={setModuloFormativoId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Nessuno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nessuno</SelectItem>
                      {createContext.moduliFormativi.map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Chiudi
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={!createContext?.supported || createSaving || !fineOra}
            >
              {createSaving ? "Salvataggio..." : "Crea lezione"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica lezione</DialogTitle>
            <DialogDescription>
              {selectedEditSlot
                ? `${formatDisplayDate(selectedEditSlot.date)} · ${selectedEditSlot.ora}ª ora`
                : "Aggiorna i dati della lezione."}
            </DialogDescription>
          </DialogHeader>

          {editLoading && (
            <p className="text-sm text-muted-foreground">Caricamento dati...</p>
          )}

          {!editLoading && editContext && !editContext.supported && (
            <p className="text-sm text-muted-foreground">{editContext.reason}</p>
          )}

          {!editLoading && editContext?.supported && (
            <div className="space-y-4">
              {editContext.context && (
                <div className="flex flex-wrap gap-2">
                  <Badge>{editContext.context.classe.nome}</Badge>
                  <Badge variant="secondary">
                    {editContext.context.materia.nomeBreve || "Materia"}
                  </Badge>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="editArgomento">Argomento</Label>
                <Textarea
                  id="editArgomento"
                  value={argomento}
                  onChange={(event) => setArgomento(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editAttivita">Attività</Label>
                <Textarea
                  id="editAttivita"
                  value={attivita}
                  onChange={(event) => setAttivita(event.target.value)}
                />
              </div>

              {editContext.moduliFormativi.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="editModuloFormativo">Modulo formativo</Label>
                  <Select value={moduloFormativoId} onValueChange={setModuloFormativoId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Nessuno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nessuno</SelectItem>
                      {editContext.moduliFormativi.map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {editContext.reason && (
                <p className="text-sm text-muted-foreground">{editContext.reason}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Chiudi
            </Button>
            <Button
              onClick={() => void handleEdit()}
              disabled={!editContext?.supported || editSaving}
            >
              {editSaving ? "Salvataggio..." : "Salva modifiche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma cancellazione</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteContextLoading
                ? "Caricamento informazioni lezione..."
                : deleteContextInfo
                  ? deleteContextInfo.message
                  : selectedDeleteSlot
                    ? `Vuoi cancellare la tua lezione del ${formatDisplayDate(selectedDeleteSlot.date)} alla ${selectedDeleteSlot.ora}ª ora?`
                    : "Vuoi cancellare questa lezione?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleteSaving || deleteContextLoading}>
              {deleteSaving ? "Cancellazione..." : "Elimina"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Errore caricamento</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Classe</CardDescription>
                <CardTitle>{data.info.classe.nome}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Materia</CardDescription>
                <CardTitle>{data.info.materia.nomeBreve || "Sostituzione"}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avvisi</CardDescription>
                <CardTitle>{data.alerts.avvisi}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Circolari</CardDescription>
                <CardTitle>{data.alerts.circolari.length}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{data.info.dataLabel}</CardTitle>
                  <CardDescription>
                    Vista {data.info.vista === "G" ? "giornaliera" : "mensile"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" asChild>
                    <Link href={`/registro/assenze?data=${data.info.data}`}>
                      Assenze
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/registro/voti">Voti</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/registro/note?data=${data.info.data}`}>Note</Link>
                  </Button>
                  {data.info.dataPrec && (
                    <Button variant="outline" asChild>
                      <Link href={`/registro/firme?data=${data.info.dataPrec}&vista=${currentVista}`}>
                        <ChevronLeft className="size-4" />
                        Precedente
                      </Link>
                    </Button>
                  )}
                  {data.info.dataSucc && (
                    <Button variant="outline" asChild>
                      <Link href={`/registro/firme?data=${data.info.dataSucc}&vista=${currentVista}`}>
                        Successivo
                        <ChevronRight className="size-4" />
                      </Link>
                    </Button>
                  )}
                  <Button variant={currentVista === "G" ? "default" : "outline"} asChild>
                    <Link href={`/registro/firme?data=${data.info.data}&vista=G`}>Giorno</Link>
                  </Button>
                  <Button variant={currentVista === "M" ? "default" : "outline"} asChild>
                    <Link href={`/registro/firme?data=${data.info.data}&vista=M`}>Mese</Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.info.errore && (
                <p className="text-sm text-muted-foreground">{data.info.errore}</p>
              )}

              {currentVista === "G" && (
                <div className="grid gap-3 md:grid-cols-4">
                  {assentiSummary.map((item) => (
                    <div key={item.label} className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="text-xl font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                {data.rows.map((row) => (
                  <Card key={row.date}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="size-4 text-muted-foreground" />
                          <CardTitle className="text-base">{formatDisplayDate(row.date)}</CardTitle>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            <NotebookPen className="size-3" />
                            Note {row.noteCount}
                          </Badge>
                          <Badge variant="outline">
                            <ClipboardList className="size-3" />
                            Annotazioni {row.annotazioniCount}
                          </Badge>
                        </div>
                      </div>
                      {row.error && (
                        <CardDescription>{row.error}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {row.lessons.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Nessuna lezione disponibile per questa data.
                        </p>
                      )}

                      {row.lessons.map((lesson) => (
                        <div key={`${row.date}-${lesson.ora}`} className="rounded-lg border p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-medium">
                                {lesson.ora}ª ora
                                {lesson.inizio && lesson.fine ? ` · ${lesson.inizio}-${lesson.fine}` : ""}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {lesson.permissions.canAdd && (
                                <Button
                                  size="xs"
                                  onClick={() => void openCreateDialog(row.date, lesson.ora)}
                                  type="button"
                                >
                                  <Plus className="size-3" />
                                  Aggiungi
                                </Button>
                              )}
                              {lesson.permissions.canEdit && (
                                <Button
                                  size="xs"
                                  variant="secondary"
                                  onClick={() => void openEditDialog(row.date, lesson.ora)}
                                  type="button"
                                >
                                  <Pencil className="size-3" />
                                  Modifica
                                </Button>
                              )}
                              {lesson.permissions.canDelete && (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => {
                                    const slot = { date: row.date, ora: lesson.ora };
                                    setSelectedDeleteSlot(slot);
                                    setDeleteContextInfo(null);
                                    setDeleteDialogOpen(true);
                                    if (token) {
                                      const stored = readStoredContext();
                                      if (stored) {
                                        setDeleteContextLoading(true);
                                        const params = stored.mode === "cattedra"
                                          ? { cattedraId: stored.cattedraId ?? undefined, data: slot.date, ora: slot.ora }
                                          : { classeId: stored.classeId ?? undefined, data: slot.date, ora: slot.ora };
                                        api.registro.deleteContext(token, params)
                                          .then((res) => setDeleteContextInfo(res.data))
                                          .catch(() => undefined)
                                          .finally(() => setDeleteContextLoading(false));
                                      }
                                    }
                                  }}
                                  type="button"
                                >
                                  <Trash2 className="size-3" />
                                  Elimina
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 space-y-3">
                            {lesson.groups.length === 0 && (
                              <p className="text-sm text-muted-foreground">
                                Nessuna firma presente.
                              </p>
                            )}

                            {lesson.groups.map((group) => (
                              <div key={group.groupKey} className="rounded-md bg-muted/40 p-3">
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline">{group.groupKey}</Badge>
                                  <Badge variant="secondary">{group.materia}</Badge>
                                </div>
                                {group.argomento && (
                                  <p className="mt-2 text-sm">{group.argomento}</p>
                                )}
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {group.docenti.length > 0 ? group.docenti.join(", ") : "Nessun docente firmatario"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
