"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const TOKEN_STORAGE_KEY = "jwt_token";

function Caricamento() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">Accesso in corso…</p>
      </div>
    </div>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const err = searchParams.get("error");

    if (err || !token) {
      setError(
        err === "google"
          ? "Autenticazione Google non riuscita. Verifica che il tuo account sia abilitato."
          : "Token mancante o non valido."
      );
      return;
    }

    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      router.replace("/");
    } catch {
      setError("Impossibile salvare la sessione. Verifica che i cookie/localStorage siano abilitati.");
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <XCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold">Accesso non riuscito</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild>
            <Link href="/login">Torna al login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <Caricamento />;
}

// useSearchParams() richiede un confine <Suspense> per il prerender statico (Next 16.2+)
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Caricamento />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
