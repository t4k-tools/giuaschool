import { SectionHub } from "@/components/layout/section-hub";

const items = [
  {
    href: "/sistema/parametri",
    title: "Parametri",
    description: "Aggiorna i parametri generali dell'applicazione.",
    badge: "Sistema",
  },
  {
    href: "/sistema/banner",
    title: "Banner",
    description: "Gestisci i banner mostrati in home e login.",
  },
  {
    href: "/sistema/manutenzione",
    title: "Manutenzione",
    description: "Imposta le finestre di manutenzione del portale.",
  },
  {
    href: "/sistema/archivia",
    title: "Archiviazione",
    description: "Accedi alle funzioni di archiviazione dell'anno scolastico.",
  },
  {
    href: "/sistema/nuovo",
    title: "Nuovo anno scolastico",
    description: "Prepara il passaggio operativo al nuovo anno.",
  },
  {
    href: "/sistema/aggiorna",
    title: "Aggiornamento",
    description: "Gestisci aggiornamenti e operazioni tecniche di sistema.",
  },
  {
    href: "/sistema/email",
    title: "Email",
    description: "Configura il server di posta e i dati del mittente.",
  },
  {
    href: "/sistema/telegram",
    title: "Telegram",
    description: "Collega il bot Telegram e aggiorna webhook e token.",
  },
  {
    href: "/sistema/alias",
    title: "Alias utente",
    description: "Assumi temporaneamente l'identità di un altro utente.",
  },
  {
    href: "/sistema/password",
    title: "Cambio password",
    description: "Reimposta la password di utenti selezionati.",
  },
];

export default function SistemaPage() {
  return (
    <SectionHub
      eyebrow="Sistema"
      title="Strumenti area sistema"
      description="Hub delle funzioni tecniche e amministrative: parametri globali, manutenzione, integrazioni e operazioni di servizio."
      quickActions={[
        { href: "/sistema/parametri", label: "Apri parametri" },
        { href: "/sistema/email", label: "Configura email" },
      ]}
      items={items}
    />
  );
}
