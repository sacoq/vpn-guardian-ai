-- Whitelist tables (public read, no writes from clients)
CREATE TABLE public.whitelist_sni (
  sni TEXT PRIMARY KEY
);

CREATE TABLE public.whitelist_ip (
  ip TEXT PRIMARY KEY
);

ALTER TABLE public.whitelist_sni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitelist_ip ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read whitelist_sni" ON public.whitelist_sni FOR SELECT USING (true);
CREATE POLICY "Anyone can read whitelist_ip" ON public.whitelist_ip FOR SELECT USING (true);

-- Checks history (anonymous allowed, no user binding for now)
CREATE TABLE public.checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_type TEXT NOT NULL CHECK (input_type IN ('subscription', 'vless')),
  input_preview TEXT NOT NULL,
  total_servers INTEGER NOT NULL DEFAULT 0,
  whitelisted_count INTEGER NOT NULL DEFAULT 0,
  safety_score INTEGER NOT NULL DEFAULT 0,
  ai_summary TEXT,
  servers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read checks" ON public.checks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert checks" ON public.checks FOR INSERT WITH CHECK (true);

CREATE INDEX idx_checks_created_at ON public.checks (created_at DESC);