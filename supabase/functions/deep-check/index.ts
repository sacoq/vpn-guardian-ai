// Deep-check: actually try TLS handshake / ping each server.
// Cloudflare Workers have no raw TCP, so we use HTTP HEAD against host:port via fetch.
// For non-HTTP ports the request will fail — we measure latency anyway.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Probe = { host: string; port: number; sni?: string };
type Result = {
  host: string; port: number;
  reachable: boolean;
  latency_ms: number | null;
  detail: string;
};

async function probe(p: Probe): Promise<Result> {
  const start = performance.now();
  // Use HTTPS to host:port — for VLESS+TLS or trojan this often returns a TLS handshake response.
  // We don't care about HTTP status, only that TCP+TLS succeeded (any response => reachable).
  const url = `https://${p.host}:${p.port}/`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(url, { method: "HEAD", signal: ctrl.signal });
    clearTimeout(t);
    return {
      host: p.host, port: p.port,
      reachable: true,
      latency_ms: Math.round(performance.now() - start),
      detail: `HTTP ${r.status}`,
    };
  } catch (e: any) {
    const dur = Math.round(performance.now() - start);
    const msg = String(e?.message || e);
    // Some VLESS servers terminate TLS but reject HTTP — that's still reachable.
    const reachable = /handshake|certificate|protocol|self.signed|TLS|SSL|HTTP\/0\.9/i.test(msg);
    return {
      host: p.host, port: p.port,
      reachable,
      latency_ms: reachable ? dur : null,
      detail: msg.slice(0, 120),
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { servers } = await req.json() as { servers: Probe[] };
    if (!Array.isArray(servers) || servers.length === 0) {
      return new Response(JSON.stringify({ error: "servers required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    // Cap at 30 to stay under timeout
    const targets = servers.slice(0, 30);
    const results = await Promise.all(targets.map((p) => probe(p)));
    return new Response(JSON.stringify({ results }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
