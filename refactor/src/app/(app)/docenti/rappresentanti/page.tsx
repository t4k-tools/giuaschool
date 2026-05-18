"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type Docente } from "@/lib/api/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

type DocenteRappresentante = Docente & { rappresentante: string[] };

const TIPI_RAPPRESENTANTE = [
  { value: "I", label: "Istituto" },
  { value: "P", label: "Provinciale" },
  { value: "R", label: "RSU" },
] as const;

function getBadgeVariant(tipo: string) {
  switch (tipo) {
    case "I":
      return "default" as const;
    case "P":
      return "secondary" as const;
    case "R":
      return "outline" as const;
    default:
      return "outline" as const;
  }
}

function getTipoLabel(tipo: string) {
  return TIPI_RAPPRESENTANTE.find((t) => t.value === tipo)?.label ?? tipo;
}

export default function RappresentantiPage() {
  const { token } = useAuth();
  const [docenti, setDocenti] = useState<DocenteRappresentante[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editDocente, setEditDocente] = useState<DocenteRappresentante | null>(
    null,
  );
  const [editTipi, setEditTipi] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.docenti.rappresentanti(token);
      setDocenti(res.data);
    } catch {
      toast.error("Errore nel caricamento dei rappresentanti");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (docente: DocenteRappresentante) => {
    setEditDocente(docente);
    setEditTipi([...docente.rappresentante]);
    setEditOpen(true);
  };

  const handleToggleTipo = (tipo: string) => {
    setEditTipi((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    );
  };

  const handleSave = async () => {
    if (!token || !editDocente) return;
    setSaving(true);
    try {
      const res = await api.docenti.setRappresentante(
        token,
        editDocente.id,
        editTipi,
      );
      toast.success(res.message);
      if (editTipi.length === 0) {
        setDocenti((prev) => prev.filter((d) => d.id !== editDocente.id));
      } else {
        setDocenti((prev) =>
          prev.map((d) =>
            d.id === editDocente.id
              ? { ...d, rappresentante: editTipi }
              : d,
          ),
        );
      }
      setEditOpen(false);
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const filtered = search
    ? docenti.filter(
        (d) =>
          d.cognome.toLowerCase().includes(search.toLowerCase()) ||
          d.nome.toLowerCase().includes(search.toLowerCase()),
      )
    : docenti;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Rappresentanti Docenti
        </h1>
        <p className="text-muted-foreground">
          Gestisci i docenti rappresentanti (Istituto, Provinciale, RSU)
        </p>
      </div>

      <div className="flex gap-2 max-w-sm">
        <Input
          placeholder="Filtra per cognome o nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cognome</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo Rappresentante</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nessun rappresentante trovato.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.cognome}</TableCell>
                  <TableCell>{d.nome}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {d.rappresentante.map((tipo) => (
                        <Badge key={tipo} variant={getBadgeVariant(tipo)}>
                          {getTipoLabel(tipo)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(d)}
                      title="Modifica rappresentanza"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Modifica Rappresentanza
            </DialogTitle>
            <DialogDescription>
              {editDocente
                ? `${editDocente.cognome} ${editDocente.nome}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {TIPI_RAPPRESENTANTE.map((tipo) => (
              <div key={tipo.value} className="flex items-center gap-3">
                <Checkbox
                  id={`tipo-${tipo.value}`}
                  checked={editTipi.includes(tipo.value)}
                  onCheckedChange={() => handleToggleTipo(tipo.value)}
                />
                <Label htmlFor={`tipo-${tipo.value}`} className="cursor-pointer">
                  {tipo.label}
                </Label>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Salva"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
