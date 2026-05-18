"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type RappresentanteGenitore } from "@/lib/api/client";
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

const RUOLI_RAPPRESENTANTE: Record<string, string> = {
  L: "Rappresentante classe genitori",
  I: "Istituto",
};

export default function RappresentantiGenitoriPage() {
  const { token } = useAuth();
  const [genitori, setGenitori] = useState<RappresentanteGenitore[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editGenitore, setEditGenitore] = useState<RappresentanteGenitore | null>(null);
  const [selectedRuoli, setSelectedRuoli] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.alunni.rappresentantiGenitori(token);
      setGenitori(res.data);
    } catch {
      toast.error("Errore nel caricamento dei rappresentanti genitori");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (genitore: RappresentanteGenitore) => {
    setEditGenitore(genitore);
    setSelectedRuoli([...genitore.rappresentante]);
    setEditOpen(true);
  };

  const handleToggleRuolo = (ruolo: string) => {
    setSelectedRuoli((prev) =>
      prev.includes(ruolo) ? prev.filter((r) => r !== ruolo) : [...prev, ruolo],
    );
  };

  const handleSave = async () => {
    if (!token || !editGenitore) return;
    setSaving(true);
    try {
      await api.alunni.setRappresentanteGenitore(token, editGenitore.id, selectedRuoli);
      toast.success("Ruoli rappresentante aggiornati");
      setEditOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<RappresentanteGenitore>[] = [
    {
      key: "genitore",
      header: "Genitore",
      render: (g) => (
        <span className="font-medium">
          {g.cognome} {g.nome}
        </span>
      ),
    },
    {
      key: "alunno",
      header: "Alunno",
      render: (g) =>
        g.alunno ? (
          <span>
            {g.alunno.cognome} {g.alunno.nome}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">--</span>
        ),
    },
    {
      key: "classe",
      header: "Classe",
      render: (g) =>
        g.alunno?.classe ? (
          <Badge variant="outline">{g.alunno.classe.nome}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">--</span>
        ),
    },
    {
      key: "rappresentante",
      header: "Ruoli",
      render: (g) => (
        <div className="flex flex-wrap gap-1">
          {g.rappresentante.length > 0 ? (
            g.rappresentante.map((r) => (
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
      render: (g) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(g);
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
        <h1 className="text-2xl font-bold tracking-tight">Rappresentanti Genitori</h1>
        <p className="text-muted-foreground">
          Gestisci i ruoli di rappresentante dei genitori
        </p>
      </div>

      <DataTable
        columns={columns}
        data={genitori}
        loading={loading}
        emptyMessage="Nessun rappresentante genitore trovato."
        onRowClick={(g) => handleEdit(g)}
      />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editGenitore
                ? `Rappresentante: ${editGenitore.cognome} ${editGenitore.nome}`
                : "Modifica rappresentante"}
            </DialogTitle>
            <DialogDescription>
              Seleziona i ruoli di rappresentante per il genitore.
              {editGenitore?.alunno && (
                <span className="block mt-1">
                  Genitore di:{" "}
                  <strong>
                    {editGenitore.alunno.cognome} {editGenitore.alunno.nome}
                  </strong>
                  {editGenitore.alunno.classe && (
                    <> - Classe: <strong>{editGenitore.alunno.classe.nome}</strong></>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Label className="text-sm font-medium">Ruoli rappresentante</Label>
            {Object.entries(RUOLI_RAPPRESENTANTE).map(([key, label]) => (
              <div key={key} className="flex items-center space-x-3">
                <Checkbox
                  id={`ruolo-gen-${key}`}
                  checked={selectedRuoli.includes(key)}
                  onCheckedChange={() => handleToggleRuolo(key)}
                />
                <Label htmlFor={`ruolo-gen-${key}`} className="cursor-pointer">
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
