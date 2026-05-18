"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EmailConfig {
  server: string;
  porta: string;
  username: string;
  password: string;
  mittente: string;
}

export default function EmailPage() {
  const { token } = useAuth();
  const [config, setConfig] = useState<EmailConfig>({
    server: "",
    porta: "",
    username: "",
    password: "",
    mittente: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchEmail = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.sistema.email(token);
      setConfig({
        server: res.server || "",
        porta: res.porta || "",
        username: res.username || "",
        password: res.password || "",
        mittente: res.mittente || "",
      });
    } catch {
      toast.error("Errore nel caricamento della configurazione email");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchEmail();
  }, [fetchEmail]);

  const handleChange = (field: keyof EmailConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await api.sistema.updateEmail(token, config);
      toast.success("Configurazione email aggiornata");
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
        <h1 className="text-2xl font-bold tracking-tight">
          Configurazione Email
        </h1>
        <p className="text-muted-foreground">
          Configura il server SMTP per l&apos;invio delle email
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-80 w-full" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Server SMTP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="server">Server SMTP</Label>
                <Input
                  id="server"
                  placeholder="smtp.example.com"
                  value={config.server}
                  onChange={(e) => handleChange("server", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="porta">Porta</Label>
                <Input
                  id="porta"
                  placeholder="587"
                  value={config.porta}
                  onChange={(e) => handleChange("porta", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="user@example.com"
                  value={config.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={config.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mittente">Indirizzo mittente</Label>
              <Input
                id="mittente"
                type="email"
                placeholder="noreply@example.com"
                value={config.mittente}
                onChange={(e) => handleChange("mittente", e.target.value)}
              />
            </div>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
