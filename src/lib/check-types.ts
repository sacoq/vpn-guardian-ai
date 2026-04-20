export type ServerInfo = {
  protocol: string;
  remark: string;
  host: string;
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

export type CheckResult = {
  id?: string;
  inputType: "subscription" | "vless";
  totalServers: number;
  whitelistedCount: number;
  safetyScore: number;
  aiSummary: string;
  servers: ServerInfo[];
};

export type DeepProbe = {
  host: string;
  port: number;
  reachable: boolean;
  latency_ms: number | null;
  detail: string;
};
