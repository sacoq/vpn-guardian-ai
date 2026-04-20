// One-shot importer for whitelists (run once after migration).
// Auth: requires header X-Admin-Token == ADMIN_IMPORT_TOKEN secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const token = req.headers.get("x-admin-token");
    const expected = Deno.env.get("ADMIN_IMPORT_TOKEN");
    if (!expected || token !== expected) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { snis = [], ips = [] } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const chunk = <T,>(arr: T[], size: number): T[][] => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    let sniInserted = 0;
    for (const part of chunk(snis as string[], 1000)) {
      const rows = part.map((sni) => ({ sni }));
      const { error } = await supabase.from("whitelist_sni").upsert(rows, { onConflict: "sni" });
      if (error) throw new Error("sni: " + error.message);
      sniInserted += rows.length;
    }

    let ipInserted = 0;
    for (const part of chunk(ips as string[], 2000)) {
      const rows = part.map((ip) => ({ ip }));
      const { error } = await supabase.from("whitelist_ip").upsert(rows, { onConflict: "ip" });
      if (error) throw new Error("ip: " + error.message);
      ipInserted += rows.length;
    }

    return new Response(JSON.stringify({ ok: true, sniInserted, ipInserted }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
