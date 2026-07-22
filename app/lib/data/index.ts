import type { CubeLabsData } from "./types";
import { supabaseProvider } from "./providers/supabase";

/*
 * Single seam for the whole app's data access. Feature code calls getData() and
 * never imports a provider directly. The active provider is chosen by the
 * DATA_PROVIDER env var (default: supabase), so switching backends is a config
 * change plus one new provider file — not a code-wide rewrite.
 *
 * To add a provider (e.g. self-hosted Supabase is identical; a Postgres +
 * PostgREST + GoTrue stack or another backend is a new file implementing
 * CubeLabsData): register it in `providers` below.
 */
const providers: Record<string, CubeLabsData> = {
  supabase: supabaseProvider,
  // "selfhosted-supabase": supabaseProvider,   // same API surface, different URL/keys
  // "postgrest": postgrestProvider,            // future
};

export function getData(): CubeLabsData {
  const name = (process.env.DATA_PROVIDER || "supabase").toLowerCase();
  const provider = providers[name];
  if (!provider) {
    throw new Error(
      `Unknown DATA_PROVIDER "${name}". Registered: ${Object.keys(providers).join(", ")}.`,
    );
  }
  return provider;
}

export type { CubeLabsData } from "./types";
