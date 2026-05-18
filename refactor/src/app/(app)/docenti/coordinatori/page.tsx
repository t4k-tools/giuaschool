"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import {
  api,
  type CoordinatoreInfo,
  type DocenteOption,
} from "@/lib/api/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CoordinatoriPage() {
  const { token } = useAuth();
  const [coordinatori, setCoordinatori] = useState<CoordinatoreInfo[]>([]);
  const [docentiOptions, setDocentiOptions] = useState<DocenteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [coordRes, optRes] = await Promise.all([
        api.docenti.coordinatori(token),
        api.docenti.options(token),
      ]);
      setCoordinatori(coordRes.data);
      setDocentiOptions(optRes.data);
    } catch {
      toast.error("Errore nel caricamento dei coordinatori");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = async (classeId: number, value: string) => {
    if (!token) return;
    setSaving(classeId);
    try {
      const docenteId = value === "none" ? null : Number(value);
      const res = await api.docenti.setCoordinatore(token, classeId, docenteId);
      toast.success(res.message);
      setCoordinatori((prev) =>
        prev.map((c) => {
          if (c.classe.id !== classeId) return c;
          const docente = docenteId
            ? docentiOptions.find((d) => d.id === docenteId)
            : null;
          return {
            ...c,
            coordinatore: docente
              ? {
                  id: docente.id,
                  cognome: docente.label.split(" ").slice(-1)[0],
                  nome: docente.label.split(" ").slice(0, -1).join(" "),
                }
              : null,
          };
        }),
      );
    } catch {
      toast.error("Errore nel salvataggio del coordinatore");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Coordinatori</h1>
        <p className="text-muted-foreground">
          Assegna un coordinatore di classe a ciascuna classe
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Classe</TableHead>
              <TableHead>Coordinatore</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-9 w-64" />
                  </TableCell>
                </TableRow>
              ))
            ) : coordinatori.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nessuna classe trovata.
                </TableCell>
              </TableRow>
            ) : (
              coordinatori.map((c) => (
                <TableRow key={c.classe.id}>
                  <TableCell className="font-medium">{c.classe.nome}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={
                          c.coordinatore
                            ? String(c.coordinatore.id)
                            : "none"
                        }
                        onValueChange={(v) => handleChange(c.classe.id, v)}
                        disabled={saving === c.classe.id}
                      >
                        <SelectTrigger className="w-[300px]">
                          <SelectValue placeholder="Seleziona coordinatore" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            -- Nessun coordinatore --
                          </SelectItem>
                          {docentiOptions.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {saving === c.classe.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
