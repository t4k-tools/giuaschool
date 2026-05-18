"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import {
  api,
  type LezioneContextData,
  type LezioneContextCattedra,
  type LezioneContextClasse,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  RefreshCcw,
  Save,
  Users,
} from "lucide-react";

const STORAGE_KEY = "lesson_context_v1";

type SelectionMode = "cattedra" | "classe";

interface StoredLessonContext {
  mode: SelectionMode;
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

function writeStoredContext(value: StoredLessonContext) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export default function LezioniPage() {
  const { token, user } = useAuth();
  const [context, setContext] = useState<LezioneContextData | null>(null);
  const [mode, setMode] = useState<SelectionMode>("cattedra");
  const [selectedCattedraId, setSelectedCattedraId] = useState<string>("");
  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    api.lezioni.context(token)
      .then((response) => {
        const nextContext = response.data;
        setContext(nextContext);

        const stored = readStoredContext();
        if (
          stored?.mode === "cattedra" &&
          stored.cattedraId &&
          nextContext.cattedre.some((item) => item.id === stored.cattedraId)
        ) {
          setMode("cattedra");
          setSelectedCattedraId(String(stored.cattedraId));
          return;
        }

        if (
          stored?.mode === "classe" &&
          stored.classeId &&
          nextContext.classiSostituzione.some((item) => item.id === stored.classeId)
        ) {
          setMode("classe");
          setSelectedClasseId(String(stored.classeId));
          return;
        }

        if (nextContext.defaultSelection.mode === "cattedra" && nextContext.defaultSelection.cattedraId) {
          setMode("cattedra");
          setSelectedCattedraId(String(nextContext.defaultSelection.cattedraId));
        } else if (nextContext.defaultSelection.mode === "classe" && nextContext.defaultSelection.classeId) {
          setMode("classe");
          setSelectedClasseId(String(nextContext.defaultSelection.classeId));
        }
      })
      .catch((err: { message?: string }) => {
        setError(err.message || "Impossibile caricare il contesto lezioni.");
      });
  }, [token]);

  const selectedCattedra = useMemo<LezioneContextCattedra | null>(
    () => context?.cattedre.find((item) => item.id === Number(selectedCattedraId)) || null,
    [context, selectedCattedraId],
  );

  const selectedClasse = useMemo<LezioneContextClasse | null>(
    () => context?.classiSostituzione.find((item) => item.id === Number(selectedClasseId)) || null,
    [context, selectedClasseId],
  );

  const handleSave = () => {
    if (mode === "cattedra" && !selectedCattedraId) {
      return;
    }
    if (mode === "classe" && !selectedClasseId) {
      return;
    }

    setIsSaving(true);
    writeStoredContext({
      mode,
      cattedraId: mode === "cattedra" ? Number(selectedCattedraId) : null,
      classeId: mode === "classe" ? Number(selectedClasseId) : null,
    });
    setSavedMessage("Contesto lezioni salvato nel browser.");
    setTimeout(() => {
      setIsSaving(false);
    }, 150);
  };

  const handleReset = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    setSavedMessage(null);
    if (context?.defaultSelection.mode === "cattedra" && context.defaultSelection.cattedraId) {
      setMode("cattedra");
      setSelectedCattedraId(String(context.defaultSelection.cattedraId));
      setSelectedClasseId("");
      return;
    }
    if (context?.defaultSelection.mode === "classe" && context.defaultSelection.classeId) {
      setMode("classe");
      setSelectedClasseId(String(context.defaultSelection.classeId));
      setSelectedCattedraId("");
    }
  };

  const canSave = (mode === "cattedra" && selectedCattedraId !== "")
    || (mode === "classe" && selectedClasseId !== "");

  const docenteEnabled = Boolean(user?.roles.includes("ROLE_DOCENTE"));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Contesto lezioni</h1>
        <p className="text-muted-foreground">
          Seleziona la cattedra o la classe di sostituzione che userai nei moduli registro, assenze e voti.
        </p>
      </div>

      {!docenteEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Accesso non disponibile</CardTitle>
            <CardDescription>
              Questa sezione è riservata ai docenti.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {docenteEnabled && error && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Errore caricamento</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {docenteEnabled && context && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Cattedre attive</CardDescription>
                <CardTitle>{context.cattedre.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Classi per sostituzione</CardDescription>
                <CardTitle>{context.classiSostituzione.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Contesto salvato</CardDescription>
                <CardTitle className="text-base">
                  {savedMessage ? "Presente" : "Non ancora salvato"}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Selezione operativa</CardTitle>
              <CardDescription>
                Il contesto viene memorizzato localmente e sarà riusato dai moduli lezioni in migrazione.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={mode === "cattedra" ? "default" : "outline"}
                  onClick={() => setMode("cattedra")}
                  type="button"
                >
                  <BookOpen className="size-4" />
                  Cattedra
                </Button>
                <Button
                  variant={mode === "classe" ? "default" : "outline"}
                  onClick={() => setMode("classe")}
                  type="button"
                >
                  <Users className="size-4" />
                  Sostituzione
                </Button>
              </div>

              {mode === "cattedra" ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Cattedra</p>
                  <Select value={selectedCattedraId} onValueChange={setSelectedCattedraId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona una cattedra" />
                    </SelectTrigger>
                    <SelectContent>
                      {context.cattedre.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Classe in sostituzione</p>
                  <Select value={selectedClasseId} onValueChange={setSelectedClasseId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona una classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {context.classiSostituzione.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.label}{item.sede ? ` · ${item.sede.nomeBreve}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleSave} disabled={!canSave || isSaving}>
                  <Save className="size-4" />
                  Salva contesto
                </Button>
                <Button type="button" variant="outline" asChild disabled={!canSave}>
                  <Link href="/registro/firme">
                    <ClipboardList className="size-4" />
                    Apri registro firme
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  disabled={(mode === "cattedra" && !selectedCattedra) || (mode === "classe" && !selectedClasse)}
                >
                  <Link href="/registro/voti">
                    <GraduationCap className="size-4" />
                    Apri registro voti
                  </Link>
                </Button>
                <Button type="button" variant="outline" onClick={handleReset}>
                  <RefreshCcw className="size-4" />
                  Ripristina default
                </Button>
              </div>

              {savedMessage && (
                <p className="text-sm text-muted-foreground">{savedMessage}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Anteprima contesto</CardTitle>
              <CardDescription>
                Riepilogo della selezione che verrà riutilizzata dai moduli successivi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === "cattedra" && selectedCattedra ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{selectedCattedra.classe.nome}</Badge>
                    <Badge variant="secondary">{selectedCattedra.materia.nomeBreve || "Materia"}</Badge>
                    {selectedCattedra.flags.isSostegno && (
                      <Badge variant="outline">Sostegno</Badge>
                    )}
                    {selectedCattedra.flags.isReligione && (
                      <Badge variant="outline">Religione</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedCattedra.label}</p>
                  {selectedCattedra.flags.isSostegno && selectedCattedra.alunnoSostegno && (
                    <p className="text-sm text-muted-foreground">
                      Il modulo voti userà la modalità sostegno in sola consultazione per{" "}
                      {selectedCattedra.alunnoSostegno.cognome} {selectedCattedra.alunnoSostegno.nome}.
                    </p>
                  )}
                </div>
              ) : null}

              {mode === "classe" && selectedClasse ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{selectedClasse.label}</Badge>
                    {selectedClasse.sede && (
                      <Badge variant="secondary">{selectedClasse.sede.nomeBreve}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Modalità sostituzione attiva sulla classe selezionata. Il modulo voti proverà a risolvere una tua cattedra compatibile per questa classe.
                  </p>
                </div>
              ) : null}

              {!selectedCattedra && !selectedClasse && (
                <p className="text-sm text-muted-foreground">
                  Nessun contesto selezionato.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
