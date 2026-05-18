"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/context";
import {
  api,
  type ColloquiDashboardData,
  type ColloquiFamilyData,
  type ColloquiManagementData,
  type ColloquiManagementItem,
  type ColloquiTeacherData,
  type ColloquiTeacherRequest,
  type ColloquiTeacherSlotsData,
} from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "R":
      return "secondary";
    case "C":
      return "default";
    case "N":
      return "destructive";
    default:
      return "outline";
  }
}

export default function ColloquiPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<ColloquiDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [teacherSlots, setTeacherSlots] = useState<ColloquiTeacherSlotsData | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseTarget, setResponseTarget] = useState<ColloquiTeacherRequest | null>(null);
  const [responseStatus, setResponseStatus] = useState<"C" | "N">("N");
  const [responseMessage, setResponseMessage] = useState("");
  const [managementData, setManagementData] = useState<ColloquiManagementData | null>(null);
  const [managementLoading, setManagementLoading] = useState(false);
  const [singleForm, setSingleForm] = useState({
    date: "",
    startTime: "08:30",
    endTime: "09:30",
    duration: 10,
    type: "P" as "P" | "D",
    location: "",
    enabled: true,
  });
  const [periodicForm, setPeriodicForm] = useState({
    type: "P" as "P" | "D",
    frequency: "S" as "S" | "1" | "2" | "3" | "4",
    weekday: "1",
    startTime: "08:30",
    endTime: "09:30",
    duration: 10,
    location: "",
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ColloquiManagementItem | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    setLoading(true);
    api.colloqui
      .dashboard(token)
      .then((response) => {
        setData(response.data);
        setError(null);
      })
      .catch((err: { message?: string }) => {
        setError(err.message || "Impossibile caricare i colloqui.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const familyData = data?.role === "genitore" ? (data as ColloquiFamilyData) : null;
  const teacherData = data?.role === "docente" ? (data as ColloquiTeacherData) : null;

  useEffect(() => {
    if (!token || data?.role !== "docente") {
      return;
    }

    setManagementLoading(true);
    api.colloqui
      .management(token)
      .then((response) => {
        setManagementData(response.data);
        setSingleForm((current) => ({
          ...current,
          date: current.date || response.data.window.start,
        }));
      })
      .catch((err: { message?: string }) => {
        setError(err.message || "Impossibile caricare la gestione ricevimenti.");
      })
      .finally(() => setManagementLoading(false));
  }, [data?.role, token]);

  const pendingRequests = useMemo(
    () => teacherData?.appointments.flatMap((appointment) => appointment.requests.filter((request) => request.status === "R")) ?? [],
    [teacherData],
  );

  const patchTeacherRequest = (updated: ColloquiTeacherRequest) => {
    setData((current) =>
      current && current.role === "docente"
        ? {
            ...current,
            appointments: current.appointments.map((appointment) => ({
              ...appointment,
              requests: appointment.requests.map((request) =>
                request.id === updated.id ? { ...request, ...updated } : request,
              ),
            })),
          }
        : current,
    );
  };

  const loadManagement = async () => {
    if (!token) {
      return;
    }
    setManagementLoading(true);
    try {
      const response = await api.colloqui.management(token);
      setManagementData(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossibile aggiornare la gestione ricevimenti.");
    } finally {
      setManagementLoading(false);
    }
  };

  const loadTeacherSlots = async (teacherId: number) => {
    if (!token) {
      return;
    }
    try {
      const response = await api.colloqui.teacherSlots(token, teacherId);
      setTeacherSlots(response.data);
      setSlotDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossibile caricare gli slot colloqui.");
    }
  };

  const handleBook = async (teacherId: number, colloquioId: number) => {
    if (!token) {
      return;
    }
    setActionLoading(colloquioId);
    try {
      const response = await api.colloqui.book(token, teacherId, colloquioId);
      setData((current) =>
        current && current.role === "genitore"
          ? { ...current, requests: [...current.requests, response.data] }
          : current,
      );
      setTeacherSlots((current) =>
        current
          ? {
              ...current,
              slots: current.slots
                .map((slot) =>
                  slot.id === colloquioId
                    ? { ...slot, booked: slot.booked + 1, available: Math.max(0, slot.available - 1) }
                    : slot,
                )
                .filter((slot) => slot.available > 0),
            }
          : current,
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prenotazione non riuscita.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (requestId: number) => {
    if (!token) {
      return;
    }
    setActionLoading(requestId);
    try {
      const response = await api.colloqui.cancel(token, requestId);
      setData((current) =>
        current && current.role === "genitore"
          ? {
              ...current,
              requests: current.requests.map((request) =>
                request.id === requestId ? response.data : request,
              ),
            }
          : current,
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Annullamento non riuscito.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirm = async (requestId: number) => {
    if (!token) {
      return;
    }
    setActionLoading(requestId);
    try {
      const response = await api.colloqui.confirm(token, requestId);
      patchTeacherRequest(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conferma non riuscita.");
    } finally {
      setActionLoading(null);
    }
  };

  const openResponseDialog = (request: ColloquiTeacherRequest, initialStatus: "C" | "N") => {
    setResponseTarget(request);
    setResponseStatus(initialStatus);
    setResponseMessage(request.message || "");
    setResponseDialogOpen(true);
  };

  const submitResponse = async () => {
    if (!token || !responseTarget) {
      return;
    }

    setActionLoading(responseTarget.id);
    try {
      const response =
        responseTarget.status === "R"
          ? await api.colloqui.reject(token, responseTarget.id, responseMessage)
          : await api.colloqui.updateResponse(token, responseTarget.id, responseStatus, responseMessage);
      patchTeacherRequest(response.data);
      setResponseDialogOpen(false);
      setResponseTarget(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aggiornamento risposta non riuscito.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSingleManagementSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }
    setActionLoading(-1);
    try {
      await api.colloqui.createSingleManagement(token, singleForm);
      await loadManagement();
      setSingleForm((current) => ({
        ...current,
        location: "",
      }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creazione ricevimento non riuscita.");
    } finally {
      setActionLoading(null);
    }
  };

  const openEditDialog = (item: ColloquiManagementItem) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const handleUpdateManagement = async () => {
    if (!token || !editingItem) {
      return;
    }
    setActionLoading(editingItem.id);
    try {
      await api.colloqui.updateSingleManagement(token, editingItem.id, {
        date: editingItem.date || "",
        startTime: editingItem.startTime || "",
        endTime: editingItem.endTime || "",
        duration: editingItem.duration,
        type: editingItem.type,
        location: editingItem.location,
        enabled: editingItem.enabled,
      });
      await loadManagement();
      setEditDialogOpen(false);
      setEditingItem(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aggiornamento ricevimento non riuscito.");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePeriodicManagementSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }
    setActionLoading(-2);
    try {
      const response = await api.colloqui.createPeriodicManagement(token, {
        ...periodicForm,
        weekday: Number(periodicForm.weekday),
      });
      await loadManagement();
      if (response.warning) {
        setError(response.warning);
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creazione ricevimenti periodici non riuscita.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleManagement = async (item: ColloquiManagementItem) => {
    if (!token) {
      return;
    }
    setActionLoading(item.id);
    try {
      await api.colloqui.setManagementEnabled(token, item.id, !item.enabled);
      await loadManagement();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cambio stato ricevimento non riuscito.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteManagement = async (mode: "D" | "T") => {
    if (!token) {
      return;
    }
    setActionLoading(mode === "D" ? -3 : -4);
    try {
      await api.colloqui.deleteManagement(token, mode);
      await loadManagement();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancellazione ricevimenti non riuscita.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Colloqui</h1>
        <p className="text-muted-foreground">
          {user?.roles.includes("ROLE_GENITORE")
            ? "Prenotazioni e stato dei colloqui con i docenti."
            : "Gestione delle richieste colloquio e storico risposte."}
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

      {familyData && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Studente</CardDescription>
                <CardTitle className="text-base">{familyData.student.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{familyData.student.className}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Docenti disponibili</CardDescription>
                <CardTitle>{familyData.teachers.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Prenotazioni attive</CardDescription>
                <CardTitle>{familyData.requests.filter((request) => request.status !== "A").length}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Prenota colloquio</CardTitle>
              <CardDescription>Seleziona un docente per vedere gli slot disponibili.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row">
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger className="md:max-w-md">
                  <SelectValue placeholder="Scegli docente" />
                </SelectTrigger>
                <SelectContent>
                  {familyData.teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={String(teacher.id)}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button disabled={!selectedTeacherId} onClick={() => void loadTeacherSlots(Number(selectedTeacherId))}>
                Visualizza slot
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Le tue richieste</CardTitle>
            </CardHeader>
            <CardContent>
              {familyData.requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessuna richiesta colloquio presente.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Docente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ora</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="hidden lg:table-cell">Messaggio</TableHead>
                      <TableHead className="text-right">Azione</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {familyData.requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.teacher}</TableCell>
                        <TableCell>{request.displayDate}</TableCell>
                        <TableCell>{request.appointmentAt ?? "-"}</TableCell>
                        <TableCell><Badge variant={statusVariant(request.status)}>{request.statusLabel}</Badge></TableCell>
                        <TableCell className="hidden max-w-xs truncate lg:table-cell">{request.message || "-"}</TableCell>
                        <TableCell className="text-right">
                          {(request.status === "R" || request.status === "C") && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading === request.id}
                              onClick={() => void handleCancel(request.id)}
                            >
                              Annulla
                            </Button>
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

      {teacherData && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Richieste in attesa</CardDescription>
                <CardTitle>{teacherData.pendingCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Ricevimenti attivi</CardDescription>
                <CardTitle>{teacherData.appointments.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Storico</CardDescription>
                <CardTitle>{teacherData.history.length}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">In attesa</TabsTrigger>
              <TabsTrigger value="calendar">Ricevimenti</TabsTrigger>
              <TabsTrigger value="history">Storico</TabsTrigger>
              <TabsTrigger value="management">Gestione</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>Richieste da gestire</CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessuna richiesta in attesa.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Studente</TableHead>
                          <TableHead>Classe</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Ora</TableHead>
                          <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">{request.student}</TableCell>
                            <TableCell>{request.className}</TableCell>
                            <TableCell>{request.displayDate}</TableCell>
                            <TableCell>{request.appointmentAt ?? "-"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  disabled={actionLoading === request.id}
                                  onClick={() => void handleConfirm(request.id)}
                                >
                                  Conferma
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={actionLoading === request.id}
                                  onClick={() => openResponseDialog(request, "N")}
                                >
                                  Rifiuta
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calendar">
              <div className="grid gap-4">
                {teacherData.appointments.map((appointment) => (
                  <Card key={appointment.id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {appointment.displayDate} · {appointment.startTime} - {appointment.endTime}
                      </CardTitle>
                      <CardDescription>
                        {appointment.mode} · {appointment.location || "Luogo non indicato"} · {appointment.booked}/{appointment.capacity} prenotazioni
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {appointment.requests.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nessuna prenotazione per questo ricevimento.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Studente</TableHead>
                              <TableHead>Classe</TableHead>
                              <TableHead>Ora</TableHead>
                              <TableHead>Stato</TableHead>
                              <TableHead>Messaggio</TableHead>
                              <TableHead className="text-right">Azione</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {appointment.requests.map((request) => (
                              <TableRow key={request.id}>
                                <TableCell className="font-medium">{request.student}</TableCell>
                                <TableCell>{request.className}</TableCell>
                                <TableCell>{request.appointmentAt ?? "-"}</TableCell>
                                <TableCell><Badge variant={statusVariant(request.status)}>{request.statusLabel}</Badge></TableCell>
                                <TableCell className="max-w-xs truncate">{request.message || "-"}</TableCell>
                                <TableCell className="text-right">
                                  {request.status !== "R" && (
                                    <Button size="sm" variant="outline" onClick={() => openResponseDialog(request, request.status === "N" ? "N" : "C")}>
                                      Modifica risposta
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="grid gap-4">
                {teacherData.history.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {item.displayDate} · {item.startTime} - {item.endTime}
                      </CardTitle>
                      <CardDescription>
                        {item.mode} · {item.location || "Luogo non indicato"} · {item.enabled ? "Abilitato" : "Disabilitato"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {item.requests.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nessuna prenotazione storica.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Studente</TableHead>
                              <TableHead>Classe</TableHead>
                              <TableHead>Ora</TableHead>
                              <TableHead>Stato</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {item.requests.map((request, index) => (
                              <TableRow key={`${item.id}-${index}`}>
                                <TableCell className="font-medium">{request.student}</TableCell>
                                <TableCell>{request.className}</TableCell>
                                <TableCell>{request.appointmentAt ?? "-"}</TableCell>
                                <TableCell><Badge variant={statusVariant(request.status)}>{request.statusLabel}</Badge></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="management">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Nuovo ricevimento singolo</CardTitle>
                    <CardDescription>
                      Finestra consentita: {managementData?.window.start ?? "-"} → {managementData?.window.end ?? "-"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="grid gap-3" onSubmit={handleSingleManagementSubmit}>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input type="date" value={singleForm.date} min={managementData?.window.start} max={managementData?.window.end} onChange={(event) => setSingleForm((current) => ({ ...current, date: event.target.value }))} />
                        <Select value={singleForm.type} onValueChange={(value: "P" | "D") => setSingleForm((current) => ({ ...current, type: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="P">In presenza</SelectItem>
                            <SelectItem value="D">A distanza</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <Input type="time" value={singleForm.startTime} onChange={(event) => setSingleForm((current) => ({ ...current, startTime: event.target.value }))} />
                        <Input type="time" value={singleForm.endTime} onChange={(event) => setSingleForm((current) => ({ ...current, endTime: event.target.value }))} />
                        <Input type="number" min={5} step={5} value={singleForm.duration} onChange={(event) => setSingleForm((current) => ({ ...current, duration: Number(event.target.value) }))} />
                      </div>
                      <Input placeholder={singleForm.type === "D" ? "Link del colloquio" : "Luogo del colloquio"} value={singleForm.location} onChange={(event) => setSingleForm((current) => ({ ...current, location: event.target.value }))} />
                      <Button type="submit" disabled={actionLoading === -1}>Crea ricevimento</Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Nuovi ricevimenti periodici</CardTitle>
                    <CardDescription>Genera una serie ricorrente fino al termine dei colloqui.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="grid gap-3" onSubmit={handlePeriodicManagementSubmit}>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Select value={periodicForm.type} onValueChange={(value: "P" | "D") => setPeriodicForm((current) => ({ ...current, type: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="P">In presenza</SelectItem>
                            <SelectItem value="D">A distanza</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={periodicForm.frequency} onValueChange={(value: "S" | "1" | "2" | "3" | "4") => setPeriodicForm((current) => ({ ...current, frequency: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="S">Ogni settimana</SelectItem>
                            <SelectItem value="1">Prima settimana</SelectItem>
                            <SelectItem value="2">Seconda settimana</SelectItem>
                            <SelectItem value="3">Terza settimana</SelectItem>
                            <SelectItem value="4">Ultima settimana</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <Select value={periodicForm.weekday} onValueChange={(value) => setPeriodicForm((current) => ({ ...current, weekday: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Lunedì</SelectItem>
                            <SelectItem value="2">Martedì</SelectItem>
                            <SelectItem value="3">Mercoledì</SelectItem>
                            <SelectItem value="4">Giovedì</SelectItem>
                            <SelectItem value="5">Venerdì</SelectItem>
                            <SelectItem value="6">Sabato</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="time" value={periodicForm.startTime} onChange={(event) => setPeriodicForm((current) => ({ ...current, startTime: event.target.value }))} />
                        <Input type="time" value={periodicForm.endTime} onChange={(event) => setPeriodicForm((current) => ({ ...current, endTime: event.target.value }))} />
                      </div>
                      <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                        <Input type="number" min={5} step={5} value={periodicForm.duration} onChange={(event) => setPeriodicForm((current) => ({ ...current, duration: Number(event.target.value) }))} />
                        <Input placeholder={periodicForm.type === "D" ? "Link del colloquio" : "Luogo del colloquio"} value={periodicForm.location} onChange={(event) => setPeriodicForm((current) => ({ ...current, location: event.target.value }))} />
                      </div>
                      <Button type="submit" disabled={actionLoading === -2}>Genera ricevimenti</Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Ricevimenti configurati</CardTitle>
                  <CardDescription>
                    {managementLoading ? "Aggiornamento in corso..." : `${managementData?.items.length ?? 0} ricevimenti nel periodo`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={!managementData?.deleteOptions.disabledCount || actionLoading === -3}
                      onClick={() => void handleDeleteManagement("D")}
                    >
                      Cancella disabilitati ({managementData?.deleteOptions.disabledCount ?? 0})
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!managementData?.deleteOptions.allCount || actionLoading === -4}
                      onClick={() => void handleDeleteManagement("T")}
                    >
                      Cancella tutti i cancellabili ({managementData?.deleteOptions.allCount ?? 0})
                    </Button>
                  </div>

                  {managementData?.items.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Orario</TableHead>
                          <TableHead>Modalità</TableHead>
                          <TableHead>Capienza</TableHead>
                          <TableHead>Richieste</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {managementData.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.displayDate}</TableCell>
                            <TableCell>{item.startTime} - {item.endTime}</TableCell>
                            <TableCell>{item.mode}</TableCell>
                            <TableCell>{item.capacity}</TableCell>
                            <TableCell>{item.requestCount}</TableCell>
                            <TableCell><Badge variant={item.enabled ? "default" : "outline"}>{item.enabled ? "Abilitato" : "Disabilitato"}</Badge></TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" disabled={!item.canEdit} onClick={() => openEditDialog(item)}>
                                  Modifica
                                </Button>
                                <Button size="sm" variant="outline" disabled={!item.canToggle || actionLoading === item.id} onClick={() => void handleToggleManagement(item)}>
                                  {item.enabled ? "Disabilita" : "Abilita"}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nessun ricevimento configurato.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{teacherSlots?.teacher.name ?? "Slot colloqui"}</DialogTitle>
            <DialogDescription>
              {teacherSlots?.teacher.subjects.join(", ") || "Materie non disponibili"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Slot prenotabili</CardTitle>
              </CardHeader>
              <CardContent>
                {teacherSlots?.slots.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Orario</TableHead>
                        <TableHead>Modalità</TableHead>
                        <TableHead>Disponibilità</TableHead>
                        <TableHead className="text-right">Azione</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teacherSlots.slots.map((slot) => (
                        <TableRow key={slot.id}>
                          <TableCell>{slot.displayDate}</TableCell>
                          <TableCell>{slot.startTime} - {slot.endTime}</TableCell>
                          <TableCell>{slot.mode}</TableCell>
                          <TableCell>{slot.available}/{slot.capacity}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              disabled={actionLoading === slot.id}
                              onClick={() => selectedTeacherId && void handleBook(Number(selectedTeacherId), slot.id)}
                            >
                              Prenota
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">Nessuno slot disponibile nel periodo corrente.</p>
                )}
              </CardContent>
            </Card>

            {teacherSlots?.exhausted.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Slot esauriti</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {teacherSlots.exhausted.map((slot) => (
                    <div key={slot.id} className="rounded-md border p-3 text-sm text-muted-foreground">
                      {slot.displayDate} · {slot.startTime} - {slot.endTime} · completo
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gestisci risposta</DialogTitle>
            <DialogDescription>
              {responseTarget ? `${responseTarget.student} · ${responseTarget.displayDate} ${responseTarget.appointmentAt ?? ""}` : ""}
            </DialogDescription>
          </DialogHeader>
          {responseTarget?.status !== "R" && (
            <Select value={responseStatus} onValueChange={(value: "C" | "N") => setResponseStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="C">Confermato</SelectItem>
                <SelectItem value="N">Rifiutato</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Textarea
            placeholder={responseStatus === "N" ? "Messaggio al genitore" : "Messaggio opzionale"}
            value={responseMessage}
            onChange={(event) => setResponseMessage(event.target.value)}
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
              Chiudi
            </Button>
            <Button disabled={!responseTarget || actionLoading === responseTarget.id} onClick={() => void submitResponse()}>
              Salva risposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica ricevimento</DialogTitle>
            <DialogDescription>
              {editingItem ? `${editingItem.displayDate} · ${editingItem.startTime} - ${editingItem.endTime}` : ""}
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input type="date" value={editingItem.date ?? ""} min={managementData?.window.start} max={managementData?.window.end} onChange={(event) => setEditingItem((current) => current ? { ...current, date: event.target.value } : current)} />
                <Select value={editingItem.type} onValueChange={(value: "P" | "D") => setEditingItem((current) => current ? { ...current, type: value, mode: value === "D" ? "A distanza" : "In presenza" } : current)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P">In presenza</SelectItem>
                    <SelectItem value="D">A distanza</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Input type="time" value={editingItem.startTime ?? ""} onChange={(event) => setEditingItem((current) => current ? { ...current, startTime: event.target.value } : current)} />
                <Input type="time" value={editingItem.endTime ?? ""} onChange={(event) => setEditingItem((current) => current ? { ...current, endTime: event.target.value } : current)} />
                <Input type="number" min={5} step={5} value={editingItem.duration} onChange={(event) => setEditingItem((current) => current ? { ...current, duration: Number(event.target.value) } : current)} />
              </div>
              <Input placeholder={editingItem.type === "D" ? "Link del colloquio" : "Luogo del colloquio"} value={editingItem.location} onChange={(event) => setEditingItem((current) => current ? { ...current, location: event.target.value } : current)} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Chiudi
            </Button>
            <Button disabled={!editingItem || actionLoading === editingItem.id} onClick={() => void handleUpdateManagement()}>
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
