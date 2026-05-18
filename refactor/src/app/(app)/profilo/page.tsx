"use client";

import { useAuth } from "@/lib/auth/context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Mail, Shield, Clock } from "lucide-react";

export default function ProfiloPage() {
  const { user, isLoading } = useAuth();

  const initials = user
    ? `${user.nome.charAt(0)}${user.cognome.charAt(0)}`
    : "?";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profilo</h1>
        <p className="text-muted-foreground">
          Informazioni sul tuo account
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : !user ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Impossibile caricare il profilo.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          {/* Avatar Card */}
          <Card>
            <CardContent className="flex flex-col items-center py-8">
              <Avatar className="h-20 w-20 mb-4">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold text-center">
                {user.cognome} {user.nome}
              </h2>
              <Badge variant="secondary" className="mt-2">
                {user.ruoloLabel}
              </Badge>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dettagli Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    Nome
                  </div>
                  <p className="font-medium">{user.nome}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    Cognome
                  </div>
                  <p className="font-medium">{user.cognome}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    Username
                  </div>
                  <p className="font-medium font-mono text-sm">{user.username}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <p className="font-medium text-sm">{user.email}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    Ruolo
                  </div>
                  <p className="font-medium">{user.ruoloLabel}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Sesso
                  </div>
                  <p className="font-medium">
                    {user.sesso === "M" ? "Maschio" : "Femmina"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
