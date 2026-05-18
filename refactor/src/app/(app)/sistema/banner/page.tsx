"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function BannerPage() {
  const { token } = useAuth();
  const [bannerLogin, setBannerLogin] = useState("");
  const [bannerHome, setBannerHome] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchBanner = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.sistema.banner(token);
      setBannerLogin(res.banner_login || "");
      setBannerHome(res.banner_home || "");
    } catch {
      toast.error("Errore nel caricamento dei banner");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBanner();
  }, [fetchBanner]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await api.sistema.updateBanner(token, {
        banner_login: bannerLogin,
        banner_home: bannerHome,
      });
      toast.success("Banner aggiornati");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Errore nel salvataggio"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Banner</h1>
        <p className="text-muted-foreground">
          Configura i messaggi banner mostrati nella pagina di login e nella home
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Banner Login
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="banner-login">
                Messaggio visualizzato nella pagina di login
              </Label>
              <Textarea
                id="banner-login"
                rows={5}
                placeholder="Inserisci il testo del banner per la pagina di login..."
                value={bannerLogin}
                onChange={(e) => setBannerLogin(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Banner Home
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="banner-home">
                Messaggio visualizzato nella pagina principale dopo il login
              </Label>
              <Textarea
                id="banner-home"
                rows={5}
                placeholder="Inserisci il testo del banner per la home..."
                value={bannerHome}
                onChange={(e) => setBannerHome(e.target.value)}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
