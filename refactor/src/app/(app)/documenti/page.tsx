"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type DocumentoSlot, type DocumentoInfo, type DocumentoBesRow } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

type TabKey = "piani" | "programmi" | "relazioni" | "maggio" | "bes";

const TAB_LABELS: Record<TabKey, string> = {
  piani: "Piani di Lavoro",
  programmi: "Programmi Svolti",
  relazioni: "Relazioni Finali",
  maggio: "Doc. 15 Maggio",
  bes: "BES",
};

const TIPO_MAP: Record<TabKey, string> = {
  piani: "L",
  programmi: "P",
  relazioni: "R",
  maggio: "M",
  bes: "",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentoCell({
  slot,
  tipo,
  token,
  onUpload,
  onDelete,
}: {
  slot: DocumentoSlot;
  tipo: string;
  token: string;
  onUpload: (slot: DocumentoSlot) => void;
  onDelete: (doc: DocumentoInfo) => void;
}) {
  const doc = slot.documento;
  if (!doc) {
    return (
      <Button size="sm" variant="outline" onClick={() => onUpload(slot)}>
        <Upload className="mr-1 h-3 w-3" />
        Carica
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {doc.allegati.map((a) => (
        <Button
          key={a.id}
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={() => void api.documenti.download(token, doc.id, "open")}
          title={`${a.nome}.${a.estensione} (${formatSize(a.dimensione)})`}
        >
          <Download className="mr-1 h-3 w-3" />
          {a.estensione.toUpperCase()}
        </Button>
      ))}
      {doc.canDelete && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
          onClick={() => onDelete(doc)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export default function DocumentiPage() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("piani");
  const [slotData, setSlotData] = useState<Partial<Record<TabKey, DocumentoSlot[]>>>({});
  const [besData, setBesData] = useState<DocumentoBesRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<DocumentoSlot | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSeeBes = user?.roles.some((r) =>
    ["ROLE_STAFF", "ROLE_AMMINISTRATORE"].includes(r),
  ) ?? false;

  const loadTab = useCallback(
    async (tab: TabKey) => {
      if (!token) return;
      setLoading(true);
      try {
        if (tab === "piani") {
          const res = await api.documenti.piani(token);
          setSlotData((prev) => ({ ...prev, piani: res.data }));
        } else if (tab === "programmi") {
          const res = await api.documenti.programmi(token);
          setSlotData((prev) => ({ ...prev, programmi: res.data }));
        } else if (tab === "relazioni") {
          const res = await api.documenti.relazioni(token);
          setSlotData((prev) => ({ ...prev, relazioni: res.data }));
        } else if (tab === "maggio") {
          const res = await api.documenti.maggio(token);
          setSlotData((prev) => ({ ...prev, maggio: res.data }));
        } else if (tab === "bes") {
          const res = await api.documenti.bes(token);
          setBesData(res.data);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore nel caricamento.");
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void loadTab(activeTab);
  }, [activeTab, loadTab]);

  const handleUploadClick = (slot: DocumentoSlot) => {
    setUploadTarget(slot);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget || !token) return;
    e.target.value = "";

    setUploading(true);
    try {
      const tipo = TIPO_MAP[activeTab];
      await api.documenti.upload(token, tipo, file, {
        classeId: uploadTarget.classeId,
        materiaId: uploadTarget.materiaId,
        alunnoId: uploadTarget.alunnoId ?? undefined,
      });
      toast.success("Documento caricato con successo.");
      await loadTab(activeTab);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel caricamento del file.");
    } finally {
      setUploading(false);
      setUploadTarget(null);
    }
  };

  const handleDelete = async (doc: DocumentoInfo) => {
    if (!token) return;
    try {
      await api.documenti.delete(token, doc.id);
      toast.success("Documento eliminato.");
      await loadTab(activeTab);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nell'eliminazione.");
    }
  };

  const slots = slotData[activeTab] ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Documenti didattici</h1>
        <p className="text-muted-foreground">
          Gestione piani di lavoro, programmi svolti, relazioni finali e documenti BES.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.odt,.rtf"
        onChange={(e) => void handleFileChange(e)}
      />

      {uploading && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <CardDescription>Caricamento in corso...</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList>
          {(["piani", "programmi", "relazioni", "maggio"] as TabKey[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {TAB_LABELS[t]}
            </TabsTrigger>
          ))}
          {canSeeBes && <TabsTrigger value="bes">{TAB_LABELS.bes}</TabsTrigger>}
        </TabsList>

        {(["piani", "programmi", "relazioni", "maggio"] as TabKey[]).map((tab) => (
          <TabsContent key={tab} value={tab} className="pt-4">
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : slots.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Nessun risultato</CardTitle>
                  <CardDescription>Nessuna cattedra trovata per questa tipologia.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Classe</TableHead>
                        {tab !== "maggio" && <TableHead>Materia</TableHead>}
                        {tab === "relazioni" && <TableHead>Alunno</TableHead>}
                        <TableHead>Sede</TableHead>
                        <TableHead>Documento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slots.map((slot, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{slot.classeName}</TableCell>
                          {tab !== "maggio" && (
                            <TableCell>{slot.materiaNome ?? "—"}</TableCell>
                          )}
                          {tab === "relazioni" && (
                            <TableCell className="text-sm text-muted-foreground">
                              {slot.alunnoName ?? "—"}
                            </TableCell>
                          )}
                          <TableCell className="text-sm text-muted-foreground">
                            {slot.sedeNome}
                          </TableCell>
                          <TableCell>
                            <DocumentoCell
                              slot={slot}
                              tipo={TIPO_MAP[tab]}
                              token={token ?? ""}
                              onUpload={handleUploadClick}
                              onDelete={(doc) => void handleDelete(doc)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}

        {canSeeBes && (
          <TabsContent value="bes" className="pt-4">
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : besData.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Nessun documento BES</CardTitle>
                  <CardDescription>Nessun documento BES trovato per le classi accessibili.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="space-y-4">
                {besData.map((row) => (
                  <Card key={row.alunnoId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{row.alunnoName}</CardTitle>
                      <CardDescription>{row.classeName}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {row.documenti.map((doc) => (
                          <div key={doc.id} className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm">
                            <Badge variant="outline" className="mr-1 text-xs">
                              {doc.tipo === "B" ? "Diagnosi" : doc.tipo === "H" ? "PEI" : doc.tipo === "D" ? "PDP" : "Cert."}
                            </Badge>
                            {doc.allegati.map((a) => (
                              <Button
                                key={a.id}
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => void api.documenti.download(token ?? "", doc.id, "open")}
                              >
                                <Download className="mr-1 h-3 w-3" />
                                {a.estensione.toUpperCase()}
                              </Button>
                            ))}
                            {doc.canDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                                onClick={() => void handleDelete(doc)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
