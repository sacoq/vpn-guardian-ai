// Parses a VPN subscription (base64 / clash / list of vless/trojan/ss URIs)
// or single VLESS key and analyzes:
//   - whitelist match (SNI + IP)
//   - quick metadata heuristics
//   - AI summary via Lovable AI Gateway
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Server = {
  protocol: string;
  remark: string;
  host: string;          // address (domain or ip)
  port: number;
  sni?: string;
  resolved_ips?: string[];
  whitelisted_sni?: boolean;
  whitelisted_ip?: boolean;
  in_whitelist?: boolean;
  network?: string;
  security?: string;
  flow?: string;
  raw?: string;
};

function parseVless(uri: string): Server | null {
  // vless://uuid@host:port?params#remark
  try {
    const m = uri.match(/^vless:\/\/([^@]+)@([^:/?#]+):(\d+)(\?[^#]*)?(#.*)?$/i);
    if (!m) return null;
    const [, , host, portStr, queryStr, hashStr] = m;
    const params = new URLSearchParams(queryStr ? queryStr.slice(1) : "");
    const remark = hashStr ? decodeURIComponent(hashStr.slice(1)) : `${host}:${portStr}`;
    return {
      protocol: "vless",
      remark,
      host,
      port: parseInt(portStr, 10),
      sni: params.get("sni") || params.get("host") || undefined,
      network: params.get("type") || "tcp",
      security: params.get("security") || "none",
      flow: params.get("flow") || undefined,
      raw: uri,
    };
  } catch {
    return null;
  }
}

function parseTrojan(uri: string): Server | null {
  try {
    const m = uri.match(/^trojan:\/\/([^@]+)@([^:/?#]+):(\d+)(\?[^#]*)?(#.*)?$/i);
    if (!m) return null;
    const [, , host, portStr, queryStr, hashStr] = m;
    const params = new URLSearchParams(queryStr ? queryStr.slice(1) : "");
    return {
      protocol: "trojan",
      remark: hashStr ? decodeURIComponent(hashStr.slice(1)) : `${host}:${portStr}`,
      host,
      port: parseInt(portStr, 10),
      sni: params.get("sni") || params.get("peer") || undefined,
      network: params.get("type") || "tcp",
      security: "tls",
      raw: uri,
    };
  } catch {
    return null;
  }
}

function parseShadowsocks(uri: string): Server | null {
  try {
    // ss://base64(method:pass)@host:port#remark  OR ss://base64(...)#remark
    const cleaned = uri.replace(/^ss:\/\//i, "");
    const hashIdx = cleaned.indexOf("#");
    const remark = hashIdx >= 0 ? decodeURIComponent(cleaned.slice(hashIdx + 1)) : "";
    const body = hashIdx >= 0 ? cleaned.slice(0, hashIdx) : cleaned;
    const at = body.lastIndexOf("@");
    let hostPort = body;
    if (at >= 0) hostPort = body.slice(at + 1);
    const m = hostPort.match(/^([^:]+):(\d+)/);
    if (!m) return null;
    return {
      protocol: "shadowsocks",
      remark: remark || `${m[1]}:${m[2]}`,
      host: m[1],
      port: parseInt(m[2], 10),
      raw: uri,
    };
  } catch {
    return null;
  }
}

function tryDecodeBase64(s: string): string | null {
  try {
    // url-safe base64
    const norm = s.replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
    const pad = norm.length % 4 === 0 ? norm : norm + "=".repeat(4 - (norm.length % 4));
    const decoded = atob(pad);
    if (/vless:|trojan:|ss:|vmess:/i.test(decoded)) return decoded;
    return null;
  } catch {
    return null;
  }
}

function parseLines(text: string): Server[] {
  const out: Server[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith("vless://")) {
      const s = parseVless(line); if (s) out.push(s);
    } else if (line.startsWith("trojan://")) {
      const s = parseTrojan(line); if (s) out.push(s);
    } else if (line.startsWith("ss://")) {
      const s = parseShadowsocks(line); if (s) out.push(s);
    }
    // vmess:// not parsed in detail
  }
  return out;
}

const isIp = (s: string) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s);

async function resolveDoH(host: string): Promise<string[]> {
  if (isIp(host)) return [host];
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`, {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.Answer || []).filter((a: any) => a.type === 1).map((a: any) => a.data);
  } catch {
    return [];
  }
}

async function fetchSubscription(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: { "User-Agent": "Happ/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`subscription fetch failed: ${r.status}`);
  return await r.text();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { input } = await req.json();
    if (!input || typeof input !== "string") {
      return new Response(JSON.stringify({ error: "input required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const trimmed = input.trim();
    let inputType: "subscription" | "vless" = "vless";
    let rawText = trimmed;

    if (/^https?:\/\//i.test(trimmed)) {
      inputType = "subscription";
      rawText = await fetchSubscription(trimmed);
      const decoded = tryDecodeBase64(rawText);
      if (decoded) rawText = decoded;
    } else {
      // maybe whole subscription as base64 blob pasted
      const decoded = tryDecodeBase64(trimmed);
      if (decoded) {
        inputType = "subscription";
        rawText = decoded;
      }
    }

    const servers = parseLines(rawText);
    if (servers.length === 0) {
      return new Response(JSON.stringify({ error: "no servers parsed" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Load whitelists (small for SNI, IP could be 125k — query selectively)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve and check
    const uniqueHosts = [...new Set(servers.map((s) => s.host))];
    const resolveMap = new Map<string, string[]>();
    await Promise.all(uniqueHosts.map(async (h) => {
      resolveMap.set(h, await resolveDoH(h));
    }));

    const allIps = new Set<string>();
    const allSnis = new Set<string>();
    for (const s of servers) {
      s.resolved_ips = resolveMap.get(s.host) || [];
      s.resolved_ips.forEach((ip) => allIps.add(ip));
      const sniOrHost = (s.sni || (isIp(s.host) ? "" : s.host)).toLowerCase();
      if (sniOrHost) allSnis.add(sniOrHost);
    }

    // batch lookups
    const sniList = [...allSnis];
    const ipList = [...allIps];
    const [sniRes, ipRes] = await Promise.all([
      sniList.length
        ? supabase.from("whitelist_sni").select("sni").in("sni", sniList)
        : Promise.resolve({ data: [], error: null } as any),
      ipList.length
        ? supabase.from("whitelist_ip").select("ip").in("ip", ipList)
        : Promise.resolve({ data: [], error: null } as any),
    ]);
    const sniSet = new Set((sniRes.data || []).map((r: any) => r.sni));
    const ipSet = new Set((ipRes.data || []).map((r: any) => r.ip));

    let whitelistedCount = 0;
    for (const s of servers) {
      const sniOrHost = (s.sni || (isIp(s.host) ? "" : s.host)).toLowerCase();
      s.whitelisted_sni = sniOrHost ? sniSet.has(sniOrHost) : false;
      s.whitelisted_ip = (s.resolved_ips || []).some((ip) => ipSet.has(ip));
      s.in_whitelist = s.whitelisted_sni || s.whitelisted_ip;
      if (s.in_whitelist) whitelistedCount++;
    }

    // ===== Композитная оценка подписки =====
    // 1. Качество конфигов (40 баллов): REALITY/TLS, vision flow, нестандартные порты
    // 2. Соответствие белым спискам (25 баллов): SNI/IP в whitelist
    // 3. Количество и разнообразие (20 баллов): количество серверов, уникальные SNI, география (по подсетям)
    // 4. Безопасность протокола (15 баллов): vless/trojan vs ss
    let qualityScore = 0;     // /40
    let whitelistScore = 0;   // /25
    let varietyScore = 0;     // /20
    let protocolScore = 0;    // /15

    // 1. Качество
    let qSum = 0;
    for (const s of servers) {
      let v = 0;
      if (s.security === "reality") v += 10;
      else if (s.security === "tls") v += 6;
      else v += 1;
      if (s.flow?.includes("vision")) v += 3;
      if (s.port === 443 || s.port === 8443) v += 2;
      else if (s.port < 1024) v += 1;
      qSum += Math.min(v, 15);
    }
    qualityScore = Math.round((qSum / (servers.length * 15)) * 40);

    // 2. Белые списки
    whitelistScore = Math.round((whitelistedCount / servers.length) * 25);

    // 3. Разнообразие
    const uniqueSnis = new Set(servers.map((s) => s.sni).filter(Boolean)).size;
    const uniqueSubnets = new Set(
      servers.flatMap((s) => (s.resolved_ips || []).map((ip) => ip.split(".").slice(0, 2).join(".")))
    ).size;
    const countScore = Math.min(servers.length / 20, 1) * 8;        // до 8 за 20+ серверов
    const sniDivScore = Math.min(uniqueSnis / 10, 1) * 6;           // до 6 за 10+ уникальных SNI
    const geoScore = Math.min(uniqueSubnets / 8, 1) * 6;            // до 6 за 8+ подсетей
    varietyScore = Math.round(countScore + sniDivScore + geoScore);

    // 4. Протокол
    let pSum = 0;
    for (const s of servers) {
      if (s.protocol === "vless") pSum += 15;
      else if (s.protocol === "trojan") pSum += 12;
      else if (s.protocol === "shadowsocks") pSum += 6;
      else pSum += 3;
    }
    protocolScore = Math.round((pSum / (servers.length * 15)) * 15);

    const safetyScore = Math.min(100, qualityScore + whitelistScore + varietyScore + protocolScore);
    const scoreBreakdown = {
      quality: qualityScore,
      whitelist: whitelistScore,
      variety: varietyScore,
      protocol: protocolScore,
      uniqueSnis,
      uniqueSubnets,
    };

    // AI analysis via Lovable AI
    let aiSummary = "";
    try {
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (apiKey) {
        const summary = servers.slice(0, 30).map((s) =>
          `- ${s.protocol} ${s.remark} | host=${s.host}:${s.port} sni=${s.sni || "—"} sec=${s.security || "—"} net=${s.network || "—"} ips=${(s.resolved_ips || []).join(",") || "—"} whitelisted=${s.in_whitelist ? "✅" : "❌"}`
        ).join("\n");

        const prompt = `Ты эксперт по безопасности VPN-подписок и обходу блокировок РКН в РФ.
Проанализируй конфиг ниже и дай краткий вердикт (5-8 предложений) по-русски:

1. Общая безопасность (TLS, REALITY, шифрование, fingerprint).
2. Шанс блокировки/детекции в РФ (исходя из SNI, IP, протокола).
3. Удобство (количество серверов, география, дублирование).
4. Соответствие "белым спискам" (нерезидентский трафик через разрешённые SNI/IP — лучше для маскировки).
5. Конкретные риски и рекомендации (какие сервера убрать/оставить).

Будь конкретным, технически точным. Не лей воды.

Сводка по конфигу:
- Протоколов: ${[...new Set(servers.map((s) => s.protocol))].join(", ")}
- Серверов всего: ${servers.length}
- В белом списке (SNI или IP): ${whitelistedCount}/${servers.length}
- Уникальных SNI: ${uniqueSnis}, уникальных подсетей: ${uniqueSubnets}
- Композитная оценка ПОДПИСКИ: ${safetyScore}/100 (качество ${qualityScore}/40, белый список ${whitelistScore}/25, разнообразие ${varietyScore}/20, протокол ${protocolScore}/15)

Серверы:
${summary}${servers.length > 30 ? `\n...и ещё ${servers.length - 30} серверов` : ""}`;

        const aiR = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "Ты технический аналитик VPN/прокси конфигов. Отвечай по-русски, кратко и по делу." },
              { role: "user", content: prompt },
            ],
          }),
        });
        if (aiR.ok) {
          const aiJ = await aiR.json();
          aiSummary = aiJ.choices?.[0]?.message?.content || "";
        } else if (aiR.status === 429) {
          aiSummary = "⚠️ Слишком много запросов к AI. Попробуйте через минуту.";
        } else if (aiR.status === 402) {
          aiSummary = "⚠️ Закончились AI-кредиты в воркспейсе.";
        }
      }
    } catch (e) {
      console.error("AI error", e);
      aiSummary = "Не удалось получить AI-анализ.";
    }

    // Save check (service role bypasses RLS)
    const inputPreview = trimmed.length > 200 ? trimmed.slice(0, 200) + "…" : trimmed;
    const { data: saved, error: saveErr } = await supabase.from("checks").insert({
      input_type: inputType,
      input_preview: inputPreview,
      total_servers: servers.length,
      whitelisted_count: whitelistedCount,
      safety_score: safetyScore,
      ai_summary: aiSummary,
      servers,
    }).select().single();

    if (saveErr) console.error("save err", saveErr);

    return new Response(JSON.stringify({
      id: saved?.id,
      inputType,
      totalServers: servers.length,
      whitelistedCount,
      safetyScore,
      scoreBreakdown,
      aiSummary,
      servers,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("check err", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
