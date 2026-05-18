"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { SectionHub } from "@/components/layout/section-hub";

const items = [
  {
    href: "/docenti",
    title: "Docenti",
    description: "Anagrafica, cattedre, incarichi (coordinatori, segretari, staff, BES, RSPP) e rappresentanti del personale docente.",
  },
  {
    href: "/alunni",
    title: "Alunni",
    description: "Anagrafica alunni, gestione classi, importazione massiva e rappresentanti di classe.",
  },
  {
    href: "/ata",
    title: "Personale ATA",
    description: "Anagrafica del personale amministrativo, tecnico e ausiliario e relativi rappresentanti.",
  },
];

export default function UtentiPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const allowed =
    user?.roles.includes("ROLE_AMMINISTRATORE") ||
    user?.roles.includes("ROLE_PRESIDE");

  useEffect(() => {
    if (!isLoading && !allowed) {
      router.replace("/dashboard");
    }
  }, [isLoading, allowed, router]);

  if (isLoading || !allowed) {
    return null;
  }

  return (
    <SectionHub
      eyebrow="Utenti"
      title="Gestione utenti"
      description="Punto di accesso unico alle aree dedicate alla gestione del personale docente, degli alunni e del personale ATA."
      items={items}
    />
  );
}
