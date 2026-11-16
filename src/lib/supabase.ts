import { createClient, SupabaseClient } from "@supabase/supabase-js";

function cleanEnv(val?: string): string {
  return (val || "").trim().replace(/^["']|["']$/g, "");
}

const supabaseUrl =
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
  cleanEnv(process.env.SUPABASE_URL);

const supabaseAnonKey =
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  cleanEnv(process.env.SUPABASE_ANON_KEY) ||
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) ||
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  cleanEnv(process.env.SUPABASE_PUBLISHABLE_KEY) ||
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_KEY) ||
  cleanEnv(process.env.SUPABASE_KEY);

const supabaseServiceKey =
  cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) || supabaseAnonKey;

export function getSupabaseEnvDiagnostics() {
  return {
    hasUrl: Boolean(supabaseUrl),
    urlStartsWithHttp: supabaseUrl.startsWith("http"),
    hasKey: Boolean(supabaseAnonKey || supabaseServiceKey),
  };
}

export function isSupabaseConfigured(): boolean {
  const activeKey = supabaseAnonKey || supabaseServiceKey;
  return (
    Boolean(supabaseUrl) &&
    Boolean(activeKey) &&
    !supabaseUrl.includes("tu-proyecto.supabase.co") &&
    supabaseUrl.startsWith("http")
  );
}

let browserClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!browserClient) {
    browserClient = createClient(
      supabaseUrl,
      supabaseAnonKey || supabaseServiceKey,
      {
        realtime: {
          params: {
            eventsPerSecond: 20,
          },
        },
      }
    );
  }
  return browserClient;
}

function noStoreServerFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, {
    ...init,
    cache: "no-store",
  });
}

export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!serverClient) {
    serverClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: { fetch: noStoreServerFetch },
    });
  }
  return serverClient;
}
