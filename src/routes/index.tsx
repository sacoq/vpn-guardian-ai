import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { CheckForm } from "@/components/check-form";
import { ResultPanel } from "@/components/result-panel";
import type { CheckResult } from "@/lib/check-types";
import { Toaster } from "@/components/ui/sonner";
import { ShieldCheck, Zap, Brain } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "xnCheck — аудит VPN-подписок и VLESS-ключей" },
      { name: "description", content: "Проверка VPN-подписок и VLESS-ключей: безопасность, скорость, белый список SNI/IP, AI-анализ для пользователей из РФ." },
      { property: "og:title", content: "xnCheck — аудит VPN-подписок" },
      { property: "og:description", content: "Анализ безопасности и доступности серверов из подписки." },
    ],
  }),
  component: Index,
});

function Index() {
  const [result, setResult] = useState<CheckResult | null>(null);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Toaster theme="dark" position="top-center" />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            125 696 IP · 1 027 SNI в базе белых списков
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Проверка <span className="gradient-text">VPN-подписок</span> и&nbsp;VLESS-ключей
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            Безопасность · скорость · удобство · соответствие белым спискам РФ.
            AI-аудит каждого сервера за&nbsp;несколько секунд.
          </p>
        </div>

        {/* Form */}
        <CheckForm onResult={setResult} />

        {/* Features (only when no result) */}
        {!result && (
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <Feature
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Белые списки"
              desc="Сверка SNI и IP с базой разрешённых доменов и адресов в РФ — серверы из этой базы менее заметны для DPI."
            />
            <Feature
              icon={<Brain className="h-5 w-5" />}
              title="AI-анализ"
              desc="Gemini 3 Flash оценивает протокол, маскировку, шифрование, фингерпринт и риски блокировки."
            />
            <Feature
              icon={<Zap className="h-5 w-5" />}
              title="Глубокая проверка"
              desc="По кнопке — реальный TLS-handshake до серверов с измерением латентности (до 30 узлов за раз)."
            />
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-10">
            <ResultPanel result={result} />
          </div>
        )}
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        xnCheck · независимый аудит. Не храним подписки целиком, только превью первых 200 символов.
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="mb-3 inline-flex rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 p-2 text-primary">
        {icon}
      </div>
      <h3 className="mb-1.5 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
