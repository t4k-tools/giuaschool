"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth/context";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileSpreadsheet,
  Plus,
  Info,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface ImportResult {
  message: string;
  importati: number;
  aggiornati: number;
  errori: string[];
}

export default function ImportaAtaPage() {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [filtro, setFiltro] = useState("T");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith(".csv")) setFile(droppedFile);
    else toast.error("Seleziona un file CSV valido");
  };

  const handleImport = async () => {
    if (!file || !token) return;
    setUploading(true);
    setResult(null);
    try {
      const data = await api.import.ata(token, file, filtro);
      setResult(data);
      toast.success(data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante l'importazione");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importa Personale ATA</h1>
          <p className="text-muted-foreground">
            Importa il personale ATA da file CSV
          </p>
        </div>
        <Button asChild>
          <Link href="/ata">
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* CSV Format Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Formato CSV
            </CardTitle>
            <CardDescription>
              Il file CSV deve contenere le seguenti colonne separate da punto e
              virgola (<code className="bg-muted px-1 rounded">;</code>).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="rounded-md border">
                <div className="grid grid-cols-[auto_1fr] text-sm">
                  {[
                    { campo: "cognome", desc: "Cognome del dipendente" },
                    { campo: "nome", desc: "Nome del dipendente" },
                    { campo: "sesso", desc: "M oppure F" },
                    { campo: "codiceFiscale", desc: "Codice fiscale (16 caratteri)" },
                    { campo: "username", desc: "Username per l'accesso" },
                    { campo: "email", desc: "Indirizzo email" },
                    {
                      campo: "tipo",
                      desc: "A=Amministrativo, T=Tecnico, C=Collaboratore, U=Autista, D=DSGA",
                    },
                    { campo: "segreteria", desc: "S=Si, N=No" },
                    { campo: "sede", desc: "Nome breve della sede" },
                  ].map((row, i) => (
                    <div key={row.campo} className="contents">
                      <div
                        className={cn(
                          "px-3 py-2 font-mono text-xs font-medium border-r",
                          i > 0 && "border-t"
                        )}
                      >
                        {row.campo}
                      </div>
                      <div
                        className={cn(
                          "px-3 py-2 text-muted-foreground",
                          i > 0 && "border-t"
                        )}
                      >
                        {row.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-md bg-muted p-3">
              <p className="text-xs font-medium mb-1">Esempio:</p>
              <code className="text-xs font-mono block whitespace-pre-wrap break-all">
                Rossi;Mario;M;RSSMRA80A01H501Z;mario.rossi;mario.rossi@scuola.it;A;S;SEDE1{"\n"}
                Bianchi;Anna;F;BNCNNA85B41F205X;anna.bianchi;anna.bianchi@scuola.it;C;N;SEDE1
              </code>
            </div>

            <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Tipi di personale:</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span><Badge variant="secondary">A</Badge> Amministrativo</span>
                  <span><Badge variant="secondary">T</Badge> Tecnico</span>
                  <span><Badge variant="secondary">C</Badge> Collaboratore</span>
                  <span><Badge variant="secondary">U</Badge> Autista</span>
                  <span><Badge variant="secondary">D</Badge> DSGA</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Caricamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50",
                uploading && "opacity-50 pointer-events-none"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Trascina un file CSV qui</p>
              <p className="text-xs text-muted-foreground mt-1">
                oppure clicca per selezionare
              </p>
              {file && (
                <Badge variant="secondary" className="mt-3">
                  {file.name}
                </Badge>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) setFile(e.target.files[0]);
              }}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Filtro importazione</label>
              <Select value={filtro} onValueChange={setFiltro}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="T">Tutti</SelectItem>
                  <SelectItem value="N">Solo nuovi</SelectItem>
                  <SelectItem value="E">Solo esistenti</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              disabled={!file || uploading}
              onClick={handleImport}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {uploading ? "Importazione in corso..." : "Importa"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Risultato importazione
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{result.importati}</p>
                <p className="text-sm text-muted-foreground">Importati</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{result.aggiornati}</p>
                <p className="text-sm text-muted-foreground">Aggiornati</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{result.errori.length}</p>
                <p className="text-sm text-muted-foreground">Errori</p>
              </div>
            </div>

            {result.errori.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Errori riscontrati
                </div>
                <div className="max-h-60 overflow-y-auto rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                  <ul className="space-y-1">
                    {result.errori.map((errore, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300"
                      >
                        <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        {errore}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
