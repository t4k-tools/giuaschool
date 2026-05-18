import { SectionHub } from "@/components/layout/section-hub";

const items = [
  {
    href: "/docenti/modifica",
    title: "Anagrafica docenti",
    description: "Crea, modifica e abilita i profili dei docenti dell'istituto.",
    badge: "Operativo",
  },
  {
    href: "/docenti/importa",
    title: "Importazione docenti",
    description: "Carica massivamente i docenti da file CSV.",
  },
  {
    href: "/docenti/cattedre",
    title: "Cattedre",
    description: "Assegna docenti, materie e classi alle cattedre attive.",
  },
  {
    href: "/docenti/coordinatori",
    title: "Coordinatori",
    description: "Definisci il coordinatore per ogni classe.",
  },
  {
    href: "/docenti/segretari",
    title: "Segretari",
    description: "Associa il segretario del consiglio di classe.",
  },
  {
    href: "/docenti/staff",
    title: "Staff",
    description: "Gestisci i docenti che fanno parte dello staff di dirigenza.",
  },
  {
    href: "/docenti/responsabiliBes",
    title: "Responsabili BES",
    description: "Configura i referenti BES e la sede di competenza.",
  },
  {
    href: "/docenti/rspp",
    title: "RSPP",
    description: "Gestisci i docenti incaricati della sicurezza.",
  },
  {
    href: "/docenti/rappresentanti",
    title: "Rappresentanti docenti",
    description: "Assegna i ruoli di rappresentanza al personale docente.",
  },
];

export default function DocentiPage() {
  return (
    <SectionHub
      eyebrow="Docenti"
      title="Gestione area docenti"
      description="Punto di accesso rapido alle funzioni principali dedicate ai docenti: anagrafica, incarichi, importazioni e ruoli."
      quickActions={[
        { href: "/docenti/modifica?new=1", label: "Nuovo docente" },
        { href: "/docenti/cattedre?new=1", label: "Nuova cattedra" },
      ]}
      items={items}
    />
  );
}
