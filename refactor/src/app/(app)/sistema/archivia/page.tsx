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
  Archive,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
} from "lucide-react";

const steps = [
  {
    number: 1,
    title: "Verifica scrutini",
    description: "Verifica che tutti gli scrutini siano completati",
  },
  {
    number: 2,
    title: "Verifica documenti",
    description: "Verifica che i documenti siano stati pubblicati",
  },
  {
    number: 3,
    title: "Conferma archiviazione",
    description: "Conferma l'archiviazione con doppia verifica",
  },
  {
    number: 4,
    title: "Generazione archivio",
    description:
      "Il sistema genera i PDF dei registri e archivia i dati",
  },
];

export default function ArchiviaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Archiviazione Anno Scolastico
        </h1>
        <p className="text-muted-foreground">
          Procedura di archiviazione dei dati dell&apos;anno scolastico corrente
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
            Cosa comporta l&apos;archiviazione dell&apos;anno scolastico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            L&apos;archiviazione dell&apos;anno scolastico permette di
            conservare tutti i dati relativi all&apos;anno corrente in un
            archivio storico consultabile. I dati archiviati includono:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-1">
            {[
              "Voti e valutazioni",
              "Assenze e ritardi",
              "Registri di classe",
              "Documenti degli scrutini",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="font-medium text-foreground">
            Attenzione: l&apos;archiviazione è un&apos;operazione irreversibile.
            Assicurarsi che tutti i dati siano corretti prima di procedere.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/scuola/scrutini">Controlla scrutini</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/documenti">Controlla documenti</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Steps card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Fasi della procedura
          </CardTitle>
          <CardDescription>
            La procedura di archiviazione si articola in quattro fasi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.number} className="flex gap-4 items-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {step.number}
                </div>
                <div className="space-y-0.5 pt-0.5">
                  <p className="text-sm font-medium leading-none">
                    {step.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
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
              Per ora, l&apos;archiviazione deve essere eseguita tramite il
              comando da terminale.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
