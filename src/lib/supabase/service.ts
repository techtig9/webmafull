// Service-role Supabase client, isolated in its own module (no `next/headers`
// import) so it's safe to use from Edge Middleware as well as Route Handlers.
// Never import this from client components or expose the key to the browser.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
