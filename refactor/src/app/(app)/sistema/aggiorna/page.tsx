"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api } from "@/lib/api/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Info, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";

interface SystemInfo {
  versione: string;
  anno_scolastico: string;
  anno_inizio: string;
  anno_fine: string;
}

export default function AggiornaPage() {
  const { token } = useAuth();
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInfo = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.sistema.info(token);
      setInfo(res);
    } catch {
      toast.error("Errore nel caricamento delle informazioni di sistema");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Aggiornamento Sistema
        </h1>
        <p className="text-muted-foreground">
          Informazioni sulla versione corrente e aggiornamento del sistema
        </p>
      </div>

      {/* System info card */}
      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  Informazioni Sistema
                </CardTitle>
                <CardDescription>
                  Versione corrente e configurazione dell&apos;anno scolastico
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="cursor-pointer"
                onClick={() => void fetchInfo()}
              >
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Aggiorna dati
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Versione</p>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-sm">
                    <RefreshCw className="mr-1.5 h-3 w-3" />
                    {info?.versione || "N/D"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Anno Scolastico
                </p>
                <p className="font-medium">
                  {info?.anno_scolastico || "N/D"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Inizio anno</p>
                <p className="font-medium">
                  {info?.anno_inizio
                    ? new Date(info.anno_inizio).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : "N/D"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Fine anno</p>
                <p className="font-medium">
                  {info?.anno_fine
                    ? new Date(info.anno_fine).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : "N/D"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              L&apos;aggiornamento automatico del sistema sarà disponibile
              nella prossima versione. Per ora, gli aggiornamenti devono
              essere applicati tramite il comando da terminale.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
