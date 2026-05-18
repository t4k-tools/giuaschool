"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type AtaInfo } from "@/lib/api/client";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Users } from "lucide-react";
import { toast } from "sonner";

type AtaRappresentante = AtaInfo & { rappresentante: string[] };

const RAPPRESENTANTE_LABELS: Record<string, string> = {
  I: "Istituto",
  R: "RSU",
};

export default function AtaRappresentantiPage() {
  const { token } = useAuth();
  const [ataList, setAtaList] = useState<AtaRappresentante[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editAta, setEditAta] = useState<AtaRappresentante | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchRappresentanti = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.ata.rappresentanti(token);
      setAtaList(res.data);
    } catch {
      toast.error("Errore nel caricamento dei rappresentanti ATA");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRappresentanti(); }, [fetchRappresentanti]);

  const handleEdit = (ata: AtaRappresentante) => {
    setEditAta(ata);
    setSelectedRoles([...ata.rappresentante]);
    setEditOpen(true);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    if (!token || !editAta) return;
    setSaving(true);
    try {
      await api.ata.setRappresentante(token, editAta.id, selectedRoles);
      toast.success("Ruoli rappresentante aggiornati con successo");
      setEditOpen(false);
      fetchRappresentanti();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rappresentanti ATA</h1>
        <p className="text-muted-foreground">Gestisci i ruoli di rappresentanza del personale ATA</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cognome</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Tipo</TableHead>
              <TableHead>Ruoli Rappresentante</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : ataList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nessun rappresentante ATA trovato.
                </TableCell>
              </TableRow>
            ) : (
              ataList.map((ata) => (
                <TableRow
                  key={ata.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleEdit(ata)}
                >
                  <TableCell className="font-medium">{ata.cognome}</TableCell>
                  <TableCell>{ata.nome}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">{ata.tipoLabel}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {ata.rappresentante.length > 0 ? (
                        ata.rappresentante.map((r) => (
                          <Badge key={r} variant="default">
                            {RAPPRESENTANTE_LABELS[r] || r}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">&mdash;</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); handleEdit(ata); }}
                      title="Modifica ruoli"
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

      {/* Edit Rappresentante Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Ruoli Rappresentante
              </div>
            </DialogTitle>
            <DialogDescription>
              {editAta ? `${editAta.cognome} ${editAta.nome} - ${editAta.tipoLabel}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {Object.entries(RAPPRESENTANTE_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-3">
                <Switch
                  id={`role-${key}`}
                  checked={selectedRoles.includes(key)}
                  onCheckedChange={() => toggleRole(key)}
                />
                <Label htmlFor={`role-${key}`} className="flex-1">
                  {label}
                </Label>
                <Badge variant={selectedRoles.includes(key) ? "default" : "outline"}>
                  {key}
                </Badge>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
