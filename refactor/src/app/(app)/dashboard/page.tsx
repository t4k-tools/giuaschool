"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { api, type IstitutoConfig } from "@/lib/api/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Calendar,
  Users,
  BookOpen,
  School,
  Clock,
} from "lucide-react";

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [config, setConfig] = useState<IstitutoConfig | null>(null);

  useEffect(() => {
    if (token) {
      api.config
        .istituto(token)
        .then(setConfig)
        .catch(() => {});
    }
  }, [token]);

  const oggi = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const ora = new Date().toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      {/* Header di benvenuto */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Benvenuto, {user?.nome}!
        </h1>
        <p className="text-muted-foreground">
          <span className="capitalize">{oggi}</span> &mdash; {ora}
        </p>
      </div>

      {/* Info utente */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ruolo</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.ruoloLabel}</div>
            <Badge variant="secondary" className="mt-1">
              {user?.roles[0]?.replace("ROLE_", "")}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Anno Scolastico
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {config?.annoScolastico || "---"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {config?.annoInizio && config?.annoFine
                ? `${new Date(config.annoInizio).toLocaleDateString("it-IT")} - ${new Date(config.annoFine).toLocaleDateString("it-IT")}`
                : "Date non configurate"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Istituto</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {config?.istituto?.nomeBreve || "---"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {config?.istituto?.tipo || ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orario</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ora}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ora locale
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Card rapide */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(user?.roles.includes("ROLE_AMMINISTRATORE") || user?.roles.includes("ROLE_PRESIDE")) && (
          <Link href="/utenti">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Gestione Utenti
                </CardTitle>
                <CardDescription>
                  Gestisci docenti, alunni e personale ATA
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}

        <Link href="/lezioni">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Registro Classe
              </CardTitle>
              <CardDescription>
                Accedi al contesto lezioni e al registro di classe
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/agenda">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Calendario
              </CardTitle>
              <CardDescription>
                Visualizza il calendario scolastico e le festivit&agrave;
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
