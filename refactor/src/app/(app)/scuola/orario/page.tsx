"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import {
  api,
  type OrarioInfo,
  type SedeInfo,
  type ClasseInfo,
  type CattedraInfo,
  type OrarioLezione,
} from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Clock,
  MapPin,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  CalendarDays,
  X,
  LayoutGrid,
  Eye,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──

type SlotItem = { inizio: string; fine: string; durata: number };
type WeekData = Record<number, SlotItem[]>;

interface OrarioFormData {
  nome: string;
  inizio: string;
  fine: string;
  sedeId: string;
}

const GIORNI: { num: number; short: string; long: string }[] = [
  { num: 1, short: "Lun", long: "Lunedì" },
  { num: 2, short: "Mar", long: "Martedì" },
  { num: 3, short: "Mer", long: "Mercoledì" },
  { num: 4, short: "Gio", long: "Giovedì" },
  { num: 5, short: "Ven", long: "Venerdì" },
  { num: 6, short: "Sab", long: "Sabato" },
];

const emptyForm: OrarioFormData = { nome: "", inizio: "", fine: "", sedeId: "" };

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buildWeekData(scansioni: OrarioInfo["scansioni"]): WeekData {
  const week: WeekData = {};
  for (const s of scansioni) {
    if (!week[s.giorno]) week[s.giorno] = [];
    week[s.giorno].push({ inizio: s.inizio, fine: s.fine, durata: s.durata });
  }
  return week;
}

/** Get grid dimensions from scansioni, with sensible defaults */
function getGridDimensions(orario: OrarioInfo) {
  if (orario.scansioni.length === 0) {
    return {
      ore: [1, 2, 3, 4, 5, 6],
      giorni: GIORNI,
    };
  }
  const oreSet = new Set(orario.scansioni.map((s) => s.ora));
  const giorniSet = new Set(orario.scansioni.map((s) => s.giorno));
  return {
    ore: Array.from(oreSet).sort((a, b) => a - b),
    giorni: GIORNI.filter((g) => giorniSet.has(g.num)),
  };
}

// ── Component ──

export default function OrarioPage() {
  const { token } = useAuth();
  const [orari, setOrari] = useState<OrarioInfo[]>([]);
  const [sedi, setSedi] = useState<SedeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Orario Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOrario, setEditOrario] = useState<OrarioInfo | null>(null);
  const [formData, setFormData] = useState<OrarioFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Scansioni editor dialog
  const [scansioniOpen, setScansioniOpen] = useState(false);
  const [scansioniOrario, setScansioniOrario] = useState<OrarioInfo | null>(null);
  const [weekData, setWeekData] = useState<WeekData>({});
  const [savingScansioni, setSavingScansioni] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteOrario, setDeleteOrario] = useState<OrarioInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Compose dialog state ──
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeOrario, setComposeOrario] = useState<OrarioInfo | null>(null);
  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [classiSede, setClassiSede] = useState<ClasseInfo[]>([]);
  const [lezioni, setLezioni] = useState<OrarioLezione[]>([]);
  const [cattedreClasse, setCattedreClasse] = useState<CattedraInfo[]>([]);
  const [loadingLezioni, setLoadingLezioni] = useState(false);
  const [openCell, setOpenCell] = useState<string | null>(null);

  // ── View/Print dialog state ──
  const [viewOpen, setViewOpen] = useState(false);
  const [viewOrario, setViewOrario] = useState<OrarioInfo | null>(null);
  const [viewClasseId, setViewClasseId] = useState<string>("");
  const [viewClassi, setViewClassi] = useState<ClasseInfo[]>([]);
  const [viewLezioni, setViewLezioni] = useState<OrarioLezione[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  // Load sedi on mount
  useEffect(() => {
    if (!token) return;
    api.sedi.list(token).then((res) => setSedi(res.data)).catch(() => {});
  }, [token]);

  const fetchOrari = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.scuola.orario(token);
      setOrari(res.data);
    } catch {
      toast.error("Errore nel caricamento degli orari");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrari();
  }, [fetchOrari]);

  // ── Orario CRUD ──

  const handleCreate = () => {
    setEditOrario(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (o: OrarioInfo) => {
    setEditOrario(o);
    setFormData({
      nome: o.nome,
      inizio: o.inizio,
      fine: o.fine,
      sedeId: String(o.sede.id),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    if (!formData.nome.trim()) { toast.error("Il nome è obbligatorio"); return; }
    if (!formData.inizio) { toast.error("La data di inizio è obbligatoria"); return; }
    if (!formData.fine) { toast.error("La data di fine è obbligatoria"); return; }
    if (!formData.sedeId) { toast.error("Seleziona una sede"); return; }

    setSaving(true);
    try {
      const payload = {
        nome: formData.nome.trim(),
        inizio: formData.inizio,
        fine: formData.fine,
        sedeId: Number(formData.sedeId),
      };
      if (editOrario) {
        await api.scuola.updateOrario(token, editOrario.id, payload);
        toast.success("Orario aggiornato");
      } else {
        await api.scuola.createOrario(token, payload);
        toast.success("Orario creato");
      }
      setDialogOpen(false);
      fetchOrari();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOpen = (o: OrarioInfo) => {
    setDeleteOrario(o);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!token || !deleteOrario) return;
    setDeleting(true);
    try {
      await api.scuola.deleteOrario(token, deleteOrario.id);
      setOrari((prev) => prev.filter((o) => o.id !== deleteOrario.id));
      toast.success("Orario eliminato");
      setDeleteOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nell'eliminazione");
    } finally {
      setDeleting(false);
    }
  };

  // ── Scansioni editor ──

  const handleOpenScansioni = (o: OrarioInfo) => {
    setScansioniOrario(o);
    setWeekData(buildWeekData(o.scansioni));
    setScansioniOpen(true);
  };

  const addSlot = (giorno: number) => {
    setWeekData((prev) => ({
      ...prev,
      [giorno]: [...(prev[giorno] || []), { inizio: "08:00", fine: "09:00", durata: 1.0 }],
    }));
  };

  const removeSlot = (giorno: number, idx: number) => {
    setWeekData((prev) => ({
      ...prev,
      [giorno]: (prev[giorno] || []).filter((_, i) => i !== idx),
    }));
  };

  const updateSlot = (giorno: number, idx: number, field: keyof SlotItem, value: string | number) => {
    setWeekData((prev) => {
      const day = [...(prev[giorno] || [])];
      day[idx] = { ...day[idx], [field]: value };
      return { ...prev, [giorno]: day };
    });
  };

  const handleSaveScansioni = async () => {
    if (!token || !scansioniOrario) return;
    setSavingScansioni(true);
    try {
      const scansioni = Object.entries(weekData).flatMap(([giorno, slots]) =>
        slots.map((slot, idx) => ({
          giorno: Number(giorno),
          ora: idx + 1,
          inizio: slot.inizio,
          fine: slot.fine,
          durata: slot.durata,
        }))
      );
      await api.scuola.updateScansioni(token, scansioniOrario.id, scansioni);
      toast.success("Scansioni salvate");
      setScansioniOpen(false);
      fetchOrari();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSavingScansioni(false);
    }
  };

  // ── Compose orario ──

  const handleOpenCompose = async (o: OrarioInfo) => {
    if (!token) return;
    setComposeOrario(o);
    setSelectedClasseId("");
    setLezioni([]);
    setCattedreClasse([]);
    setOpenCell(null);
    setComposeOpen(true);
    // Load classes for this orario's sede
    try {
      const res = await api.classi.list(token, { sede: o.sede.id, limit: 100 });
      setClassiSede(res.data);
    } catch {
      toast.error("Errore nel caricamento delle classi");
    }
  };

  // When class selection changes, load lezioni + cattedre
  const handleClasseChange = useCallback(
    async (classeId: string) => {
      setSelectedClasseId(classeId);
      setLezioni([]);
      setCattedreClasse([]);
      setOpenCell(null);
      if (!token || !composeOrario || !classeId) return;
      setLoadingLezioni(true);
      try {
        const [lRes, cRes] = await Promise.all([
          api.scuola.orarioLezioni(token, composeOrario.id, Number(classeId)),
          api.cattedre.list(token, { classe: Number(classeId), limit: 100 }),
        ]);
        setLezioni(lRes.data);
        setCattedreClasse(cRes.data);
      } catch {
        toast.error("Errore nel caricamento dei dati");
      } finally {
        setLoadingLezioni(false);
      }
    },
    [token, composeOrario],
  );

  const getCellLezioni = (giorno: number, ora: number) =>
    lezioni.filter((l) => l.giorno === giorno && l.ora === ora);

  const getAvailableCattedre = (giorno: number, ora: number) => {
    const assigned = new Set(getCellLezioni(giorno, ora).map((l) => l.cattedra.id));
    return cattedreClasse.filter((c) => !assigned.has(c.id) && c.attiva);
  };

  const handleAddLezione = async (giorno: number, ora: number, cattedraId: number) => {
    if (!token || !composeOrario) return;
    try {
      const res = await api.scuola.addOrarioLezione(token, composeOrario.id, {
        giorno,
        ora,
        cattedraId,
      });
      setLezioni((prev) => [...prev, res.data]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nell'aggiunta");
    }
  };

  const handleRemoveLezione = async (lezioneId: number) => {
    if (!token || !composeOrario) return;
    try {
      await api.scuola.deleteOrarioLezione(token, composeOrario.id, lezioneId);
      setLezioni((prev) => prev.filter((l) => l.id !== lezioneId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nella rimozione");
    }
  };

  // ── View / Print orario ──

  const handleOpenView = async (o: OrarioInfo) => {
    if (!token) return;
    setViewOrario(o);
    setViewClasseId("");
    setViewLezioni([]);
    setViewOpen(true);
    try {
      const res = await api.classi.list(token, { sede: o.sede.id, limit: 100 });
      setViewClassi(res.data);
    } catch {
      toast.error("Errore nel caricamento delle classi");
    }
  };

  const handleViewClasseChange = useCallback(
    async (classeId: string) => {
      setViewClasseId(classeId);
      setViewLezioni([]);
      if (!token || !viewOrario || !classeId) return;
      setViewLoading(true);
      try {
        const res = await api.scuola.orarioLezioni(token, viewOrario.id, Number(classeId));
        setViewLezioni(res.data);
      } catch {
        toast.error("Errore nel caricamento dell'orario");
      } finally {
        setViewLoading(false);
      }
    },
    [token, viewOrario],
  );

  const handlePrint = () => {
    window.print();
  };

  // ── Timetable grid (read-only, for cards) ──

  function TimetableGrid({ orario }: { orario: OrarioInfo }) {
    const scansioniByGiorno = new Map<number, OrarioInfo["scansioni"]>();
    for (const s of orario.scansioni) {
      if (!scansioniByGiorno.has(s.giorno)) scansioniByGiorno.set(s.giorno, []);
      scansioniByGiorno.get(s.giorno)!.push(s);
    }
    const oreSet = new Set(orario.scansioni.map((s) => s.ora));
    const oreList = Array.from(oreSet).sort((a, b) => a - b);
    const giorniList = Array.from(scansioniByGiorno.keys()).sort((a, b) => a - b);

    if (orario.scansioni.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nessuna scansione configurata.
        </p>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">Ora</TableHead>
              {giorniList.map((g) => (
                <TableHead key={g} className="text-center text-xs">
                  {GIORNI.find((d) => d.num === g)?.long ?? `G${g}`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {oreList.map((ora) => (
              <TableRow key={ora}>
                <TableCell className="text-center font-medium text-sm">{ora}</TableCell>
                {giorniList.map((giorno) => {
                  const s = orario.scansioni.find((sc) => sc.giorno === giorno && sc.ora === ora);
                  return (
                    <TableCell key={giorno} className="text-center text-xs">
                      {s ? (
                        <span className="font-medium">{s.inizio}&ndash;{s.fine}</span>
                      ) : (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orario</h1>
          <p className="text-muted-foreground">Gestisci le scansioni orarie e l&apos;orario delle lezioni</p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orari.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground">Nessun orario configurato.</p>
            <Button onClick={handleCreate} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi il primo orario
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orari.map((orario) => (
            <Card key={orario.id}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{orario.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(orario.inizio)} &mdash; {formatDate(orario.fine)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1 mr-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge variant="outline">{orario.sede.nomeBreve}</Badge>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleOpenCompose(orario)}
                    >
                      <LayoutGrid className="h-4 w-4" />
                      <span className="hidden sm:inline">Componi</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleOpenView(orario)}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">Visualizza</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleOpenScansioni(orario)}
                    >
                      <CalendarDays className="h-4 w-4" />
                      <span className="hidden sm:inline">Scansioni</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(orario)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteOpen(orario)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <TimetableGrid orario={orario} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ──────── Create / Edit Orario Dialog ──────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md flex flex-col max-h-[90vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>{editOrario ? `Modifica: ${editOrario.nome}` : "Nuovo Orario"}</DialogTitle>
            <DialogDescription>
              {editOrario ? "Modifica i dati dell'orario." : "Inserisci i dati del nuovo orario."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6">
            <div className="grid gap-4 pb-2">
              <div className="space-y-2">
                <Label htmlFor="orario-nome">Nome *</Label>
                <Input
                  id="orario-nome"
                  placeholder="es. Orario provvisorio"
                  value={formData.nome}
                  onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orario-inizio">Inizio validità *</Label>
                  <Input
                    id="orario-inizio"
                    type="date"
                    value={formData.inizio}
                    onChange={(e) => setFormData((p) => ({ ...p, inizio: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orario-fine">Fine validità *</Label>
                  <Input
                    id="orario-fine"
                    type="date"
                    value={formData.fine}
                    onChange={(e) => setFormData((p) => ({ ...p, fine: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sede *</Label>
                <Select value={formData.sedeId} onValueChange={(v) => setFormData((p) => ({ ...p, sedeId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {sedi.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.nome} ({s.nomeBreve})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ──────── Scansioni Editor Dialog ──────── */}
      <Dialog open={scansioniOpen} onOpenChange={setScansioniOpen}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[92vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>Scansioni: {scansioniOrario?.nome}</DialogTitle>
            <DialogDescription>
              Configura gli orari di inizio/fine per ogni ora di lezione.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-6 pb-2">
              {GIORNI.map(({ num, long }) => {
                const slots = weekData[num] || [];
                return (
                  <div key={num}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">{long}</h3>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addSlot(num)}>
                        <Plus className="mr-1 h-3 w-3" />
                        Aggiungi ora
                      </Button>
                    </div>
                    {slots.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 pl-1">Nessuna ora configurata.</p>
                    ) : (
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              <TableHead className="w-10 text-center text-xs py-2">#</TableHead>
                              <TableHead className="text-xs py-2">Inizio</TableHead>
                              <TableHead className="text-xs py-2">Fine</TableHead>
                              <TableHead className="text-xs py-2 w-28">Durata (h)</TableHead>
                              <TableHead className="w-10 py-2" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {slots.map((slot, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="text-center text-sm font-medium py-1.5">{idx + 1}</TableCell>
                                <TableCell className="py-1.5">
                                  <Input type="time" value={slot.inizio} onChange={(e) => updateSlot(num, idx, "inizio", e.target.value)} className="h-7 text-sm" />
                                </TableCell>
                                <TableCell className="py-1.5">
                                  <Input type="time" value={slot.fine} onChange={(e) => updateSlot(num, idx, "fine", e.target.value)} className="h-7 text-sm" />
                                </TableCell>
                                <TableCell className="py-1.5">
                                  <Select value={String(slot.durata)} onValueChange={(v) => updateSlot(num, idx, "durata", Number(v))}>
                                    <SelectTrigger className="h-7 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0.5">0.5</SelectItem>
                                      <SelectItem value="1">1</SelectItem>
                                      <SelectItem value="1.5">1.5</SelectItem>
                                      <SelectItem value="2">2</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="py-1.5">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeSlot(num, idx)}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setScansioniOpen(false)}>Annulla</Button>
            <Button onClick={handleSaveScansioni} disabled={savingScansioni}>
              {savingScansioni && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {savingScansioni ? "Salvataggio..." : "Salva scansioni"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ──────── Delete Confirmation ──────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare &quot;{deleteOrario?.nome}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà l&apos;orario e tutte le sue scansioni orarie. Non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleting ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ──────── Componi Orario Dialog ──────── */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-6xl flex flex-col max-h-[95vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
            <DialogTitle>
              Componi Orario: {composeOrario?.nome}
            </DialogTitle>
            <DialogDescription>
              Seleziona una classe e clicca sulle celle per assegnare materie e docenti.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Class selector */}
            <div className="mb-4">
              <Label className="text-sm font-medium mb-1.5 block">Classe</Label>
              <Select value={selectedClasseId} onValueChange={handleClasseChange}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Seleziona una classe" />
                </SelectTrigger>
                <SelectContent>
                  {classiSede.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome} &mdash; {c.corso.nomeBreve}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grid */}
            {!selectedClasseId ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <p>Seleziona una classe per visualizzare e comporre l&apos;orario.</p>
              </div>
            ) : loadingLezioni ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : composeOrario ? (
              (() => {
                const selectedClasse = classiSede.find((c) => c.id === Number(selectedClasseId));
                const oreSettimanali = selectedClasse?.oreSettimanali ?? 30;
                const maxOrePerDay = Math.ceil(oreSettimanali / 6);
                const ore = Array.from({ length: maxOrePerDay }, (_, i) => i + 1);
                const giorni = GIORNI;
                const oreAssegnate = lezioni.length;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Badge variant="secondary">
                        {oreSettimanali} ore/settimana
                      </Badge>
                      <Badge variant={oreAssegnate === oreSettimanali ? "default" : "outline"}>
                        {oreAssegnate}/{oreSettimanali} assegnate
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        (max {maxOrePerDay} ore/giorno)
                      </span>
                    </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-14 text-center text-xs font-semibold">Ora</TableHead>
                          {giorni.map((g) => (
                            <TableHead key={g.num} className="text-center text-xs font-semibold min-w-[110px]">
                              {g.long}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ore.map((ora) => (
                          <TableRow key={ora}>
                            <TableCell className="text-center font-bold text-sm align-middle">
                              {ora}ª
                            </TableCell>
                            {giorni.map((g) => {
                              const cellKey = `${g.num}-${ora}`;
                              const cellLezioni = getCellLezioni(g.num, ora);
                              const available = getAvailableCattedre(g.num, ora);

                              return (
                                <TableCell key={g.num} className="p-0.5 align-middle">
                                  <Popover
                                    open={openCell === cellKey}
                                    onOpenChange={(open) => setOpenCell(open ? cellKey : null)}
                                  >
                                    <PopoverTrigger asChild>
                                      <button
                                        className={`w-full min-h-[52px] flex flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1 transition-colors ${
                                          cellLezioni.length > 0
                                            ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                                            : "border-dashed border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/40"
                                        }`}
                                      >
                                        {cellLezioni.length > 0 ? (
                                          cellLezioni.map((l) => (
                                            <div key={l.id} className="text-center leading-tight">
                                              <span className="text-xs font-semibold text-primary">
                                                {l.cattedra.materia.nomeBreve}
                                              </span>
                                              <span className="block text-[10px] text-muted-foreground leading-tight">
                                                {l.cattedra.docente.cognome}
                                              </span>
                                            </div>
                                          ))
                                        ) : (
                                          <Plus className="h-4 w-4 text-muted-foreground/30" />
                                        )}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-3" align="center">
                                      <div className="space-y-3">
                                        <h4 className="font-medium text-sm">
                                          {g.long}, {ora}ª ora
                                        </h4>

                                        {/* Current assignments */}
                                        {cellLezioni.length > 0 && (
                                          <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground font-medium">Assegnati:</p>
                                            {cellLezioni.map((l) => (
                                              <div
                                                key={l.id}
                                                className="flex items-center justify-between gap-2 bg-muted/50 rounded px-2 py-1.5"
                                              >
                                                <span className="text-xs">
                                                  <span className="font-semibold">{l.cattedra.materia.nomeBreve}</span>
                                                  {" — "}
                                                  {l.cattedra.docente.cognome} {l.cattedra.docente.nome}
                                                </span>
                                                <button
                                                  className="text-destructive hover:text-destructive/80 shrink-0 p-0.5"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveLezione(l.id);
                                                  }}
                                                >
                                                  <X className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Add new */}
                                        {available.length > 0 && (
                                          <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground font-medium">Aggiungi:</p>
                                            <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                                              {available.map((c) => (
                                                <button
                                                  key={c.id}
                                                  className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-primary/10 transition-colors"
                                                  onClick={() => handleAddLezione(g.num, ora, c.id)}
                                                >
                                                  <span className="font-semibold text-primary">
                                                    {c.materia.nomeBreve}
                                                  </span>
                                                  <span className="text-muted-foreground">
                                                    {" — "}{c.docente.cognome} {c.docente.nome}
                                                  </span>
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {available.length === 0 && cellLezioni.length > 0 && (
                                          <p className="text-xs text-muted-foreground italic">
                                            Tutte le cattedre della classe sono già assegnate in questa cella.
                                          </p>
                                        )}

                                        {available.length === 0 && cellLezioni.length === 0 && (
                                          <p className="text-xs text-muted-foreground italic">
                                            Nessuna cattedra attiva disponibile per questa classe.
                                          </p>
                                        )}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  </div>
                );
              })()
            ) : null}
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Chiudi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ──────── Visualizza / Stampa Orario Dialog ──────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-5xl flex flex-col max-h-[95vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b" data-print-hide>
            <DialogTitle>
              Visualizza Orario: {viewOrario?.nome}
            </DialogTitle>
            <DialogDescription>
              Seleziona una classe per visualizzare l&apos;orario completo. Usa il pulsante Stampa per stamparlo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Class selector — hidden in print */}
            <div className="mb-4 flex items-end gap-3" data-print-hide>
              <div className="flex-1 max-w-xs">
                <Label className="text-sm font-medium mb-1.5 block">Classe</Label>
                <Select value={viewClasseId} onValueChange={handleViewClasseChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona una classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {viewClassi.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome} &mdash; {c.corso.nomeBreve}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {viewClasseId && viewLezioni.length > 0 && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                  Stampa
                </Button>
              )}
            </div>

            {/* Print header — visible only when printing */}
            <div className="hidden mb-4" data-print-show>
              <h1 className="text-xl font-bold text-center">
                Orario: {viewOrario?.nome}
              </h1>
              <p className="text-center text-sm">
                {viewOrario && `${formatDate(viewOrario.inizio)} — ${formatDate(viewOrario.fine)}`}
                {" | Sede: "}{viewOrario?.sede.nomeBreve}
                {" | Classe: "}{viewClassi.find((c) => c.id === Number(viewClasseId))?.nome ?? ""}
              </p>
            </div>

            {/* Content */}
            {!viewClasseId ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground" data-print-hide>
                <p>Seleziona una classe per visualizzare l&apos;orario.</p>
              </div>
            ) : viewLoading ? (
              <div className="flex items-center justify-center py-16" data-print-hide>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : viewLezioni.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground" data-print-hide>
                <p>Nessuna lezione assegnata per questa classe.</p>
              </div>
            ) : (() => {
              const selectedClasse = viewClassi.find((c) => c.id === Number(viewClasseId));
              const oreSettimanali = selectedClasse?.oreSettimanali ?? 30;
              const maxOrePerDay = Math.ceil(oreSettimanali / 6);
              const viewOre = Array.from({ length: maxOrePerDay }, (_, i) => i + 1);
              const getViewCellLezioni = (giorno: number, ora: number) =>
                viewLezioni.filter((l) => l.giorno === giorno && l.ora === ora);

              return (
                <div className="overflow-x-auto" id="printable-timetable">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14 text-center text-xs font-bold border">
                          Ora
                        </TableHead>
                        {GIORNI.map((g) => (
                          <TableHead
                            key={g.num}
                            className="text-center text-xs font-bold min-w-[120px] border"
                          >
                            {g.long}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewOre.map((ora) => (
                        <TableRow key={ora}>
                          <TableCell className="text-center font-bold text-sm border">
                            {ora}ª
                          </TableCell>
                          {GIORNI.map((g) => {
                            const cellLezioni = getViewCellLezioni(g.num, ora);
                            return (
                              <TableCell
                                key={g.num}
                                className="text-center border p-2 align-middle"
                              >
                                {cellLezioni.length > 0 ? (
                                  cellLezioni.map((l) => (
                                    <div key={l.id} className="leading-tight">
                                      <span className="text-sm font-semibold">
                                        {l.cattedra.materia.nomeBreve}
                                      </span>
                                      <br />
                                      <span className="text-xs text-muted-foreground">
                                        {l.cattedra.docente.cognome}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground">&mdash;</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0" data-print-hide>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Chiudi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
