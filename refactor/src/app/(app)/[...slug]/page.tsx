"use client";

import { usePathname } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getLegacyBaseUrl } from "@/lib/runtime-config";

// Mappa delle sezioni con descrizioni
const sectionInfo: Record<string, { title: string; description: string }> = {
  "sistema/parametri": { title: "Parametri di Sistema", description: "Configura i parametri generali dell'applicazione" },
  "sistema/banner": { title: "Banner", description: "Gestisci i banner sulle pagine principali" },
  "sistema/manutenzione": { title: "Manutenzione", description: "Imposta la modalità di manutenzione" },
  "sistema/archivia": { title: "Archiviazione", description: "Archivia registri e documenti delle classi" },
  "sistema/nuovo": { title: "Nuovo Anno Scolastico", description: "Passaggio al nuovo anno scolastico" },
  "sistema/aggiorna": { title: "Aggiornamento", description: "Aggiorna l'applicazione" },
  "sistema/email": { title: "Configura Email", description: "Configura il server per l'invio email" },
  "sistema/telegram": { title: "Configura Telegram", description: "Configura le notifiche Telegram" },
  "sistema/alias": { title: "Alias", description: "Assumi l'identità di un altro utente" },
  "sistema/password": { title: "Cambia Password", description: "Cambia la password di un utente" },
  "scuola/amministratore": { title: "Amministratore", description: "Configura i dati dell'amministratore" },
  "scuola/dirigente": { title: "Dirigente Scolastico", description: "Configura i dati del dirigente" },
  "scuola/istituto": { title: "Istituto", description: "Configura i dati dell'istituto" },
  "scuola/sedi": { title: "Sedi", description: "Configura le sedi scolastiche" },
  "scuola/corsi": { title: "Corsi", description: "Configura i corsi di studio" },
  "scuola/materie": { title: "Materie", description: "Configura le materie scolastiche" },
  "scuola/classi": { title: "Classi", description: "Configura le classi" },
  "scuola/festivita": { title: "Festività", description: "Configura il calendario delle festività" },
  "scuola/orario": { title: "Orario", description: "Configura la scansione oraria delle lezioni" },
  "scuola/scrutini": { title: "Scrutini", description: "Configura gli scrutini" },
  "scuola/moduli": { title: "Moduli di Richiesta", description: "Configura i moduli di richiesta" },
  "scuola/moduliFormativi": { title: "Moduli Formativi", description: "Configura i moduli formativi PCTO" },
  "ata/importa": { title: "Importa ATA", description: "Importa da file i dati del personale ATA" },
  "ata/modifica": { title: "Modifica ATA", description: "Modifica i dati del personale ATA" },
  "ata/rappresentanti": { title: "Rappresentanti ATA", description: "Configura i rappresentanti ATA" },
  "docenti/importa": { title: "Importa Docenti", description: "Importa da file i dati dei docenti" },
  "docenti/modifica": { title: "Modifica Docenti", description: "Modifica i dati dei docenti" },
  "docenti/cattedre": { title: "Cattedre", description: "Configura le cattedre dei docenti" },
  "docenti/staff": { title: "Staff", description: "Configura lo staff della dirigenza" },
  "docenti/coordinatori": { title: "Coordinatori", description: "Configura i coordinatori di classe" },
  "docenti/segretari": { title: "Segretari", description: "Configura i segretari di classe" },
  "docenti/responsabiliBes": { title: "Responsabili BES", description: "Configura i responsabili BES" },
  "docenti/rspp": { title: "RSPP", description: "Configura il responsabile sicurezza" },
  "docenti/rappresentanti": { title: "Rappresentanti Docenti", description: "Configura i rappresentanti dei docenti" },
  "alunni/importa": { title: "Importa Alunni", description: "Importa da file i dati degli alunni" },
  "alunni/modifica": { title: "Modifica Alunni", description: "Modifica i dati degli alunni" },
  "alunni/classe": { title: "Cambio Classe", description: "Configura il cambio di classe degli alunni" },
  "alunni/rappresentanti": { title: "Rappresentanti Alunni", description: "Configura i rappresentanti degli alunni" },
  "alunni/rappresentantiGenitori": { title: "Rappresentanti Genitori", description: "Configura i rappresentanti dei genitori" },
};

export default function CatchAllPage() {
  const pathname = usePathname();
  const slug = pathname.replace(/^\//, "");
  const info = sectionInfo[slug];
  const legacyBaseUrl = getLegacyBaseUrl();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {info?.title || slug.replace(/\//g, " > ")}
          </h1>
          {info?.description && (
            <p className="text-muted-foreground">{info.description}</p>
          )}
        </div>
      </div>

      <Card className="border-dashed border-2 border-primary/20">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Pagina in costruzione</CardTitle>
          <CardDescription className="text-base">
            Questa sezione sarà disponibile a breve nel nuovo frontend.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Badge variant="secondary" className="text-sm">
            {slug}
          </Badge>
          <p className="mt-4 text-sm text-muted-foreground">
            Nel frattempo puoi usare il backend legacy su{" "}
            <a
              href={`${legacyBaseUrl}/${slug.replace(/\//g, "_")}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              {legacyBaseUrl}
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
