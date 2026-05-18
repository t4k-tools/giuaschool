"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import {
  api,
  type SegretarioInfo,
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

export default function SegretariPage() {
  const { token } = useAuth();
  const [segretari, setSegretari] = useState<SegretarioInfo[]>([]);
  const [docentiOptions, setDocentiOptions] = useState<DocenteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [segRes, optRes] = await Promise.all([
        api.docenti.segretari(token),
        api.docenti.options(token),
      ]);
      setSegretari(segRes.data);
      setDocentiOptions(optRes.data);
    } catch {
      toast.error("Errore nel caricamento dei segretari");
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
      const res = await api.docenti.setSegretario(token, classeId, docenteId);
      toast.success(res.message);
      setSegretari((prev) =>
        prev.map((s) => {
          if (s.classe.id !== classeId) return s;
          const docente = docenteId
            ? docentiOptions.find((d) => d.id === docenteId)
            : null;
          return {
            ...s,
            segretario: docente
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
      toast.error("Errore nel salvataggio del segretario");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Segretari</h1>
        <p className="text-muted-foreground">
          Assegna un segretario di classe a ciascuna classe
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Classe</TableHead>
              <TableHead>Segretario</TableHead>
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
            ) : segretari.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nessuna classe trovata.
                </TableCell>
              </TableRow>
            ) : (
              segretari.map((s) => (
                <TableRow key={s.classe.id}>
                  <TableCell className="font-medium">{s.classe.nome}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={
                          s.segretario ? String(s.segretario.id) : "none"
                        }
                        onValueChange={(v) => handleChange(s.classe.id, v)}
                        disabled={saving === s.classe.id}
                      >
                        <SelectTrigger className="w-[300px]">
                          <SelectValue placeholder="Seleziona segretario" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            -- Nessun segretario --
                          </SelectItem>
                          {docentiOptions.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {saving === s.classe.id && (
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
