"use client";

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

export default function ImportaAlunniPage() {
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
      const data = await api.import.alunni(token, file, filtro);
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importa Alunni</h1>
        <p className="text-muted-foreground">
          Importa gli alunni da un file CSV
        </p>
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
              Il file CSV deve utilizzare il punto e virgola come separatore
              e contenere le seguenti colonne nell&apos;ordine indicato.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="rounded-md border">
                <div className="grid grid-cols-[auto_1fr] text-sm">
                  {[
                    { campo: "cognome", desc: "Cognome dell'alunno" },
                    { campo: "nome", desc: "Nome dell'alunno" },
                    { campo: "sesso", desc: "M oppure F" },
                    { campo: "dataNascita", desc: "Formato GG/MM/AAAA" },
                    { campo: "comuneNascita", desc: "Comune di nascita" },
                    { campo: "codiceFiscale", desc: "Codice fiscale (16 caratteri)" },
                    { campo: "classe", desc: "Nome della classe (es. 1A, 2B)" },
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
                Rossi;Mario;M;15/03/2010;Roma;RSSMRA10C15H501Z;1A{"\n"}
                Bianchi;Laura;F;22/07/2010;Milano;BNCLRA10L62F205K;1A{"\n"}
                Verdi;Luca;M;03/11/2009;Napoli;VRDLCU09S03F839P;2B
              </code>
            </div>

            <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Note:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Il file non deve contenere una riga di intestazione</li>
                  <li>La codifica del file deve essere UTF-8</li>
                  <li>Le classi specificate devono gi&agrave; esistere nel sistema</li>
                  <li>Gli alunni duplicati (stesso codice fiscale) verranno aggiornati</li>
                </ul>
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
