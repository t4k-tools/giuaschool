"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type Alunno } from "@/lib/api/client";
import { DataTable, type Column } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

type AlunnoRappresentante = Alunno & { rappresentante: string[] };

const RUOLI_RAPPRESENTANTE: Record<string, string> = {
  S: "Rappresentante di classe alunni",
  I: "Istituto",
};

export default function AlunniRappresentantiPage() {
  const { token } = useAuth();
  const [alunni, setAlunni] = useState<AlunnoRappresentante[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editAlunno, setEditAlunno] = useState<AlunnoRappresentante | null>(null);
  const [selectedRuoli, setSelectedRuoli] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.alunni.rappresentanti(token);
      setAlunni(res.data);
    } catch {
      toast.error("Errore nel caricamento dei rappresentanti");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (alunno: AlunnoRappresentante) => {
    setEditAlunno(alunno);
    setSelectedRuoli([...alunno.rappresentante]);
    setEditOpen(true);
  };

  const handleToggleRuolo = (ruolo: string) => {
    setSelectedRuoli((prev) =>
      prev.includes(ruolo) ? prev.filter((r) => r !== ruolo) : [...prev, ruolo],
    );
  };

  const handleSave = async () => {
    if (!token || !editAlunno) return;
    setSaving(true);
    try {
      await api.alunni.setRappresentante(token, editAlunno.id, selectedRuoli);
      toast.success("Ruoli rappresentante aggiornati");
      setEditOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<AlunnoRappresentante>[] = [
    {
      key: "cognome",
      header: "Cognome",
      render: (a) => <span className="font-medium">{a.cognome}</span>,
    },
    { key: "nome", header: "Nome" },
    {
      key: "classe",
      header: "Classe",
      render: (a) =>
        a.classe ? (
          <Badge variant="outline">{a.classe.nome}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">--</span>
        ),
    },
    {
      key: "rappresentante",
      header: "Ruoli",
      render: (a) => (
        <div className="flex flex-wrap gap-1">
          {a.rappresentante.length > 0 ? (
            a.rappresentante.map((r) => (
              <Badge key={r} variant="secondary">
                {RUOLI_RAPPRESENTANTE[r] || r}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">Nessun ruolo</span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (a) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(a);
          }}
          title="Modifica ruoli"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rappresentanti Alunni</h1>
        <p className="text-muted-foreground">
          Gestisci i ruoli di rappresentante degli alunni
        </p>
      </div>

      <DataTable
        columns={columns}
        data={alunni}
        loading={loading}
        emptyMessage="Nessun rappresentante trovato."
        onRowClick={(a) => handleEdit(a)}
      />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editAlunno
                ? `Rappresentante: ${editAlunno.cognome} ${editAlunno.nome}`
                : "Modifica rappresentante"}
            </DialogTitle>
            <DialogDescription>
              Seleziona i ruoli di rappresentante per l&apos;alunno.
              {editAlunno?.classe && (
                <span className="block mt-1">
                  Classe: <strong>{editAlunno.classe.nome}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Label className="text-sm font-medium">Ruoli rappresentante</Label>
            {Object.entries(RUOLI_RAPPRESENTANTE).map(([key, label]) => (
              <div key={key} className="flex items-center space-x-3">
                <Checkbox
                  id={`ruolo-${key}`}
                  checked={selectedRuoli.includes(key)}
                  onCheckedChange={() => handleToggleRuolo(key)}
                />
                <Label htmlFor={`ruolo-${key}`} className="cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
