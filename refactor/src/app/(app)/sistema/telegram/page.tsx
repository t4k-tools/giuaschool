"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TelegramPage() {
  const { token } = useAuth();
  const [botToken, setBotToken] = useState("");
  const [webhook, setWebhook] = useState("");
  const [abilitato, setAbilitato] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTelegram = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.sistema.telegram(token);
      setBotToken(res.bot_token || "");
      setWebhook(res.webhook || "");
      setAbilitato(res.abilitato === "1" || res.abilitato === "true");
    } catch {
      toast.error("Errore nel caricamento della configurazione Telegram");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTelegram();
  }, [fetchTelegram]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await api.sistema.updateTelegram(token, {
        bot_token: botToken,
        webhook,
        abilitato: abilitato ? "1" : "0",
      });
      toast.success("Configurazione Telegram aggiornata");
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
          Configurazione Telegram
        </h1>
        <p className="text-muted-foreground">
          Configura il bot Telegram per le notifiche
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Bot Telegram
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bot-token">Bot Token</Label>
              <Input
                id="bot-token"
                placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook">Webhook URL</Label>
              <Input
                id="webhook"
                placeholder="https://example.com/api/telegram/webhook"
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="abilitato"
                checked={abilitato}
                onCheckedChange={setAbilitato}
              />
              <Label htmlFor="abilitato">
                Bot abilitato
              </Label>
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
