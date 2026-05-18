import { SectionHub } from "@/components/layout/section-hub";

const items = [
  {
    href: "/scuola/istituto",
    title: "Istituto",
    description: "Configura i dati generali dell'istituto.",
    badge: "Configurazione",
  },
  {
    href: "/scuola/dirigente",
    title: "Dirigente",
    description: "Aggiorna i dati del dirigente scolastico.",
  },
  {
    href: "/scuola/amministratore",
    title: "Amministratore",
    description: "Gestisci il profilo dell'amministratore di sistema.",
  },
  {
    href: "/scuola/sedi",
    title: "Sedi",
    description: "Definisci le sedi e i relativi riferimenti.",
  },
  {
    href: "/scuola/classi",
    title: "Classi",
    description: "Crea e modifica classi, sezioni e associazioni di corso.",
  },
  {
    href: "/scuola/corsi",
    title: "Corsi",
    description: "Gestisci i corsi e i relativi nomi brevi.",
  },
  {
    href: "/scuola/materie",
    title: "Materie",
    description: "Configura le materie e le impostazioni di valutazione.",
  },
  {
    href: "/scuola/festivita",
    title: "Festività",
    description: "Imposta il calendario delle festività per sede.",
  },
  {
    href: "/scuola/orario",
    title: "Orario",
    description: "Gestisci orari, scansioni e lezioni.",
  },
  {
    href: "/scuola/scrutini",
    title: "Scrutini",
    description: "Definisci le finestre di scrutinio e le relative configurazioni.",
  },
  {
    href: "/scuola/moduli",
    title: "Moduli",
    description: "Configura i moduli disponibili per l'istituto.",
  },
];

export default function ScuolaPage() {
  return (
    <SectionHub
      eyebrow="Scuola"
      title="Configurazione area scuola"
      description="Sezione centrale per la configurazione strutturale dell'istituto: anagrafiche, calendario, classi, orari e moduli."
      quickActions={[
        { href: "/scuola/sedi?new=1", label: "Nuova sede" },
        { href: "/scuola/classi?new=1", label: "Nuova classe" },
        { href: "/scuola/corsi?new=1", label: "Nuovo corso" },
      ]}
      items={items}
    />
  );
}
