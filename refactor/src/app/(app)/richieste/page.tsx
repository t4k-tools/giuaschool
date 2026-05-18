"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import {
  api,
  type RichiestaFamigliaDetail,
  type RichiestaFamigliaModule,
  type RichiestaFamigliaRow,
  type RichiesteFamigliaData,
} from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { FilePlus2, FileText, History, Paperclip, PlusCircle, XCircle } from "lucide-react";

function statusVariant(code: string): "default" | "secondary" | "outline" | "destructive" {
  switch (code) {
    case "I":
      return "default";
    case "G":
      return "secondary";
    case "A":
    case "C":
      return "outline";
    default:
      return "destructive";
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }
  try {
    return new Intl.DateTimeFormat("it-IT", {
      dateStyle: "medium",
      timeStyle: value.includes("T") ? "short" : undefined,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function moduleKindLabel(kind: RichiestaFamigliaModule["kind"]) {
  return kind === "single" ? "Modulo singolo" : "Modulo multiplo";
}

function RequestRow({
  item,
  onOpen,
}: {
  item: RichiestaFamigliaRow;
  onOpen: (id: number) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{item.requestDate ? formatDate(item.requestDate) : "-"}</TableCell>
      <TableCell>
        <Badge variant={statusVariant(item.status.code)}>{item.status.label}</Badge>
      </TableCell>
      <TableCell>{item.document || "-"}</TableCell>
      <TableCell>{item.attachmentsCount}</TableCell>
      <TableCell>{item.handledAt ? formatDate(item.handledAt) : "-"}</TableCell>
      <TableCell className="text-right">
        <Button variant="outline" size="sm" onClick={() => onOpen(item.id)}>
          Apri dettaglio
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function RichiestePage() {
  const { token } = useAuth();
  const [data, setData] = useState<RichiesteFamigliaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<RichiestaFamigliaDetail | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<RichiestaFamigliaModule | null>(null);
  const [requestDate, setRequestDate] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    try {
      const response = await api.richieste.list(token);
      setData(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossibile caricare le richieste.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const creatableModules = useMemo(
    () =>
      data?.modules.filter(
        (module) => module.create.canCreate && !(module.kind === "single" && module.requests.current.length > 0),
      ) ?? [],
    [data],
  );

  const openDetail = async (id: number) => {
    if (!token) {
      return;
    }
    try {
      const response = await api.richieste.detail(token, id);
      setSelected(response.data);
      setDetailOpen(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dettaglio richiesta non disponibile.");
    }
  };

  const openCreate = (module: RichiestaFamigliaModule) => {
    const emptyValues = Object.fromEntries(module.create.fields.map((field) => [field.name, ""]));
    setSelectedModule(module);
    setFormValues(emptyValues);
    setRequestDate("");
    setAttachments([]);
    setCreateOpen(true);
  };

  const handleDownload = async (documento: number, mode: "download" | "open") => {
    if (!token || !selected) {
      return;
    }
    try {
      await api.richieste.download(token, selected.id, documento, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download documento non riuscito.");
    }
  };

  const handleCancel = async () => {
    if (!token || !selected) {
      return;
    }
    setCancelling(true);
    try {
      await api.richieste.cancel(token, selected.id);
      const detailResponse = await api.richieste.detail(token, selected.id);
      setSelected(detailResponse.data);
      await loadData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Annullamento richiesta non riuscito.");
    } finally {
      setCancelling(false);
    }
  };

  const handleCreate = async () => {
    if (!token || !selectedModule) {
      return;
    }
    setCreating(true);
    try {
      await api.richieste.create(
        token,
        {
          moduleId: selectedModule.id,
          requestDate: selectedModule.create.showRequestDate ? requestDate || undefined : undefined,
          values: Object.fromEntries(
            selectedModule.create.fields.map((field) => {
              const value = formValues[field.name] ?? "";
              if (field.type === "bool") {
                return [field.name, value === "" ? null : value === "true"];
              }

              return [field.name, value === "" ? null : value];
            }),
          ),
        },
        attachments,
      );
      setCreateOpen(false);
      setSelectedModule(null);
      await loadData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invio richiesta non riuscito.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Richieste</h1>
        <p className="text-muted-foreground">
          Consultazione, invio, download e annullamento dei moduli disponibili per famiglia e alunno.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Moduli disponibili</CardDescription>
            <CardTitle>{data?.summary.modules ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Richieste correnti</CardDescription>
            <CardTitle>{data?.summary.currentRequests ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Storico</CardDescription>
            <CardTitle>{data?.summary.historyRequests ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Nuovi invii disponibili</CardDescription>
            <CardTitle>{creatableModules.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Uso rapido</CardTitle>
          <CardDescription>
            Il refactor copre ora anche l&apos;invio dei moduli standard con allegati PDF/JPEG, oltre a dettaglio, download e annullamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          <Link href="/famiglia" className="text-primary underline-offset-4 hover:underline">
            Torna all&apos;area famiglia
          </Link>
          <Link href="/pagelle" className="text-primary underline-offset-4 hover:underline">
            Apri pagelle
          </Link>
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

      {loading && (
        <Card>
          <CardHeader>
            <CardDescription>Caricamento in corso...</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!loading && data?.modules.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Nessun modulo disponibile</CardTitle>
            <CardDescription>Non risultano richieste o moduli accessibili per l&apos;utente corrente.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4">
        {data?.modules.map((module) => {
          const createDisabled = module.kind === "single" && module.requests.current.length > 0;

          return (
            <Card key={module.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{module.name}</CardTitle>
                      <Badge variant="outline">{moduleKindLabel(module.kind)}</Badge>
                      {module.gestione && <Badge variant="secondary">Con gestione</Badge>}
                      {module.create.attachmentsRequired > 0 && (
                        <Badge variant="outline">
                          <Paperclip className="mr-1 size-3" />
                          {module.create.attachmentsRequired} allegati
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {module.requests.current.length} correnti · {module.requests.history.length} nello storico
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => openCreate(module)}
                    disabled={!module.create.canCreate || createDisabled}
                  >
                    <PlusCircle className="size-4" />
                    Invia modulo
                  </Button>
                </div>
                {createDisabled && (
                  <p className="text-sm text-muted-foreground">
                    Questo modulo accetta una sola richiesta attiva per volta.
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="size-4" />
                    Richieste correnti
                  </div>
                  {module.requests.current.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessuna richiesta corrente.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data richiesta</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead>Documento</TableHead>
                          <TableHead>Allegati</TableHead>
                          <TableHead>Gestita il</TableHead>
                          <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {module.requests.current.map((item) => (
                          <RequestRow key={item.id} item={item} onOpen={openDetail} />
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <History className="size-4" />
                    Storico
                  </div>
                  {module.requests.history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessuna richiesta archiviata.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data richiesta</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead>Documento</TableHead>
                          <TableHead>Allegati</TableHead>
                          <TableHead>Gestita il</TableHead>
                          <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {module.requests.history.map((item) => (
                          <RequestRow key={item.id} item={item} onOpen={openDetail} />
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedModule?.name ?? "Nuova richiesta"}</DialogTitle>
            <DialogDescription>
              {selectedModule
                ? `Compila il modulo ${selectedModule.kind === "single" ? "singolo" : "multiplo"} e conferma l'invio.`
                : "Invio nuova richiesta"}
            </DialogDescription>
          </DialogHeader>

          {selectedModule && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{moduleKindLabel(selectedModule.kind)}</Badge>
                {selectedModule.gestione && <Badge variant="secondary">Con gestione stati</Badge>}
                {selectedModule.create.attachmentsRequired > 0 && (
                  <Badge variant="outline">{selectedModule.create.attachmentsRequired} allegati richiesti</Badge>
                )}
              </div>

              {selectedModule.create.showRequestDate && (
                <div className="space-y-2">
                  <Label htmlFor="request-date">Data richiesta</Label>
                  <Input
                    id="request-date"
                    type="date"
                    value={requestDate}
                    onChange={(event) => setRequestDate(event.target.value)}
                  />
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {selectedModule.create.fields.map((field) => (
                  <div
                    key={field.name}
                    className={field.type === "text" ? "space-y-2 md:col-span-2" : "space-y-2"}
                  >
                    <Label htmlFor={`field-${field.name}`}>
                      {field.label}
                      {field.required ? " *" : ""}
                    </Label>

                    {field.type === "text" ? (
                      <Textarea
                        id={`field-${field.name}`}
                        value={formValues[field.name] ?? ""}
                        onChange={(event) =>
                          setFormValues((current) => ({ ...current, [field.name]: event.target.value }))
                        }
                      />
                    ) : field.type === "bool" ? (
                      <Select
                        value={formValues[field.name] ?? ""}
                        onValueChange={(value) =>
                          setFormValues((current) => ({ ...current, [field.name]: value }))
                        }
                      >
                        <SelectTrigger id={`field-${field.name}`}>
                          <SelectValue placeholder="Seleziona un valore" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Sì</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={`field-${field.name}`}
                        type={field.type === "date" || field.type === "time" ? field.type : field.type === "int" || field.type === "float" ? "number" : "text"}
                        step={field.type === "float" ? "0.01" : undefined}
                        value={formValues[field.name] ?? ""}
                        onChange={(event) =>
                          setFormValues((current) => ({ ...current, [field.name]: event.target.value }))
                        }
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FilePlus2 className="size-4" />
                  <Label htmlFor="attachments">Allegati</Label>
                </div>
                <Input
                  id="attachments"
                  type="file"
                  multiple={selectedModule.create.attachmentsRequired !== 1}
                  accept=".pdf,.jpg,.jpeg"
                  onChange={(event) => setAttachments(Array.from(event.target.files ?? []))}
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={attachments.length >= selectedModule.create.attachmentsRequired} disabled />
                  <span>
                    {attachments.length} selezionati
                    {selectedModule.create.attachmentsRequired > 0
                      ? ` su ${selectedModule.create.attachmentsRequired} richiesti`
                      : " · allegati opzionali"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Chiudi
            </Button>
            <Button onClick={() => void handleCreate()} disabled={creating}>
              {creating ? "Invio..." : "Invia richiesta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected?.module.name ?? "Richiesta"}</DialogTitle>
            <DialogDescription>
              {selected ? `Stato attuale: ${selected.status.label}` : "Dettaglio richiesta"}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant={statusVariant(selected.status.code)}>{selected.status.label}</Badge>
                <Badge variant="outline">{moduleKindLabel(selected.module.kind)}</Badge>
                {selected.module.gestione && <Badge variant="secondary">Con gestione</Badge>}
                {selected.canCancel && <Badge variant="default">Annullabile</Badge>}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Data richiesta</CardDescription>
                    <CardTitle className="text-base">{formatDate(selected.requestDate)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Inviata il</CardDescription>
                    <CardTitle className="text-base">{formatDate(selected.sentAt)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Gestita il</CardDescription>
                    <CardTitle className="text-base">{formatDate(selected.handledAt)}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Messaggio</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">
                    {selected.message || "Nessun messaggio disponibile."}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Documento e allegati</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selected.document.filename ? (
                    <div className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{selected.document.filename}</p>
                          <p className="text-sm text-muted-foreground">Documento principale della richiesta</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => void handleDownload(0, "open")}>
                            Apri
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => void handleDownload(0, "download")}>
                            Scarica
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nessun documento principale disponibile.</p>
                  )}

                  {selected.attachments.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Paperclip className="size-4" />
                        Allegati
                      </div>
                      <div className="space-y-2">
                        {selected.attachments.map((attachment) => (
                          <div key={attachment.index} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                            <span className="text-sm">{attachment.filename}</span>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => void handleDownload(attachment.index, "open")}>
                                Apri
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => void handleDownload(attachment.index, "download")}>
                                Scarica
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dati inviati</CardTitle>
                </CardHeader>
                <CardContent>
                  {selected.values.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessun dato strutturato disponibile.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campo</TableHead>
                          <TableHead>Valore</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.values.map((value) => (
                          <TableRow key={value.key}>
                            <TableCell className="font-medium">{value.key}</TableCell>
                            <TableCell className="whitespace-pre-wrap">{value.value || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            {selected?.canCancel && (
              <Button variant="destructive" onClick={() => void handleCancel()} disabled={cancelling}>
                <XCircle className="size-4" />
                {cancelling ? "Annullamento..." : "Annulla richiesta"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
