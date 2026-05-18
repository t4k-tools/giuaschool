"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type Alunno, type ClasseInfo } from "@/lib/api/client";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AlunniClassePage() {
  const { token } = useAuth();
  const [alunni, setAlunni] = useState<Alunno[]>([]);
  const [classi, setClassi] = useState<ClasseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClasse, setFilterClasse] = useState<string>("all");
  const [savingId, setSavingId] = useState<number | null>(null);

  // Load classi for filter and select
  useEffect(() => {
    if (!token) return;
    api.classi.list(token, { limit: 100 }).then((res) => setClassi(res.data)).catch(() => {});
  }, [token]);

  const fetchAlunni = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: { search?: string; classe?: number; limit: number } = { limit: 100 };
      if (search) params.search = search;
      if (filterClasse !== "all" && filterClasse !== "unassigned") {
        params.classe = Number(filterClasse);
      }
      const res = await api.alunni.list(token, params);
      let data = res.data;
      // Client-side filter for unassigned
      if (filterClasse === "unassigned") {
        data = data.filter((a) => !a.classe);
      }
      setAlunni(data);
    } catch {
      toast.error("Errore nel caricamento degli alunni");
    } finally {
      setLoading(false);
    }
  }, [token, search, filterClasse]);

  useEffect(() => {
    fetchAlunni();
  }, [fetchAlunni]);

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleCambioClasse = async (alunno: Alunno, classeId: string) => {
    if (!token) return;
    setSavingId(alunno.id);
    try {
      const newClasseId = classeId === "none" ? null : Number(classeId);
      await api.alunni.cambioClasse(token, alunno.id, newClasseId);
      const classeName = newClasseId
        ? classi.find((c) => c.id === newClasseId)?.nome
        : "nessuna classe";
      toast.success(`${alunno.cognome} ${alunno.nome} assegnato a ${classeName}`);
      fetchAlunni();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel cambio classe");
    } finally {
      setSavingId(null);
    }
  };

  const columns: Column<Alunno>[] = [
    {
      key: "cognome",
      header: "Cognome",
      render: (a) => <span className="font-medium">{a.cognome}</span>,
    },
    { key: "nome", header: "Nome" },
    {
      key: "classe",
      header: "Classe attuale",
      render: (a) =>
        a.classe ? (
          <Badge variant="outline">{a.classe.nome}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Non assegnato</span>
        ),
    },
    {
      key: "cambioClasse",
      header: "Nuova classe",
      render: (a) => (
        <div className="flex items-center gap-2">
          {savingId === a.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Select
              value={a.classe ? String(a.classe.id) : "none"}
              onValueChange={(v) => handleCambioClasse(a, v)}
            >
              <SelectTrigger className="w-[160px] h-8">
                <ArrowRightLeft className="mr-1 h-3 w-3" />
                <SelectValue placeholder="Seleziona classe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessuna classe</SelectItem>
                {classi.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assegnazione Classi</h1>
        <p className="text-muted-foreground">
          Assegna gli alunni alle classi dell&apos;istituto
        </p>
      </div>

      <DataTable
        columns={columns}
        data={alunni}
        loading={loading}
        searchPlaceholder="Cerca per cognome, nome..."
        searchValue={search}
        onSearchChange={handleSearch}
        emptyMessage="Nessun alunno trovato."
        actions={
          <Select
            value={filterClasse}
            onValueChange={(v) => setFilterClasse(v)}
          >
            <SelectTrigger className="w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtra classe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le classi</SelectItem>
              <SelectItem value="unassigned">Non assegnati</SelectItem>
              {classi.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
}
