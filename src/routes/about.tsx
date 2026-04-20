import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { ShieldCheck, Brain, Zap, Database, Lock, Globe } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "О сервисе — xnCheck" },
      { name: "description", content: "Как xnCheck проверяет VPN-подписки и VLESS-ключи: белые списки, AI-анализ, глубокие пробы." },
      { property: "og:title", content: "О сервисе — xnCheck" },
      { property: "og:description", content: "Принципы работы независимого аудита VPN-конфигов." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">О сервисе</h1>
        <p className="mb-10 text-muted-foreground">
          xnCheck — независимый аудит VPN-подписок и VLESS/Trojan/Shadowsocks-ключей.
          Сделан для пользователей в РФ, где имеет значение, через какие SNI и IP идёт трафик.
        </p>

        <div className="space-y-4">
          <Block icon={<Database />} title="Белые списки">
            В базе <b>1 027 SNI</b> и <b>125 696 IP</b>, относящихся к разрешённым российским ресурсам
            (Avito, VK, Mail.ru, Яндекс, Сбер, Госуслуги, RuTube и т.&nbsp;п.).
            Если сервер из вашей подписки маскируется под один из них — он менее заметен для DPI.
          </Block>
          <Block icon={<ShieldCheck />} title="Что проверяем">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>Синтаксис VLESS / Trojan / SS-ключей и base64-подписок.</li>
              <li>SNI каждого сервера — есть ли совпадение с белым списком.</li>
              <li>Резолв домена в IP через DoH (Cloudflare) и сверка с базой IP.</li>
              <li>Тип сети (tcp / ws / grpc), security (reality / tls / none), flow.</li>
            </ul>
          </Block>
          <Block icon={<Brain />} title="AI-анализ">
            Каждая проверка отправляется в Gemini&nbsp;3&nbsp;Flash через защищённый шлюз.
            Модель оценивает безопасность шифрования, риски детекции в РФ, удобство (количество и
            география серверов) и даёт рекомендации какие узлы оставить.
          </Block>
          <Block icon={<Zap />} title="Глубокая проверка">
            По кнопке: реальные TLS-запросы к&nbsp;первым 30 серверам подписки.
            Меряем латентность и доступность.
          </Block>
          <Block icon={<Globe />} title="User-Agent: Happ">
            Подписки тянутся с заголовком <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">User-Agent: Happ/1.0</code>,
            чтобы получать актуальное содержимое (часто провайдеры отдают разные конфиги разным клиентам).
          </Block>
          <Block icon={<Lock />} title="Приватность">
            В базе сохраняется только <b>превью первых 200 символов</b> входа, агрегированные
            результаты и список серверов. Полная подписка не сохраняется. Все запросы к AI и
            сетевые пробы идут с серверной стороны — ваш IP не светится.
          </Block>
        </div>
      </main>
    </div>
  );
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 p-2 text-primary">
          {icon}
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="text-sm leading-relaxed text-foreground/85">{children}</div>
    </div>
  );
}
