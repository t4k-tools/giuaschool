"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CalendarPlus,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
} from "lucide-react";

const prerequisites = [
  {
    label: "Archiviazione dell'anno precedente completata",
    description:
      "Tutti i dati dell'anno corrente devono essere stati archiviati",
  },
  {
    label: "Definizione date nuovo anno scolastico",
    description: "Data di inizio e fine del nuovo anno scolastico",
  },
  {
    label: "Configurazione periodi di valutazione",
    description: "Trimestri, quadrimestri e relative date degli scrutini",
  },
  {
    label: "Predisposizione struttura classi",
    description:
      "Definizione delle classi, sezioni e corsi per il nuovo anno",
  },
];

export default function NuovoAnnoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Inizializzazione Nuovo Anno Scolastico
        </h1>
        <p className="text-muted-foreground">
          Procedura di inizializzazione per il nuovo anno scolastico
        </p>
      </div>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Informazioni sulla procedura
          </CardTitle>
          <CardDescription>
            Cosa comporta l&apos;inizializzazione del nuovo anno
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            L&apos;inizializzazione del nuovo anno scolastico prepara il
            sistema per l&apos;avvio delle attività didattiche. La procedura
            comprende:
          </p>
          <ul className="space-y-1.5 ml-1">
            {[
              "Aggiornamento delle date dell'anno scolastico",
              "Configurazione dei periodi di valutazione e degli scrutini",
              "Predisposizione delle classi e delle sezioni",
              "Reset dei registri e dei dati temporanei",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="font-medium text-foreground">
            Attenzione: assicurarsi di aver completato l&apos;archiviazione
            dell&apos;anno precedente prima di procedere con
            l&apos;inizializzazione.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/scuola/istituto">Configura anno scolastico</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/scuola/classi">Controlla classi</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/scuola/scrutini">Controlla scrutini</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prerequisites checklist card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Prerequisiti
          </CardTitle>
          <CardDescription>
            Verificare che tutte le condizioni siano soddisfatte prima di
            procedere
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {prerequisites.map((item) => (
              <div key={item.label} className="flex gap-3 items-start">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-muted-foreground/25 mt-0.5">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground/50" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium leading-none">
                    {item.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Coming soon card */}
      <Card className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Clock className="h-5 w-5" />
            Prossimamente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Questa funzionalità sarà disponibile nella prossima versione.
              Per ora, l&apos;inizializzazione del nuovo anno deve essere
              eseguita tramite il comando da terminale.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
