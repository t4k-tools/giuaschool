"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type Docente } from "@/lib/api/client";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function StaffPage() {
  const { token } = useAuth();
  const [staff, setStaff] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchStaff = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.docenti.staff(token, { search });
      setStaff(res.data);
    } catch {
      toast.error("Errore nel caricamento dello staff");
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const columns: Column<Docente>[] = [
    {
      key: "cognome",
      header: "Cognome",
      render: (d) => <span className="font-medium">{d.cognome}</span>,
    },
    { key: "nome", header: "Nome" },
    {
      key: "username",
      header: "Username",
      className: "hidden md:table-cell",
    },
    {
      key: "email",
      header: "Email",
      className: "hidden lg:table-cell",
    },
    {
      key: "abilitato",
      header: "Stato",
      render: (d) => (
        <Badge variant={d.abilitato ? "default" : "destructive"}>
          {d.abilitato ? "Attivo" : "Disabilitato"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
        <p className="text-muted-foreground">
          Elenco dei membri dello staff dell&apos;istituto
        </p>
      </div>

      <DataTable
        columns={columns}
        data={staff}
        loading={loading}
        searchPlaceholder="Cerca per cognome, nome, username..."
        searchValue={search}
        onSearchChange={handleSearch}
        emptyMessage="Nessun membro dello staff trovato."
      />
    </div>
  );
}
