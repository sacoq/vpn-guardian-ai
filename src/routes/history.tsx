import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { ResultPanel } from "@/components/result-panel.tsx";
import { supabase } from "@/integrations/supabase/client";
import type { CheckResult } from "@/lib/check-types";
import { Loader2, History as HistoryIcon, ShieldCheck, ShieldAlert } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "История проверок — xnCheck" },
      { name: "description", content: "Последние проверки VPN-подписок и VLESS-ключей." },
      { property: "og:title", content: "История проверок — xnCheck" },
      { property: "og:description", content: "Все недавние аудиты конфигов." },
    ],
  }),
  component: HistoryPage,
});

type Row = {
  id: string;
  input_type: string;
  input_preview: string;
  total_servers: number;
  whitelisted_count: number;
  safety_score: number;
  ai_summary: string | null;
  servers: unknown;
  created_at: string;
};

function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<CheckResult | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("checks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) setRows(data as Row[]);
      setLoading(false);
    })();
  }, []);

  const open = (r: Row) => {
    setActive({
      id: r.id,
      inputType: r.input_type as "subscription" | "vless",
      totalServers: r.total_servers,
      whitelistedCount: r.whitelisted_count,
      safetyScore: r.safety_score,
      aiSummary: r.ai_summary || "",
      servers: (r.servers as CheckResult["servers"]) || [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Toaster theme="dark" position="top-center" />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <HistoryIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">История проверок</h1>
        </div>

        {active && (
          <div className="mb-8">
            <ResultPanel result={active} />
            <button
              onClick={() => setActive(null)}
              className="mt-3 text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              ← Скрыть детальный просмотр
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center text-muted-foreground">
            Ещё ничего не проверяли.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const score = r.safety_score;
              const color = score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-destructive";
              return (
                <button
                  key={r.id}
                  onClick={() => open(r)}
                  className="glass flex w-full items-center gap-4 rounded-lg p-4 text-left transition hover:border-primary/40"
                >
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-bold tabular-nums ${color}`}>
                    {score}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {r.input_type === "subscription" ? "Подписка" : "VLESS-ключ"}
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">
                        {r.total_servers} серверов · {r.whitelisted_count} в WL
                      </span>
                    </div>
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      {r.input_preview}
                    </div>
                  </div>
                  <div className="hidden text-right text-xs text-muted-foreground sm:block">
                    {new Date(r.created_at).toLocaleString("ru-RU")}
                  </div>
                  {score >= 70 ? (
                    <ShieldCheck className="h-5 w-5 flex-shrink-0 text-success" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 flex-shrink-0 text-warning" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
