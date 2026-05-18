"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api, type SedeInfo } from "@/lib/api/client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, UserPlus, Users, Upload } from "lucide-react";

type AtaFormState = {
  cognome: string;
  nome: string;
  sesso: string;
  tipo: string;
  username: string;
  email: string;
  password: string;
  codiceFiscale: string;
  dataNascita: string;
  comuneNascita: string;
  provinciaNascita: string;
  citta: string;
  provincia: string;
  indirizzo: string;
  numeriTelefono: string;
  sedeId: string;
  segreteria: boolean;
  abilitato: boolean;
};

const DEFAULT_FORM: AtaFormState = {
  cognome: "",
  nome: "",
  sesso: "M",
  tipo: "A",
  username: "",
  email: "",
  password: "",
  codiceFiscale: "",
  dataNascita: "",
  comuneNascita: "",
  provinciaNascita: "",
  citta: "",
  provincia: "",
  indirizzo: "",
  numeriTelefono: "",
  sedeId: "none",
  segreteria: false,
  abilitato: true,
};

const TIPO_OPTIONS = [
  { value: "A", label: "Amministrativo" },
  { value: "T", label: "Tecnico" },
  { value: "C", label: "Collaboratore scolastico" },
  { value: "U", label: "Autista" },
  { value: "D", label: "DSGA" },
];

export default function AtaPage() {
  const { token } = useAuth();
  const [form, setForm] = useState<AtaFormState>(DEFAULT_FORM);
  const [sedi, setSedi] = useState<SedeInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.sedi
      .list(token)
      .then((res) => setSedi(res.data))
      .catch(() => {
        toast.error("Errore nel caricamento delle sedi");
      });
  }, [token]);

  const selectedTipo = useMemo(
    () => TIPO_OPTIONS.find((option) => option.value === form.tipo)?.label ?? "Personale ATA",
    [form.tipo],
  );

  const updateField = <K extends keyof AtaFormState>(field: K, value: AtaFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!token) return;

    if (!form.cognome.trim() || !form.nome.trim() || !form.username.trim() || !form.email.trim()) {
      toast.error("Compila i campi obbligatori");
      return;
    }

    setSaving(true);
    setGeneratedPassword(null);

    try {
      const payload = {
        cognome: form.cognome.trim(),
        nome: form.nome.trim(),
        sesso: form.sesso,
        tipo: form.tipo,
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password.trim() || undefined,
        codiceFiscale: form.codiceFiscale.trim() || undefined,
        dataNascita: form.dataNascita || undefined,
        comuneNascita: form.comuneNascita.trim() || undefined,
        provinciaNascita: form.provinciaNascita.trim() || undefined,
        citta: form.citta.trim() || undefined,
        provincia: form.provincia.trim() || undefined,
        indirizzo: form.indirizzo.trim() || undefined,
        numeriTelefono: form.numeriTelefono
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
        sedeId: form.sedeId !== "none" ? Number(form.sedeId) : null,
        segreteria: form.segreteria,
        abilitato: form.abilitato,
      };

      const res = await api.ata.create(token, payload);
      if (res.generatedPassword) {
        setGeneratedPassword(res.generatedPassword);
        toast.success(`Personale ATA creato. Password generata: ${res.generatedPassword}`);
      } else {
        toast.success("Personale ATA creato correttamente");
      }
      setForm(DEFAULT_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Personale ATA</Badge>
            <Badge variant="outline">{selectedTipo}</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Inserimento Personale ATA</h1>
          <p className="max-w-3xl text-muted-foreground">
            Inserisci manualmente un nuovo profilo ATA e abilitalo subito alle funzioni del registro.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/ata/modifica">
              <Users className="mr-2 h-4 w-4" />
              Gestisci elenco
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/ata/importa">
              <Upload className="mr-2 h-4 w-4" />
              Importa CSV
            </Link>
          </Button>
        </div>
      </div>

      {generatedPassword && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              Password generata automaticamente
            </CardTitle>
            <CardDescription>
              Comunicala all&apos;utente e chiedi di cambiarla al primo accesso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-background px-4 py-3 font-mono text-sm">
              {generatedPassword}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Nuovo profilo ATA
            </CardTitle>
            <CardDescription>
              I campi con asterisco sono obbligatori. La password può essere lasciata vuota per generarne una casuale.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cognome">Cognome *</Label>
                <Input
                  id="cognome"
                  value={form.cognome}
                  onChange={(e) => updateField("cognome", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => updateField("nome", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="sesso">Sesso *</Label>
                <Select value={form.sesso} onValueChange={(value) => updateField("sesso", value)}>
                  <SelectTrigger id="sesso">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Maschio</SelectItem>
                    <SelectItem value="F">Femmina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tipo">Profilo ATA *</Label>
                <Select value={form.tipo} onValueChange={(value) => updateField("tipo", value)}>
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sede">Sede</Label>
                <Select value={form.sedeId} onValueChange={(value) => updateField("sedeId", value)}>
                  <SelectTrigger id="sede">
                    <SelectValue placeholder="Nessuna sede" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuna sede</SelectItem>
                    {sedi.map((sede) => (
                      <SelectItem key={sede.id} value={String(sede.id)}>
                        {sede.nomeBreve}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => updateField("username", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Password iniziale</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Lascia vuoto per generarla"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codiceFiscale">Codice fiscale</Label>
                <Input
                  id="codiceFiscale"
                  maxLength={16}
                  value={form.codiceFiscale}
                  onChange={(e) => updateField("codiceFiscale", e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="dataNascita">Data di nascita</Label>
                <Input
                  id="dataNascita"
                  type="date"
                  value={form.dataNascita}
                  onChange={(e) => updateField("dataNascita", e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="comuneNascita">Comune di nascita</Label>
                <Input
                  id="comuneNascita"
                  value={form.comuneNascita}
                  onChange={(e) => updateField("comuneNascita", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="provinciaNascita">Provincia di nascita</Label>
                <Input
                  id="provinciaNascita"
                  maxLength={2}
                  value={form.provinciaNascita}
                  onChange={(e) => updateField("provinciaNascita", e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="citta">Città di residenza</Label>
                <Input
                  id="citta"
                  value={form.citta}
                  onChange={(e) => updateField("citta", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="provincia">Provincia</Label>
                <Input
                  id="provincia"
                  maxLength={2}
                  value={form.provincia}
                  onChange={(e) => updateField("provincia", e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="indirizzo">Indirizzo</Label>
                <Input
                  id="indirizzo"
                  value={form.indirizzo}
                  onChange={(e) => updateField("indirizzo", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeriTelefono">Recapiti telefonici</Label>
              <Textarea
                id="numeriTelefono"
                value={form.numeriTelefono}
                onChange={(e) => updateField("numeriTelefono", e.target.value)}
                placeholder={"Un numero per riga\n0701234567\n3331234567"}
                className="min-h-24"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-start gap-3 rounded-lg border p-4">
                <Checkbox
                  checked={form.segreteria}
                  onCheckedChange={(checked) => updateField("segreteria", checked === true)}
                />
                <div className="space-y-1">
                  <span className="text-sm font-medium">Accesso alle funzioni di segreteria</span>
                  <p className="text-sm text-muted-foreground">
                    Consente l&apos;uso delle sezioni riservate al personale amministrativo.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border p-4">
                <Checkbox
                  checked={form.abilitato}
                  onCheckedChange={(checked) => updateField("abilitato", checked === true)}
                />
                <div className="space-y-1">
                  <span className="text-sm font-medium">Utente abilitato all&apos;accesso</span>
                  <p className="text-sm text-muted-foreground">
                    Se disattivato, il profilo viene creato ma resta bloccato fino ad abilitazione manuale.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setForm(DEFAULT_FORM);
                  setGeneratedPassword(null);
                }}
                disabled={saving}
              >
                Svuota form
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                {saving ? "Salvataggio..." : "Crea personale ATA"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Indicazioni operative</CardTitle>
            <CardDescription>
              Dati minimi consigliati per un inserimento corretto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-lg border p-4">
              <p className="font-medium text-foreground">Campi obbligatori</p>
              <p className="mt-2">
                Cognome, nome, sesso, profilo ATA, username ed email. Il resto può essere completato anche in un secondo momento.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-medium text-foreground">Username</p>
              <p className="mt-2">
                Usa una convenzione stabile, ad esempio iniziale del nome + cognome, per semplificare supporto e recupero account.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-medium text-foreground">Password</p>
              <p className="mt-2">
                Se la lasci vuota, il sistema ne genera una casuale e la mostra subito dopo il salvataggio.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-medium text-foreground">Dopo l&apos;inserimento</p>
              <p className="mt-2">
                Puoi aggiornare foto, sede e stato di abilitazione dalla sezione <Link href="/ata/modifica" className="text-primary underline">ATA modifica</Link>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
