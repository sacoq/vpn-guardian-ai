import { useState } from "react";
import { Loader2, Search, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { CheckResult } from "@/lib/check-types";
import { toast } from "sonner";

type Props = {
  onResult: (r: CheckResult) => void;
};

export function CheckForm({ onResult }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const value = input.trim();
    if (!value) {
      toast.error("Вставьте подписку или VLESS-ключ");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        body: { input: value },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      onResult(data as CheckResult);
      toast.success("Проверка завершена");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Ошибка: " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass gradient-border relative rounded-2xl p-6 shadow-elegant">
      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        Подписка (https://...) или VLESS / Trojan / SS ключ
      </label>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="vless://uuid@server.com:443?security=reality&sni=..."
        rows={4}
        className="mb-4 resize-none border-border/60 bg-input/40 font-mono text-sm placeholder:text-muted-foreground/50"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5" />
          Подписки тянем с <code className="rounded bg-secondary px-1 py-0.5">User-Agent: Happ</code>
        </div>
        <Button
          onClick={submit}
          disabled={loading}
          size="lg"
          className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Анализирую...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Проверить
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
