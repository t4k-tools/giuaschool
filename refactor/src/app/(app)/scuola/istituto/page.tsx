"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type IstitutoDetail } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { School, Pencil, PlusCircle, ImageIcon, Save } from "lucide-react";
import { toast } from "sonner";

/** Ensure URLs always have a protocol prefix */
const ensureProtocol = (url: string) => {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
};

// Fields shown in read-only card view (label → key)
const VIEW_FIELDS: { key: keyof IstitutoDetail; label: string; url?: boolean }[] = [
  { key: "codiceMeccanografico", label: "Cod. Meccanografico" },
  { key: "tipo", label: "Tipo Istituto" },
  { key: "tipoSigla", label: "Sigla" },
  { key: "nomeBreve", label: "Nome Breve" },
  { key: "indirizzo", label: "Indirizzo" },
  { key: "cap", label: "CAP" },
  { key: "citta", label: "Città" },
  { key: "provincia", label: "Provincia" },
  { key: "telefono", label: "Telefono" },
  { key: "email", label: "Email" },
  { key: "pec", label: "PEC" },
  { key: "urlSito", label: "Sito Web", url: true },
  { key: "urlRegistro", label: "URL Registro", url: true },
  { key: "emailAmministratore", label: "Email Amministratore" },
  { key: "emailNotifiche", label: "Email Notifiche" },
  { key: "firmaPreside", label: "Firma Preside" },
];

const EMPTY_FORM: Record<string, string> = {
  codiceMeccanografico: "",
  tipo: "",
  tipoSigla: "",
  nome: "",
  nomeBreve: "",
  indirizzo: "",
  cap: "",
  citta: "",
  provincia: "",
  telefono: "",
  email: "",
  pec: "",
  urlSito: "",
  urlRegistro: "",
  firmaPreside: "",
  emailAmministratore: "",
  emailNotifiche: "",
  logoUrl: "",
};

export default function IstitutoPage() {
  const { token } = useAuth();
  const [istituto, setIstituto] = useState<IstitutoDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchIstituto = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.scuola.istituto(token);
      setIstituto(res.data);
    } catch {
      toast.error("Errore nel caricamento dei dati dell'istituto");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchIstituto();
  }, [fetchIstituto]);

  const openDialog = () => {
    if (istituto) {
      setFormData({
        codiceMeccanografico: istituto.codiceMeccanografico ?? "",
        tipo: istituto.tipo ?? "",
        tipoSigla: istituto.tipoSigla ?? "",
        nome: istituto.nome ?? "",
        nomeBreve: istituto.nomeBreve ?? "",
        indirizzo: istituto.indirizzo ?? "",
        cap: istituto.cap ?? "",
        citta: istituto.citta ?? "",
        provincia: istituto.provincia ?? "",
        telefono: istituto.telefono ?? "",
        email: istituto.email ?? "",
        pec: istituto.pec ?? "",
        urlSito: istituto.urlSito ?? "",
        urlRegistro: istituto.urlRegistro ?? "",
        firmaPreside: istituto.firmaPreside ?? "",
        emailAmministratore: istituto.emailAmministratore ?? "",
        emailNotifiche: istituto.emailNotifiche ?? "",
        logoUrl: istituto.logoUrl ?? "",
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await api.scuola.updateIstituto(token, {
        ...formData,
        logoUrl: formData.logoUrl || null,
        indirizzo: formData.indirizzo || null,
        cap: formData.cap || null,
        citta: formData.citta || null,
        provincia: formData.provincia || null,
        telefono: formData.telefono || null,
        codiceMeccanografico: formData.codiceMeccanografico || null,
      });
      toast.success(istituto ? "Dati istituto aggiornati" : "Istituto creato con successo");
      setEditOpen(false);
      fetchIstituto();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const field = (id: string, label: string, opts?: { type?: string; placeholder?: string; maxLength?: number }) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={opts?.type ?? "text"}
        value={formData[id] ?? ""}
        onChange={(e) => setFormData({ ...formData, [id]: e.target.value })}
        placeholder={opts?.placeholder}
        maxLength={opts?.maxLength}
      />
    </div>
  );

  const logoUrl = formData.logoUrl ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Istituto</h1>
        <p className="text-muted-foreground">
          Informazioni dell&apos;istituto scolastico
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {istituto?.logoUrl ? (
                  <div className="h-12 w-12 rounded-lg overflow-hidden border shrink-0 bg-white flex items-center justify-center">
                    <img
                      src={istituto.logoUrl}
                      alt="Logo istituto"
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <School className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <CardTitle>
                    {istituto
                      ? istituto.tipoSigla
                        ? `${istituto.tipoSigla} ${istituto.nomeBreve}`
                        : istituto.nomeBreve || istituto.nome || "Istituto"
                      : "Nessun istituto configurato"}
                  </CardTitle>
                  {istituto?.codiceMeccanografico && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cod. {istituto.codiceMeccanografico}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant={istituto ? "outline" : "default"}
                size="sm"
                onClick={openDialog}
              >
                {istituto ? (
                  <>
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifica
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Inserisci
                  </>
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {istituto ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                {VIEW_FIELDS.filter((f) => istituto[f.key]).map((f) => (
                  <div key={f.key} className="space-y-0.5">
                    <dt className="text-xs text-muted-foreground">{f.label}</dt>
                    <dd className="text-sm font-medium break-all">
                      {f.url ? (
                        <a
                          href={ensureProtocol(String(istituto[f.key]))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {String(istituto[f.key])}
                        </a>
                      ) : (
                        String(istituto[f.key])
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nessun dato inserito. Clicca &quot;Inserisci&quot; per configurare l&apos;istituto.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit / Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {istituto ? "Modifica Istituto" : "Inserisci Istituto"}
            </DialogTitle>
            <DialogDescription>
              {istituto
                ? "Modifica i dati dell'istituto scolastico."
                : "Inserisci i dati dell'istituto scolastico."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">

            {/* Identificazione */}
            <div className="grid grid-cols-2 gap-4">
              {field("codiceMeccanografico", "Cod. Meccanografico", { placeholder: "CAIS...", maxLength: 16 })}
              {field("tipoSigla", "Sigla Tipo", { placeholder: "I.I.S.", maxLength: 16 })}
            </div>

            {field("tipo", "Tipo Istituto", { placeholder: "Istituto di Istruzione Superiore" })}

            <div className="grid grid-cols-2 gap-4">
              {field("nome", "Nome Istituto")}
              {field("nomeBreve", "Nome Breve", { maxLength: 32 })}
            </div>

            {/* Indirizzo */}
            {field("indirizzo", "Indirizzo", { placeholder: "Via Roma, 1" })}

            <div className="grid grid-cols-3 gap-4">
              {field("cap", "CAP", { placeholder: "09100", maxLength: 10 })}
              {field("citta", "Città", { placeholder: "Cagliari" })}
              {field("provincia", "Prov.", { placeholder: "CA", maxLength: 2 })}
            </div>

            {field("telefono", "Telefono", { type: "tel", placeholder: "070 000000" })}

            {/* Contatti */}
            <div className="grid grid-cols-2 gap-4">
              {field("email", "Email Istituto", { type: "email" })}
              {field("pec", "PEC", { type: "email" })}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {field("urlSito", "Sito Web", { type: "url", placeholder: "https://" })}
              {field("urlRegistro", "URL Registro", { type: "url", placeholder: "https://" })}
            </div>

            {field("firmaPreside", "Firma Preside", { placeholder: "Il Dirigente Scolastico" })}

            <div className="grid grid-cols-2 gap-4">
              {field("emailAmministratore", "Email Amministratore", { type: "email" })}
              {field("emailNotifiche", "Email Notifiche", { type: "email" })}
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo (URL)</Label>
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 rounded-lg border overflow-hidden bg-muted flex items-center justify-center"
                  style={{ width: 76, height: 76 }}
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Anteprima logo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <Input
                    id="logoUrl"
                    type="url"
                    value={logoUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, logoUrl: e.target.value })
                    }
                    placeholder="https://esempio.com/logo.png"
                  />
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG o SVG del logo dell&apos;istituto
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvataggio..." : istituto ? "Salva" : "Inserisci"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
