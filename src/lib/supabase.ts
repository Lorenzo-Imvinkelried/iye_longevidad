import { createClient, SupabaseClient } from "@supabase/supabase-js";

function cleanEnv(val?: string): string {
  return (val || "").trim().replace(/^["']|["']$/g, "");
}

const supabaseUrl =
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
  cleanEnv(process.env.SUPABASE_URL);
const supabaseAnonKey =
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  cleanEnv(process.env.SUPABASE_ANON_KEY);
const supabaseServiceKey =
  cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) || supabaseAnonKey;

export function getSupabaseEnvDiagnostics() {
  return {
    hasUrl: Boolean(supabaseUrl),
    urlStartsWithHttp: supabaseUrl.startsWith("http"),
    hasKey: Boolean(supabaseAnonKey),
  };
}

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes("tu-proyecto.supabase.co") &&
    supabaseUrl.startsWith("http")
  );
}

let browserClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    });
  }
  return browserClient;
}

export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!serverClient) {
    serverClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  }
  return serverClient;
}
