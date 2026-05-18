import { SectionHub } from "@/components/layout/section-hub";

const items = [
  {
    href: "/alunni/modifica",
    title: "Anagrafica alunni",
    description: "Inserisci, aggiorna e abilita i profili degli studenti.",
    badge: "Operativo",
  },
  {
    href: "/alunni/importa",
    title: "Importazione alunni",
    description: "Carica gli studenti da CSV con procedura massiva.",
  },
  {
    href: "/alunni/classe",
    title: "Cambio classe",
    description: "Gestisci gli spostamenti degli alunni tra le classi.",
  },
  {
    href: "/alunni/rappresentanti",
    title: "Rappresentanti studenti",
    description: "Assegna i ruoli di rappresentanza agli alunni.",
  },
  {
    href: "/alunni/rappresentantiGenitori",
    title: "Rappresentanti genitori",
    description: "Configura i rappresentanti dei genitori collegati alle classi.",
  },
];

export default function AlunniPage() {
  return (
    <SectionHub
      eyebrow="Alunni"
      title="Gestione area alunni"
      description="Hub operativo per l'anagrafica studenti, importazioni, cambi di classe e rappresentanze."
      quickActions={[
        { href: "/alunni/modifica?new=1", label: "Nuovo alunno" },
      ]}
      items={items}
    />
  );
}
